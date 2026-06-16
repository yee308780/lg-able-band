import { useCallback, useEffect, useRef, useState } from 'react'

function getSpeechRecognition() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

function formatRecognitionError(error) {
  const messages = {
    'not-allowed': '마이크 권한을 허용해주세요.',
    'service-not-allowed': '브라우저에서 음성 인식 사용이 차단되었습니다.',
    'audio-capture': '사용 가능한 마이크를 찾지 못했습니다.',
    'no-speech': '인식된 문장이 없습니다. 다시 시도해주세요.',
    network: '음성 인식 네트워크 오류가 발생했습니다.',
  }

  return messages[error] || '음성 인식 중 오류가 발생했습니다.'
}

export function useSpeechRecognition({ lang = 'ko-KR' } = {}) {
  const recognitionRef = useRef(null)
  const SpeechRecognition = getSpeechRecognition()
  const isSupported = Boolean(SpeechRecognition)
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [status, setStatus] = useState(() => (isSupported ? '대기 중' : '브라우저 미지원'))
  const [error, setError] = useState(() => (
    isSupported ? '' : '현재 브라우저에서는 음성 인식을 지원하지 않습니다.'
  ))

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    setStatus('인식 완료')
  }, [])

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setStatus('브라우저 미지원')
      setError('현재 브라우저에서는 음성 인식을 지원하지 않습니다.')
      return
    }

    if (isListening) {
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => {
      setTranscript('')
      setError('')
      setIsListening(true)
      setStatus('듣는 중')
    }

    recognition.onresult = (event) => {
      const nextTranscript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('')
        .trim()

      setTranscript(nextTranscript)

      const lastResult = event.results[event.results.length - 1]
      if (lastResult?.isFinal) {
        setStatus(nextTranscript ? '인식 완료' : '오류 발생')
        if (!nextTranscript) {
          setError('인식된 문장이 없습니다. 다시 시도해주세요.')
        }
      }
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      setStatus(event.error === 'not-allowed' ? '브라우저 미지원' : '오류 발생')
      setError(formatRecognitionError(event.error))
    }

    recognition.onend = () => {
      setIsListening(false)
      setStatus((currentStatus) => (currentStatus === '듣는 중' ? '인식 완료' : currentStatus))
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch {
      setStatus('오류 발생')
      setError('마이크를 시작하지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }, [SpeechRecognition, isListening, lang])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    setError('')
    setStatus(isSupported ? '대기 중' : '브라우저 미지원')
  }, [isSupported])

  const replaceTranscript = useCallback((nextTranscript) => {
    setTranscript(nextTranscript)
    setError('')
    setStatus(nextTranscript.trim() ? '인식 완료' : '대기 중')
  }, [])

  useEffect(
    () => () => {
      recognitionRef.current?.stop()
    },
    [],
  )

  return {
    clearTranscript,
    error,
    isListening,
    isSupported,
    replaceTranscript,
    startListening,
    status,
    stopListening,
    transcript,
  }
}
