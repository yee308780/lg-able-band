import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startChatbotWakeService, stopChatbotWakeService } from './chatbotWakeService'

const originalSpeechRecognition = window.SpeechRecognition
const originalWebkitSpeechRecognition = window.webkitSpeechRecognition

function installSpeechRecognitionMock({ autoStart = true } = {}) {
  const instances = []

  class MockSpeechRecognition {
    constructor() {
      this.start = vi.fn(() => {
        if (autoStart) {
          this.onstart?.()
        }
      })
      this.abort = vi.fn(() => {
        this.onend?.()
      })
      instances.push(this)
    }
  }

  window.SpeechRecognition = MockSpeechRecognition
  window.webkitSpeechRecognition = undefined

  return instances
}

describe('chatbotWakeService wake lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    stopChatbotWakeService()
    window.SpeechRecognition = originalSpeechRecognition
    window.webkitSpeechRecognition = originalWebkitSpeechRecognition
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('creates a fresh recognizer after a wake session ends', async () => {
    const instances = installSpeechRecognitionMock()

    expect(startChatbotWakeService()).toBe(true)
    expect(instances).toHaveLength(1)
    expect(instances[0].start).toHaveBeenCalledTimes(1)

    instances[0].onend()
    await vi.advanceTimersByTimeAsync(100)

    expect(instances).toHaveLength(2)
    expect(instances[1].start).toHaveBeenCalledTimes(1)
  })

  it('restarts with the blocked delay when start never reaches onstart', async () => {
    const instances = installSpeechRecognitionMock({ autoStart: false })

    expect(startChatbotWakeService()).toBe(true)
    expect(instances).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(2500)
    expect(instances[0].abort).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1499)
    expect(instances).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(instances).toHaveLength(2)
  })

  it('restarts with the blocked delay when no wake input events arrive', async () => {
    const instances = installSpeechRecognitionMock()

    expect(startChatbotWakeService()).toBe(true)
    expect(instances).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(7000)
    expect(instances[0].abort).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1499)
    expect(instances).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(instances).toHaveLength(2)
  })
})
