from typing import Any
import logging
import torch
from sentence_transformers import SentenceTransformer, util

logger = logging.getLogger('ml-service')


class SbertMatcher:
    """
    Real SBERT Matcher utilizing paraphrase-multilingual-MiniLM-L12-v2 
    as requested for superior Vietnamese handling.
    """

    def __init__(self) -> None:
        self.model_name = "paraphrase-multilingual-MiniLM-L12-v2"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"[AI] Loading SBERT model '{self.model_name}' onto {self.device}...")
        self.model = SentenceTransformer(self.model_name).to(self.device)
        logger.info(f"[AI] SBERT model '{self.model_name}' loaded successfully")

    def match(self, student: dict[str, Any], topics: list[dict[str, Any]]) -> list[dict[str, Any]]:
        gpa = float(student.get("gpa", 0.0))
        major_scores = student.get("major_scores", {}) or {}
        
        # Determine student profile text based on strong skills
        strong_skills = [major for major, score in major_scores.items() if float(score) >= 7.0]
        skill_text = "Thế mạnh của sinh viên: " + ", ".join(strong_skills) if strong_skills else "Chưa phân hóa kỹ năng chuyên môn."
        
        # Pre-compute student vector
        student_vector = self.model.encode(skill_text, convert_to_tensor=True)

        recommendations: list[dict[str, Any]] = []
        for topic in topics:
            reqs = topic.get("requirements", [])
            req_text = "Đề tài yêu cầu kỹ năng thuật: " + ", ".join(reqs) if reqs else "Đề tài cơ bản, không nặng về kỹ năng cụ thể."
            
            # Encode topic requirements
            topic_vector = self.model.encode(req_text, convert_to_tensor=True)

            # Compute Cosine Similarity between skills and requirements
            cosine_score = util.cos_sim(student_vector, topic_vector).item()

            # Normalize and Combine logic
            semantic_score = max(0.0, cosine_score)
            base_gpa_score = min(1.0, 0.4 + gpa / 10.0) # Base bias for higher GPA students
            
            # Final matching equation: 60% Semantic alignment + 40% Academic capacity
            match_score = (semantic_score * 0.6) + (base_gpa_score * 0.4)
            match_score = max(0.0, min(1.0, match_score))

            recommendations.append(
                {
                    "topic_id": topic.get("topic_id") or topic.get("_id") or "unknown",
                    "match_score": round(match_score, 4),
                    "model": self.model_name,
                }
            )

        # Sort highest matches first
        recommendations.sort(key=lambda x: x["match_score"], reverse=True)
        return recommendations
