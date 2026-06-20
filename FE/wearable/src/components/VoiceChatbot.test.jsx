import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VoiceChatbot } from './VoiceChatbot'

describe('wearable VoiceChatbot button selection', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens category and recommendation screens from the button selection path', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    const { container } = render(
      <VoiceChatbot
        embedded
        isPaired
        mode="idle"
        notificationSettings={{ voiceGuide: false, vibrationGuide: false }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'AI 챗봇' })).toBeTruthy()
    expect(screen.getByText('어떤 도움이 필요하신가요?')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '복지 정보 질문: 의료비 지원' })).toBeNull()
    expect(screen.getByRole('button', { name: '대신말하기' })).toBeTruthy()
    expect(screen.getByText('내 말을 대신 전해주세요')).toBeTruthy()
    expect(screen.getByText('정보를 찾아드려요')).toBeTruthy()
    expect(screen.getByRole('button', { name: '챗봇 음성 호출로 시작' })).toBeTruthy()
    expect(screen.getByText('‘챗봇 켜줘’라고 말하면 바로 시작해요.')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'AI에게 묻기' }))
    expect(screen.getByRole('heading', { name: 'AI에게 묻기' })).toBeTruthy()
    expect(screen.getByText('어떤 정보를 알려드릴까요?')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '복지 정보 질문: 의료비 지원' })).toBeNull()
    expect(container.querySelectorAll('.wearable-ai-category-card').length).toBeGreaterThan(0)

    await user.click(container.querySelector('.wearable-ai-category-card'))
    expect(screen.getByRole('heading', { name: '복지 정보' })).toBeTruthy()
    expect(container.querySelectorAll('.wearable-ai-question-button')).toHaveLength(4)
    expect(screen.getByRole('button', { name: '복지 정보 질문: 의료비 지원' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '복지 정보 질문: 교통비 지원' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '복지 정보 질문: 보청기 지원' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '복지 정보 질문: 직접 질문하기' })).toBeTruthy()

    await user.click(container.querySelector('.wearable-ai-question-button'))

    await waitFor(() => {
      expect(container.querySelector('.wearable-ai-answer-card')).toBeTruthy()
      expect(screen.queryByText('답변을 준비하고 있어요.')).toBeNull()
    })
    expect(screen.getByRole('heading', { name: 'AI 답변' })).toBeTruthy()
    expect(screen.getByText('더 궁금한 것이 있나요?')).toBeTruthy()
    expect(screen.getByRole('button', { name: '다른 질문 보기' })).toBeTruthy()
  })

  it('shows the selected category recommendation list and keeps direct question on the voice path', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <VoiceChatbot
        embedded
        isPaired
        mode="idle"
        notificationSettings={{ voiceGuide: false, vibrationGuide: false }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'AI에게 묻기' }))
    await user.click(screen.getByRole('button', { name: '생활/안전' }))

    expect(screen.getByRole('heading', { name: '생활/안전' })).toBeTruthy()
    expect(container.querySelectorAll('.wearable-ai-question-button')).toHaveLength(4)
    expect(screen.getByRole('button', { name: '생활/안전 질문: 최근 위험 알림 확인' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '생활/안전 질문: 오늘 생활 알림 확인' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '생활/안전 질문: 문 열림 상태 확인' })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '생활/안전 질문: 직접 질문하기' }))

    expect(container.querySelectorAll('.wearable-ai-category-card')).toHaveLength(0)
    expect(screen.queryByRole('heading', { name: 'AI 답변' })).toBeNull()
  })

  it('renders appliance status answers as wearable cards', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    const { container } = render(
      <VoiceChatbot
        embedded
        isPaired
        mode="idle"
        notificationSettings={{ voiceGuide: false, vibrationGuide: false }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'AI에게 묻기' }))
    await user.click(screen.getByRole('button', { name: '가전 상태' }))
    await user.click(screen.getByRole('button', { name: '가전 상태 질문: 세탁기 상태 알려줘' }))

    await waitFor(() => {
      expect(container.querySelector('.wearable-appliance-main-card')).toBeTruthy()
    })

    expect(screen.getByRole('heading', { name: '세탁기 상태 알려줘' })).toBeTruthy()
    expect(container.querySelector('.wearable-appliance-status-badge')?.textContent).toBe('주의')
    expect(screen.queryByLabelText('해야 할 일')).toBeNull()
    expect(screen.getByLabelText('빠른 액션')).toBeTruthy()
    expect(screen.getByRole('button', { name: '다시 확인' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '앱에서 자세히' })).toBeTruthy()
    expect(screen.getByLabelText('후속 질문')).toBeTruthy()
    expect(screen.getByRole('button', { name: '다른 가전 보기' })).toBeTruthy()
  })

  it('uses an appliance-specific fallback when a recommended device question receives a clarification prompt', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ answerText: '어떤 상태를 확인할지 조금 더 구체적으로 말해주세요.' }),
    })
    const user = userEvent.setup()
    render(
      <VoiceChatbot
        embedded
        isPaired
        mode="idle"
        notificationSettings={{ voiceGuide: false, vibrationGuide: false }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'AI에게 묻기' }))
    await user.click(screen.getByRole('button', { name: '가전 상태' }))
    await user.click(screen.getByRole('button', { name: '가전 상태 질문: 세탁기 상태 알려줘' }))

    await waitFor(() => {
      expect(screen.getByText('세탁기 상태 정보를 확인하지 못했어요.')).toBeTruthy()
    })
    expect(screen.queryByText('어떤 상태를 확인할지 조금 더 구체적으로 말해주세요.')).toBeNull()
  })

  it('shows the complete device question list with separate arrow space', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <VoiceChatbot
        embedded
        isPaired
        mode="idle"
        notificationSettings={{ voiceGuide: false, vibrationGuide: false }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'AI에게 묻기' }))
    await user.click(screen.getByRole('button', { name: '가전 상태' }))

    expect(container.querySelectorAll('.wearable-device-question-button')).toHaveLength(8)
    expect(screen.getByRole('button', { name: '가전 상태 질문: 냉장고 문 열려 있어?' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '가전 상태 질문: 전기레인지 상태 확인해줘' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '가전 상태 질문: 도어센서 상태 확인해줘' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /TV 알림/ })).toBeNull()
    expect(container.querySelectorAll('.wearable-device-question-button .wearable-question-chevron')).toHaveLength(8)
  })

  it('keeps connected device fallback answers compact and non-critical', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    const { container } = render(
      <VoiceChatbot
        embedded
        isPaired
        mode="idle"
        notificationSettings={{ voiceGuide: false, vibrationGuide: false }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'AI에게 묻기' }))
    await user.click(screen.getByRole('button', { name: '가전 상태' }))
    await user.click(screen.getByRole('button', { name: '가전 상태 질문: 연결된 기기 상태 알려줘' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '연결된 기기 상태 알려줘' })).toBeTruthy()
    })

    expect(container.querySelector('.wearable-appliance-status-badge')?.textContent).toBe('주의')
    expect(screen.getByText('연결된 기기 상태를 확인하지 못했어요.')).toBeTruthy()
    expect(screen.getByText('다시 확인하거나 다른 가전을 선택해 주세요.')).toBeTruthy()
    expect(screen.getAllByText('연결된 기기 상태 알려줘')).toHaveLength(1)
    expect(container.querySelectorAll('.wearable-appliance-followups .wearable-question-chevron')).toHaveLength(0)
  })

  it('opens the existing substitute speech phrase selection path', async () => {
    const user = userEvent.setup()
    render(
      <VoiceChatbot
        embedded
        isPaired
        mode="idle"
        notificationSettings={{ voiceGuide: false, vibrationGuide: false }}
      />,
    )

    await user.click(screen.getByRole('button', { name: '대신말하기' }))

    expect(screen.queryByRole('button', { name: 'AI에게 묻기' })).toBeNull()
    expect(screen.getAllByRole('button').length).toBeGreaterThan(2)
  })

  it('starts the existing voice listening path from the bottom microphone button', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <VoiceChatbot
        embedded
        isPaired
        mode="idle"
        notificationSettings={{ voiceGuide: false, vibrationGuide: false }}
      />,
    )

    await user.click(screen.getByRole('button', { name: '챗봇 음성 호출로 시작' }))

    expect(container.querySelectorAll('.wearable-ai-category-card')).toHaveLength(0)
    expect(screen.queryByRole('heading', { name: 'AI에게 묻기' })).toBeNull()
  })
})
