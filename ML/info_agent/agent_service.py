"""Build information cards and decide accessible agent actions."""

from typing import Dict, List

try:
    from .classifiers.category_classifier import predict_category
    from .classifiers.priority_classifier import predict_priority
    from .schemas import AgentActions, ClassificationResult, InfoAgentResponse, InfoCard
except ImportError:
    from classifiers.category_classifier import predict_category
    from classifiers.priority_classifier import predict_priority
    from schemas import AgentActions, ClassificationResult, InfoAgentResponse, InfoCard


PRIORITY_RANK = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "URGENT": 3}
ACTION_GUIDES = {
    "URGENT": "즉시 내용을 확인하고 안전 수칙에 따라 행동하세요.",
    "HIGH": "지원 조건과 신청 기한을 확인하세요.",
    "MEDIUM": "필요한 서비스와 이용 방법을 확인하세요.",
    "LOW": "관심 있는 경우 상세 내용을 확인하세요.",
}
BAND_LABEL_RULES = [
    ("폭염", "폭염주의"),
    ("화재", "화재대피"),
    ("재난", "재난안내"),
    ("보조기기", "보조기기지원"),
    ("활동지원", "활동지원"),
    ("취업", "취업지원"),
    ("이동", "이동안전"),
    ("보행", "보행안전"),
    ("의료", "의료정보"),
    ("건강", "건강정보"),
]


def _summary(content: str, limit: int = 120) -> str:
    content = " ".join(content.split())
    return content if len(content) <= limit else content[: limit - 1] + "…"


def _make_band_message(title: str, priority: str) -> str:
    first_line = next((label for keyword, label in BAND_LABEL_RULES if keyword in title), "")
    if not first_line:
        words = [word for word in title.split() if word not in {"안내", "정보", "프로그램"}]
        selected_words = []
        for word in words:
            if len("".join(selected_words)) + len(word) > 8:
                break
            selected_words.append(word)
        first_line = "".join(selected_words) or "새정보"
    second_line = "즉시 확인" if priority == "URGENT" else "앱 확인"
    return f"{first_line}\n{second_line}"


def _make_actions(title: str, priority: str, guardian_connected: bool) -> AgentActions:
    notify = priority in {"URGENT", "HIGH"}
    suggest_share = priority in {"URGENT", "HIGH"}
    vibration = {"URGENT": "LONG_REPEAT", "HIGH": "SHORT_REPEAT"}.get(priority, "NONE")
    return AgentActions(
        showInApp=True,
        notifyBand=notify,
        bandMessage=_make_band_message(title, priority) if notify else "",
        suggestGuardianShare=suggest_share,
        vibrationPattern=vibration,
    )


def _make_spoken_text(card: InfoCard, accessibility_type: str, guardian_connected: bool) -> str:
    title = card.title.removesuffix(" 안내")
    if accessibility_type == "VISUAL_IMPAIRED":
        return f"{title} 안내입니다. {card.summary} 자세한 행동 안내는 {card.actionGuide}"
    if accessibility_type == "HEARING_IMPAIRED":
        return f"{title} 정보를 화면과 진동 중심으로 안내합니다."
    if accessibility_type == "VISUAL_HEARING_IMPAIRED":
        share = " 연결된 보호자에게 공유를 권합니다." if guardian_connected else " 보호자 공유를 권합니다."
        return f"{title}. 앱을 확인하세요.{share}"
    return f"{title} 정보를 안내합니다. {card.summary}"


def build_info_agent_response(
    documents: List[Dict[str, str]],
    accessibility_type: str | None,
    guardian_connected: bool,
) -> InfoAgentResponse:
    evaluated = []
    for document in documents:
        text = f"{document.get('title', '')} {document.get('content', '')}"
        category, category_confidence = predict_category(text)
        priority, priority_confidence = predict_priority(text)
        evaluated.append((document, category, category_confidence, priority, priority_confidence))

    evaluated.sort(
        key=lambda item: (PRIORITY_RANK.get(item[3], 0), float(item[0].get("_score", 0))),
        reverse=True,
    )
    cards = [
        InfoCard(
            title=document.get("title", "정보 안내"),
            category=category,
            priority=priority,
            summary=_summary(document.get("content", "")),
            actionGuide=ACTION_GUIDES.get(priority, ACTION_GUIDES["LOW"]),
            source=document.get("source", "LG Able Band"),
            url=document.get("url") or None,
            confidence=round(min(0.99, (category_confidence + priority_confidence) / 2), 3),
        )
        for document, category, category_confidence, priority, priority_confidence in evaluated
    ]
    representative = cards[0]
    top = evaluated[0]
    accessibility = (accessibility_type or "").upper()
    return InfoAgentResponse(
        spokenText=_make_spoken_text(representative, accessibility, guardian_connected),
        cards=cards,
        classification=ClassificationResult(
            category=top[1],
            categoryConfidence=top[2],
            priority=top[3],
            priorityConfidence=top[4],
        ),
        agentActions=_make_actions(representative.title, representative.priority, guardian_connected),
    )
