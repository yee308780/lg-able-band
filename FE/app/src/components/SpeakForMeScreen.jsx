import { useState } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useTextToSpeech } from '../hooks/useTextToSpeech'

const commonPhrases = [
  '도와주세요',
  '물을 주세요',
  '화장실에 가고 싶어요',
  '보호자를 불러주세요',
  '아파요',
  '괜찮아요',
  '다시 말씀해주세요',
  '천천히 말씀해주세요',
]

const MAX_TEXT_LENGTH = 200

export function SpeakForMeScreen({ onBack }) {
  const [activeMode, setActiveMode] = useState('microphone')
  const [typedText, setTypedText] = useState('')
  const [message, setMessage] = useState('')
  const recognition = useSpeechRecognition()
  const textToSpeech = useTextToSpeech()
  const visibleMessage = message || recognition.error || textToSpeech.error

  function handleSpeak(text) {
    const sentence = text.trim()
    if (!sentence) {
      setMessage(activeMode === 'microphone'
        ? '인식된 문장이 없습니다. 다시 시도해주세요.'
        : '읽어줄 문장을 먼저 입력해주세요.')
      return
    }

    if (textToSpeech.speak(sentence)) {
      setMessage('음성으로 말하고 있어요.')
    }
  }

  function handleClear() {
    setMessage('')
    if (activeMode === 'microphone') {
      recognition.clearTranscript()
      return
    }
    setTypedText('')
  }

  function handlePhraseClick(phrase) {
    setMessage('')
    if (activeMode === 'microphone') {
      recognition.replaceTranscript(phrase)
      return
    }
    setTypedText(phrase.slice(0, MAX_TEXT_LENGTH))
  }

  return (
    <section className="tab-stack speak-for-me-screen" aria-labelledby="speak-for-me-title">
      <div className="speak-screen-header">
        <button className="speak-header-button" type="button" aria-label="챗봇 선택으로 돌아가기" onClick={onBack}>
          ‹
        </button>
        <h2 id="speak-for-me-title">대신 말하기</h2>
        <span className="speak-header-spacer" aria-hidden="true" />
      </div>

      <section className="speak-for-me-card">
        <div className="speak-mode-tabs" role="tablist" aria-label="대신 말하기 입력 방식">
          <button
            className={activeMode === 'microphone' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeMode === 'microphone'}
            onClick={() => {
              recognition.stopListening()
              setActiveMode('microphone')
              setMessage('')
            }}
          >
            마이크로 말하기
          </button>
          <button
            className={activeMode === 'typing' ? 'active' : ''}
            type="button"
            role="tab"
            aria-selected={activeMode === 'typing'}
            onClick={() => {
              recognition.stopListening()
              setActiveMode('typing')
              setMessage('')
            }}
          >
            글자로 입력하기
          </button>
        </div>

        <div className={`speak-status status-${recognition.status.replace(/\s+/g, '-')}`} role="status">
          {activeMode === 'microphone'
            ? formatSpeechStatus(recognition.status)
            : '글자를 입력한 뒤 음성으로 말하기를 누르세요.'}
        </div>

        {visibleMessage ? (
          <p className="member-status-message" role={visibleMessage.includes('오류') ? 'alert' : 'status'}>
            {visibleMessage}
          </p>
        ) : null}

        {activeMode === 'microphone' ? (
          <div className="speak-panel" role="tabpanel" aria-label="마이크로 말하기">
            <div className="speak-mic-stage">
              <p className="speak-guide-text">마이크 버튼을 누르고 말해보세요.</p>
              <button
                className={`speak-big-mic-button ${recognition.isListening ? 'is-listening' : ''}`}
                type="button"
                disabled={!recognition.isSupported}
                aria-label={recognition.isListening ? '음성 인식 중지' : '음성 인식 시작'}
                onClick={() => {
                  setMessage('')
                  if (recognition.isListening) {
                    recognition.stopListening()
                  } else {
                    recognition.startListening()
                  }
              }}
            >
                <span aria-hidden="true">MIC</span>
              </button>
            </div>

            <div className="speak-current-sentence" aria-live="polite">
              <span>인식된 문장</span>
              <strong>{recognition.transcript.trim() || '인식된 문장이 여기에 표시됩니다.'}</strong>
              <button
                className="speak-inline-audio-button"
                type="button"
                aria-label="인식된 문장 음성으로 말하기"
                onClick={() => handleSpeak(recognition.transcript)}
              >
                듣기
              </button>
            </div>
            {!recognition.isSupported ? (
              <p className="form-error" role="alert">
                이 브라우저에서는 음성 인식을 지원하지 않습니다.
              </p>
            ) : null}
            <div className="speak-action-row">
              <button className="primary-button" type="button" onClick={() => handleSpeak(recognition.transcript)}>
                음성으로 말하기
              </button>
              <button className="secondary-button" type="button" onClick={handleClear}>
                문장 지우기
              </button>
            </div>
            <QuickPhraseList onPhraseClick={handlePhraseClick} />
          </div>
        ) : (
          <div className="speak-panel" role="tabpanel" aria-label="글자로 입력하기">
            <div className="speak-typing-stage">
              <p className="speak-guide-text">하고 싶은 말을 입력해 주세요.</p>
            </div>
            <label className="speak-text-field">
              <span className="sr-only">읽어줄 문장 입력</span>
              <textarea
                value={typedText}
                rows={4}
                maxLength={MAX_TEXT_LENGTH}
                placeholder="여기에 입력하세요."
                onChange={(event) => {
                  setMessage('')
                  setTypedText(event.target.value)
                }}
              />
              <small>{typedText.length}/{MAX_TEXT_LENGTH}</small>
            </label>

            <div className="speak-action-row">
              <button className="primary-button" type="button" onClick={() => handleSpeak(typedText)}>
                음성으로 말하기
              </button>
              <button className="secondary-button" type="button" onClick={handleClear}>
                입력 지우기
              </button>
            </div>
            <QuickPhraseList onPhraseClick={handlePhraseClick} />
            <p className="speak-helper-text">입력한 내용은 음성으로 변환되어 들려집니다.</p>
          </div>
        )}
      </section>
    </section>
  )
}

function QuickPhraseList({ onPhraseClick }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const visiblePhrases = isExpanded ? commonPhrases : commonPhrases.slice(0, 6)

  return (
    <section className="quick-phrase-section" aria-labelledby="quick-phrase-title">
      <div className="quick-phrase-heading">
        <h3 id="quick-phrase-title">자주 쓰는 문장</h3>
        <button
          type="button"
          className="text-link-button"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? '자주 쓰는 문장 접기' : '자주 쓰는 문장 더보기'}
          onClick={() => setIsExpanded((current) => !current)}
        >
          {isExpanded ? '접기' : '더보기 ›'}
        </button>
      </div>
      <div className="phrase-grid" aria-label="자주 쓰는 문장">
        {visiblePhrases.map((phrase) => (
          <button
            className="secondary-button compact-button"
            type="button"
            key={phrase}
            onClick={() => onPhraseClick(phrase)}
          >
            {phrase}
          </button>
        ))}
      </div>
    </section>
  )
}

function formatSpeechStatus(status) {
  if (status === '듣는 중') {
    return '듣고 있어요.'
  }

  if (status === '인식 완료') {
    return '인식된 문장을 확인한 뒤 음성으로 말하기를 누르세요.'
  }

  if (status === '브라우저 미지원') {
    return '이 브라우저에서는 음성 인식을 지원하지 않습니다.'
  }

  if (status === '오류 발생') {
    return '오류가 발생했습니다.'
  }

  return '대기 중'
}
