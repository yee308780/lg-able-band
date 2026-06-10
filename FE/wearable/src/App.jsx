import { useEffect, useRef, useState } from 'react'
import { ModeSwitch } from './components/ModeSwitch'
import { WearableFrame } from './components/WearableFrame'
import { CurrentAlertScreen } from './features/alerts/CurrentAlertScreen'
import { PairingQrScreen } from './features/pairing/PairingQrScreen'
import { UwbGuideScreen } from './features/uwb/UwbGuideScreen'
import {
  confirmAlert,
  createPairingPayload,
  getCurrentAlert,
  getInitialUwbSessionId,
  getPairingSession,
  getUwbSession,
  replayAlert,
  stopUwbSession,
} from './services/wearableService'
import './App.css'

const DEFAULT_UWB_POLL_INTERVAL_MS = 2000

function App() {
  const [isPaired, setIsPaired] = useState(false)
  const [mode, setMode] = useState('alert')
  const [pairing] = useState(() => {
    const session = getPairingSession()
    return { ...session, pairingPayload: createPairingPayload(session) }
  })
  const [alert, setAlert] = useState(null)
  const [alertStatuses, setAlertStatuses] = useState({})
  const [uwbSession, setUwbSession] = useState(null)
  const [isUwbPolling, setIsUwbPolling] = useState(true)
  const isUwbPollingRef = useRef(true)
  const [statusMessage, setStatusMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    if (!isPaired || mode !== 'alert') {
      return undefined
    }

    let isMounted = true

    async function loadAlert() {
      const currentAlert = await getCurrentAlert()
      if (isMounted) {
        setAlert(applyStoredAlertStatus(currentAlert, alertStatuses))
      }
    }

    loadAlert()

    return () => {
      isMounted = false
    }
  }, [alertStatuses, isPaired, mode])

  useEffect(() => {
    if (!isPaired || mode !== 'uwb' || !isUwbPolling) {
      return undefined
    }

    let isMounted = true
    let timeoutId
    const sessionId = getInitialUwbSessionId()
    isUwbPollingRef.current = true

    async function loadUwbSession() {
      try {
        const session = await getUwbSession(sessionId)
        if (!isMounted || !isUwbPollingRef.current) {
          return
        }

        setUwbSession(session)
        if (session.navigationStatus === 'ACTIVE') {
          timeoutId = window.setTimeout(loadUwbSession, getUwbPollIntervalMs())
          return
        }

        setIsUwbPolling(false)
        isUwbPollingRef.current = false
      } catch {
        if (isMounted) {
          setUwbSession(null)
          setStatusMessage('진행 중인 위치 안내가 없습니다.')
          setIsUwbPolling(false)
          isUwbPollingRef.current = false
        }
      }
    }

    loadUwbSession()

    return () => {
      isMounted = false
      window.clearTimeout(timeoutId)
    }
  }, [isPaired, isUwbPolling, mode])

  async function handleReplay() {
    if (!alert) {
      return
    }

    setIsBusy(true)
    try {
      const replayed = await replayAlert(alert.alertId)
      setStatusMessage(`다시 듣기: ${replayed.voiceGuide}`)
    } catch {
      setStatusMessage('다시 듣기를 실행할 수 없습니다.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleConfirm() {
    if (!alert) {
      return
    }

    setIsBusy(true)
    try {
      const confirmed = await confirmAlert(alert.alertId)
      setAlertStatuses((currentStatuses) => ({
        ...currentStatuses,
        [alert.alertId]: confirmed.status,
      }))
      setAlert((currentAlert) => ({ ...currentAlert, status: confirmed.status }))
      setStatusMessage('확인 완료')
    } catch {
      setStatusMessage('확인 처리에 실패했습니다.')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleStopUwb(sessionId) {
    const currentSessionId = sessionId || uwbSession?.sessionId
    if (!currentSessionId) {
      return
    }

    setIsBusy(true)
    try {
      isUwbPollingRef.current = false
      setIsUwbPolling(false)
      const stopped = await stopUwbSession(currentSessionId)
      setUwbSession(stopped)
    } catch {
      setStatusMessage('탐색 종료에 실패했습니다.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <main className="app-root">
      <WearableFrame>
        {isPaired ? (
          <ModeSwitch
            activeMode={mode}
            onModeChange={(nextMode) => {
              setMode(nextMode)
              setStatusMessage('')
              if (nextMode === 'uwb') {
                isUwbPollingRef.current = true
                setIsUwbPolling(true)
              }
            }}
          />
        ) : null}

        {!isPaired ? (
          <PairingQrScreen
            pairing={pairing}
            onPairComplete={() => {
              setIsPaired(true)
              setMode('alert')
            }}
          />
        ) : null}

        {isPaired && mode === 'alert' ? (
          <CurrentAlertScreen
            alert={alert}
            actionMessage={statusMessage}
            isBusy={isBusy}
            onConfirm={handleConfirm}
            onReplay={handleReplay}
          />
        ) : null}

        {isPaired && mode === 'uwb' ? (
          <UwbGuideScreen
            session={uwbSession}
            actionMessage={statusMessage}
            isBusy={isBusy}
            onStop={handleStopUwb}
          />
        ) : null}

        {isPaired && mode === 'idle' ? (
          <section className="state-screen" aria-label="웨어러블 대기">
            <p className="eyebrow">Able Band</p>
            <h1>대기 중입니다.</h1>
            <p>알림이나 위치 안내가 시작되면 바로 표시합니다.</p>
          </section>
        ) : null}
      </WearableFrame>
    </main>
  )
}

function applyStoredAlertStatus(alert, alertStatuses) {
  if (!alert) {
    return null
  }

  const storedStatus = alertStatuses[alert.alertId]
  return storedStatus ? { ...alert, status: storedStatus } : alert
}

function getUwbPollIntervalMs() {
  const override = Number(window.__ABLE_BAND_UWB_POLL_MS__)
  return Number.isFinite(override) && override > 0 ? override : DEFAULT_UWB_POLL_INTERVAL_MS
}

export default App
