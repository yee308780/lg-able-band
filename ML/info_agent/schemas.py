"""Pydantic schemas for the standalone information agent."""

from typing import List, Optional

from pydantic import BaseModel, Field


class InfoAgentQueryRequest(BaseModel):
    userId: Optional[int] = None
    query: str = ""
    accessibilityType: Optional[str] = None
    interests: List[str] = Field(default_factory=list)
    guardianConnected: bool = False


class InfoCard(BaseModel):
    title: str
    category: str
    priority: str
    summary: str
    actionGuide: str
    source: str
    url: Optional[str] = None
    confidence: float


class ClassificationResult(BaseModel):
    category: str
    categoryConfidence: float
    priority: str
    priorityConfidence: float


class AgentActions(BaseModel):
    showInApp: bool
    notifyBand: bool
    bandMessage: str
    suggestGuardianShare: bool
    vibrationPattern: str


class InfoAgentResponse(BaseModel):
    spokenText: str
    cards: List[InfoCard]
    classification: ClassificationResult
    agentActions: AgentActions
