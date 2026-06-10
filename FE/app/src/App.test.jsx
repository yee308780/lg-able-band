import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { mockHomeSummary } from './mocks/homeMock'

const API_BASE_URL = 'http://localhost:8080'
const REQUEST_DELAY_MS = 30

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    installMockBackend()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('renders login screen by default', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /able band/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /로그인/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /회원가입/i })).toBeTruthy()
  })

  it('opens signup and returns to login', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /회원가입/i }))
    expect(screen.getByRole('heading', { name: /회원가입/i })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /로그인.*돌아가기/i }))
    expect(screen.getByRole('heading', { name: /able band/i })).toBeTruthy()
  })

  it('logs in as a USER and opens the home screen', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/이메일/i), 'user@example.com')
    await user.type(screen.getByLabelText(/비밀번호/i), 'password1234')
    await user.click(screen.getByRole('button', { name: /^로그인$/i }))

    expect(await screen.findByRole('button', { name: '로그아웃' })).toBeTruthy()
    expect(window.localStorage.getItem('lg-able-band.accessToken')).toBe('api-user-token')
  })

  it('lets a USER preview alerts, devices, menu, and living signal settings after login', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText(/이메일/i), 'user@example.com')
    await user.type(screen.getByLabelText(/비밀번호/i), 'password1234')
    await user.click(screen.getByRole('button', { name: /^로그인$/i }))

    await screen.findByRole('button', { name: '로그아웃' })

    await user.click(screen.getByRole('button', { name: '알림' }))
    expect(screen.getByRole('heading', { name: '실시간 알림' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '기기' }))
    expect(screen.getByRole('heading', { name: '기기와 UWB' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '우리 집 MVP 가전을 연결해요.' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '가전 추가하기' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '가전 추가하기' }))
    expect(screen.getByRole('button', { name: '세탁기 추가하기' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'TV 추가하기' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '세탁기 추가하기' }))
    expect(screen.getByRole('heading', { name: '세탁기 연결' })).toBeTruthy()
    expect(screen.getByDisplayValue('thinq-washer-001')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '가전 연결 완료' }))
    expect(await screen.findByRole('button', { name: '세탁기 관리 열기' })).toBeTruthy()
    expect(screen.getByText('세탁기 관리')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('세탁기를 연결했어요.')

    await user.click(screen.getByRole('button', { name: '주변 제품 찾기' }))
    expect(screen.getByRole('status').textContent).toContain('연결 가능한 MVP 가전 6종')

    await user.click(screen.getByRole('button', { name: '메뉴' }))
    expect(screen.getByRole('heading', { name: '메뉴' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /생활 신호 설정/i })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /생활 신호 설정/i }))
    expect(screen.getByRole('heading', { level: 2, name: '생활 신호 설정' })).toBeTruthy()
  })

  it('routes GUARDIAN login to guardian placeholder', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('radio', { name: /보호자/i }))
    await user.type(screen.getByLabelText(/이메일/i), 'guardian@example.com')
    await user.type(screen.getByLabelText(/비밀번호/i), 'password1234')
    await user.click(screen.getByRole('button', { name: /^로그인$/i }))

    expect(await screen.findByRole('heading', { name: '보호자 화면 준비 중' })).toBeTruthy()
  })
})

