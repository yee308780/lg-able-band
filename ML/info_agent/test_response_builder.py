"""Print sample user-facing responses built from RAG results."""

import sys

from response_builder import build_info_response


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="replace")


TEST_CASES = [
    ("시각장애인이 받을 수 있는 보조기기 지원 알려줘", "VISUAL_IMPAIRED"),
    ("청각장애인을 위한 수어통역 지원이 있어?", "HEARING_IMPAIRED"),
    ("장애인 폭염 대처 방법 알려줘", "ALL"),
    ("장애인 차별을 당했을 때 어디에 신고해?", "ALL"),
    ("시청각장애인을 위한 지원 정보 있어?", "VISUAL_HEARING_IMPAIRED"),
    ("화재가 났을 때 장애인은 어떻게 대피해야 해?", "VISUAL_IMPAIRED"),
    ("점자정보단말기 지원 받을 수 있어?", "VISUAL_IMPAIRED"),
    ("장애인 취업 교육 지원사업 알려줘", "ALL"),
    ("장애인 의료비 지원 정보 알려줘", "HEARING_IMPAIRED"),
]


def main() -> None:
    for query, user_type in TEST_CASES:
        response = build_info_response(query, user_type)
        classification = response["classification"]
        card = response["appCard"]

        print("=" * 80)
        print(f"질문: {response['query']}")
        print(f"사용자 유형: {response['userAccessibilityType']}")
        print(
            "분류 결과: "
            f"{classification['category']} / "
            f"{classification['accessibilityTarget']} / "
            f"{classification['priority']}"
        )
        print(f"추천 채널: {', '.join(response['recommendedChannels'])}")
        print(f"보호자 알림: {response['notifyGuardian']}")
        print(f"안내: {response['note']}")

        print("\n[앱 카드]")
        print(f"제목: {card['title']}")
        print(f"요약: {card['summary']}")
        print(f"필요 행동: {card['recommendedAction']}")
        print(f"출처: {card['source']}")
        print(f"URL: {card['url']}")

        print("\n[밴드 문구]")
        print(response["bandMessage"])
        print("\n[음성 안내]")
        print(response["voiceMessage"])
        print("\n[알림탭 문구]")
        print(response["notificationTabMessage"])
        print("\n[근거 문서]")
        for document in response["sourceDocuments"]:
            print(
                f"{document['rank']}. {document['title']} / {document['source']} / "
                f"{document['finalScore']} / {document['url']}"
            )


if __name__ == "__main__":
    main()
