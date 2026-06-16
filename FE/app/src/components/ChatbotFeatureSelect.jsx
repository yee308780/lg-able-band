export function ChatbotFeatureSelect({ onOpenSpeak, onOpenTalk }) {
  return (
    <section className="tab-stack chatbot-choice-screen" aria-labelledby="chatbot-choice-title">
      <div className="chatbot-choice-hero">
        <div className="chatbot-bot-visual" aria-hidden="true">
          <span className="chatbot-bot-head">AI</span>
          <span className="chatbot-bot-dots">•••</span>
        </div>
        <h2 id="chatbot-choice-title">무엇을 도와드릴까요?</h2>
        <p>말하기가 어렵거나 정보가 필요할 때 선택하세요.</p>
      </div>

      <div className="chatbot-choice-grid" role="list">
        <button
          className="chatbot-choice-card speak-card"
          type="button"
          aria-label="대신 말하기 화면으로 이동"
          onClick={onOpenSpeak}
        >
          <span className="chatbot-choice-icon" aria-hidden="true">MIC</span>
          <span>
            <strong>대신 말하기</strong>
            <small>마이크로 말하거나 글자로 입력해서 대신 말해드려요.</small>
          </span>
          <span className="chatbot-choice-arrow" aria-hidden="true">›</span>
        </button>

        <button
          className="chatbot-choice-card talk-card"
          type="button"
          aria-label="챗봇과 대화하기 화면으로 이동"
          onClick={onOpenTalk}
        >
          <span className="chatbot-choice-icon" aria-hidden="true">CHAT</span>
          <span>
            <strong>챗봇과 대화하기</strong>
            <small>궁금한 정보를 챗봇에게 물어보세요.</small>
          </span>
          <span className="chatbot-choice-arrow" aria-hidden="true">›</span>
        </button>
      </div>
    </section>
  )
}
