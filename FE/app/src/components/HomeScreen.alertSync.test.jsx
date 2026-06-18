import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { HomeScreen } from './HomeScreen'

const API_BASE_URL = 'http://localhost:8080'

const session = {
  account: {
    name: '소희',
  },
  userProfile: {
    accessibilityType: 'VISUAL',
  },
}

const homeSummary = {
  user: {
    name: '소희',
  },
  safetyStatus: {
    level: 'DANGER',
    message: '전기레인지 확인이 필요합니다.',
    lastCheckedAt: '2026-06-10T14:30:00+09:00',
  },
  recentAlerts: [
    {
      alertId: 201,
      type: 'DANGER',
      severity: 'HIGH',
      title: '전기레인지 과열 주의',
      message: '주방에서 위험 신호가 감지되었습니다.',
      deviceName: '전기레인지',
      occurredAt: '2026-06-10T14:20:00+09:00',
      status: 'UNREAD',
    },
  ],
  deviceSummary: {
    totalCount: 2,
    connectedCount: 2,
    warningCount: 1,
    uwbSupportedCount: 1,
  },
  emergency: {
    enabled: true,
    primaryGuardianName: '보호자',
  },
  quickActions: {
    canRequestEmergency: true,
  },
}

const previewAlerts = [
  {
    alertId: 201,
    type: 'DANGER',
    severity: 'HIGH',
    title: '전기레인지 과열 주의',
    message: '주방에서 위험 신호가 감지되었습니다.',
    deviceName: '전기레인지',
    occurredAt: '2026-06-10T14:20:00+09:00',
    status: 'UNREAD',
    recommendedAction: '전원을 끄고 주변을 확인해 주세요.',
  },
]

describe('HomeScreen alert summary sync', () => {
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

  it('removes confirmed alerts from the home real-time summary', async () => {
    const user = userEvent.setup()
    render(<HomeScreen session={session} onLogout={() => {}} />)

    await screen.findByRole('heading', { name: '소희 홈' })
    expect(screen.getByText('전기레인지 과열 주의')).toBeTruthy()
    expect(screen.getByText('최근 알림 1건')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '알림' }))
    await user.click(screen.getByRole('button', { name: '전기레인지 과열 주의 확인 완료' }))

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain('알림을 확인 완료로 처리했습니다.')
    })

    await user.click(screen.getByRole('button', { name: '홈' }))

    const homeContent = within(screen.getByText('실시간 알림 요약').closest('section'))
    expect(homeContent.queryByText('전기레인지 과열 주의')).toBeNull()
    expect(homeContent.getByText('최근 알림이 없습니다.')).toBeTruthy()
    expect(screen.getByText('최근 알림 0건')).toBeTruthy()
  })
})

async function mockFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input.url
  const method = (init.method || 'GET').toUpperCase()

  if (url === `${API_BASE_URL}/api/app/home` && method === 'GET') {
    return jsonResponse(homeSummary)
  }

  if (url === `${API_BASE_URL}/api/alerts?limit=20` && method === 'GET') {
    return jsonResponse({ items: previewAlerts })
  }

  if (url === `${API_BASE_URL}/api/devices` && method === 'GET') {
    return jsonResponse({ items: [] })
  }

  if (url === `${API_BASE_URL}/api/guardians` && method === 'GET') {
    return jsonResponse({ items: [] })
  }

  if (url === `${API_BASE_URL}/api/alerts/201/confirm` && method === 'POST') {
    return jsonResponse({ ...previewAlerts[0], status: 'CONFIRMED' })
  }

  return jsonResponse({ message: 'not found' }, { status: 404 })
}

function jsonResponse(body, { status = 200 } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
