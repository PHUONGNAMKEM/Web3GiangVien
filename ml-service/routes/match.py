from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from models.sbert_matcher import SbertMatcher


router = APIRouter()
matcher = SbertMatcher()


class StudentPayload(BaseModel):
    gpa: float = 0.0
    major_scores: dict[str, float] = Field(default_factory=dict)


class TopicPayload(BaseModel):
    topic_id: str | None = None
    requirements: list[str] = Field(default_factory=list)


class MatchRequest(BaseModel):
    student: StudentPayload
    topics: list[TopicPayload]


@router.post("/match-student")
def match_student(payload: MatchRequest):
    topics: list[dict[str, Any]] = [t.model_dump() for t in payload.topics]
    recommendations = matcher.match(payload.student.model_dump(), topics)
    return {"recommendations": recommendations}
