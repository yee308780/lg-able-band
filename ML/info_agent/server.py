"""Standalone FastAPI server for LG Able Band information retrieval and actions."""

import os
from typing import Dict

import uvicorn
from fastapi import FastAPI, HTTPException

try:
    from .agent_service import build_info_agent_response
    from .rag_service import search_documents
    from .schemas import InfoAgentQueryRequest, InfoAgentResponse
except ImportError:
    from agent_service import build_info_agent_response
    from rag_service import search_documents
    from schemas import InfoAgentQueryRequest, InfoAgentResponse


HOST = os.environ.get("INFO_AGENT_HOST", "127.0.0.1")
PORT = int(os.environ.get("INFO_AGENT_PORT", "8010"))

app = FastAPI(
    title="LG Able Band Info Agent",
    description="Standalone RAG retrieval, classification, and agent-action service.",
    version="0.1.0",
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"service": "lg-able-band-info-agent", "status": "running"}


@app.post("/api/ai/info-agent/query", response_model=InfoAgentResponse)
def query_info_agent(request: InfoAgentQueryRequest) -> InfoAgentResponse:
    if not request.query.strip():
        raise HTTPException(status_code=422, detail="query must not be empty")
    documents = search_documents(request.query, request.accessibilityType, request.interests)
    return build_info_agent_response(documents, request.accessibilityType, request.guardianConnected)


@app.post("/api/ai/info-agent/recommend", response_model=InfoAgentResponse)
def recommend_info(request: InfoAgentQueryRequest) -> InfoAgentResponse:
    documents = search_documents(request.query, request.accessibilityType, request.interests)
    return build_info_agent_response(documents, request.accessibilityType, request.guardianConnected)


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
