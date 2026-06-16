import categoryAlertsIcon from '../assets/chatbot/category-alerts.png'
import categoryDevicesIcon from '../assets/chatbot/category-devices.png'
import categoryGuardianIcon from '../assets/chatbot/category-guardian.png'
import categoryWelfareIcon from '../assets/chatbot/category-welfare.png'

export const CHATBOT_QUESTION_CATEGORIES = [
  {
    id: 'welfare',
    title: '복지 정보 질문',
    description: '복지 서비스, 지원 제도, 신청 방법 등',
    icon: '문서',
    iconSrc: categoryWelfareIcon,
    prompts: [
      '장애인 의료비 지원 알려줘',
      '장애인 활동지원 서비스 알려줘',
      '장애인 교통비 지원 신청 방법 알려줘',
      '보조기기 지원 받을 수 있어?',
      '청각장애인 지원 제도 알려줘',
      '시각장애인 복지 서비스 알려줘',
    ],
  },
  {
    id: 'alerts',
    title: '생활/안전 알림 확인',
    description: '알림, 공지사항, 안전 정보 등',
    icon: '알림',
    iconSrc: categoryAlertsIcon,
    prompts: [
      '현재 알림 알려줘',
      '위험 알림 있어?',
      '오늘 안전 알림 확인해줘',
      '최근 알림 다시 알려줘',
      '읽지 않은 알림 있어?',
      '외출 전 확인할 안전 정보 알려줘',
    ],
  },
  {
    id: 'devices',
    title: '가전 상태 질문',
    description: '연결된 가전 제품 상태 확인',
    icon: '기기',
    iconSrc: categoryDevicesIcon,
    prompts: [
      '세탁기 상태 알려줘',
      '냉장고 문 열려 있어?',
      '공기질 상태 확인해줘',
      'TV 알림 있어?',
      '전기레인지 상태 확인해줘',
      '연결된 기기 상태 알려줘',
    ],
  },
  {
    id: 'guardian',
    title: '보호자 연결 요청',
    description: '보호자에게 연락하거나 도움 요청',
    icon: '보호',
    iconSrc: categoryGuardianIcon,
    prompts: [
      '보호자에게 연락해줘',
      '보호자에게 도움 요청 보내줘',
      '긴급 상황이라고 알려줘',
      '보호자에게 현재 상태 전달해줘',
      '보호자 연결 상태 확인해줘',
      '보호자에게 전화 요청해줘',
    ],
  },
]

export const FALLBACK_CHAT_ALERTS = [
  {
    id: 'fallback-safety-alert',
    title: '안전 알림',
    message: '내일 오전 전국에 비 소식이 있어요. 외출 시 우산을 챙기세요.',
    time: '오전 8:30',
    severity: 'LOW',
  },
  {
    id: 'fallback-welfare-alert',
    title: '복지 알림',
    message: '장애인 교통비 지원 신청 기간이 시작되었습니다.',
    time: '2024.05.20',
    severity: 'MEDIUM',
  },
]
