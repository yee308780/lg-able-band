import { shouldOpenChatbot } from '../utils/chatbotWake'

export const CHATBOT_WAKE_EVENT = 'able-band:chatbot-wake'

const NORMAL_RESTART_DELAY_MS = 700
const QUICK_END_THRESHOLD_MS = 1200
const QUICK_END_RESTART_DELAYS_MS = [1500, 3000, 5000]
const BLOCKED_RESTART_DELAY_MS = 3000
const WAKE_STUCK_RESTART_MS = 7000
const WAKE_START_GUARD_MS = 2500
const WAKE_DISPATCH_DELAY_MS = 80
const MAX_WAKE_TRANSCRIPT_LENGTH = 160

let recognition = null
let wakeDesired = false
let starting = false
let listening = false
let restartTimer = null
let startGuardTimer = null
let watchdogTimer = null
let dispatchTimer = null
let activeSessionId = 0
let lastStartAt = 0
let quickEndCount = 0
let wakeTranscriptBuffer = ''
let preferContinuousRecognition = true

export function startChatbotWakeService() {
  if (typeof window === 'undefined') {
    return false
  }

  wakeDesired = true

  if (!canRunWakeRecognition()) {
    return false
  }

  if (recognition || starting || listening) {
    return true
  }

  return startRecognitionSession()
}

export function stopChatbotWakeService() {
  wakeDesired = false
  activeSessionId += 1
  clearWakeTimers()
  starting = false
  listening = false
  wakeTranscriptBuffer = ''
  quickEndCount = 0

  const currentRecognition = recognition
  recognition = null

  try {
    currentRecognition?.abort?.()
  } catch {
    // The browser can already have stopped the recognition session.
  }

  return false
}

export function subscribeChatbotWake(callback) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  function handleWake(event) {
    callback(event.detail || {})
  }

  window.addEventListener(CHATBOT_WAKE_EVENT, handleWake)
  return () => {
    window.removeEventListener(CHATBOT_WAKE_EVENT, handleWake)
  }
}

function startRecognitionSession() {
  const SpeechRecognition = getSpeechRecognitionConstructor()
  if (!SpeechRecognition) {
    wakeDesired = false
    return false
  }

  clearWakeTimers()

  const nextRecognition = new SpeechRecognition()
  const sessionId = activeSessionId + 1
  activeSessionId = sessionId
  recognition = nextRecognition
  starting = true
  listening = false
  lastStartAt = Date.now()
  wakeTranscriptBuffer = ''

  nextRecognition.lang = 'ko-KR'
  nextRecognition.interimResults = true
  nextRecognition.continuous = preferContinuousRecognition
  nextRecognition.maxAlternatives = 5

  nextRecognition.onstart = () => {
    if (!isCurrentSession(sessionId, nextRecognition)) {
      return
    }

    window.clearTimeout(startGuardTimer)
    starting = false
    listening = true
    wakeTranscriptBuffer = ''
    scheduleWatchdog(sessionId, nextRecognition)
  }

  nextRecognition.onresult = (event) => {
    if (!isCurrentSession(sessionId, nextRecognition)) {
      return
    }

    scheduleWatchdog(sessionId, nextRecognition)
    const heard = cleanupRecognizedSpeech(
      Array.from(event.results || [])
        .flatMap((result) => getRecognitionAlternatives(result))
        .filter(Boolean)
        .join(' '),
    )
    if (!heard) {
      return
    }

    wakeTranscriptBuffer = `${wakeTranscriptBuffer} ${heard}`.slice(-MAX_WAKE_TRANSCRIPT_LENGTH)
    const wakeText = `${heard} ${wakeTranscriptBuffer}`
    if (shouldOpenChatbot(wakeText)) {
      completeWakeMatch(sessionId, nextRecognition, wakeText)
    }
  }

  nextRecognition.onerror = async (event) => {
    if (!isCurrentSession(sessionId, nextRecognition)) {
      return
    }

    const error = event?.error || ''
    cleanupCurrentSession()

    if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(error)) {
      const permissionDenied = await isMicrophonePermissionDenied()
      if (permissionDenied || !wakeDesired) {
        wakeDesired = false
        return
      }

      scheduleRestart(BLOCKED_RESTART_DELAY_MS)
      return
    }

    if (error === 'aborted' && !wakeDesired) {
      return
    }

    scheduleRestart(getRestartDelay())
  }

  nextRecognition.onend = () => {
    if (!isCurrentSession(sessionId, nextRecognition)) {
      return
    }

    cleanupCurrentSession()
    scheduleRestart(getRestartDelay())
  }

  nextRecognition.onnomatch = () => {
    if (isCurrentSession(sessionId, nextRecognition)) {
      wakeTranscriptBuffer = ''
    }
  }

  scheduleStartGuard(sessionId, nextRecognition)

  try {
    nextRecognition.start()
    return true
  } catch {
    cleanupCurrentSession()
    if (preferContinuousRecognition) {
      preferContinuousRecognition = false
      scheduleRestart(NORMAL_RESTART_DELAY_MS)
      return false
    }

    scheduleRestart(BLOCKED_RESTART_DELAY_MS)
    return false
  }
}

