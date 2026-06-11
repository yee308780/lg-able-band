import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

const originalFetch = globalThis.fetch
const pairingApiSession = {
  pairingSessionId: 'pairing-api-001',
  deviceId: 'able-band-api-001',
  deviceName: 'LG Able Band',
  pairingCode: 'ABLE-API-001',
  nonce: 'nonce-api-001',
  issuedAt: '2026-06-10T15:00:00+09:00',
  expiresAt: '2026-06-10T15:05:00+09:00',
  expiresInMinutes: 5,
  pairingPayload: 'lg-able-band://pair?pairingSessionId=pairing-api-001&from=backend',
}

describe('Wearable MVP', () => {
  beforeEach(() => {
    window.__ABLE_BAND_UWB_POLL_MS__ = 20
    window.__ABLE_BAND_PAIRING_POLL_MS__ = 10
    localStorage.clear()
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: vi.fn(() => true),
    })
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    delete window.__ABLE_BAND_UWB_POLL_MS__
    delete window.__ABLE_BAND_PAIRING_POLL_MS__
    delete window.__ABLE_BAND_PAIRING_MANUAL__
    delete window.__ABLE_BAND_WEARABLE_FAIL_CONFIRM__
    delete window.__ABLE_BAND_WEARABLE_FALLBACK__
    delete window.__ABLE_BAND_WEARABLE_EMERGENCY_ERROR__
    delete navigator.vibrate
    localStorage.clear()
    if (originalFetch) {
      globalThis.fetch = originalFetch
    } else {
      delete globalThis.fetch
    }
    window.history.pushState({}, '', '/')
  })

  it('shows QR pairing first so a phone can link the wearable', async () => {
    setupPairingApi({ statuses: ['WAITING'] })
    render(<App />)

    expect(await screen.findByRole('heading', { name: '휴대폰으로 연동' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('스캔 대기')
    const qrCode = screen.getByAltText('Able Band 연동 QR 코드')
    expect(qrCode.getAttribute('src')).toMatch(/^data:image\/svg\+xml/)
    expect(qrCode.getAttribute('data-pairing-payload')).toBe(pairingApiSession.pairingPayload)
    expect(screen.getByText('ABLE-API-001')).toBeTruthy()
    expect(screen.getByText(/5분 동안 유효/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: '휴대폰 연동 완료' })).toBeNull()
  })

  it('syncs app alerts to the wearable after automatic backend pairing', async () => {
    const apiFetch = setupPairingApi()
    render(<App />)

    expect(await screen.findByRole('heading', { name: '연동 완료' })).toBeTruthy()
    expect(await screen.findByRole('heading', { name: '전기레인지 과열 주의' })).toBeTruthy()
    expect(localStorage.getItem('lg-able-band.accessToken')).toBe('paired-api-token')
    expect(apiFetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/wearable/pairing-sessions/pairing-api-001?deviceId=able-band-api-001&nonce=nonce-api-001',
      expect.objectContaining({ method: 'GET' }),
    )
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
    await renderPairedApp()
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
    await renderPairedApp()

    await screen.findByRole('button', { name: 'UWB' })
    await user.click(screen.getByRole('button', { name: 'UWB' }))

    expect(await screen.findByRole('heading', { name: '내 가전 목록' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /세탁기/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /안전 전기레인지/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /도어센서/ })).toBeTruthy()
  })

  it('shows standby and sends emergency requests after pairing', async () => {
    await renderPairedApp()

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
    await renderPairedApp()

    await screen.findByRole('button', { name: '대기' })
    fireEvent.click(screen.getByRole('button', { name: '대기' }))
    fireEvent.click(screen.getByRole('button', { name: '긴급 요청' }))
    expect(await screen.findByRole('heading', { name: '긴급 요청' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '보호자에게 보내기' }))

    expect((await screen.findByRole('status')).textContent).toContain('연결된 보호자가 없습니다.')
  })

  it('shows alert load failure when fallback is disabled', async () => {
    window.__ABLE_BAND_WEARABLE_FALLBACK__ = false
    setupPairingApi({ alertFailure: true })
    render(<App />)

    expect(await screen.findByRole('heading', { name: '알림 상태 확인 필요' })).toBeTruthy()
    expect((await screen.findByRole('status')).textContent).toContain('서버 연결 실패')
  })

  it('keeps terminal UWB sessions from polling again', async () => {
    window.history.pushState({}, '', '/?sessionId=9002')
    await renderPairedApp()

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

  it('shows the manual pairing fallback only for development tests', async () => {
    window.__ABLE_BAND_PAIRING_MANUAL__ = true
    setupPairingApi({ statuses: ['WAITING'] })
    render(<App />)

    expect(await screen.findByRole('button', { name: '휴대폰 연동 완료' })).toBeTruthy()
  })
})

async function renderPairedApp(options) {
  const apiFetch = setupPairingApi(options)
  render(<App />)
  await screen.findByRole('heading', { name: '전기레인지 과열 주의' })
  return apiFetch
}

function setupPairingApi({ statuses = ['WAITING', 'PAIRED'], alertFailure = false } = {}) {
  const statusQueue = [...statuses]
  const lastStatus = statuses[statuses.length - 1] || 'WAITING'
  const apiFetch = vi.fn(async (url) => {
    const endpoint = String(url)
    if (endpoint === 'http://localhost:8080/api/wearable/pairing-sessions') {
      return jsonResponse({
        ...pairingApiSession,
        status: 'WAITING',
      })
    }

    if (endpoint.startsWith('http://localhost:8080/api/wearable/pairing-sessions/pairing-api-001?')) {
      const status = statusQueue.length > 0 ? statusQueue.shift() : lastStatus
      return jsonResponse({
        ...pairingApiSession,
        status,
        accessToken: status === 'PAIRED' ? 'paired-api-token' : undefined,
      })
    }

    if (endpoint === 'http://localhost:8080/api/alerts?limit=20') {
      if (alertFailure) {
        return jsonResponse({ message: '서버 연결 실패' }, 500)
      }

      throw new Error('alert api unavailable')
    }

    throw new Error(`Unexpected API call: ${endpoint}`)
  })
  globalThis.fetch = apiFetch
  return apiFetch
}

function jsonResponse(body, status = 200) {
  return {
    ok: status < 400,
    status,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => body,
  }
}
