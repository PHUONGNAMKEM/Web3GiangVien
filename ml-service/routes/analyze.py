import logging
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from models.phobert_analyzer import PhoBertAnalyzer
from utils.text_security import scan_injection, check_repetition, check_type_token_ratio
from utils.progress import get_job

logger = logging.getLogger('ml-service')

router = APIRouter()
analyzer = PhoBertAnalyzer()
limiter = Limiter(key_func=get_remote_address)


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=300_000)
    topic_requirements: list[str] = Field(default_factory=list, max_items=20)
    job_id: str | None = Field(default=None, max_length=100)


class RubricItem(BaseModel):
    TenTieuChi: str
    MoTa: str = ""
    TrongSo: float
    DiemToiDa: float = 10
    GoiYChoAI: list[str] = Field(default_factory=list)


class AnalyzeRubricsRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=300_000)
    rubrics: list[RubricItem] = Field(..., max_items=20)
    job_id: str | None = Field(default=None, max_length=100)


@router.post("/analyze-report")
@limiter.limit("20/minute")
def analyze_report(request: Request, payload: AnalyzeRequest):
    logger.info(f"[AI] POST /analyze-report | textLength={len(payload.text)} | requirements={len(payload.topic_requirements)}")
    
    security_flags = []
    
    # 1. Injection check
    injection_alerts = scan_injection(payload.text)
    if injection_alerts:
        security_flags.extend(injection_alerts)
        logger.warning(f'[SECURITY] Injection detected | flags={injection_alerts}')
    
    # 2. Repetition check
    rep_result = check_repetition(payload.text, threshold=0.20)
    if rep_result['flagged']:
        security_flags.append(f"Nội dung lặp lại cao: {rep_result['repetition_rate']*100:.0f}%")
        
    # 3. Type-token ratio check
    if check_type_token_ratio(payload.text):
        security_flags.append('Từ vựng nghèo, nghi ngờ keyword stuffing')
        
    # Gọi PhoBERT chấm điểm
    result = analyzer.analyze(payload.text, payload.topic_requirements, job_id=payload.job_id)
    
    # Trả thêm thông tin bảo mật
    result['security_flags'] = security_flags
    result['repetition_rate'] = rep_result['repetition_rate']
    result['trigram_repetition_rate'] = rep_result['trigram_repetition_rate']
    
    logger.info(f"[AI] /analyze-report response | score={result.get('score')} | security_flags={len(security_flags)}")
    return result


@router.post("/analyze-with-rubrics")
@limiter.limit("20/minute")
def analyze_with_rubrics(request: Request, payload: AnalyzeRubricsRequest):
    logger.info(f"[AI] POST /analyze-with-rubrics | textLength={len(payload.text)} | criteria={len(payload.rubrics)}")
    
    security_flags = []
    
    # 1. Injection check
    injection_alerts = scan_injection(payload.text)
    if injection_alerts:
        security_flags.extend(injection_alerts)
        logger.warning(f'[SECURITY] Injection detected | flags={injection_alerts}')
    
    # 2. Repetition check
    rep_result = check_repetition(payload.text, threshold=0.20)
    if rep_result['flagged']:
        security_flags.append(f"Nội dung lặp lại cao: {rep_result['repetition_rate']*100:.0f}%")
        
    # 3. Type-token ratio check
    if check_type_token_ratio(payload.text):
        security_flags.append('Từ vựng nghèo, nghi ngờ keyword stuffing')
        
    # Gọi PhoBERT chấm điểm
    rubrics_dicts = [r.model_dump() for r in payload.rubrics]
    result = analyzer.analyze_with_rubrics(payload.text, rubrics_dicts, job_id=payload.job_id)
    
    # Trả thêm thông tin bảo mật
    result['security_flags'] = security_flags
    result['repetition_rate'] = rep_result['repetition_rate']
    result['trigram_repetition_rate'] = rep_result['trigram_repetition_rate']
    
    logger.info(f"[AI] /analyze-with-rubrics response | score={result.get('score')} | criteria={len(payload.rubrics)} | security_flags={len(security_flags)}")
    return result


@router.get("/analyze-progress/{job_id}")
def analyze_progress(job_id: str):
    """Trả tiến độ phân tích theo job_id để frontend vẽ thanh % thật. KHÔNG rate-limit (poll liên tục)."""
    return get_job(job_id)
