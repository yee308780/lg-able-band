import { useCallback, useEffect, useState } from 'react'
import { isTextToSpeechSupported, speakText, stopSpeaking } from '../utils/speech'

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState('')
  const isSupported = isTextToSpeechSupported()

  const speak = useCallback((text) => {
    setError('')

    const result = speakText(text, {
      onEnd: () => setIsSpeaking(false),
      onError: () => {
        setIsSpeaking(false)
        setError('음성 출력 중 오류가 발생했습니다.')
      },
    })

    if (!result.ok) {
      setError(result.message)
      setIsSpeaking(false)
      return false
    }

    setIsSpeaking(true)
    return true
  }, [])

  const stop = useCallback(() => {
    stopSpeaking()
    setIsSpeaking(false)
  }, [])

  useEffect(() => stop, [stop])

  return {
    error,
    isSpeaking,
    isSupported,
    speak,
    stop,
  }
}
