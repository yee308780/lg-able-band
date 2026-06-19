import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  startChatbotWakeService,
  stopChatbotWakeService,
  subscribeChatbotWake,
} from './chatbotWakeService'

const originalSpeechRecognition = window.SpeechRecognition
const originalWebkitSpeechRecognition = window.webkitSpeechRecognition
const originalPermissions = window.navigator.permissions

describe('chatbotWakeService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-19T00:00:00.000Z'))
    vi.clearAllMocks()
    MockSpeechRecognition.instances = []
    window.SpeechRecognition = MockSpeechRecognition
    window.webkitSpeechRecognition = undefined
  })

  afterEach(() => {
    stopChatbotWakeService()
    vi.clearAllTimers()
    vi.useRealTimers()
    window.SpeechRecognition = originalSpeechRecognition
    window.webkitSpeechRecognition = originalWebkitSpeechRecognition
    Object.defineProperty(window.navigator, 'permissions', {
      configurable: true,
      value: originalPermissions,
    })
  })

  it('restarts after a normal recognition end without a tight loop', () => {
    expect(startChatbotWakeService()).toBe(true)
    const firstRecognition = MockSpeechRecognition.instances[0]
    firstRecognition.emitStart()

    vi.advanceTimersByTime(2000)
    firstRecognition.emitEnd()

    expect(MockSpeechRecognition.instances).toHaveLength(1)
    vi.advanceTimersByTime(699)
    expect(MockSpeechRecognition.instances).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(MockSpeechRecognition.instances).toHaveLength(2)
  })

  it('backs off when the browser ends immediately', () => {
    expect(startChatbotWakeService()).toBe(true)
    const firstRecognition = MockSpeechRecognition.instances[0]
    firstRecognition.emitStart()

    vi.advanceTimersByTime(300)
    firstRecognition.emitEnd()

    vi.advanceTimersByTime(1499)
    expect(MockSpeechRecognition.instances).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(MockSpeechRecognition.instances).toHaveLength(2)
  })

  it('does not restart from late end or abort events after an intentional stop', () => {
    expect(startChatbotWakeService()).toBe(true)
    const firstRecognition = MockSpeechRecognition.instances[0]
    firstRecognition.emitStart()

    stopChatbotWakeService()
    firstRecognition.emitError('aborted')
    firstRecognition.emitEnd()

    vi.advanceTimersByTime(10000)
    expect(MockSpeechRecognition.instances).toHaveLength(1)
  })

  it('dispatches a wake event and does not restart after the wake phrase is recognized', () => {
    const onWake = vi.fn()
    const unsubscribe = subscribeChatbotWake(onWake)

    expect(startChatbotWakeService()).toBe(true)
    const firstRecognition = MockSpeechRecognition.instances[0]
    firstRecognition.emitStart()
    firstRecognition.emitResult('챗봇 켜줘')

    vi.advanceTimersByTime(80)
    expect(onWake).toHaveBeenCalledWith(expect.objectContaining({
      transcript: expect.stringContaining('챗봇 켜줘'),
    }))

    firstRecognition.emitEnd()
    vi.advanceTimersByTime(10000)
    expect(MockSpeechRecognition.instances).toHaveLength(1)
    unsubscribe()
  })

  it('uses the blocked restart delay when recognition never starts', () => {
    expect(startChatbotWakeService()).toBe(true)
    const firstRecognition = MockSpeechRecognition.instances[0]

    vi.advanceTimersByTime(2500)
    expect(firstRecognition.abort).toHaveBeenCalledTimes(1)

    firstRecognition.emitEnd()
    vi.advanceTimersByTime(2999)
    expect(MockSpeechRecognition.instances).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(MockSpeechRecognition.instances).toHaveLength(2)
  })

  it('stops permanently when microphone permission is denied', async () => {
    Object.defineProperty(window.navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn(() => Promise.resolve({ state: 'denied' })),
      },
    })

    expect(startChatbotWakeService()).toBe(true)
    const firstRecognition = MockSpeechRecognition.instances[0]
    firstRecognition.emitStart()
    firstRecognition.emitError('not-allowed')
    await Promise.resolve()

    vi.advanceTimersByTime(10000)
    expect(MockSpeechRecognition.instances).toHaveLength(1)
  })
})

class MockSpeechRecognition {
  static instances = []

  constructor() {
    this.start = vi.fn()
    this.abort = vi.fn()
    this.stop = vi.fn()
    MockSpeechRecognition.instances.push(this)
  }

  emitStart() {
    this.onstart?.()
  }

  emitEnd() {
    this.onend?.()
  }

  emitError(error) {
    this.onerror?.({ error })
  }

  emitResult(transcript) {
    const result = {
      0: { transcript },
      length: 1,
      isFinal: true,
    }
    this.onresult?.({
      results: [result],
    })
  }
}
