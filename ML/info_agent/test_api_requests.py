"""Send sample HTTP requests to the integrated info-agent API server."""

import sys

import requests


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="replace")


BASE_URL = "http://127.0.0.1:8004"
TEST_CASES = [
    ("시각장애인이 받을 수 있는 보조기기 지원 알려줘", "VISUAL_IMPAIRED"),
    ("청각장애인을 위한 수어통역 지원이 있어?", "HEARING_IMPAIRED"),
    ("장애인 폭염 대처 방법 알려줘", "ALL"),
    ("장애인 의료비 지원 정보 알려줘", "HEARING_IMPAIRED"),
]


def _print_query_response(query: str, user_type: str, response: requests.Response) -> None:
    result = response.json()
    print("=" * 80)
    print(f"질문: {query}")
    print(f"사용자 유형: {user_type}")
    print(f"HTTP Status: {response.status_code}")
    print(f"성공 여부: {result.get('success')}")

    if not result.get("success"):
        error = result.get("error", {})
        print(f"오류: {error.get('type')} / {error.get('message')}")
        return

    classification = result["classification"]
    card = result["appCard"]
    print(
        "분류 결과: "
        f"{classification['category']} / "
        f"{classification['accessibilityTarget']} / "
        f"{classification['priority']}"
    )
    print(f"추천 채널: {', '.join(result['recommendedChannels'])}")
    print(f"보호자 알림: {result['notifyGuardian']}")
    documents = result.get("sourceDocuments", [])
    print(f"근거 문서 수: {len(documents)}")
    if documents:
        print(f"대표 근거: {documents[0]['title']} / {documents[0]['source']}")

    print("\n[앱 카드]")
    print(f"제목: {card['title']}")
    print(f"요약: {card['summary']}")
    print(f"필요 행동: {card['recommendedAction']}")
    print(f"출처: {card['source']}")
    print(f"URL: {card['url']}")

    print("\n[밴드 문구]")
    print(result["bandMessage"])
    print("\n[음성 안내]")
    print(result["voiceMessage"])
    print("\n[알림탭 문구]")
    print(result["notificationTabMessage"])


def main() -> None:
    try:
        health_response = requests.get(f"{BASE_URL}/health", timeout=10)
        print("=" * 80)
        print("[Health Check]")
        print(f"HTTP Status: {health_response.status_code}")
        print(health_response.json())

        for query, user_type in TEST_CASES:
            response = requests.post(
                f"{BASE_URL}/api/info-agent/query",
                json={
                    "query": query,
                    "userAccessibilityType": user_type,
                    "topK": 5,
                },
                timeout=30,
            )
            _print_query_response(query, user_type, response)

        empty_response = requests.post(
            f"{BASE_URL}/api/info-agent/query",
            json={
                "query": "",
                "userAccessibilityType": "UNKNOWN",
                "topK": 5,
            },
            timeout=30,
        )
        _print_query_response("", "UNKNOWN", empty_response)
    except requests.RequestException as error:
        print(f"API 요청에 실패했습니다: {error}")
        print("먼저 python info_agent_server.py 명령으로 서버를 실행하세요.")
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
