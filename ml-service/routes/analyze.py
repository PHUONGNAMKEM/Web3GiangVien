from fastapi import APIRouter
from pydantic import BaseModel, Field

from models.phobert_analyzer import PhoBertAnalyzer


router = APIRouter()
analyzer = PhoBertAnalyzer()


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1)
    topic_requirements: list[str] = Field(default_factory=list)


@router.post("/analyze-report")
def analyze_report(payload: AnalyzeRequest):
    result = analyzer.analyze(payload.text, payload.topic_requirements)
    return result
