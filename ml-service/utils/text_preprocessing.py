import re
from underthesea import word_tokenize

def normalize_text(text: str) -> str:
    text = text or ""
    text = text.strip()
    # Word segmentation for Vietnamese (e.g. "Học sinh" -> "Học_sinh")
    try:
        text = word_tokenize(text, format="text")
    except Exception:
        pass # Fallback to normal text if underthesea fails
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text

def extract_requirement_hits(text: str, requirements: list[str]) -> int:
    if not requirements:
        return 0
    normalized = normalize_text(text)
    hits = 0
    for req in requirements:
        req_norm = normalize_text(req)
        # remove underscores for string matching heuristic
        req_plain = req_norm.replace('_', ' ')
        norm_plain = normalized.replace('_', ' ')
        if req_plain and req_plain in norm_plain:
            hits += 1
    return hits
