import {
  confirmAlert,
  createPairingPayload,
  getCurrentAlert,
  getPairingSession,
  getUwbSession,
  normalizeUwbSession,
  replayAlert,
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

  it('selects the highest priority current alert', async () => {
    const alert = await getCurrentAlert()

    expect(alert.alertId).toBe(301)
    expect(alert.severity).toBe('CRITICAL')
    expect(alert.type).toBe('EMERGENCY')
  })

  it('confirms and replays an alert without mutating the fixture', async () => {
    const confirmed = await confirmAlert(301)
    const replayed = await replayAlert(301)
    const current = await getCurrentAlert()

    expect(confirmed.status).toBe('CONFIRMED')
    expect(replayed.status).toBe('REPLAYED')
    expect(replayed.voiceGuide).toContain('가스 위험')
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
})