function completeWakeMatch(sessionId, currentRecognition, transcript) {
  if (!isCurrentSession(sessionId, currentRecognition)) {
    return
  }

  wakeDesired = false
  activeSessionId += 1
  clearWakeTimers()
  quickEndCount = 0
  cleanupCurrentSession()

  try {
    currentRecognition.abort?.()
  } catch {
    // Recognition can already be stopped by the browser.
  }

  dispatchTimer = window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(CHATBOT_WAKE_EVENT, {
      detail: { transcript },
    }))
  }, WAKE_DISPATCH_DELAY_MS)
}

function scheduleRestart(delayMs) {
  window.clearTimeout(restartTimer)
  if (!shouldRestart()) {
    return
  }

  restartTimer = window.setTimeout(() => {
    restartTimer = null
    if (shouldRestart()) {
      startRecognitionSession()
    }
  }, delayMs)
}

function scheduleWatchdog(sessionId, currentRecognition) {
  window.clearTimeout(watchdogTimer)
  if (!isCurrentSession(sessionId, currentRecognition)) {
    return
  }

  watchdogTimer = window.setTimeout(() => {
    if (!isCurrentSession(sessionId, currentRecognition)) {
      return
    }

    cleanupCurrentSession()
    activeSessionId += 1
    try {
      currentRecognition.abort?.()
    } catch {
      // Recognition can already be stopped.
    }
    scheduleRestart(BLOCKED_RESTART_DELAY_MS)
  }, WAKE_STUCK_RESTART_MS)
}

function scheduleStartGuard(sessionId, currentRecognition) {
  window.clearTimeout(startGuardTimer)
  startGuardTimer = window.setTimeout(() => {
    if (!isCurrentSession(sessionId, currentRecognition)) {
      return
    }

    cleanupCurrentSession()
    activeSessionId += 1
    try {
      currentRecognition.abort?.()
    } catch {
      // Recognition can already be stopped.
    }
    scheduleRestart(BLOCKED_RESTART_DELAY_MS)
  }, WAKE_START_GUARD_MS)
}

function cleanupCurrentSession() {
  window.clearTimeout(startGuardTimer)
  window.clearTimeout(watchdogTimer)
  startGuardTimer = null
  watchdogTimer = null
  recognition = null
  starting = false
  listening = false
  wakeTranscriptBuffer = ''
}

function clearWakeTimers() {
  window.clearTimeout(restartTimer)
  window.clearTimeout(startGuardTimer)
  window.clearTimeout(watchdogTimer)
  window.clearTimeout(dispatchTimer)
  restartTimer = null
  startGuardTimer = null
  watchdogTimer = null
  dispatchTimer = null
}

function getRestartDelay() {
  const aliveMs = Date.now() - lastStartAt
  if (aliveMs < QUICK_END_THRESHOLD_MS) {
    quickEndCount += 1
    return QUICK_END_RESTART_DELAYS_MS[Math.min(
      quickEndCount - 1,
      QUICK_END_RESTART_DELAYS_MS.length - 1,
    )]
  }

  quickEndCount = 0
  return NORMAL_RESTART_DELAY_MS
}

function shouldRestart() {
  return wakeDesired && canRunWakeRecognition() && !recognition && !starting && !listening
}

function canRunWakeRecognition() {
  return Boolean(getSpeechRecognitionConstructor()) && document.visibilityState !== 'hidden'
}

function isCurrentSession(sessionId, currentRecognition) {
  return activeSessionId === sessionId && recognition === currentRecognition
}

function getSpeechRecognitionConstructor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition
}

function getRecognitionAlternatives(result) {
  if (!result?.length) {
    return []
  }

  return Array.from({ length: result.length }, (_, index) => result[index]?.transcript || '').filter(Boolean)
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

async function isMicrophonePermissionDenied() {
  try {
    const permissionStatus = await window.navigator?.permissions?.query?.({ name: 'microphone' })
    return permissionStatus?.state === 'denied'
  } catch {
    return false
  }
}
