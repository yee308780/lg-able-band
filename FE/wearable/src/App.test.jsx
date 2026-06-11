import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('Wearable MVP', () => {
  beforeEach(() => {
    window.__ABLE_BAND_UWB_POLL_MS__ = 20
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: vi.fn(() => true),
    })
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    delete window.__ABLE_BAND_UWB_POLL_MS__
    delete window.__ABLE_BAND_WEARABLE_FAIL_CONFIRM__
    delete window.__ABLE_BAND_WEARABLE_FALLBACK__
    delete window.__ABLE_BAND_WEARABLE_EMERGENCY_ERROR__
    delete navigator.vibrate
    window.history.pushState({}, '', '/')
  })

  it('shows QR pairing first so a phone can link the wearable', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: '휴대폰으로 연동' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('스캔 대기')
    const qrCode = screen.getByAltText('Able Band 연동 QR 코드')
    expect(qrCode.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
    expect(qrCode.getAttribute('data-pairing-payload')).toContain('lg-able-band://pair')
    expect(screen.getByText('ABLE-4IN-260610')).toBeTruthy()
    expect(screen.getByText(/5분 동안 유효/)).toBeTruthy()
  })

  it('syncs app alerts to the wearable after pairing', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '휴대폰 연동 완료' }))

    expect(screen.getByRole('heading', { name: '연동 완료' })).toBeTruthy()
    expect(await screen.findByRole('heading', { name: '전기레인지 과열 주의' })).toBeTruthy()
    expect(screen.getByText('위험 알림')).toBeTruthy()
    expect(screen.getByText('안전 전기레인지')).toBeTruthy()
    expect(screen.getByLabelText('1/3')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '다음 알림' }))
    expect(screen.getByRole('heading', { name: '도어센서 열림' })).toBeTruthy()
    expect(screen.getByLabelText('2/3')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '다음 알림' }))
    expect(screen.getByRole('heading', { name: '냉장고 문 열림' })).toBeTruthy()
    expect(screen.getByLabelText('3/3')).toBeTruthy()
  })

  it('confirms the current synced alert and keeps the next app alert visible', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '휴대폰 연동 완료' }))
    expect(await screen.findByRole('heading', { name: '전기레인지 과열 주의' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '확인' }))

    expect((await screen.findByRole('status')).textContent).toContain('확인한 알림을 삭제했습니다.')
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '전기레인지 과열 주의' })).toBeNull()
    })
    expect(screen.getByRole('heading', { name: '도어센서 열림' })).toBeTruthy()
  })

  it('opens UWB device selection after pairing', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '휴대폰 연동 완료' }))
    await screen.findByRole('button', { name: 'UWB' })
    await user.click(screen.getByRole('button', { name: 'UWB' }))

    expect(await screen.findByRole('heading', { name: '내 가전 목록' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /세탁기/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /안전 전기레인지/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /도어센서/ })).toBeTruthy()
  })

  it('shows standby and sends emergency requests after pairing', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '휴대폰 연동 완료' }))
    await screen.findByRole('button', { name: '대기' })
    fireEvent.click(screen.getByRole('button', { name: '대기' }))

    expect(screen.getByRole('heading', { name: '손목에서 대기 중' })).toBeTruthy()
    expect(screen.getByText('배터리 82%')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '긴급 요청' }))
    expect(await screen.findByRole('heading', { name: '긴급 요청' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '보호자에게 보내기' }))

    expect((await screen.findByRole('status')).textContent).toContain('보호자에게 긴급 요청을 보냈습니다.')
  })

  it('shows no guardian emergency failure', async () => {
    window.__ABLE_BAND_WEARABLE_EMERGENCY_ERROR__ = 'NO_GUARDIAN'
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '휴대폰 연동 완료' }))
    await screen.findByRole('button', { name: '대기' })
    fireEvent.click(screen.getByRole('button', { name: '대기' }))
    fireEvent.click(screen.getByRole('button', { name: '긴급 요청' }))
    expect(await screen.findByRole('heading', { name: '긴급 요청' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '보호자에게 보내기' }))

    expect((await screen.findByRole('status')).textContent).toContain('연결된 보호자가 없습니다.')
  })

  it('shows alert load failure when fallback is disabled', async () => {
    window.__ABLE_BAND_WEARABLE_FALLBACK__ = false
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ message: '서버 연결 실패' }),
    }))

    try {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: '휴대폰 연동 완료' }))

      expect(await screen.findByRole('heading', { name: '알림 상태 확인 필요' })).toBeTruthy()
      expect((await screen.findByRole('status')).textContent).toContain('서버 연결 실패')
    } finally {
      if (originalFetch) {
        globalThis.fetch = originalFetch
      } else {
        delete globalThis.fetch
      }
    }
  })

  it('keeps terminal UWB sessions from polling again', async () => {
    window.history.pushState({}, '', '/?sessionId=9002')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '휴대폰 연동 완료' }))
    await screen.findByRole('button', { name: 'UWB' })
    fireEvent.click(screen.getByRole('button', { name: 'UWB' }))
    expect(await screen.findByRole('heading', { name: '내 가전 목록' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /세탁기/ }))

    expect(await screen.findByRole('heading', { name: '세탁기 찾기' })).toBeTruthy()
    expect(screen.getAllByText('도착').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '탐색 종료' }).disabled).toBe(true)

    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 50)
      })
    })

    expect(screen.getAllByText('도착').length).toBeGreaterThan(0)
  })
})
