import { shouldOpenChatbot } from '../utils/chatbotWake'

export const CHATBOT_WAKE_EVENT = 'able-band:chatbot-wake'

let recognition = null
let enabled = false
let starting = false
let listening = false
let restartTimer = null
let pendingWake = false
let preferContinuousRecognition = true
let wakeTranscriptToDispatch = ''
let wakeDispatchTimer = null

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

function scheduleWakeStart(delayMs = 300) {
  if (typeof window === 'undefined') {
    return
  }

  window.clearTimeout(restartTimer)
  restartTimer = window.setTimeout(() => {
    startChatbotWakeService()
  }, delayMs)
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
  nextRecognition.maxAlternatives = 1

  nextRecognition.onstart = () => {
    starting = false
    listening = true
  }

  nextRecognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join('')

    if (shouldOpenChatbot(transcript)) {
      enabled = false
      starting = false
      listening = false
      wakeTranscriptToDispatch = transcript
      nextRecognition.abort?.()
      scheduleWakeDispatch(transcript, 650)
    }
  }

  nextRecognition.onerror = (event) => {
    starting = false
    listening = false

    if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
      recognition = null
      return
    }

    if (enabled) {
      scheduleWakeStart(700)
    }
  }

  nextRecognition.onend = () => {
    starting = false
    listening = false

    if (wakeTranscriptToDispatch) {
      scheduleWakeDispatch(wakeTranscriptToDispatch, 250)
      return
    }

    if (enabled) {
      scheduleWakeStart(300)
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
    nextRecognition.start()
    return true
  } catch {
    starting = false
    listening = false
    if (preferContinuousRecognition) {
      preferContinuousRecognition = false
      recognition = null
    }

    if (enabled) {
      scheduleWakeStart(600)
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

  wakeTranscriptToDispatch = ''
  recognition?.abort?.()
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
