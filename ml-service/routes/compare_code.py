import logging
from fastapi import APIRouter
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer, util

router = APIRouter()
logger = logging.getLogger('ml-service')

# Reuse the same SBERT model for code comparison
_model = None

def get_model():
    global _model
    if _model is None:
        logger.info("[AI] Loading SBERT model for code comparison...")
        _model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        logger.info("[AI] SBERT model loaded for code comparison")
    return _model


class CompareCodeRequest(BaseModel):
    student_code: str = ""
    answer_code: str = ""


@router.post("/compare-code")
def compare_code(payload: CompareCodeRequest):
    """
    So sánh code sinh viên với code mẫu giảng viên bằng SBERT.
    Trả về cosine similarity (0-1).
    """
    if not payload.student_code.strip() or not payload.answer_code.strip():
        return {"similarity": 0.0, "feedback": "Code trống"}

    model = get_model()

    # Encode cả 2 đoạn code
    student_vec = model.encode(payload.student_code, convert_to_tensor=True)
    answer_vec = model.encode(payload.answer_code, convert_to_tensor=True)

    # Cosine similarity
    similarity = util.cos_sim(student_vec, answer_vec).item()
    similarity = max(0.0, min(1.0, similarity))
    similarity = round(similarity, 4)

    # Feedback dựa trên mức similarity
    if similarity >= 0.85:
        feedback = "Code rất tương đồng với đáp án mẫu"
    elif similarity >= 0.65:
        feedback = "Code có cấu trúc tương tự, một số khác biệt"
    elif similarity >= 0.4:
        feedback = "Code có một phần tương đồng, nhiều điểm khác biệt"
    else:
        feedback = "Code khác biệt nhiều so với đáp án mẫu"

    logger.info(f"[AI] Code comparison | similarity={similarity} | student_len={len(payload.student_code)} | answer_len={len(payload.answer_code)}")

    return {
        "similarity": similarity,
        "feedback": feedback,
        "model": "paraphrase-multilingual-MiniLM-L12-v2"
    }