function installMockBackend() {
  const deviceItems = []
  const alertItems = [
    {
      alertId: 201,
      type: 'DANGER',
      severity: 'HIGH',
      title: '가스 위험 감지',
      message: '가스 위험이 감지되었습니다. 즉시 확인하세요.',
      voiceGuide: '가스 위험이 감지되었습니다. 즉시 확인하세요.',
      deviceName: '가스 센서',
      device: {
        deviceId: 20,
        name: '가스 센서',
        type: 'AIR_SENSOR',
      },
      locationName: '주방',
      occurredAt: '2026-06-10T18:30:00+09:00',
      status: 'UNREAD',
      recommendedAction: '창문을 열고 안전한 곳으로 이동하세요.',
      requiresGuardianNotify: true,
    },
    {
      alertId: 202,
      type: 'LIFE',
      severity: 'LOW',
      title: '세탁 완료',
      message: '세탁이 완료되었습니다. 건조기로 옮겨주세요.',
      voiceGuide: '세탁이 완료되었습니다. 건조기로 옮겨주세요.',
      deviceName: '세탁기',
      device: {
        deviceId: 10,
        name: '세탁기',
        type: 'WASHER',
      },
      locationName: '세탁실',
      occurredAt: '2026-06-10T18:20:00+09:00',
      status: 'UNREAD',
      recommendedAction: '세탁물을 꺼내 주세요.',
      requiresGuardianNotify: false,
    },
  ]
  let nextAccountId = 3
  let nextDeviceId = 100

  const accounts = new Map([
    [
      accountMapKey('USER', 'user@example.com'),
      {
        role: 'USER',
        email: 'user@example.com',
        password: 'password1234',
        accountId: 1,
        name: '홍길동',
        userId: 1,
        accessibilityType: 'VISUAL',
        accessToken: 'api-user-token',
      },
    ],
    [
      accountMapKey('GUARDIAN', 'guardian@example.com'),
      {
        role: 'GUARDIAN',
        email: 'guardian@example.com',
        password: 'password1234',
        accountId: 2,
        name: '보호자',
        guardianId: 1,
        linkedUserId: 1,
        relationship: 'FAMILY',
        accessToken: 'api-guardian-token',
      },
    ],
  ])

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init = {}) => {
    await delay(REQUEST_DELAY_MS)

    const url = typeof input === 'string' ? input : input.url
    const method = (init.method || 'GET').toUpperCase()
    const body = init.body ? JSON.parse(init.body) : {}
    const authorization = new Headers(init.headers).get('Authorization')

    if (url === `${API_BASE_URL}/api/auth/signup` && method === 'POST') {
      const accountKey = accountMapKey(body.role, body.email)
      if (accounts.has(accountKey)) {
        return jsonResponse(
          { code: 'DUPLICATE_EMAIL', message: '이미 가입한 이메일입니다.', details: {} },
          { status: 409 },
        )
      }

      const accountId = nextAccountId
      nextAccountId += 1
      const account = {
        ...body,
        accountId,
        userId: body.role === 'USER' ? accountId : null,
        guardianId: body.role === 'GUARDIAN' ? accountId : null,
        accessToken: `api-${body.role.toLowerCase()}-token-${accountId}`,
      }
      accounts.set(accountKey, account)

      return jsonResponse(
        {
          accountId: account.accountId,
          role: account.role,
          userId: account.userId,
          name: account.name,
          email: account.email,
          accessibilityType: account.accessibilityType,
        },
        { status: 201 },
      )
    }

    if (url === `${API_BASE_URL}/api/auth/login` && method === 'POST') {
      const account = accounts.get(accountMapKey(body.role, body.email))
      if (!account || account.password !== body.password) {
        return jsonResponse(
          { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.', details: {} },
          { status: 401 },
        )
      }

      return jsonResponse(createLoginResponse(account))
    }

    if (url === `${API_BASE_URL}/api/app/home` && method === 'GET') {
      if (!isKnownUserToken(authorization)) {
        return jsonResponse(
          { code: 'UNAUTHORIZED', message: 'Authorization 헤더가 필요합니다.', details: {} },
          { status: 401 },
        )
      }

      return jsonResponse(mockHomeSummary)
    }

    if (url === `${API_BASE_URL}/api/devices` && method === 'GET') {
      if (!isKnownUserToken(authorization)) {
        return jsonResponse(
          { code: 'UNAUTHORIZED', message: 'Authorization 헤더가 필요합니다.', details: {} },
          { status: 401 },
        )
      }

      return jsonResponse({ items: deviceItems })
    }

    if (url === `${API_BASE_URL}/api/devices` && method === 'POST') {
      if (!isKnownUserToken(authorization)) {
        return jsonResponse(
          { code: 'UNAUTHORIZED', message: 'Authorization 헤더가 필요합니다.', details: {} },
          { status: 401 },
        )
      }

      const device = {
        deviceId: nextDeviceId,
        name: body.name,
        type: body.type,
        connectionStatus: 'CONNECTED',
        locationSupported: body.locationSupported,
        lastEventAt: '2026-06-10T18:30:00+09:00',
        vendor: body.vendor,
        vendorDeviceId: body.vendorDeviceId,
        remoteEnabled: body.remoteEnabled,
      }
      nextDeviceId += 1
      deviceItems.unshift(device)
      return jsonResponse(device, { status: 201 })
    }

    if (url === `${API_BASE_URL}/api/alerts?limit=20` && method === 'GET') {
      if (!isKnownUserToken(authorization)) {
        return jsonResponse(
          { code: 'UNAUTHORIZED', message: 'Authorization 헤더가 필요합니다.', details: {} },
          { status: 401 },
        )
      }

      return jsonResponse({ items: alertItems })
    }

    if (url.match(new RegExp(`${API_BASE_URL}/api/alerts/\\d+/confirm$`)) && method === 'POST') {
      if (!isKnownUserToken(authorization)) {
        return jsonResponse(
          { code: 'UNAUTHORIZED', message: 'Authorization 헤더가 필요합니다.', details: {} },
          { status: 401 },
        )
      }

      const alertId = Number(url.match(/\/api\/alerts\/(\d+)\/confirm$/)?.[1])
      const target = alertItems.find((item) => item.alertId === alertId)
      if (!target) {
        return jsonResponse(
          { code: 'NOT_FOUND', message: '알림을 찾을 수 없습니다.', details: {} },
          { status: 404 },
        )
      }

      target.status = 'CONFIRMED'
      return jsonResponse({
        alertId,
        status: 'CONFIRMED',
        confirmedAt: '2026-06-10T18:31:00+09:00',
      })
    }

    if (url.match(new RegExp(`${API_BASE_URL}/api/alerts/\\d+/replay$`)) && method === 'POST') {
      if (!isKnownUserToken(authorization)) {
        return jsonResponse(
          { code: 'UNAUTHORIZED', message: 'Authorization 헤더가 필요합니다.', details: {} },
          { status: 401 },
        )
      }

      const alertId = Number(url.match(/\/api\/alerts\/(\d+)\/replay$/)?.[1])
      const target = alertItems.find((item) => item.alertId === alertId)
      if (!target) {
        return jsonResponse(
          { code: 'NOT_FOUND', message: '알림을 찾을 수 없습니다.', details: {} },
          { status: 404 },
        )
      }

      target.status = 'REPLAYED'
      return jsonResponse({
        alertId,
        status: 'REPLAYED',
        voiceGuide: target.voiceGuide,
        replayedAt: '2026-06-10T18:32:00+09:00',
      })
    }

    return jsonResponse(
      { code: 'NOT_FOUND', message: `테스트 mock API에 없는 경로입니다. ${url}`, details: {} },
      { status: 404 },
    )
  })
}

function createLoginResponse(account) {
  const baseResponse = {
    accessToken: account.accessToken,
    role: account.role,
    account: {
      accountId: account.accountId,
      name: account.name,
      email: account.email,
    },
  }

  if (account.role === 'GUARDIAN') {
    return {
      ...baseResponse,
      guardianProfile: {
        guardianId: account.guardianId,
        linkedUserId: account.linkedUserId || null,
        relationship: account.relationship,
      },
    }
  }

  return {
    ...baseResponse,
    userProfile: {
      userId: account.userId,
      name: account.name,
      accessibilityType: account.accessibilityType,
    },
  }
}

function isKnownUserToken(authorization) {
  return authorization === 'Bearer api-user-token' || authorization?.startsWith('Bearer api-user-token-')
}

function accountMapKey(role, email) {
  return `${role}:${email}`
}

function jsonResponse(body, { status = 200 } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
