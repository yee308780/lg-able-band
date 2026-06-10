import { selectPriorityAlert } from '../features/alerts/alertPriority'
import { mockAlerts, mockPairingSession, mockUwbSessions } from '../mocks/wearableMock'

export function getPairingSession() {
  return clone(mockPairingSession)
}

export function createPairingPayload(session) {
  const params = new URLSearchParams({
    pairingSessionId: session.pairingSessionId,
    deviceId: session.deviceId,
    pairingCode: session.pairingCode,
    nonce: session.nonce,
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
    source: 'wearable',
  })

  return `lg-able-band://pair?${params.toString()}`
}

export async function getCurrentAlert() {
  const selectedAlert = selectPriorityAlert(mockAlerts)
  return selectedAlert ? clone(selectedAlert) : null
}

export async function confirmAlert(alertId) {
  findAlert(alertId)

  return {
    alertId,
    status: 'CONFIRMED',
    confirmedAt: '2026-06-10T14:43:00+09:00',
  }
}

export async function replayAlert(alertId) {
  const alert = findAlert(alertId)

  return {
    alertId,
    status: 'REPLAYED',
    voiceGuide: alert.voiceGuide,
    replayedAt: '2026-06-10T14:44:00+09:00',
  }
}

export async function getUwbSession(sessionId) {
  const session = mockUwbSessions.find((item) => item.sessionId === Number(sessionId))
  if (!session) {
    throw new Error('진행 중인 위치 안내가 없습니다.')
  }

  return normalizeUwbSession(session)
}

export async function stopUwbSession(sessionId) {
  const session = await getUwbSession(sessionId)

  return {
    ...session,
    navigationStatus: 'CANCELED',
    vibrationPattern: 'NONE',
    voiceGuide: '탐색 종료',
  }
}

export function normalizeUwbSession(session) {
  return {
    sessionId: session.sessionId,
    targetDeviceName: session.targetDeviceName || session.targetDevice?.name || '대상 기기',
    distanceM: session.distanceM,
    confidence: session.confidence,
    navigationStatus: session.navigationStatus || session.status,
    voiceGuide: session.voiceGuide,
    vibrationPattern: session.vibrationPattern || 'NONE',
    updatedAt: session.updatedAt || '',
  }
}

export function getInitialUwbSessionId(searchParams = new URLSearchParams(window.location.search)) {
  const sessionId = Number(searchParams.get('sessionId'))
  return Number.isFinite(sessionId) && sessionId > 0 ? sessionId : 9001
}

function findAlert(alertId) {
  const alert = mockAlerts.find((item) => item.alertId === Number(alertId))
  if (!alert) {
    throw new Error('알림을 찾을 수 없습니다.')
  }

  return alert
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
