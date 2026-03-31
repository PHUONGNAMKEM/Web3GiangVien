import torch
import torch.nn.functional as F
from transformers import AutoModel, AutoTokenizer
from utils.text_preprocessing import extract_requirement_hits, normalize_text


class PhoBertAnalyzer:
    """
    Real AI Analyzer utilizing VinAI's PhoBERT to extract semantic embeddings
    and perform cosine similarity against requirements.
    """

    def __init__(self) -> None:
        self.model_name = "vinai/phobert-base"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading {self.model_name} onto {self.device}...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModel.from_pretrained(self.model_name).to(self.device)
        self.model.eval()

    def _get_embedding(self, text: str):
        # Tokenize with max length for PhoBERT
        inputs = self.tokenizer(text, return_tensors='pt', padding=True, truncation=True, max_length=256).to(self.device)
        with torch.no_grad():
            outputs = self.model(**inputs)
        # Using [CLS] token embedding for sentence summary
        return outputs.last_hidden_state[:, 0, :]

    def analyze(self, text: str, topic_requirements: list[str] | None = None) -> dict:
        topic_requirements = topic_requirements or []
        clean_text = normalize_text(text)

        if not clean_text:
            return {
                "score": 0.0,
                "feedback": "No content provided.",
                "issues": ["Empty report content"],
                "model": self.model_name
            }

        hits = extract_requirement_hits(clean_text, topic_requirements)
        base_score = min(8.0, 4.0 + len(clean_text) / 800.0)
        
        bonus = 0.0
        semantic_hits = 0
        issues = []

        if topic_requirements:
            doc_emb = self._get_embedding(clean_text)
            
            for req in topic_requirements:
                req_norm = normalize_text(req)
                req_emb = self._get_embedding(req_norm)
                
                sim = F.cosine_similarity(doc_emb, req_emb).item()
                if sim > 0.45:  # Threshold for semantic matching
                    semantic_hits += 1

            total_hits = max(hits, semantic_hits)
            bonus = 2.0 * min(1.0, (total_hits / len(topic_requirements)))
            
            if total_hits == 0:
                issues.append("Báo cáo thiếu các kiến thức chuyên môn cốt lõi của đề tài.")

        score = round(min(10.0, base_score + bonus), 2)

        if len(clean_text) < 300:
            issues.append("Nội dung báo cáo quá ngắn, cần bổ sung thêm chi tiết kỹ thuật.")

        feedback = "Nội dung đạt yêu cầu."
        if issues:
            feedback = "Cần cải thiện: " + "; ".join(issues)

        return {
            "score": score,
            "feedback": feedback,
            "issues": issues,
            "model": self.model_name,
        }
