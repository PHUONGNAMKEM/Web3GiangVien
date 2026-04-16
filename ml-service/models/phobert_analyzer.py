import time
import logging
import torch
import torch.nn.functional as F
from transformers import AutoModel, AutoTokenizer
from utils.text_preprocessing import extract_requirement_hits, normalize_text
from utils.pdf_chunker import chunk_text

logger = logging.getLogger('ml-service')


class PhoBertAnalyzer:
    """
    Real AI Analyzer utilizing VinAI's PhoBERT to extract semantic embeddings
    and perform cosine similarity against requirements.
    """

    def __init__(self) -> None:
        self.model_name = "vinai/phobert-base"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"[AI] Loading {self.model_name} onto {self.device}...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModel.from_pretrained(self.model_name).to(self.device)
        self.model.eval()
        logger.info(f"[AI] {self.model_name} loaded successfully")

    def _get_embedding(self, text: str):
        # Tokenize with max length for PhoBERT
        inputs = self.tokenizer(text, return_tensors='pt', padding=True, truncation=True, max_length=256).to(self.device)
        with torch.no_grad():
            outputs = self.model(**inputs)
        # Using [CLS] token embedding for sentence summary
        return outputs.last_hidden_state[:, 0, :]

    def analyze(self, text: str, topic_requirements: list[str] | None = None) -> dict:
        start_time = time.time()
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
                logger.debug(f"[AI] Requirement '{req[:30]}...' similarity={sim:.4f}")
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

        elapsed = int((time.time() - start_time) * 1000)
        logger.info(f"[AI] Report analysis completed | score={score} | requirements={len(topic_requirements)} | textLength={len(clean_text)} | time={elapsed}ms")

        return {
            "score": score,
            "feedback": feedback,
            "issues": issues,
            "model": self.model_name,
        }

    def analyze_with_rubrics(self, text: str, rubrics: list[dict]) -> dict:
        """
        Phân tích text theo từng tiêu chí Rubrics, SỬ DỤNG CHUNKING.
        
        Flow:
        1. Chunk text → danh sách chunks
        2. Embed tất cả chunks
        3. Embed tất cả tiêu chí (TenTieuChi + MoTa + GoiYChoAI)
        4. Tính similarity matrix [chunks x criteria]
        5. Với MỖI tiêu chí → lấy MAX similarity → đó là chunk phản ánh tốt nhất
        6. Tính điểm + feedback
        """
        start_time = time.time()
        clean_text = normalize_text(text)

        if not clean_text:
            return {
                "score": 0.0,
                "feedback": "Không có nội dung để phân tích.",
                "rubrics_result": [],
                "chunks_info": [],
                "model": self.model_name
            }

        # === BƯỚC 1: CHUNKING ===
        chunks = chunk_text(clean_text)
        logger.info(f"[AI] Rubrics chunking | chunks={len(chunks)} | criteria={len(rubrics)} | textLength={len(clean_text)}")

        # === BƯỚC 2: EMBED TẤT CẢ CHUNKS ===
        chunk_embeddings = []
        for chunk in chunks:
            # Truncate nội dung chunk nếu quá dài (PhoBERT max 256 tokens)
            chunk_content = chunk.content[:2000] if len(chunk.content) > 2000 else chunk.content
            emb = self._get_embedding(chunk_content)
            chunk_embeddings.append(emb)

        # === BƯỚC 3+4+5: EMBED TIÊU CHÍ + SIMILARITY MATRIX + MAX ===
        results = []
        total_weighted_score = 0

        for rubric in rubrics:
            # Tạo text đại diện cho tiêu chí (kết hợp GoiYChoAI)
            goi_y = rubric.get('GoiYChoAI', [])
            criteria_text = f"{rubric['TenTieuChi']} {rubric.get('MoTa', '')} {' '.join(goi_y)}"
            criteria_emb = self._get_embedding(normalize_text(criteria_text))

            # Tính similarity với TỪNG chunk
            chunk_similarities = []
            for i, chunk_emb in enumerate(chunk_embeddings):
                sim = F.cosine_similarity(chunk_emb, criteria_emb).item()
                chunk_similarities.append((i, sim))

            # === LẤY MAX SIMILARITY ===
            best_chunk_idx, best_sim = max(chunk_similarities, key=lambda x: x[1])
            best_chunk = chunks[best_chunk_idx]

            # Chuyển similarity → điểm (scale + clamp)
            diem_toi_da = rubric.get('DiemToiDa', 10)
            raw_score = max(0, min(diem_toi_da, best_sim * diem_toi_da * 1.3))
            score = round(raw_score, 2)

            # Trọng số
            trong_so = rubric.get('TrongSo', 0)
            if diem_toi_da > 0:
                total_weighted_score += score / diem_toi_da * trong_so

            # Feedback cho tiêu chí (dẫn chiếu chunk cụ thể)
            if best_sim > 0.6:
                nhan_xet = f"Tốt: '{best_chunk.heading}' thể hiện rõ nội dung '{rubric['TenTieuChi']}'"
            elif best_sim > 0.4:
                nhan_xet = f"Khá: Có đề cập '{rubric['TenTieuChi']}' tại '{best_chunk.heading}' nhưng chưa sâu"
            else:
                nhan_xet = f"Yếu: Thiếu nội dung liên quan đến '{rubric['TenTieuChi']}'"

            logger.debug(f"[AI] Criteria '{rubric['TenTieuChi']}' | bestSim={best_sim:.4f} | score={score} | chunk='{best_chunk.heading}'")

            results.append({
                "TenTieuChi": rubric['TenTieuChi'],
                "TrongSo": trong_so,
                "DiemToiDa": diem_toi_da,
                "AI_DiemTieuChi": score,
                "AI_NhanXetTieuChi": nhan_xet,
                "Similarity": round(best_sim, 4),
                "MatchedChunk": {
                    "index": best_chunk.index,
                    "heading": best_chunk.heading
                }
            })

        # Tổng điểm trên thang 10
        final_score = round(total_weighted_score / 10, 2)

        elapsed = int((time.time() - start_time) * 1000)
        logger.info(f"[AI] Rubrics analysis completed | score={final_score} | criteria={len(rubrics)} | chunks={len(chunks)} | time={elapsed}ms")

        return {
            "score": final_score,
            "rubrics_result": results,
            "chunks_info": [
                {
                    "index": c.index,
                    "heading": c.heading,
                    "char_count": c.char_count
                } for c in chunks
            ],
            "feedback": f"Phân tích {len(rubrics)} tiêu chí qua {len(chunks)} phần nội dung.",
            "model": self.model_name
        }
