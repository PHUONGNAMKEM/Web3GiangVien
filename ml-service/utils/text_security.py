import re
import logging

logger = logging.getLogger('ml-service')

INJECTION_PATTERNS = [
    r'(hãy|please|vui lòng).{0,50}(chấm|cho|give|grade|score|đánh giá).{0,50}(10|100|max|cao nhất|tối đa|full mark)',
    r'(bỏ qua|ignore|disregard|forget).{0,40}(rubric|tiêu chí|hướng dẫn|instruction|previous)',
    r'(điểm|score)\s*(=|:)\s*(10|100|tối đa|maximum)',
    r'system\s*(prompt|instruction)',
    r'<\s*/?[a-z]+[^>]*>',  # HTML/XML tags (có thể là injection)
    r'\[\[.{0,50}\]\]',     # Potential template injection
]

def scan_injection(text: str) -> list[str]:
    """Trả về danh sách cảnh báo injection, rỗng nếu sạch."""
    alerts = []
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            alerts.append(f'Phát hiện nội dung có thể là prompt injection: pattern={pattern[:40]}...')
            break
    return alerts

def check_repetition(text: str, threshold: float = 0.20) -> dict:
    """
    Kiểm tra nội dung lặp lại quá ngưỡng.
    Ngưỡng 20% (giảm từ 30%).
    """
    sentences = [s.strip() for s in re.split(r'[.!?\n]+', text) if len(s.strip()) > 20]
    if len(sentences) < 5:
        return {'repetition_rate': 0.0, 'trigram_repetition_rate': 0.0, 'flagged': False}
    
    unique = set(sentences)
    repetition_rate = 1 - len(unique) / len(sentences)
    
    # 3-gram repetition check
    words = text.split()
    trigrams = [' '.join(words[i:i+3]) for i in range(len(words)-2)]
    unique_trigrams = set(trigrams)
    trigram_rep = 1 - len(unique_trigrams) / len(trigrams) if trigrams else 0
    
    flagged = repetition_rate > threshold or trigram_rep > 0.35
    
    return {
        'repetition_rate': round(repetition_rate, 3),
        'trigram_repetition_rate': round(trigram_rep, 3),
        'flagged': flagged
    }

def check_type_token_ratio(text: str, threshold: float = 0.25) -> bool:
    """Type-Token Ratio thấp = từ vựng nghèo = có thể keyword stuffing."""
    words = re.findall(r'\b\w+\b', text.lower())
    if len(words) < 50:
        return False
    ttr = len(set(words)) / len(words)
    return ttr < threshold
