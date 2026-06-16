"""Regression checks for chatbot answer quality and LLM usage policy."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any

try:
    from . import response_builder
    from .eval_info_agent_quality import route_question
    from .info_agent import run_info_agent
    from .llm_client import clear_llm_cache
except ImportError:
    import response_builder
    from eval_info_agent_quality import route_question
    from info_agent import run_info_agent
    from llm_client import clear_llm_cache


FAKE_LLM_RESPONSE = {
    "answer": "문서 내용을 바탕으로 핵심 정보를 정리했어요. 정확한 대상과 신청 가능 여부는 공식 기관에서 확인해 주세요.",
    "shortVoiceAnswer": "문서 기준으로 정리했어요. 정확한 내용은 공식 기관에서 확인해 주세요.",
    "cardTitle": "정보 안내",
    "keyPoints": ["문서 기반 안내", "공식 기관 확인"],
    "disclaimer": "정확한 신청 가능 여부는 공식 기관에서 확인해야 합니다.",
}


@dataclass(frozen=True)
class Case:
    name: str
    query: str
    context: dict[str, Any] | None = None
    expected_agent: str = "INFO_AGENT"
    expected_response_type: str | None = None
    expected_llm_used: bool | None = None
    expected_cache_hit: bool | None = None
    expected_fallback_reason: str | None = None
    must_include: tuple[str, ...] = ()
    must_not_include: tuple[str, ...] = ()
    min_answer_length: int = 8
    max_answer_length: int | None = None
    note: str = ""
    errors: list[str] = field(default_factory=list, compare=False)


MEDICAL_CONTEXT = {
    "isFollowup": True,
    "lastInfoAgent": {
        "title": "장애인의료비지원",
        "category": "의료/건강",
        "priority": "MEDIUM",
        "source": "공공데이터포털 중앙부처복지서비스",
        "summary": "저소득 장애인의 의료비 부담을 줄이기 위한 지원 정보입니다.",
        "supportTarget": "저소득 등록 장애인",
        "applyMethod": "지원대상자가 의료기관 방문시 장애인복지카드를 제시합니다.",
        "contact": "보건복지부 상담센터 129",
        "importantFields": {
            "supportTarget": "저소득 등록 장애인",
            "applyMethod": "지원대상자가 의료기관 방문시 장애인복지카드를 제시합니다.",
            "contact": "보건복지부 상담센터 129",
        },
    },
}

HEAT_CONTEXT = {
    "isFollowup": True,
    "lastInfoAgent": {
        "title": "폭염 대처 안내",
        "category": "재난/안전",
        "priority": "HIGH",
        "summary": "폭염 때는 더운 시간대의 외출을 줄이고, 가능한 한 시원한 곳에서 쉬어야 합니다.",
        "recommendedAction": "시원한 곳으로 이동하고 물을 자주 마시세요. 어지럽거나 몸 상태가 나빠지면 119 또는 주변 사람에게 도움을 요청하세요.",
    },
}


INFO_CASES = (
    Case(
        name="medical-card",
        query="장애인 의료비 지원 알려줘",
        expected_response_type="INFO_CARD",
        expected_llm_used=True,
        must_include=("문서 내용을 바탕으로",),
        must_not_include=("문서에는 신청방법이 명확히 제공되지 않았습니다",),
    ),
    Case(
        name="medical-apply-followup",
        query="신청 방법 알려줘",
        context=MEDICAL_CONTEXT,
        expected_response_type="FOLLOWUP_ANSWER",
        expected_llm_used=False,
        must_include=("장애인복지카드",),
        must_not_include=("명확히 제공되지 않았습니다",),
    ),
    Case(
        name="medical-contact-followup",
        query="담당 기관 문의 방법은?",
        context=MEDICAL_CONTEXT,
        expected_response_type="FOLLOWUP_ANSWER",
        expected_llm_used=False,
        must_include=("129",),
        must_not_include=("전화번호나 문의처가 제공되지 않았습니다",),
    ),
    Case(
        name="medical-detail-uses-llm",
        query="장애인 의료비 지원 자세히 알려줘",
        expected_response_type="INFO_CARD",
        expected_llm_used=True,
        expected_cache_hit=False,
        must_include=("문서 내용을 바탕으로",),
    ),
    Case(
        name="assistive-device-support",
        query="장애인 보조기기 지원 알려줘",
        expected_response_type="INFO_CARD",
        expected_llm_used=True,
        must_include=("보조기기",),
        must_not_include=("장애인 접근권 집단소송",),
    ),
    Case(
        name="wheelchair-mobility-support",
        query="휠체어 이동 지원 알려줘",
        expected_response_type="INFO_CARD",
        expected_llm_used=True,
        must_include=("휠체어",),
        must_not_include=("장애인 접근권 집단소송",),
    ),
    Case(
        name="digital-education-support",
        query="장애인 정보화교육 알려줘",
        expected_response_type="INFO_CARD",
        expected_llm_used=True,
        must_include=("정보화 교육",),
        must_not_include=("장애인 접근권 집단소송",),
    ),
    Case(
        name="sign-language-accessibility",
        query="수어 통역 지원 알려줘",
        expected_response_type="INFO_CARD",
        expected_llm_used=True,
        must_include=("수어",),
        must_not_include=("장애인 접근권 집단소송",),
    ),
    Case(
        name="able-band-living-sound",
        query="생활가전 소리를 못 들으면 Able Band가 어떻게 알려줘?",
        expected_response_type="INFO_CARD",
        expected_llm_used=False,
        expected_fallback_reason="app_feature",
        must_include=("생활 소리", "밴드 진동"),
        must_not_include=("장애인 맞춤주택",),
    ),
    Case(
        name="able-band-danger-alert",
        query="Able Band 위험 알림은 어떻게 받아?",
        expected_response_type="INFO_CARD",
        expected_llm_used=False,
        expected_fallback_reason="app_feature",
        must_include=("위험 알림", "보호자 알림"),
        must_not_include=("상해보험",),
    ),
    Case(
        name="able-band-vibration-alert",
        query="진동 알림이 안 오면 뭐를 확인해?",
        expected_response_type="INFO_CARD",
        expected_llm_used=False,
        expected_fallback_reason="app_feature",
        must_include=("진동 알림", "밴드 연결"),
        must_not_include=("장애인 접근권 집단소송",),
    ),
    Case(
        name="able-band-vibration-alert-no-spaces",
        query="진동알림이안오면 무엇을 확인해?",
        expected_response_type="INFO_CARD",
        expected_llm_used=False,
        expected_fallback_reason="app_feature",
        must_include=("진동 알림", "밴드 연결"),
        must_not_include=("장애인복지택시",),
    ),
    Case(
        name="able-band-guardian-alert",
        query="보호자 알림은 어떻게 보내?",
        expected_response_type="INFO_CARD",
        expected_llm_used=False,
        expected_fallback_reason="app_feature",
        must_include=("보호자 알림", "연락처"),
        must_not_include=("차량용 보조기기",),
    ),
    Case(
        name="able-band-connection-howto",
        query="밴드 연결 방법 알려줘",
        expected_response_type="INFO_CARD",
        expected_llm_used=False,
        expected_fallback_reason="app_feature",
        must_include=("밴드 연결", "블루투스"),
        must_not_include=("여성장애인출산비",),
    ),
    Case(
        name="heat-card-no-llm",
        query="폭염 때 장애인은 어떻게 대비해야 해?",
        expected_response_type="INFO_CARD",
        expected_llm_used=False,
        expected_fallback_reason="safety_template",
        must_include=("시원한 곳", "119"),
        max_answer_length=140,
    ),
    Case(
        name="heat-action-followup",
        query="지금 어떻게 해야 해?",
        context=HEAT_CONTEXT,
        expected_response_type="FOLLOWUP_ANSWER",
        expected_llm_used=False,
        must_include=("시원한 곳", "119"),
        max_answer_length=140,
    ),
    Case(
        name="fire-urgent-no-llm",
        query="화재가 났을 때 어떻게 대피해?",
        expected_llm_used=False,
        expected_fallback_reason="safety_rule",
        must_include=("119", "계단"),
        max_answer_length=160,
    ),
)

ROUTING_CASES = (
    Case(name="recent-sound-alerts", query="최근 알림 알려줘", expected_agent="SOUND_CHATBOT"),
    Case(name="guardian-contact", query="보호자한테 연락해줘", expected_agent="SOUND_CHATBOT"),
    Case(name="sos-request", query="SOS 요청해줘", expected_agent="SOUND_CHATBOT"),
)


def configure_fake_llm() -> list[str]:
    """Enable LLM paths without spending API calls."""
    os.environ["INFO_AGENT_LLM_ENABLED"] = "true"
    os.environ["OPENAI_API_KEY"] = "regression-test-key"
    clear_llm_cache()
    calls: list[str] = []

    def fake_call(prompt: str, _config: dict[str, Any]) -> tuple[dict[str, Any], None]:
        calls.append(prompt)
        return FAKE_LLM_RESPONSE, None

    response_builder.call_llm = fake_call
    return calls


def answer_text(response: dict[str, Any]) -> str:
    followup = response.get("followupAnswer") if isinstance(response.get("followupAnswer"), dict) else {}
    card = response.get("appCard") if isinstance(response.get("appCard"), dict) else {}
    return " ".join(
        str(
            response.get(key)
            or followup.get(key)
            or card.get(key)
            or ""
        )
        for key in ("answerText", "answer", "summary", "recommendedAction")
    ).strip()


def primary_answer_text(response: dict[str, Any]) -> str:
    followup = response.get("followupAnswer") if isinstance(response.get("followupAnswer"), dict) else {}
    return str(response.get("answerText") or followup.get("answer") or "").strip()


def check_info_case(case: Case) -> dict[str, Any]:
    response = run_info_agent(case.query, context=case.context)
    meta = response.get("meta", {})
    text = answer_text(response)
    primary_text = primary_answer_text(response)
    errors: list[str] = []

    if response.get("success") is not True:
        errors.append("success가 True가 아닙니다.")
    if case.expected_response_type and response.get("responseType") != case.expected_response_type:
        errors.append(
            f"responseType 기대값은 {case.expected_response_type}인데 실제는 {response.get('responseType')}입니다."
        )
    if case.expected_llm_used is not None and meta.get("llmUsed") is not case.expected_llm_used:
        errors.append(f"llmUsed 기대값은 {case.expected_llm_used}인데 실제는 {meta.get('llmUsed')}입니다.")
    if case.expected_cache_hit is not None and meta.get("llmCacheHit") is not case.expected_cache_hit:
        errors.append(
            f"llmCacheHit 기대값은 {case.expected_cache_hit}인데 실제는 {meta.get('llmCacheHit')}입니다."
        )
    if case.expected_fallback_reason is not None and meta.get("llmFallbackReason") != case.expected_fallback_reason:
        errors.append(
            f"llmFallbackReason 기대값은 {case.expected_fallback_reason}인데 실제는 {meta.get('llmFallbackReason')}입니다."
        )
    if len(text) < case.min_answer_length:
        errors.append("답변이 너무 짧거나 비어 있습니다.")
    if case.max_answer_length is not None and len(primary_text) > case.max_answer_length:
        errors.append(f"안전 답변이 너무 깁니다. 현재 {len(primary_text)}자입니다.")
    for expected in case.must_include:
        if expected not in text:
            errors.append(f"답변에 '{expected}'가 없습니다.")
    for forbidden in case.must_not_include:
        if forbidden in text:
            errors.append(f"답변에 금지 문구 '{forbidden}'가 포함됐습니다.")

    return {
        "name": case.name,
        "query": case.query,
        "ok": not errors,
        "errors": errors,
        "answer": primary_text or text,
        "responseType": response.get("responseType"),
        "llmUsed": meta.get("llmUsed"),
        "llmCacheHit": meta.get("llmCacheHit"),
        "llmFallbackReason": meta.get("llmFallbackReason"),
    }


def check_routing_case(case: Case) -> dict[str, Any]:
    actual = route_question(case.query)
    errors = [] if actual == case.expected_agent else [f"라우팅 기대값은 {case.expected_agent}인데 실제는 {actual}입니다."]
    return {
        "name": case.name,
        "query": case.query,
        "ok": not errors,
        "errors": errors,
        "actualAgent": actual,
    }


def run_matrix() -> dict[str, Any]:
    calls = configure_fake_llm()
    results = [check_info_case(case) for case in INFO_CASES]

    clear_llm_cache()
    cache_call_count_before = len(calls)
    repeated_first = run_info_agent("장애인 의료비 지원 자세히 알려줘")
    repeated_second = run_info_agent("장애인 의료비 지원 자세히 알려줘")
    cache_api_call_count = len(calls) - cache_call_count_before
    cache_ok = (
        repeated_first.get("meta", {}).get("llmCacheHit") is False
        and repeated_second.get("meta", {}).get("llmCacheHit") is True
        and cache_api_call_count == 1
    )
    cache_result = {
        "name": "llm-cache-efficiency",
        "query": "장애인 의료비 지원 자세히 알려줘",
        "ok": cache_ok,
        "errors": [] if cache_ok else ["반복 질문에서 LLM 캐시가 동작하지 않았습니다."],
        "apiCallCount": cache_api_call_count,
        "firstCacheHit": repeated_first.get("meta", {}).get("llmCacheHit"),
        "secondCacheHit": repeated_second.get("meta", {}).get("llmCacheHit"),
    }

    routing_results = [check_routing_case(case) for case in ROUTING_CASES]
    all_results = results + [cache_result] + routing_results
    return {
        "ok": all(result["ok"] for result in all_results),
        "total": len(all_results),
        "failed": sum(1 for result in all_results if not result["ok"]),
        "llmApiCallCount": len(calls),
        "results": all_results,
    }


def main() -> int:
    report = run_matrix()
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
