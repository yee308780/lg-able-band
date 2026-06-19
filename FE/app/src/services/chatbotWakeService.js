import { shouldOpenChatbot } from '../utils/chatbotWake'

export const CHATBOT_WAKE_EVENT = 'able-band:chatbot-wake'

const WAKE_RESTART_DELAY_MS = 100
const WAKE_BLOCKED_RESTART_DELAY_MS = 1500
const WAKE_STUCK_RESTART_MS = 7000
const WAKE_START_GUARD_MS = 2500

let recognition = null
let enabled = false
let starting = false
let listening = false
let restartTimer = null
let pendingWake = false
let preferContinuousRecognition = true
let wakeTranscriptToDispatch = ''
let wakeDispatchTimer = null
let wakeTranscriptBuffer = ''
let wakeMatched = false
let wakeSilenceTimer = null
let wakeStartGuardTimer = null

function getSpeechRecognition() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function dispatchWake(transcript) {
  if (typeof window === 'undefined') {
    return
  }

  window.clearTimeout(wakeDispatchTimer)
  wakeTranscriptToDispatch = ''
  pendingWake = true
  window.dispatchEvent(new CustomEvent(CHATBOT_WAKE_EVENT, {
    detail: {
      transcript,
    },
  }))
}

function scheduleWakeDispatch(transcript, delayMs = 450) {
  if (typeof window === 'undefined') {
    return
  }

  wakeTranscriptToDispatch = transcript
  window.clearTimeout(wakeDispatchTimer)
  wakeDispatchTimer = window.setTimeout(() => {
    dispatchWake(wakeTranscriptToDispatch)
  }, delayMs)
}

function clearWakeStartGuard() {
  if (typeof window === 'undefined') {
    return
  }

  window.clearTimeout(wakeStartGuardTimer)
  wakeStartGuardTimer = null
}

function clearWakeWatchdog() {
  if (typeof window === 'undefined') {
    return
  }

  window.clearTimeout(wakeSilenceTimer)
  wakeSilenceTimer = null
}

function scheduleWakeStart(delayMs = WAKE_RESTART_DELAY_MS) {
  if (typeof window === 'undefined') {
    return
  }

  window.clearTimeout(restartTimer)
  restartTimer = window.setTimeout(() => {
    if (enabled) {
      startChatbotWakeService()
    }
  }, delayMs)
}

function resetWakeSession(currentRecognition = recognition) {
  if (recognition === currentRecognition) {
    recognition = null
  }
  starting = false
  listening = false
}

function getRecognitionAlternatives(result) {
  if (!result?.length) {
    return []
  }

  return Array.from({ length: result.length }, (_, index) => result[index]?.transcript || '')
    .filter(Boolean)
}

function cleanupRecognizedSpeech(text) {
  const trimmedText = String(text || '').replace(/\s+/g, ' ').trim()
  if (!trimmedText) {
    return ''
  }

  const compactText = trimmedText.replace(/\s/g, '')
  for (let size = 2; size <= Math.floor(compactText.length / 2); size += 1) {
    if (compactText.length % size === 0) {
      const unit = compactText.slice(0, size)
      const repeated = unit.repeat(compactText.length / size)
      if (repeated === compactText) {
        return unit
      }
    }
  }

  const words = trimmedText.split(' ')
  const dedupedWords = []
  for (const word of words) {
    if (word && word !== dedupedWords[dedupedWords.length - 1]) {
      dedupedWords.push(word)
    }
  }

  return dedupedWords.join(' ')
}

function scheduleWakeWatchdog(currentRecognition) {
  if (typeof window === 'undefined') {
    return
  }

  clearWakeWatchdog()

  if (!enabled || !currentRecognition || recognition !== currentRecognition) {
    return
  }

  wakeSilenceTimer = window.setTimeout(() => {
    if (!enabled || recognition !== currentRecognition) {
      return
    }

    try {
      currentRecognition.abort?.()
    } catch {
      // Recognition can already be stopped by the browser.
    }

    resetWakeSession(currentRecognition)
    wakeTranscriptBuffer = ''
    wakeMatched = false
    scheduleWakeStart(WAKE_BLOCKED_RESTART_DELAY_MS)
  }, WAKE_STUCK_RESTART_MS)
}

