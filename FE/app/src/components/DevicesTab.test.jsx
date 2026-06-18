import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { vi } from 'vitest'
import { DevicesTab } from './DevicesTab'

const API_BASE_URL = 'http://localhost:8080'

describe('DevicesTab', () => {
  beforeEach(() => {
    window.localStorage.setItem('lg-able-band.accessToken', 'api-user-token')
    window.scrollTo = vi.fn()
    window.HTMLElement.prototype.scrollTo = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockImplementation(mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('adds a user-entered location under vendorDeviceId when creating a device', async () => {
    const user = userEvent.setup()

    render(<DevicesTab devices={[]} uwb={{}} />)

    await user.click(screen.getByRole('button', { name: '추가' }))
    await user.click(screen.getByRole('button', { name: 'TV 추가하기' }))

    const nameInput = screen.getByLabelText('가전 이름')
    const vendorDeviceIdInput = screen.getByLabelText('vendorDeviceId')
    const locationInput = screen.getByLabelText('가전 위치')
    const textInputs = screen.getAllByRole('textbox')

    expect(textInputs[0]).toBe(nameInput)
    expect(textInputs[1]).toBe(vendorDeviceIdInput)
    expect(textInputs[2]).toBe(locationInput)

    await user.type(locationInput, '침실')
    await user.click(screen.getByRole('button', { name: '가전 연결 완료' }))

    await waitFor(() => {
      expect(findCreateDeviceCall()).toBeTruthy()
    })
    expect(JSON.parse(findCreateDeviceCall()[1].body)).toEqual(
      expect.objectContaining({
        name: 'TV',
        vendorDeviceId: 'thinq-tv-001',
        type: 'TV',
        room: '침실',
      }),
    )
    expect(screen.getAllByText('침실').length).toBeGreaterThanOrEqual(1)
  })

  it('updates the selected device location from the management card', async () => {
    const user = userEvent.setup()
    const devices = [
      {
        deviceId: 2,
        name: 'TV',
        vendorDeviceId: 'thinq-tv-001',
        type: 'TV',
        room: '거실',
        connectionStatus: 'CONNECTED',
      },
    ]

    render(<DevicesTab devices={devices} uwb={{}} />)

    expect(screen.getByText('가전 위치')).toBeTruthy()
    expect(screen.getAllByText('거실').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByLabelText('가전 위치 수정')).toBeNull()

    await user.click(screen.getByRole('button', { name: '가전 위치 수정' }))

    const locationInput = screen.getByLabelText('가전 위치 수정')
    await user.clear(locationInput)
    await user.type(locationInput, '안방')
    await user.click(screen.getByRole('button', { name: '위치 저장' }))

    await waitFor(() => {
      expect(findUpdateDeviceCall()).toBeTruthy()
    })
    expect(JSON.parse(findUpdateDeviceCall()[1].body)).toEqual({ room: '안방' })
    expect(screen.getAllByText('안방').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('status').textContent).toContain('TV 위치를 안방으로 저장했습니다.')
  })

  it('deletes the selected device after a second confirmation click', async () => {
    const user = userEvent.setup()
    const devices = [
      {
        deviceId: 2,
        name: 'TV',
        vendorDeviceId: 'thinq-tv-001',
        type: 'TV',
        room: '거실',
        connectionStatus: 'CONNECTED',
      },
      {
        deviceId: 1,
        name: '세탁기',
        vendorDeviceId: 'thinq-washer-001',
        type: 'WASHER',
        room: '세탁실',
        connectionStatus: 'CONNECTED',
      },
    ]

    render(<DevicesTab devices={devices} uwb={{}} />)

    await user.click(screen.getByRole('button', { name: 'TV 삭제' }))
    expect(screen.getByRole('status').textContent).toContain(
      'TV 삭제를 한 번 더 눌러 확인해 주세요.',
    )

    await user.click(screen.getByRole('button', { name: 'TV 삭제 확인' }))

    await waitFor(() => {
      expect(findDeleteDeviceCall()).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: 'TV 관리 열기' })).toBeNull()
    expect(screen.getByRole('button', { name: '세탁기 관리 열기' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('TV 연결을 해제했습니다.')
  })

  it('keeps a deleted device removed after the tab remounts', async () => {
    const user = userEvent.setup()

    render(<DevicePersistenceHarness />)

    await user.click(screen.getByRole('button', { name: 'TV 삭제' }))
    await user.click(screen.getByRole('button', { name: 'TV 삭제 확인' }))

    await waitFor(() => {
      expect(findDeleteDeviceCall()).toBeTruthy()
    })

    await user.click(screen.getByRole('button', { name: '기기 탭 숨기기' }))
    await user.click(screen.getByRole('button', { name: '기기 탭 다시 열기' }))

    expect(screen.queryByRole('button', { name: 'TV 관리 열기' })).toBeNull()
    expect(screen.getByRole('button', { name: '세탁기 관리 열기' })).toBeTruthy()
  })
})

function DevicePersistenceHarness() {
  const [isVisible, setIsVisible] = useState(true)
  const [devices, setDevices] = useState([
    {
      deviceId: 2,
      name: 'TV',
      vendorDeviceId: 'thinq-tv-001',
      type: 'TV',
      room: '거실',
      connectionStatus: 'CONNECTED',
    },
    {
      deviceId: 1,
      name: '세탁기',
      vendorDeviceId: 'thinq-washer-001',
      type: 'WASHER',
      room: '세탁실',
      connectionStatus: 'CONNECTED',
    },
  ])

  return (
    <div>
      <button type="button" onClick={() => setIsVisible((current) => !current)}>
        {isVisible ? '기기 탭 숨기기' : '기기 탭 다시 열기'}
      </button>
      {isVisible ? (
        <DevicesTab devices={devices} onDevicesChange={setDevices} uwb={{}} />
      ) : null}
    </div>
  )
}

async function mockFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input.url
  const method = (init.method || 'GET').toUpperCase()
  const body = init.body ? JSON.parse(init.body) : {}

  if (url === `${API_BASE_URL}/api/devices` && method === 'GET') {
    return jsonResponse({ items: [] })
  }

  if (url === `${API_BASE_URL}/api/devices` && method === 'POST') {
    return jsonResponse(
      {
        deviceId: 22,
        connectionStatus: 'CONNECTED',
        lastEventAt: '2026-06-10T14:20:00+09:00',
        ...body,
      },
      { status: 201 },
    )
  }

  if (url === `${API_BASE_URL}/api/devices/2` && method === 'PATCH') {
    return jsonResponse({
      deviceId: 2,
      name: 'TV',
      vendorDeviceId: 'thinq-tv-001',
      type: 'TV',
      connectionStatus: 'CONNECTED',
      room: body.room,
    })
  }

  if (url === `${API_BASE_URL}/api/devices/2` && method === 'DELETE') {
    return new Response(null, { status: 204 })
  }

  return jsonResponse({ message: 'not found' }, { status: 404 })
}

function findCreateDeviceCall() {
  return globalThis.fetch.mock.calls.find(([url, init = {}]) => {
    return url === `${API_BASE_URL}/api/devices` && init.method === 'POST'
  })
}

function findUpdateDeviceCall() {
  return globalThis.fetch.mock.calls.find(([url, init = {}]) => {
    return url === `${API_BASE_URL}/api/devices/2` && init.method === 'PATCH'
  })
}

function findDeleteDeviceCall() {
  return globalThis.fetch.mock.calls.find(([url, init = {}]) => {
    return url === `${API_BASE_URL}/api/devices/2` && init.method === 'DELETE'
  })
}

function jsonResponse(body, { status = 200 } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
