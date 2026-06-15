const DEFAULT_VOICE_CHATBOT_URL = '/api/ai/voice-chat'

export async function requestVoiceChat(payload) {
  const response = await fetch(soundChatbotUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message || '음성 챗봇 서버 요청에 실패했습니다.')
  }

  return data
}

export function soundChatbotUrl() {
  return import.meta.env.VITE_SOUND_CHATBOT_URL?.trim() || DEFAULT_VOICE_CHATBOT_URL
}
