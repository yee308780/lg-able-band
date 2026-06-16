try:
    from .chatbot_regression_matrix import run_matrix
except ImportError:
    from chatbot_regression_matrix import run_matrix


def test_chatbot_regression_matrix():
    report = run_matrix()
    failed = [result for result in report["results"] if not result["ok"]]

    assert failed == []
    assert report["llmApiCallCount"] <= 8
