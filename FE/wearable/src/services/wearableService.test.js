import {
  confirmAlert,
  createPairingPayload,
  createWearableService,
  getCurrentAlert,
  getPairingSession,
  getUwbSession,
  normalizeUwbSession,
  replayAlert,
  requestEmergencyHelp,
} from './wearableService'

describe('wearableService', () => {
  it('creates a stable QR pairing payload for phone linking', async () => {
    const session = await getPairingSession()
    const payload = createPairingPayload(session)

    expect(payload).toContain('pairingSessionId=pairing-able-260610-1440')
    expect(payload).toContain('deviceId=able-band-demo-001')
    expect(payload).toContain('pairingCode=ABLE-4IN-260610')
    expect(payload).toContain('nonce=demo-nonce-4inch-001')
    expect(payload).toContain('expiresAt=2026-06-10T14%3A45%3A00%2B09%3A00')
    expect(session.expiresInMinutes).toBe(5)
  })

  it('creates pairing sessions through the wearable final api', async () => {
    const apiFetch = vi.fn(async () =>
      jsonResponse({
        pairingSessionId: 'pairing-api-001',
        deviceId: 'able-band-api-001',
        pairingCode: 'ABLE-API-001',
        nonce: 'nonce-api-001',
        issuedAt: '2026-06-10T15:00:00+09:00',
        expiresAt: '2026-06-10T15:05:00+09:00',
        expiresInMinutes: 5,
        pairingPayload: 'lg-able-band://pair?pairingSessionId=pairing-api-001&from=backend',
        status: 'WAITING',
      }),
    )
    const service = createWearableService({
      baseUrl: 'http://api.test',
      fetchImpl: apiFetch,
      fallbackEnabled: false,
    })

    const session = await service.createPairingSession()

    expect(apiFetch).toHaveBeenCalledWith(
      'http://api.test/api/wearable/pairing-sessions',
      expect.objectContaining({
        body: JSON.stringify({
          deviceId: 'able-band-demo-001',
          deviceName: 'LG Able Band',
          pairingCode: 'ABLE-4IN-260610',
        }),
        method: 'POST',
      }),
    )
    expect(session).toMatchObject({
      pairingSessionId: 'pairing-api-001',
      deviceId: 'able-band-api-001',
      pairingPayload: 'lg-able-band://pair?pairingSessionId=pairing-api-001&from=backend',
      status: 'waiting',
    })
  })

  it('polls pairing session status with device id and nonce', async () => {
    const apiFetch = vi.fn(async () =>
      jsonResponse({
        pairingSessionId: 'pairing-api-001',
        deviceId: 'able-band-api-001',
        nonce: 'nonce-api-001',
        status: 'PAIRED',
        accessToken: 'paired-api-token',
      }),
    )
    const service = createWearableService({
      baseUrl: 'http://api.test',
      fetchImpl: apiFetch,
      fallbackEnabled: false,
    })

    const status = await service.getPairingSessionStatus({
      pairingSessionId: 'pairing-api-001',
      deviceId: 'able-band-api-001',
      nonce: 'nonce-api-001',
    })

    expect(apiFetch).toHaveBeenCalledWith(
      'http://api.test/api/wearable/pairing-sessions/pairing-api-001?deviceId=able-band-api-001&nonce=nonce-api-001',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(status).toMatchObject({
      pairingSessionId: 'pairing-api-001',
      status: 'success',
      accessToken: 'paired-api-token',
    })
  })

  it('falls back to a mock pairing session when the api is unavailable', async () => {
    const service = createWearableService({
      baseUrl: 'http://api.test',
      fetchImpl: vi.fn(async () => {
        throw new Error('network down')
      }),
      fallbackEnabled: true,
    })

    const session = await service.createPairingSession()

    expect(session.pairingSessionId).toBe('pairing-able-260610-1440')
    expect(session.pairingPayload).toContain('lg-able-band://pair')
    expect(session.status).toBe('waiting')
  })

  it('selects the highest priority current alert', async () => {
    const alert = await getCurrentAlert()

    expect(alert.alertId).toBe(201)
    expect(alert.severity).toBe('HIGH')
    expect(alert.type).toBe('DANGER')
  })

  it('confirms and replays an alert without mutating the fixture', async () => {
    const confirmed = await confirmAlert(201)
    const replayed = await replayAlert(201)
    const current = await getCurrentAlert()

    expect(confirmed.status).toBe('CONFIRMED')
    expect(replayed.status).toBe('REPLAYED')
    expect(replayed.voiceGuide).toContain('전기레인지 과열 주의')
    expect(current.status).toBe('UNREAD')
  })

  it('normalizes UWB final API and mock session shapes', async () => {
    const finalApiShape = normalizeUwbSession({
      sessionId: 9002,
      targetDevice: { deviceId: 10, name: '세탁기' },
      status: 'ARRIVED',
      distanceM: 0,
      confidence: 0.94,
      voiceGuide: '세탁기 앞입니다.',
      vibrationPattern: 'LONG_TWICE',
    })
    const mockShape = await getUwbSession(9001)
    const arrivedMockShape = await getUwbSession(9002)

    expect(finalApiShape.targetDeviceName).toBe('세탁기')
    expect(finalApiShape.navigationStatus).toBe('ARRIVED')
    expect(mockShape.targetDeviceName).toBe('세탁기')
    expect(mockShape.navigationStatus).toBe('ACTIVE')
    expect(arrivedMockShape.navigationStatus).toBe('ARRIVED')
    expect(arrivedMockShape.vibrationPattern).toBe('LONG_TWICE')
  })

  it('fetches current alert from final api shape', async () => {
    const apiFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({
        items: [
          {
            alertId: 777,
            type: 'DANGER',
            severity: 'HIGH',
            title: '화재 위험',
            message: '주방 온도가 높습니다.',
            deviceName: '온도 센서',
            occurredAt: '2026-06-10T15:00:00+09:00',
            status: 'UNREAD',
          },
        ],
      }),
    }))
    const service = createWearableService({
      baseUrl: 'http://api.test',
      fetchImpl: apiFetch,
      fallbackEnabled: false,
    })

    const alert = await service.getCurrentAlert()

    expect(apiFetch).toHaveBeenCalledWith(
      'http://api.test/api/alerts?limit=20',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(alert.alertId).toBe(777)
    expect(alert.voiceGuide).toContain('주방 온도가 높습니다.')
  })

  it('falls back to mock when wearable api is unavailable', async () => {
    const service = createWearableService({
      baseUrl: 'http://api.test',
      fetchImpl: vi.fn(async () => {
        throw new Error('network down')
      }),
      fallbackEnabled: true,
    })

    const alert = await service.getCurrentAlert()

    expect(alert.alertId).toBe(201)
  })

  it('sends final api confirm request body', async () => {
    const apiFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({
        alertId: 301,
        status: 'CONFIRMED',
        confirmedAt: '2026-06-10T14:43:00+09:00',
      }),
    }))
    const service = createWearableService({
      baseUrl: 'http://api.test',
      fetchImpl: apiFetch,
      fallbackEnabled: false,
    })

    const confirmed = await service.confirmAlert(301)

    expect(apiFetch).toHaveBeenCalledWith(
      'http://api.test/api/alerts/301/confirm',
      expect.objectContaining({
        body: JSON.stringify({ responseType: 'CONFIRMED' }),
        method: 'POST',
      }),
    )
    expect(confirmed.status).toBe('CONFIRMED')
  })

  it('surfaces emergency api business errors instead of fallback success', async () => {
    const service = createWearableService({
      baseUrl: 'http://api.test',
      fetchImpl: vi.fn(async () => ({
        ok: false,
        status: 409,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ code: 'NO_GUARDIAN' }),
      })),
      fallbackEnabled: true,
    })

    await expect(service.requestEmergencyHelp('도움이 필요합니다.')).rejects.toMatchObject({
      code: 'NO_GUARDIAN',
    })
  })

  it('requests emergency help from the wearable', async () => {
    const response = await requestEmergencyHelp('도움이 필요합니다.')

    expect(response.status).toBe('SENT')
    expect(response.source).toBe('WEARABLE')
    expect(response.message).toContain('긴급 요청')
  })
})

function jsonResponse(body, status = 200) {
  return {
    ok: status < 400,
    status,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => body,
  }
}
