import logging
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional

from models.phobert_analyzer import PhoBertAnalyzer

logger = logging.getLogger('ml-service')

router = APIRouter()
analyzer = PhoBertAnalyzer()


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1)
    topic_requirements: list[str] = Field(default_factory=list)


class RubricItem(BaseModel):
    TenTieuChi: str
    MoTa: str = ""
    TrongSo: float
    DiemToiDa: float = 10
    GoiYChoAI: list[str] = Field(default_factory=list)


class AnalyzeRubricsRequest(BaseModel):
    text: str = Field(..., min_length=1)
    rubrics: list[RubricItem]


@router.post("/analyze-report")
def analyze_report(payload: AnalyzeRequest):
    logger.info(f"[AI] POST /analyze-report | textLength={len(payload.text)} | requirements={len(payload.topic_requirements)}")
    result = analyzer.analyze(payload.text, payload.topic_requirements)
    logger.info(f"[AI] /analyze-report response | score={result.get('score')}")
    return result


@router.post("/analyze-with-rubrics")
def analyze_with_rubrics(payload: AnalyzeRubricsRequest):
    logger.info(f"[AI] POST /analyze-with-rubrics | textLength={len(payload.text)} | criteria={len(payload.rubrics)}")
    rubrics_dicts = [r.model_dump() for r in payload.rubrics]
    result = analyzer.analyze_with_rubrics(payload.text, rubrics_dicts)
    logger.info(f"[AI] /analyze-with-rubrics response | score={result.get('score')} | criteria={len(payload.rubrics)}")
    return result

