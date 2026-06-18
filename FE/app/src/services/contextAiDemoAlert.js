const DEMO_MODE_STORAGE_KEY = 'lg-able-band.context-ai-demo'
const DEMO_ALERT_ID = 990001
const demoModes = ['safe', 'caution', 'danger', 'emergency']

const demoAlerts = {
  safe: {
    type: 'LIFE',
    severity: 'LOW',
    title: 'Context AI demo safe',
    message: 'Demo washer completion event for checking the safe home status.',
    deviceName: 'LG 세탁기',
    deviceType: 'WASHER',
    eventType: 'COMPLETE',
    locationName: '세탁실',
    recommendedAction: 'Check the completed laundry when convenient.',
    requiresGuardianNotify: false,
  },
  caution: {
    type: 'DANGER',
    severity: 'MEDIUM',
    title: 'Context AI demo caution',
    message: 'Demo air quality event for checking the caution home status.',
    deviceName: 'LG 공기질 센서',
    deviceType: 'AIR_SENSOR',
    eventType: 'AIR_QUALITY_BAD',
    locationName: '거실',
    recommendedAction: 'Check indoor air quality and ventilate the room.',
    requiresGuardianNotify: false,
  },
  danger: {
    type: 'DANGER',
    severity: 'HIGH',
    title: 'Context AI demo danger',
    message: 'Demo long electric range use event for checking the danger home status.',
    deviceName: 'LG 전기레인지',
    deviceType: 'RANGE',
    eventType: 'LONG_ON',
    locationName: '주방',
    recommendedAction: 'Check the electric range and move away from the heat source.',
    requiresGuardianNotify: true,
  },
  emergency: {
    type: 'EMERGENCY',
    severity: 'CRITICAL',
    title: 'Context AI demo emergency',
    message: 'Demo emergency popup event for checking the emergency home status.',
    deviceName: 'LG TV',
    deviceType: 'TV',
    eventType: 'EMERGENCY_POPUP',
    locationName: '거실',
    recommendedAction: 'Check the emergency state and contact a guardian if needed.',
    requiresGuardianNotify: true,
  },
}

export function applyContextAiDemoAlert(alerts = []) {
  const mode = contextAiDemoMode()
  if (!mode) {
    return alerts
  }
  const demoAlert = demoAlerts[mode]

  return [
    {
      ...demoAlert,
      alertId: DEMO_ALERT_ID,
      voiceGuide: demoAlert.message,
      device: {
        name: demoAlert.deviceName,
        type: demoAlert.deviceType,
      },
      occurredAt: new Date().toISOString(),
      status: 'UNREAD',
    },
    ...alerts.filter((alert) => alert.alertId !== DEMO_ALERT_ID),
  ]
}

export function isContextAiDemoEmergencyEnabled() {
  return contextAiDemoMode() === 'emergency'
}

export function contextAiDemoMode() {
  const modeFromQuery = readDemoModeFromQuery()
  if (demoModes.includes(modeFromQuery)) {
    saveDemoMode(modeFromQuery)
    return modeFromQuery
  }

  if (modeFromQuery === 'off') {
    clearDemoMode()
    return ''
  }

  const savedMode = readSavedDemoMode()
  return demoModes.includes(savedMode) ? savedMode : ''
}

function readDemoModeFromQuery() {
  if (typeof window === 'undefined') {
    return ''
  }

  const value = new URLSearchParams(window.location.search).get('contextAiDemo')
  if (demoModes.includes(value) || value === 'off') {
    return value
  }

  return ''
}

function readSavedDemoMode() {
  try {
    return window.localStorage?.getItem(DEMO_MODE_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function saveDemoMode(mode) {
  try {
    window.localStorage?.setItem(DEMO_MODE_STORAGE_KEY, mode)
  } catch {
    // Demo mode is optional, so storage failures should not affect the app.
  }
}

function clearDemoMode() {
  try {
    window.localStorage?.removeItem(DEMO_MODE_STORAGE_KEY)
  } catch {
    // Demo mode is optional, so storage failures should not affect the app.
  }
}
