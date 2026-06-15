"""Print sample predictions from the pre-trained info-agent classifiers."""

from predict_classifier import predict_info_agent


TEST_QUERIES = [
    "시각장애인이 받을 수 있는 보조기기 지원 알려줘",
    "청각장애인을 위한 수어통역 지원이 있어?",
    "장애인 재난 대처 방법 알려줘",
    "장애인 차별을 당했는데 어디에 신고해?",
    "시청각장애인을 위한 지원 정보 있어?",
    "농맹인을 위한 의사소통 지원 제도 알려줘",
    "장애인 이동 지원 서비스 알려줘",
    "보청기나 인공와우 지원사업 알려줘",
    "화재가 났을 때 장애인은 어떻게 대피해야 해?",
    "점자정보단말기 지원 받을 수 있어?",
    "장애인 취업 교육 지원사업 알려줘",
    "장애인 의료비 지원 정보 알려줘",
]


def _format_prediction(prediction: dict[str, str]) -> str:
    return " / ".join(
        (
            prediction["category"],
            prediction["accessibilityTarget"],
            prediction["priority"],
        )
    )


def main() -> None:
    for query in TEST_QUERIES:
        result = predict_info_agent(query)
        print("=" * 80)
        print(f"질문: {result['query']}")
        print(f"모델 예측: {_format_prediction(result['rawPrediction'])}")
        print(f"최종 예측: {_format_prediction(result['finalPrediction'])}")
        print(f"룰 적용 여부: {result['ruleApplied']}")


if __name__ == "__main__":
    main()
