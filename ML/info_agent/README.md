# LG Able Band Info Agent

기존 ML 서버와 분리된 장애 정보 검색, 분류, Agent 액션 결정 서버입니다.
FAISS와 학습된 joblib 모델 없이도 `data/raw/documents.csv`와 fallback 규칙으로 실행됩니다.

```powershell
cd ML/info_agent
pip install -r requirements.txt
python server.py
```

기본 포트는 `8010`이며 `INFO_AGENT_PORT` 환경 변수로 변경할 수 있습니다.
서버 실행 후 다른 터미널에서 통합 요청을 확인합니다.

```powershell
python test_requests.py
```
