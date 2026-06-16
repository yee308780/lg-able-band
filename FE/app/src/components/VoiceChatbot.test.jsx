import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { VoiceChatbot } from './VoiceChatbot'

describe('VoiceChatbot info agent response', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = vi.fn()
    installSpeechSynthesisMock()
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('renders the accessible info card and reads voiceText again', async () => {
    const user = userEvent.setup()
    mockVoiceChatResponse({
      intent: 'INFO_AGENT_QUERY',
      action: 'SHOW_INFO_CARD',
      answerText: '폭염 안전 정보를 안내합니다.',
      voiceText: '폭염 위험 안내입니다. 즉시 안전 수칙을 확인하세요.',
      infoCard: {
        title: '장애인 폭염 대처 방법',
        summary: '더운 시간대 외출을 피하고 충분히 수분을 섭취하세요.',
        recommendedAction: '몸에 이상이 느껴지면 즉시 119에 연락하세요.',
        source: '보건복지부',
        url: 'https://example.com/heatwave',
      },
      classification: {
        category: '재난/안전',
        priority: 'URGENT',
      },
      notificationTabMessage: '폭염 위험. 외출을 자제하세요.',
      bandMessage: '폭염 위험. 외출 자제',
      recommendedChannels: ['APP', 'BAND', 'GUARDIAN'],
      notifyGuardian: true,
    })

    render(<VoiceChatbot preview={{}} session={{}} summary={{}} />)
    await openTalkMode(user)
    await user.type(screen.getByLabelText('인식된 문장'), '폭염 때 어떻게 해야 해?')
    await user.click(screen.getByRole('button', { name: '텍스트로 보내기' }))

    expect(await screen.findByLabelText('AI가 답변을 준비 중입니다')).toBeTruthy()
    expect(screen.getByRole('button', { name: '텍스트로 보내기' }).disabled).toBe(true)
    expect(await screen.findByRole('article', { name: 'AI 접근성 정보 카드' })).toBeTruthy()
    expect(screen.queryByLabelText('AI가 답변을 준비 중입니다')).toBeNull()
    expect(screen.getByText('장애인 폭염 대처 방법')).toBeTruthy()
    expect(screen.getByText('재난/안전')).toBeTruthy()
    expect(screen.getByText('중요도 URGENT')).toBeTruthy()
    expect(screen.queryByText('폭염 위험. 외출 자제')).toBeNull()
    expect(screen.queryByText(/전달 방식/)).toBeNull()
    expect(screen.queryByText(/알림탭:/)).toBeNull()
    expect(screen.getByText('보호자에게 공유할 수 있어요.')).toBeTruthy()
    expect(screen.getByRole('button', { name: '보호자에게 이 정보 공유하기' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'AI 접근성 정보 저장하기' })).toBeNull()
    expect(screen.getByRole('link', { name: '자세히 보기' }).target).toBe('_blank')
    expect(screen.queryByText('INFO_AGENT_QUERY · SHOW_INFO_CARD')).toBeNull()
    expect(screen.getByRole('button', { name: '지금 어떻게 해야 해?' })).toBeTruthy()
    expect(screen.queryByLabelText('추천 질문')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'AI 접근성 정보 다시 듣기' }))

    expect(window.speechSynthesis.speak).toHaveBeenLastCalledWith(
      expect.objectContaining({
        text: '폭염 위험 안내입니다. 즉시 안전 수칙을 확인하세요.',
      }),
    )
  })

  it('sends info agent followups with hidden title context', async () => {
    const user = userEvent.setup()
    mockVoiceChatResponses(
      {
        intent: 'INFO_AGENT_QUERY',
        action: 'SHOW_INFO_CARD',
        answerText: '장애인 의료비 지원 정보입니다.',
        voiceText: '장애인 의료비 지원 정보입니다.',
        infoCard: {
          title: '장애인의료비지원',
          summary: '의료비를 지원합니다.',
          source: '복지로',
          supportTarget: '등록 장애인 중 의료비 지원 대상자',
          eligibility: '등록 장애인 중 의료비 지원 대상자',
          selectionCriteria: '소득 기준 확인 필요',
          ageCondition: '연령 기준 확인 필요',
          incomeCondition: '소득 기준 확인 필요',
          regionCondition: '주소지 관할 지역',
          applyMethod: '주소지 주민센터에 방문 신청합니다.',
          applicationMethod: '주소지 주민센터에 방문 신청합니다.',
          contact: '주소지 주민센터',
        },
        classification: {
          category: '의료/건강',
          priority: 'MEDIUM',
        },
      },
      {
        responseType: 'FOLLOWUP_ANSWER',
        intent: 'INFO_AGENT_FOLLOWUP',
        action: 'ANSWER_FOLLOWUP',
        answerText: '담당 기관은 주민센터입니다.',
        voiceText: '담당 기관은 주민센터입니다.',
        infoCard: null,
        followupAnswer: {
          type: 'CONTACT',
          topic: '장애인의료비지원',
          answer: '담당 기관은 주민센터입니다.',
          source: '복지로',
        },
        classification: {
          category: '의료/건강',
          priority: 'MEDIUM',
        },
      },
    )

    render(<VoiceChatbot preview={{}} session={{}} summary={{}} />)
    await openTalkMode(user)
    await user.type(screen.getByLabelText('인식된 문장'), '장애인 의료비 지원 알려줘')
    await user.click(screen.getByRole('button', { name: '텍스트로 보내기' }))
    const followupButton = await screen.findByRole(
      'button',
      { name: '담당 기관 문의 방법은?' },
      { timeout: 3000 },
    )
    await waitFor(() => {
      expect(followupButton.disabled).toBe(false)
    })
    await user.click(followupButton)

    await waitFor(() => {
      expect(latestVoiceChatRequestBody()).toEqual(expect.objectContaining({
        text: '장애인의료비지원 담당 기관 문의 방법은?',
        context: expect.objectContaining({
          lastInfoAgent: expect.objectContaining({
            title: '장애인의료비지원',
            category: '의료/건강',
            importantFields: expect.objectContaining({
              supportTarget: '등록 장애인 중 의료비 지원 대상자',
              eligibility: '등록 장애인 중 의료비 지원 대상자',
              selectionCriteria: '소득 기준 확인 필요',
              applicationMethod: '주소지 주민센터에 방문 신청합니다.',
              applyMethod: '주소지 주민센터에 방문 신청합니다.',
              contact: '주소지 주민센터',
            }),
          }),
        }),
      }))
    })
    expect(screen.getAllByRole('article', { name: 'AI 접근성 정보 카드' })).toHaveLength(1)
    expect(screen.getAllByText('담당 기관 문의 방법은?').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('장애인의료비지원 담당 기관 문의 방법은?')).toBeNull()
    expect(screen.getByLabelText('정보 후속 질문')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '정보 후속 질문 닫기' }))

    expect(screen.queryByLabelText('정보 후속 질문')).toBeNull()
  })

  it('shows categories first, then sends a category recommendation through the existing API', async () => {
    const user = userEvent.setup()
    mockVoiceChatResponse({
      intent: 'INFO_AGENT_QUERY',
      action: 'SHOW_INFO_CARD',
      answerText: '장애인 활동지원 서비스 정보입니다.',
      voiceText: '장애인 활동지원 서비스 정보입니다.',
    })

    render(<VoiceChatbot preview={{}} session={{}} summary={{}} />)
    await openTalkMode(user)

    expect(screen.getByLabelText('질문 카테고리')).toBeTruthy()
    expect(screen.queryByLabelText('복지 정보 질문 추천 질문')).toBeNull()

    await user.click(screen.getByRole('button', { name: '복지 정보 질문 선택' }))
    expect(screen.getByLabelText('복지 정보 질문 추천 질문')).toBeTruthy()
    expect(screen.getByRole('button', { name: '다른 주제 선택' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '장애인 활동지원 서비스 알려줘' }))

    expect(await screen.findByText('장애인 활동지원 서비스 정보입니다.')).toBeTruthy()
    await waitFor(() => {
      expect(latestVoiceChatRequestBody()).toEqual(expect.objectContaining({
        text: '장애인 활동지원 서비스 알려줘',
      }))
    })
  })

  it('renders alert cards for alert questions using available app alert data first', async () => {
    const user = userEvent.setup()
    mockVoiceChatResponse({
      intent: 'READ_RECENT_ALERT',
      action: 'READ_RECENT_ALERT',
      answerText: '현재 새로운 알림이 1건 있습니다.',
      voiceText: '현재 새로운 알림이 1건 있습니다.',
    })

    render(
      <VoiceChatbot
        preview={{}}
        session={{}}
        summary={{
          recentAlerts: [
            {
              alertId: 77,
              title: '안전 알림',
              message: '외출 시 우산을 챙기세요.',
              severity: 'LOW',
              status: 'UNREAD',
              occurredAt: '2026-06-16T08:30:00',
            },
          ],
        }}
      />,
    )
    await openTalkMode(user)
    await user.click(screen.getByRole('button', { name: '생활/안전 알림 확인 선택' }))
    await user.click(screen.getByRole('button', { name: '현재 알림 알려줘' }))

    expect(await screen.findByLabelText('챗봇 알림 카드')).toBeTruthy()
    expect(screen.getByText('외출 시 우산을 챙기세요.')).toBeTruthy()
    expect(screen.queryByText('장애인 교통비 지원 신청 기간이 시작되었습니다.')).toBeNull()
  })

  it('keeps the existing chatbot response free of info agent controls', async () => {
    const user = userEvent.setup()
    mockVoiceChatResponse({
      intent: 'DEVICE_STATUS_CHECK',
      action: 'READ_DEVICE_STATUS',
      answerText: '세탁 완료까지 12분 남았습니다.',
      voiceText: '세탁 완료까지 12분 남았습니다.',
    })

    render(<VoiceChatbot preview={{}} session={{}} summary={{}} />)
    await openTalkMode(user)
    await user.type(screen.getByLabelText('인식된 문장'), '세탁기 몇 분 남았어?')
    await user.click(screen.getByRole('button', { name: '텍스트로 보내기' }))

    expect(await screen.findByText('세탁 완료까지 12분 남았습니다.')).toBeTruthy()
    expect(screen.queryByRole('article', { name: 'AI 접근성 정보 카드' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'AI 접근성 정보 다시 듣기' })).toBeNull()
    expect(screen.queryByLabelText('정보 후속 질문')).toBeNull()
    expect(screen.queryByText('DEVICE_STATUS_CHECK · READ_DEVICE_STATUS')).toBeNull()

    await waitFor(() => {
      expect(latestVoiceChatRequestBody()).toEqual(expect.objectContaining({ text: '세탁기 몇 분 남았어?' }))
    })
  })

  it('keeps previous user and bot messages when a new question is sent', async () => {
    const user = userEvent.setup()
    mockVoiceChatResponses(
      {
        intent: 'ALERT_LIST',
        action: 'READ_ALERTS',
        answerText: '최근 알림은 한 건입니다.',
        voiceText: '최근 알림은 한 건입니다.',
      },
      {
        intent: 'DEVICE_STATUS_CHECK',
        action: 'READ_DEVICE_STATUS',
        answerText: '세탁 완료까지 12분 남았습니다.',
        voiceText: '세탁 완료까지 12분 남았습니다.',
      },
    )

    render(<VoiceChatbot preview={{}} session={{}} summary={{}} />)
    await openTalkMode(user)
    await user.type(screen.getByLabelText('인식된 문장'), '최근 알림 읽어줘')
    await user.click(screen.getByRole('button', { name: '텍스트로 보내기' }))
    await screen.findByText('최근 알림은 한 건입니다.')
    await screen.findByText('말하는 중')

    await user.type(screen.getByLabelText('인식된 문장'), '세탁기 몇 분 남았어?')
    await user.click(screen.getByRole('button', { name: '텍스트로 보내기' }))

    expect(await screen.findByText('세탁 완료까지 12분 남았습니다.')).toBeTruthy()
    expect(screen.getAllByText('최근 알림 읽어줘').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('최근 알림은 한 건입니다.')).toBeTruthy()
    expect(screen.getAllByText('세탁기 몇 분 남았어?').length).toBeGreaterThanOrEqual(1)
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  }, 10000)

  it('resets the visible chat after confirmation only', async () => {
    const user = userEvent.setup()
    mockVoiceChatResponse({
      intent: 'INFO_AGENT_QUERY',
      action: 'SHOW_INFO_CARD',
      answerText: '초기화 테스트 답변입니다.',
      voiceText: '초기화 테스트 답변입니다.',
    })

    render(<VoiceChatbot preview={{}} session={{}} summary={{}} />)
    await openTalkMode(user)

    const input = screen.getByLabelText('인식된 문장')
    await user.type(input, '초기화 전 사용자 질문')
    await user.click(screen.getByRole('button', { name: '텍스트로 보내기' }))
    expect(await screen.findByText('초기화 테스트 답변입니다.')).toBeTruthy()

    await user.type(input, '다음 질문')
    await user.click(screen.getByRole('button', { name: '대화 초기화' }))
    expect(screen.getByRole('dialog', { name: '현재 대화 내용을 초기화할까요?' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(screen.getByText('초기화 테스트 답변입니다.')).toBeTruthy()
    expect(input.value).toBe('다음 질문')

    await user.click(screen.getByRole('button', { name: '대화 초기화' }))
    await user.click(screen.getByRole('button', { name: '초기화' }))

    expect(screen.queryByText('초기화 테스트 답변입니다.')).toBeNull()
    expect(screen.queryByText('초기화 전 사용자 질문')).toBeNull()
    expect(screen.getByText('안녕하세요!')).toBeTruthy()
    expect(screen.getByText('무엇을 도와드릴까요?')).toBeTruthy()
    expect(screen.getByLabelText('인식된 문장').value).toBe('')
    expect(window.speechSynthesis.cancel).toHaveBeenCalled()
  })
})

async function openTalkMode(user) {
  await user.click(screen.getByRole('button', { name: '음성 챗봇 열기' }))
  await user.click(screen.getByRole('button', { name: '챗봇과 대화하기 화면으로 이동' }))
}

function mockVoiceChatResponse(data) {
  mockVoiceChatResponses(data)
}

function mockVoiceChatResponses(...responses) {
  for (const data of responses) {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => data,
    })
  }
}

function latestVoiceChatRequestBody() {
  const lastCall = globalThis.fetch.mock.calls.at(-1)
  return JSON.parse(lastCall?.[1]?.body || '{}')
}

function installSpeechSynthesisMock() {
  class MockSpeechSynthesisUtterance {
    constructor(text) {
      this.text = text
    }
  }

  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: MockSpeechSynthesisUtterance,
  })
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      cancel: vi.fn(),
      speak: vi.fn(),
    },
  })
}
