"""Print sample TF-IDF retrieval results for the info agent."""

import sys

from rag_retriever import search_documents


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="replace")


TEST_QUERIES = [
    "시각장애인이 받을 수 있는 보조기기 지원 알려줘",
    "청각장애인을 위한 수어통역 지원이 있어?",
    "장애인 폭염 대처 방법 알려줘",
    "장애인 차별을 당했을 때 어디에 신고해?",
    "시청각장애인을 위한 지원 정보 있어?",
    "농맹인을 위한 의사소통 지원 제도 알려줘",
    "장애인 이동 지원 서비스 알려줘",
    "보청기나 인공와우 지원사업 알려줘",
    "화재가 났을 때 장애인은 어떻게 대피해야 해?",
    "점자정보단말기 지원 받을 수 있어?",
    "장애인 취업 교육 지원사업 알려줘",
    "장애인 의료비 지원 정보 알려줘",
]


def main() -> None:
    for query in TEST_QUERIES:
        response = search_documents(query)
        classification = response["classification"]
        print("=" * 80)
        print(f"질문: {response['query']}")
        print(
            "분류 결과: "
            f"{classification['category']} / "
            f"{classification['accessibilityTarget']} / "
            f"{classification['priority']}"
        )
        print(f"검색 결과 수: {response['resultCount']}")
        print(f"fallback 사용 여부: {response['fallbackUsed']}")
        print(f"fallback level: {response['fallbackLevel']}")

        for result in response["results"]:
            print(f"\n[{result['rank']}] {result['title']}")
            for field in (
                "docId",
                "source",
                "sourceType",
                "category",
                "accessibilityTarget",
                "priority",
                "appRelevanceScore",
                "similarityScore",
                "finalScore",
                "url",
                "summary",
            ):
                print(f"- {field}: {result[field]}")


if __name__ == "__main__":
    main()