function scheduleWakeStartGuard(currentRecognition) {
  if (typeof window === 'undefined') {
    return
  }

  clearWakeStartGuard()

  wakeStartGuardTimer = window.setTimeout(() => {
    if (!enabled || recognition !== currentRecognition) {
      return
    }

    try {
      currentRecognition.abort?.()
    } catch {
      // Recognition can already be stopped by the browser.
    }

    resetWakeSession(currentRecognition)
    wakeTranscriptBuffer = ''
    wakeMatched = false
    scheduleWakeStart(WAKE_BLOCKED_RESTART_DELAY_MS)
  }, WAKE_START_GUARD_MS)
}

function ensureRecognition() {
  const SpeechRecognition = getSpeechRecognition()
  if (!SpeechRecognition) {
    return null
  }

  if (recognition) {
    return recognition
  }

  const nextRecognition = new SpeechRecognition()
  nextRecognition.lang = 'ko-KR'
  nextRecognition.interimResults = true
  nextRecognition.continuous = preferContinuousRecognition
  nextRecognition.maxAlternatives = 5

  nextRecognition.onstart = () => {
    clearWakeStartGuard()
    starting = false
    listening = true
    wakeMatched = false
    wakeTranscriptBuffer = ''
    scheduleWakeWatchdog(nextRecognition)
  }

  nextRecognition.onresult = (event) => {
    scheduleWakeWatchdog(nextRecognition)
    const heardCandidates = Array.from(event.results)
      .flatMap((result) => getRecognitionAlternatives(result))
      .filter(Boolean)
    const heard = cleanupRecognizedSpeech(heardCandidates.join(' '))
    wakeTranscriptBuffer = `${wakeTranscriptBuffer} ${heard}`.slice(-160)
    const transcript = `${heard} ${wakeTranscriptBuffer}`.trim()

    if (shouldOpenChatbot(transcript)) {
      wakeMatched = true
      enabled = false
      resetWakeSession(nextRecognition)
      clearWakeStartGuard()
      clearWakeWatchdog()
      wakeTranscriptToDispatch = transcript
      nextRecognition.abort?.()
      scheduleWakeDispatch(transcript, 250)
    }
  }

  nextRecognition.onerror = (event) => {
    clearWakeStartGuard()
    clearWakeWatchdog()
    if (recognition !== nextRecognition) {
      return
    }

    resetWakeSession(nextRecognition)

    if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
      return
    }

    if (enabled) {
      scheduleWakeStart(WAKE_BLOCKED_RESTART_DELAY_MS)
    }
  }

  nextRecognition.onend = () => {
    clearWakeStartGuard()
    clearWakeWatchdog()
    const isCurrentSession = recognition === nextRecognition
    if (isCurrentSession) {
      resetWakeSession(nextRecognition)
    }

    if (wakeTranscriptToDispatch) {
      scheduleWakeDispatch(wakeTranscriptToDispatch, 250)
      return
    }

    if (!isCurrentSession) {
      return
    }

    if (wakeMatched) {
      return
    }

    if (enabled) {
      scheduleWakeStart(WAKE_RESTART_DELAY_MS)
    }
  }

  recognition = nextRecognition
  return recognition
}

export function startChatbotWakeService() {
  if (typeof window === 'undefined') {
    return false
  }

  enabled = true

  if (starting || listening) {
    return true
  }

  const nextRecognition = ensureRecognition()
  if (!nextRecognition) {
    return false
  }

  try {
    starting = true
    listening = true
    scheduleWakeStartGuard(nextRecognition)
    nextRecognition.start()
    return true
  } catch {
    clearWakeStartGuard()
    clearWakeWatchdog()
    resetWakeSession(nextRecognition)
    if (preferContinuousRecognition) {
      preferContinuousRecognition = false
    }

    if (enabled) {
      scheduleWakeStart(WAKE_BLOCKED_RESTART_DELAY_MS)
    }
    return false
  }
}

export function stopChatbotWakeService() {
  enabled = false
  starting = false
  listening = false

  if (typeof window !== 'undefined') {
    window.clearTimeout(restartTimer)
    window.clearTimeout(wakeDispatchTimer)
  }
  clearWakeStartGuard()
  clearWakeWatchdog()

  wakeTranscriptToDispatch = ''
  wakeTranscriptBuffer = ''
  wakeMatched = false
  recognition?.abort?.()
  recognition = null
}

export function subscribeChatbotWake(callback) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleWake = (event) => {
    pendingWake = false
    callback(event.detail?.transcript || '')
  }

  window.addEventListener(CHATBOT_WAKE_EVENT, handleWake)

  if (pendingWake) {
    window.setTimeout(() => {
      if (pendingWake) {
        pendingWake = false
        callback('')
      }
    }, 0)
  }

  return () => {
    window.removeEventListener(CHATBOT_WAKE_EVENT, handleWake)
  }
}
