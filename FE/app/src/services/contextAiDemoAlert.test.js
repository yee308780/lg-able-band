import { afterEach, describe, expect, it } from 'vitest'
import {
  applyContextAiDemoAlert,
  contextAiDemoMode,
  isContextAiDemoEmergencyEnabled,
} from './contextAiDemoAlert'

describe('context AI demo alert', () => {
  afterEach(() => {
    window.localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('keeps alerts unchanged when demo mode is off', () => {
    const alerts = [{ alertId: 1, title: 'Real alert' }]

    expect(applyContextAiDemoAlert(alerts)).toBe(alerts)
  })

  it('adds a removable emergency demo alert when enabled by query string', () => {
    window.history.replaceState({}, '', '/?contextAiDemo=emergency')

    const alerts = applyContextAiDemoAlert([{ alertId: 1, title: 'Real alert' }])

    expect(alerts[0]).toMatchObject({
      alertId: 990001,
      type: 'EMERGENCY',
      severity: 'CRITICAL',
      eventType: 'EMERGENCY_POPUP',
      status: 'UNREAD',
    })
    expect(window.localStorage.getItem('lg-able-band.context-ai-demo')).toBe('emergency')
  })

  it.each([
    ['safe', 'LIFE', 'LOW', 'COMPLETE'],
    ['caution', 'DANGER', 'MEDIUM', 'AIR_QUALITY_BAD'],
    ['danger', 'DANGER', 'HIGH', 'LONG_ON'],
  ])('adds a %s demo alert when enabled by query string', (mode, type, severity, eventType) => {
    window.history.replaceState({}, '', `/?contextAiDemo=${mode}`)

    const alerts = applyContextAiDemoAlert([{ alertId: 1, title: 'Real alert' }])

    expect(contextAiDemoMode()).toBe(mode)
    expect(alerts[0]).toMatchObject({
      alertId: 990001,
      type,
      severity,
      eventType,
      status: 'UNREAD',
    })
  })

  it('turns demo mode off from query string', () => {
    window.localStorage.setItem('lg-able-band.context-ai-demo', 'emergency')
    window.history.replaceState({}, '', '/?contextAiDemo=off')

    expect(isContextAiDemoEmergencyEnabled()).toBe(false)
    expect(window.localStorage.getItem('lg-able-band.context-ai-demo')).toBeNull()
  })
})
