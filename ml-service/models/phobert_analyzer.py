import time
import logging
import numpy as np
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

    def _calc_repetition_ratio(self, text: str) -> float:
        """Tính tỷ lệ câu bị lặp lại — phát hiện copy-paste. Trả về 0.0 (không lặp) đến 1.0 (toàn lặp)."""
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20]
        if not sentences:
            return 0.0
        unique = set(s.lower() for s in sentences)
        return 1.0 - (len(unique) / len(sentences))

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

        # Phát hiện copy-paste: penalize nội dung lặp lại
        repetition_ratio = self._calc_repetition_ratio(clean_text)
        repetition_penalty = repetition_ratio * 3.0  # tối đa -3.0 điểm

        semantic_hits = 0
        semantic_bonus = 0.0
        issues = []

        if topic_requirements:
            # Chunk toàn bộ text để đọc hết nội dung (không chỉ 256 tokens đầu)
            chunks = chunk_text(clean_text)
            chunk_embeddings = []
            for chunk in chunks:
                chunk_content = chunk.content[:2000] if len(chunk.content) > 2000 else chunk.content
                emb = self._get_embedding(chunk_content)
                chunk_embeddings.append(emb)
            logger.info(f"[AI] analyze() chunking | chunks={len(chunks)} | requirements={len(topic_requirements)}")

            for req in topic_requirements:
                req_norm = normalize_text(req)
                req_emb = self._get_embedding(req_norm)
                # Lấy MAX similarity across tất cả chunks
                best_sim = max(
                    F.cosine_similarity(chunk_emb, req_emb).item()
                    for chunk_emb in chunk_embeddings
                )
                logger.debug(f"[AI] Requirement '{req[:30]}...' bestSimilarity={best_sim:.4f} (across {len(chunks)} chunks)")
                if best_sim > 0.45:
                    semantic_hits += 1

            total_hits = max(hits, semantic_hits)
            keyword_density_score = (total_hits / len(topic_requirements)) * 1.5
            semantic_bonus = 2.0 * min(1.0, (total_hits / len(topic_requirements)))

            if total_hits == 0:
                issues.append("Báo cáo thiếu các kiến thức chuyên môn cốt lõi của đề tài.")
        else:
            keyword_density_score = 0.5

        # Base cố định 5.0 — không phụ thuộc độ dài văn bản
        base_score = 5.0 + keyword_density_score - repetition_penalty

        if repetition_ratio > 0.3:
            issues.append(f"Phát hiện nội dung lặp lại ({repetition_ratio:.0%}) — kiểm tra copy-paste.")

        score = round(min(10.0, max(0.0, base_score + semantic_bonus)), 2)

        if len(clean_text) < 300:
            issues.append("Nội dung báo cáo quá ngắn, cần bổ sung thêm chi tiết kỹ thuật.")

        feedback = "Nội dung đạt yêu cầu."
        if issues:
            feedback = "Cần cải thiện: " + "; ".join(issues)

        elapsed = int((time.time() - start_time) * 1000)
        logger.info(f"[AI] Report analysis completed | score={score} | requirements={len(topic_requirements)} | repetition={repetition_ratio:.2f} | textLength={len(clean_text)} | time={elapsed}ms")

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

            # === KEYWORD HIT RATE từ GoiYChoAI (trực tiếp trên chunk tốt nhất) ===
            goi_y_lower = [kw.lower() for kw in goi_y]
            if goi_y_lower:
                chunk_content_lower = best_chunk.content.lower()
                keyword_hits = sum(1 for kw in goi_y_lower if kw in chunk_content_lower)
                keyword_hit_rate = keyword_hits / len(goi_y_lower)
            else:
                keyword_hit_rate = 0.5  # neutral nếu GV không cung cấp keywords

            # Blend: 70% semantic similarity + 30% keyword hit rate
            blended_sim = 0.7 * best_sim + 0.3 * keyword_hit_rate
            logger.info(f"[AI] Criteria '{rubric['TenTieuChi']}' | bestSim={best_sim:.4f} | keywordHitRate={keyword_hit_rate:.4f} | blended={blended_sim:.4f}")

            # Chuyển blended_sim → điểm (scale + clamp)
            diem_toi_da = rubric.get('DiemToiDa', 10)
            raw_score = max(0, min(diem_toi_da, blended_sim * diem_toi_da * 1.3))
            score = round(raw_score, 2)

            # Trọng số
            trong_so = rubric.get('TrongSo', 0)
            if diem_toi_da > 0:
                total_weighted_score += score / diem_toi_da * trong_so

            # === ADAPTIVE THRESHOLD dựa trên phân phối similarity của tiêu chí này ===
            all_sims = [s for _, s in chunk_similarities]
            mean_sim = float(np.mean(all_sims))
            std_sim  = float(np.std(all_sims))
            good_threshold = min(0.75, mean_sim + 0.5 * std_sim)
            ok_threshold   = max(0.20, mean_sim - 0.5 * std_sim)

            # Feedback cho tiêu chí (dẫn chiếu chunk cụ thể)
            if best_sim >= good_threshold:
                nhan_xet = f"Tốt: '{best_chunk.heading}' thể hiện rõ nội dung '{rubric['TenTieuChi']}'"
            elif best_sim >= ok_threshold:
                nhan_xet = f"Khá: Có đề cập '{rubric['TenTieuChi']}' tại '{best_chunk.heading}' nhưng chưa sâu"
            else:
                nhan_xet = f"Yếu: Thiếu nội dung liên quan đến '{rubric['TenTieuChi']}'"

            # Log top-3 chunks cho tiêu chí này để debug
            sorted_sims = sorted(chunk_similarities, key=lambda x: x[1], reverse=True)[:3]
            top3_str = ' | '.join([f"chunk{idx}='{chunks[idx].heading}'({sim:.4f})" for idx, sim in sorted_sims])
            logger.info(f"[AI] Criteria '{rubric['TenTieuChi']}' | bestSim={best_sim:.4f} | blended={blended_sim:.4f} | score={score} | goodThr={good_threshold:.3f} | okThr={ok_threshold:.3f} | BEST='{best_chunk.heading}' | TOP3: {top3_str}")

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

        # === TẠO PHẢN HỒI TRỌNG TÂM (dựa trên điểm thực tế + nhận xét tiêu chí) ===
        weak_points = [r['TenTieuChi'] for r in results if r['AI_NhanXetTieuChi'].startswith('Yếu:')]
        ok_points = [r['TenTieuChi'] for r in results if r['AI_NhanXetTieuChi'].startswith('Khá:')]
        good_points = [r['TenTieuChi'] for r in results if r['AI_NhanXetTieuChi'].startswith('Tốt:')]

        # Ưu tiên final_score làm tín hiệu chính — tránh mâu thuẫn điểm thấp nhưng khen cao
        if final_score < 5.0:
            detail = ""
            if weak_points:
                detail = f" Yếu: {', '.join(weak_points)}."
            elif ok_points:
                detail = f" Cần cải thiện: {', '.join(ok_points)}."
            feedback_str = f"Báo cáo chưa đạt yêu cầu ({final_score}/10). Cần bổ sung và cải thiện nội dung.{detail}"
        elif final_score < 7.0:
            issues = weak_points + ok_points
            if issues:
                feedback_str = f"Báo cáo đạt mức trung bình ({final_score}/10). Cần cải thiện: {', '.join(issues)}."
            else:
                feedback_str = f"Báo cáo đạt mức trung bình ({final_score}/10). Có thể nâng cao chất lượng nội dung thêm."
        elif final_score < 8.5:
            if weak_points:
                feedback_str = f"Báo cáo khá ({final_score}/10). Cần khắc phục: {', '.join(weak_points)}."
            else:
                feedback_str = f"Báo cáo khá tốt ({final_score}/10), đáp ứng phần lớn tiêu chí."
        else:
            feedback_str = f"Báo cáo tốt ({final_score}/10), đáp ứng đầy đủ các tiêu chí Rubrics."

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
            "feedback": feedback_str,
            "model": self.model_name
        }
