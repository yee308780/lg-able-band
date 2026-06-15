import { useEffect, useMemo, useRef, useState } from 'react'
import { requestVoiceChat } from '../services/voiceChatbotService'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

const closeKeywords = ['챗봇 꺼줘', '챗봇 종료', '종료해줘', '그만할래', '그만해', '닫아줘']
const wakeKeywords = [
  '챗봇켜줘',
  '챗봇열어줘',
  '챗봇시작',
  '채팅봇켜줘',
  '음성챗봇켜줘',
  '음성챗봇열어줘',
  '에이블밴드',
  'ableband',
  'ai켜줘',
  '에이아이켜줘',
]

const samplePrompts = [
  '최근 알림 읽어줘',
  '세탁기 몇 분 남았어?',
  '보호자한테 알려줘',
  '장애인 의료비 지원 알려줘',
]
const followupPrompts = ['지원 대상은 누구야?', '신청 방법 알려줘', '담당 기관 문의 방법은?']

export function VoiceChatbot({ preview, session, summary }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [inputText, setInputText] = useState('')
  const [status, setStatus] = useState('대기 중')
  const [response, setResponse] = useState(null)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const wakeRecognitionRef = useRef(null)
  const latestTranscriptRef = useRef('')
  const sentTranscriptRef = useRef('')
  const conversationActiveRef = useRef(false)
  const manualStopRef = useRef(false)
  const isOpenRef = useRef(false)
  const wakeListeningRef = useRef(false)
  const recognitionStartingRef = useRef(false)
  const recognitionListeningRef = useRef(false)
  const recognitionStartTimeoutRef = useRef(null)
  const conversationEndRef = useRef(null)

  const supportsSpeechRecognition = Boolean(SpeechRecognition)
  const chatbotContext = useMemo(() => createChatbotContext(summary, preview), [preview, summary])
  const hasInfoCard = Boolean(response?.infoCard)

  useEffect(() => {
    isOpenRef.current = isOpen

    if (!isOpen) {
      // eslint-disable-next-line react-hooks/immutability
      startWakeListening()
    }
  }, [isOpen])

  useEffect(() => {
    startWakeListening()

    return () => {
      wakeListeningRef.current = false
      window.clearTimeout(recognitionStartTimeoutRef.current)
      wakeRecognitionRef.current?.stop()
      recognitionRef.current?.stop()
      window.speechSynthesis?.cancel()
    }
  }, [])

  useEffect(() => {
    if (typeof conversationEndRef.current?.scrollIntoView === 'function') {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, isListening, status])

  function openChatbot() {
    isOpenRef.current = true
    stopWakeListening()
    conversationActiveRef.current = true
    manualStopRef.current = false
    setIsOpen(true)
    setError('')
    setStatus('안내 중...')
    speak('무엇을 확인할까요? 말씀해주세요.', () => {
      startListening()
    })
  }

  function closeChatbot() {
    isOpenRef.current = false
    conversationActiveRef.current = false
    manualStopRef.current = true
    recognitionStartingRef.current = false
    recognitionListeningRef.current = false
    window.clearTimeout(recognitionStartTimeoutRef.current)
    window.speechSynthesis?.cancel()
    recognitionRef.current?.stop()
    setIsListening(false)
    setStatus('대화 종료')
    setIsOpen(false)
    startWakeListening()
  }

  function ensureWakeRecognition() {
    if (!SpeechRecognition) {
      return null
    }

    if (wakeRecognitionRef.current) {
      return wakeRecognitionRef.current
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.interimResults = false
    recognition.continuous = false

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('')

      if (shouldOpenChatbot(transcript)) {
        openChatbot()
      }
    }

    recognition.onerror = () => {
      wakeListeningRef.current = false

      if (!isOpenRef.current) {
        window.setTimeout(() => {
          startWakeListening()
        }, 900)
      }
    }

    recognition.onend = () => {
      wakeListeningRef.current = false

      if (!isOpenRef.current) {
        window.setTimeout(() => {
          startWakeListening()
        }, 450)
      }
    }

    wakeRecognitionRef.current = recognition
    return recognition
  }

  function startWakeListening() {
    if (!SpeechRecognition || isOpenRef.current || wakeListeningRef.current) {
      return
    }

    const recognition = ensureWakeRecognition()
    if (!recognition) {
      return
    }

    try {
      wakeListeningRef.current = true
      recognition.start()
    } catch {
      wakeListeningRef.current = false
    }
  }

  function stopWakeListening() {
    const wasListening = wakeListeningRef.current
    wakeListeningRef.current = false
    wakeRecognitionRef.current?.stop()
    return wasListening
  }

  function ensureRecognition() {
    if (!SpeechRecognition) {
      return null
    }

    if (recognitionRef.current) {
      return recognitionRef.current
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => {
      window.clearTimeout(recognitionStartTimeoutRef.current)
      recognitionStartingRef.current = false
      recognitionListeningRef.current = true
      latestTranscriptRef.current = ''
      sentTranscriptRef.current = ''
      manualStopRef.current = false
      setIsListening(true)
      setStatus('듣는 중...')
      setError('')
    }

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('')

      setInputText(transcript)
      latestTranscriptRef.current = transcript

      const lastResult = event.results[event.results.length - 1]
      if (lastResult.isFinal) {
        setStatus('음성 인식 완료')
        sendRecognizedText(transcript)
      }
    }

    recognition.onerror = (event) => {
      window.clearTimeout(recognitionStartTimeoutRef.current)
      recognitionStartingRef.current = false
      recognitionListeningRef.current = false
      setIsListening(false)

      if (!conversationActiveRef.current || manualStopRef.current) {
        return
      }

      setError(speechRecognitionErrorMessage(event.error))

      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
        setStatus('음성 인식 사용 불가')
        conversationActiveRef.current = false
        return
      }

      setStatus(event.error === 'no-speech' ? '음성을 기다리고 있어요' : '음성 인식 오류')
    }

    recognition.onend = () => {
      window.clearTimeout(recognitionStartTimeoutRef.current)
      recognitionStartingRef.current = false
      recognitionListeningRef.current = false
      setIsListening(false)

      if (!conversationActiveRef.current || manualStopRef.current) {
        return
      }

      const transcript = latestTranscriptRef.current.trim()
      if (transcript) {
        sendRecognizedText(transcript)
        return
      }

      setStatus('음성 입력 대기')
    }

    recognitionRef.current = recognition
    return recognition
  }

  function startListening() {
    if (
      !conversationActiveRef.current
      || recognitionStartingRef.current
      || recognitionListeningRef.current
    ) {
      return
    }

    const recognition = ensureRecognition()
    if (!recognition) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge에서 localhost로 접속해 주세요.')
      setStatus('음성 인식 미지원')
      return
    }

    const wakeWasListening = stopWakeListening()
    recognitionStartingRef.current = true
    setStatus('마이크 연결 중...')
    setError('')

    const beginRecognition = () => {
      if (!conversationActiveRef.current || !recognitionStartingRef.current) {
        recognitionStartingRef.current = false
        return
      }

      try {
        recognition.start()
        recognitionStartTimeoutRef.current = window.setTimeout(() => {
          if (!recognitionStartingRef.current) {
            return
          }
          recognitionStartingRef.current = false
          recognition.abort()
          setError('마이크 연결 시간이 초과되었습니다. 마이크 권한과 네트워크를 확인해 주세요.')
          setStatus('마이크 연결 실패')
        }, 5000)
      } catch (recognitionError) {
        recognitionStartingRef.current = false
        if (recognitionError?.name !== 'InvalidStateError') {
          setError('마이크를 시작하지 못했습니다. 브라우저의 마이크 권한을 확인해 주세요.')
          setStatus('음성 인식 시작 실패')
        }
      }
    }

    if (wakeWasListening) {
      window.setTimeout(beginRecognition, 180)
    } else {
      beginRecognition()
    }
  }

  function stopListening() {
    manualStopRef.current = true
    recognitionStartingRef.current = false
    recognitionListeningRef.current = false
    window.clearTimeout(recognitionStartTimeoutRef.current)
    recognitionRef.current?.stop()
    setIsListening(false)
    setStatus('일시 정지')
  }

  async function sendMessage(text = inputText, continueConversation = conversationActiveRef.current) {
    const trimmedText = text.trim()
    if (!trimmedText) {
      setError('먼저 문장을 말하거나 입력해 주세요.')
      if (continueConversation) {
        speak('잘 못 들었어요. 다시 말씀해주세요.', () => {
          startListening()
        })
      }
      return
    }

    if (shouldCloseChatbot(trimmedText)) {
      setInputText(trimmedText)
      setStatus('대화 종료 중...')
      speak('음성 챗봇을 종료할게요.', () => {
        closeChatbot()
      })
      return
    }

    setStatus('챗봇 응답 요청 중...')
    setError('')
    setInputText('')
    setMessages((previousMessages) => [
      ...previousMessages,
      createChatMessage('user', trimmedText),
    ])

    try {
      const data = await requestVoiceChat({
        sessionId: 'app-demo',
        text: trimmedText,
        language: 'ko-KR',
        user: {
          userId: summary?.user?.userId || session?.account?.id || 1,
          name: summary?.user?.name || session?.account?.name || '',
          accessibilityType: summary?.user?.accessibilityType || 'VISUAL',
          guardianLinked: true,
        },
        context: chatbotContext,
      })

      setResponse(data)
      setMessages((previousMessages) => [
        ...previousMessages,
        createChatMessage('bot', data.answerText || '응답을 받았습니다.', { data }),
      ])
      setStatus('응답 중...')
      speak(data.voiceText || data.answerText, () => {
        setStatus('응답 완료')
      })
    } catch (requestError) {
      const errorText = requestError.message || '음성 챗봇 연결에 실패했습니다.'
      setError(errorText)
      setMessages((previousMessages) => [
        ...previousMessages,
        createChatMessage('bot', '연결에 실패했어요. 잠시 후 다시 시도해 주세요.', { error: true }),
      ])
      setStatus('연결 실패')

      if (continueConversation) {
        speak('연결에 실패했어요. 잠시 후 다시 시도해 주세요.')
      }
    }
  }

  function sendRecognizedText(text) {
    const trimmedText = text.trim()
    if (!trimmedText || sentTranscriptRef.current === trimmedText) {
      return
    }

    sentTranscriptRef.current = trimmedText
    sendMessage(trimmedText)
  }

  function speak(text, onEnd) {
    if (!text || !('speechSynthesis' in window)) {
      onEnd?.()
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ko-KR'
    utterance.onend = () => {
      onEnd?.()
    }
    utterance.onerror = () => {
      onEnd?.()
    }
    window.speechSynthesis.speak(utterance)
  }

  return (
    <>
      <button
        className="voice-chatbot-fab"
        type="button"
        aria-label="음성 챗봇 열기"
        onClick={openChatbot}
      >
        AI
      </button>

      {isOpen ? (
        <section className="voice-chatbot-panel" aria-label="음성 챗봇">
          <div className="voice-chatbot-header">
            <div className="voice-chatbot-brand">
              <span className="voice-ai-avatar" aria-hidden="true">AI</span>
              <div>
                <h2>AI 음성 챗봇</h2>
                <p className="card-label">LG Able Band</p>
              </div>
            </div>
            <button type="button" className="voice-close-button" aria-label="음성 챗봇 닫기" onClick={closeChatbot}>
              ×
            </button>
          </div>

          <p className="voice-chatbot-status" role="status" aria-live="polite">
            <span aria-hidden="true">▮▯▮</span>
            {status}
          </p>
          {error ? <p className="voice-chatbot-error">{error}</p> : null}

          <div
            className="voice-chatbot-answer voice-chatbot-scroll-area"
            aria-label="음성 챗봇 대화 내용"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="voice-empty-state">
                <strong>무엇을 확인할까요?</strong>
                <p>알림, 가전 상태, 복지 지원 정보를 물어볼 수 있어요.</p>
              </div>
            ) : (
              <div className="voice-chatbot-conversation">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`voice-message-row ${
                      message.role === 'user' ? 'voice-message-row-user' : 'voice-message-row-bot'
                    }`}
                  >
                    {message.role === 'bot' ? (
                      <span className="voice-ai-avatar voice-ai-avatar-small" aria-hidden="true">AI</span>
                    ) : null}

                    <div
                      className={`voice-message-bundle ${
                        message.role === 'user' ? 'voice-message-bundle-user' : 'voice-message-bundle-bot'
                      }`}
                    >
                      <div
                        className={`voice-message-bubble ${
                          message.role === 'user' ? 'voice-message-bubble-user' : 'voice-message-bubble-bot'
                        } ${message.error ? 'voice-message-bubble-error' : ''}`}
                      >
                        {message.text}
                      </div>

                      {message.role === 'bot' && message.data?.infoCard ? (
                        <InfoAgentCard
                          response={message.data}
                          onReplay={() => speak(message.data.voiceText || message.data.answerText)}
                        />
                      ) : null}

                      {message.role === 'bot' && message.data ? (
                        <span className="voice-chatbot-meta">
                          {message.data.intent} · {message.data.action}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>

          {hasInfoCard ? (
            <div className="voice-followup-block">
              <strong className="voice-followup-label">✦ 정보 후속 질문</strong>
              <div className="voice-followup-row" aria-label="정보 후속 질문">
                {followupPrompts.map((prompt) => (
                  <button
                    type="button"
                    key={prompt}
                    onClick={() => sendMessage(prompt, false)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="voice-chatbot-composer">
            <label className="voice-chatbot-field voice-chatbot-input-field">
              <span className="sr-only">인식된 문장</span>
              <textarea
                value={inputText}
                rows={1}
                placeholder="말씀하거나 입력해 주세요."
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    sendMessage(inputText, false)
                  }
                }}
              />
            </label>

            <button
              className="compact-button voice-chatbot-mic"
              type="button"
              aria-label="음성 입력 시작"
              disabled={!supportsSpeechRecognition || isListening}
              onClick={() => {
                conversationActiveRef.current = true
                startListening()
              }}
            >
              🎙
            </button>

            <button
              className="primary-button compact-button voice-chatbot-send"
              type="button"
              aria-label="텍스트로 보내기"
              onClick={() => sendMessage(inputText, false)}
            >
              ↗
            </button>
          </div>

          <div className="voice-sample-block">
            <strong className="voice-followup-label">✦ 추천 질문</strong>
            <div className="voice-sample-row" aria-label="추천 질문">
              {samplePrompts.map((prompt) => (
                <button
                  type="button"
                  key={prompt}
                  onClick={() => sendMessage(prompt, false)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="voice-chatbot-actions">
            <button
              type="button"
              onClick={() => {
                conversationActiveRef.current = true
                startListening()
              }}
              disabled={isListening}
            >
              {supportsSpeechRecognition ? '다시 말하기' : '음성 미지원'}
            </button>
            <button type="button" onClick={stopListening} disabled={!isListening}>
              일시 정지
            </button>
          </div>
        </section>
      ) : null}
    </>
  )
}

function InfoAgentCard({ response, onReplay }) {
  const priority = response.classification?.priority
  const isDanger = response.notifyGuardian || priority === 'URGENT' || priority === 'HIGH'
  const guardianRecommended = response.recommendedChannels?.includes('GUARDIAN')

  return (
    <article className="voice-info-card" aria-label="AI 접근성 정보 카드">
      <div className="voice-info-card-top">
        <p className="card-label">AI 접근성 정보</p>
        <h3>{response.infoCard.title}</h3>
        <div className="voice-info-tags" aria-label="정보 분류와 중요도">
          {response.classification?.category ? (
            <span className="voice-info-tag voice-info-tag-category">{response.classification.category}</span>
          ) : null}
          {priority ? (
            <span className={`voice-info-tag voice-info-tag-priority priority-${priority.toLowerCase()}`}>
              중요도 {priority}
            </span>
          ) : null}
        </div>
      </div>

      {response.infoCard.summary ? (
        <InfoCardSection icon="▤" title="요약">
          {response.infoCard.summary}
        </InfoCardSection>
      ) : null}

      {response.infoCard.recommendedAction ? (
        <InfoCardSection icon="✓" title="해야 할 일" action>
          {response.infoCard.recommendedAction}
        </InfoCardSection>
      ) : null}

      {response.infoCard.source || response.infoCard.url ? (
        <section className="voice-info-section voice-info-section-source">
          <span className="voice-info-section-icon" aria-hidden="true">⌂</span>
          <div>
            <strong>출처</strong>
            {response.infoCard.source ? <p>{response.infoCard.source}</p> : null}
            {response.infoCard.url ? (
              <a
                className="voice-info-link"
                href={response.infoCard.url}
                target="_blank"
                rel="noreferrer"
                aria-label="자세히 보기"
              >
                자세히 보기 ›
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="voice-info-mini-grid">
        {response.bandMessage ? (
          <div className={`voice-info-mini-row ${isDanger ? 'voice-info-mini-row-danger' : ''}`}>
            <span>밴드 표시</span>
            <strong>{response.bandMessage}</strong>
          </div>
        ) : null}
        {Array.isArray(response.recommendedChannels) && response.recommendedChannels.length > 0 ? (
          <div className="voice-info-mini-row">
            <span>전달 방식</span>
            <strong>{response.recommendedChannels.join(', ')}</strong>
          </div>
        ) : null}
      </div>

      {response.notificationTabMessage ? (
        <p className="voice-info-notification">알림탭: {response.notificationTabMessage}</p>
      ) : null}

      {guardianRecommended || response.notifyGuardian ? (
        <div className="voice-guardian-box">
          <strong>보호자에게 공유할 수 있어요.</strong>
          <span>긴급하거나 도움이 필요한 정보를 보호자에게 전달합니다.</span>
        </div>
      ) : null}

      <div className="voice-info-actions">
        <button type="button" className="compact-button" aria-label="AI 접근성 정보 다시 듣기" onClick={onReplay}>
          다시 듣기
        </button>
        {response.notifyGuardian ? (
          <button
            type="button"
            className="primary-button compact-button"
            aria-label="보호자에게 이 정보 공유하기"
            onClick={() => {
              // TODO: Connect the guardian sharing API when it is available.
            }}
          >
            보호자에게 공유
          </button>
        ) : null}
      </div>
    </article>
  )
}

function InfoCardSection({ icon, title, action = false, children }) {
  return (
    <section className={`voice-info-section ${action ? 'voice-info-section-action' : ''}`}>
      <span className="voice-info-section-icon" aria-hidden="true">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </section>
  )
}

function createChatMessage(role, text, extra = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    createdAt: new Date().toISOString(),
    ...extra,
  }
}

function shouldCloseChatbot(text) {
  return closeKeywords.some((keyword) => text.includes(keyword))
}

function shouldOpenChatbot(text) {
  const normalizedText = normalizeSpeechText(text)
  return wakeKeywords.some((keyword) => normalizedText.includes(normalizeSpeechText(keyword)))
}

function normalizeSpeechText(text) {
  return text.toLowerCase().replace(/\s+/g, '')
}

function speechRecognitionErrorMessage(error) {
  const messages = {
    'not-allowed': '마이크 권한이 차단되었습니다. 주소창의 마이크 권한을 허용해 주세요.',
    'service-not-allowed': '브라우저에서 음성 인식 서비스 사용이 차단되었습니다.',
    'audio-capture': '사용 가능한 마이크를 찾지 못했습니다. 마이크 연결 상태를 확인해 주세요.',
    'no-speech': '음성이 들리지 않았습니다. 마이크 가까이에서 다시 말씀해 주세요.',
    network: '음성 인식 네트워크 연결에 실패했습니다.',
  }
  return messages[error] || `음성 인식 오류: ${error}`
}

function createChatbotContext(summary, preview) {
  const alerts = summary?.recentAlerts || []
  const unreadAlerts = alerts.filter((alert) => alert.status === 'UNREAD').map(mapAlert)
  const dangerAlerts = alerts
    .filter((alert) => ['HIGH', 'CRITICAL'].includes(alert.severity) || alert.type === 'DANGER')
    .map(mapAlert)
  const recentAlert = alerts[0] ? mapAlert(alerts[0]) : null
  const devices = preview?.devices || []

  return {
    unreadAlerts,
    dangerAlerts,
    recentAlert,
    lastSpokenAlert: recentAlert,
    devices: createDeviceContext(devices),
  }
}

function createDeviceContext(devices) {
  const washer = findDevice(devices, 'WASHER')
  const refrigerator = findDevice(devices, 'REFRIGERATOR')
  const airSensor = findDevice(devices, 'AIR_SENSOR')
  const tv = findDevice(devices, 'TV')
  const range = findDevice(devices, 'RANGE')
  const doorSensor = findDevice(devices, 'DOOR_SENSOR')

  return {
    washer: washer
      ? {
          status: readDeviceValue(washer, 'statusCode') || normalizeDeviceStatus(washer),
          remainingMinutes: readDeviceValue(washer, 'remainingMinutes'),
          error: isWarningDevice(washer),
        }
      : null,
    refrigerator: refrigerator
      ? {
          doorOpen: readDeviceValue(refrigerator, 'doorOpen'),
          temperatureStatus: readDeviceValue(refrigerator, 'temperatureStatus') || normalizeDeviceStatus(refrigerator),
          error: isWarningDevice(refrigerator),
        }
      : null,
    airSensor: airSensor
      ? {
          airQuality: readDeviceValue(airSensor, 'airQuality') || normalizeDeviceStatus(airSensor),
          pmLevel: readDeviceValue(airSensor, 'pmLevel'),
          ventilationNeeded: readDeviceValue(airSensor, 'ventilationNeeded'),
          co2Status: readDeviceValue(airSensor, 'co2Status'),
        }
      : null,
    tv: tv
      ? {
          hasPopup: readDeviceValue(tv, 'hasPopup') || false,
          popupMessage: readDeviceValue(tv, 'popupMessage'),
        }
      : null,
    range: range
      ? {
          powerOn: readDeviceValue(range, 'powerOn'),
          longOn: readDeviceValue(range, 'longOn') || isWarningDevice(range),
        }
      : null,
    doorSensor: doorSensor
      ? {
          doorOpen: readDeviceValue(doorSensor, 'doorOpen'),
          securityEvent: readDeviceValue(doorSensor, 'securityEvent') || isWarningDevice(doorSensor),
        }
      : null,
  }
}

function findDevice(devices, type) {
  return devices.find((device) => device.type === type)
}

function readDeviceValue(device, key) {
  return device?.runtime?.[key] ?? device?.state?.[key] ?? device?.[key]
}

function isWarningDevice(device) {
  return ['WARNING', 'ERROR'].includes(device?.connectionStatus)
}

function normalizeDeviceStatus(device) {
  if (device?.connectionStatus === 'CONNECTED') {
    return 'NORMAL'
  }

  if (device?.connectionStatus === 'WARNING') {
    return 'WARNING'
  }

  if (device?.connectionStatus === 'ERROR') {
    return 'ERROR'
  }

  return device?.status || null
}

function mapAlert(alert) {
  return {
    id: alert.alertId,
    deviceType: alert.deviceType || alert.type,
    title: alert.title,
    message: alert.message,
    severity: alert.severity,
    createdAt: alert.occurredAt,
  }
}
