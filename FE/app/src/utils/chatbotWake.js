const closeKeywords = [
  '챗봇 꺼줘',
  '챗봇 꺼',
  '챗봇 꺼져',
  '챗봇 종료',
  '챗봇 닫아줘',
  '챗봇 그만',
  '쳇봇 껴줘',
  '쳇 봇 껴줘',
  '쳇봇 꺼줘',
  '쳇 봇 꺼줘',
  '최복 꺼줘',
  '최 복 꺼줘',
  '최봇 꺼줘',
  '최 봇 꺼줘',
  '채팅봇 꺼줘',
  '채팅봇 종료',
  '음성 챗봇 꺼줘',
  'ai 꺼줘',
  'ai 종료',
  '에이아이 꺼줘',
  '에이아이 종료',
  '종료해줘',
  '그만할래',
  '그만해',
  '닫아줘',
]

const wakeKeywords = [
  '챗봇 켜줘',
  '챗봇 켜죠',
  '챗봇 켜주',
  '챗봇 켜저',
  '챗봇 커줘',
  '챗봇 열어줘',
  '챗봇 시작',
  '챗봇 불러줘',
  '쳇봇 켜줘',
  '쳇봇 켜죠',
  '쳇봇 켜주',
  '채봇 켜줘',
  '채봇 켜죠',
  '챕봇 켜줘',
  '찻봇 켜줘',
  '첵봇 켜줘',
  '체크봇 켜줘',
  '챗복 켜줘',
  '챗본 켜줘',
  '채팅봇 켜줘',
  '채팅봇 열어줘',
  '챗지피티 켜줘',
  '지피티 켜줘',
  '음성 챗봇 켜줘',
  '음성 챗봇 열어줘',
  '음성 인식 켜줘',
  '음성 인식 해줘',
  '음성인식 시작',
  'ai 켜줘',
  'ai 열어줘',
  'ai 시작',
  'ai 음성 인식 해줘',
  'ai 음성인식 켜줘',
  'ai 챗봇 켜줘',
  'ai 챗봇 열어줘',
  '에이아이 켜줘',
  '에이아이 열어줘',
  '에이아이 음성 인식 해줘',
  '에이아이 음성인식 켜줘',
  '에이아이 챗봇 켜줘',
  '인공지능 켜줘',
  '인공지능 음성 인식 해줘',
  '에이블 켜줘',
  '에이블 챗봇',
  '에이블 밴드',
  '에이블밴드',
  'ableband',
]

const wakeActionKeywords = ['켜줘', '켜죠', '켜주', '켜저', '커줘', '열어줘', '시작해줘', '시작', '불러줘', '호출', '해줘']
const wakeSubjectKeywords = ['챗봇', '쳇봇', '채봇', '챕봇', '찻봇', '첵봇', '체크봇', '챗복', '챗본', '채팅봇', '챗지피티', '지피티', '음성챗봇', '음성인식', 'ai', '에이아이', '인공지능', '에이블', '에이블밴드', 'ableband']
const closeActionKeywords = ['꺼줘', '꺼', '꺼져', '껴줘', '껴', '끄기', '종료', '끝내', '닫아줘', '닫기', '그만']
const closeSubjectKeywords = ['챗봇', '쳇봇', '채팅봇', '채봇', '챗본', '챗버', '최복', '최봇', '음성챗봇', 'ai', '에이아이', '인공지능']
const standaloneCloseCommands = ['꺼줘', '꺼', '꺼져', '끄기', '종료', '끝내', '닫아줘', '닫기', '그만']

export function shouldCloseChatbot(text) {
  const normalizedText = normalizeSpeechText(text)
  if (closeKeywords.some((keyword) => normalizedText.includes(normalizeSpeechText(keyword)))) {
    return true
  }

  const hasCloseAction = closeActionKeywords.some((keyword) => normalizedText.includes(normalizeSpeechText(keyword)))
  if (!hasCloseAction) {
    return false
  }

  const hasCloseSubject = closeSubjectKeywords.some((keyword) => normalizedText.includes(normalizeSpeechText(keyword)))
  return hasCloseSubject || standaloneCloseCommands.includes(normalizedText)
}

export function shouldOpenChatbot(text) {
  const normalizedText = normalizeSpeechText(text)
  if (wakeKeywords.some((keyword) => normalizedText.includes(normalizeSpeechText(keyword)))) {
    return true
  }

  if (/(챗|쳇|채|챕|찻|첵|체크).{0,8}(봇|본|봄|복|벗|보)?.{0,10}(켜|커|열|시작|불러|호출)/i.test(normalizedText)) {
    return true
  }

  if (/(에이아이|에이|ai|able|에이블).{0,12}(챗|쳇|채|봇|모드|켜|커|열|시작|불러|호출)/i.test(normalizedText)) {
    return true
  }

  const hasWakeAction = wakeActionKeywords.some((keyword) => normalizedText.includes(normalizeSpeechText(keyword)))
  if (!hasWakeAction) {
    return false
  }

  const hasWakeSubject = wakeSubjectKeywords.some((keyword) => normalizedText.includes(normalizeSpeechText(keyword)))
  return hasWakeSubject || normalizedText.length <= 6
}

export function normalizeSpeechText(text) {
  return String(text || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, '')
}
