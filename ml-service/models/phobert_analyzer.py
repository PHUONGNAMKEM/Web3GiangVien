import time
import logging
import torch
import torch.nn.functional as F
from transformers import AutoModel, AutoTokenizer
from utils.text_preprocessing import extract_requirement_hits, normalize_text
from utils.pdf_chunker import chunk_text
from utils.progress import init_job, update_job, finish_job

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

    # PhoBERT-base giới hạn cứng 256 token/forward. Để đọc HẾT chunk dài,
    # ta trượt cửa sổ 254 token (chừa 2 token đặc biệt <s>/</s>) rồi mean-pool.
    MAX_TOKENS = 256
    MAX_WINDOWS = 12  # trần số cửa sổ/chunk — chống chunk khổng lồ làm chậm

    def _get_embedding(self, text: str):
        """
        Trả về embedding [1, hidden]. Nếu text vượt 256 token → trượt cửa sổ,
        embed từng cửa sổ và lấy trung bình → KHÔNG bỏ sót phần sau của chunk.
        """
        bos = self.tokenizer.bos_token_id if self.tokenizer.bos_token_id is not None else self.tokenizer.cls_token_id
        eos = self.tokenizer.eos_token_id if self.tokenizer.eos_token_id is not None else self.tokenizer.sep_token_id

        ids = self.tokenizer.encode(text or "", add_special_tokens=False)
        if not ids:
            ids = [self.tokenizer.unk_token_id or 3]

        window = self.MAX_TOKENS - 2  # chừa chỗ cho <s> và </s>
        embeddings = []
        for start in range(0, len(ids), window):
            if len(embeddings) >= self.MAX_WINDOWS:
                logger.warning(f"[AI] _get_embedding: chunk >{self.MAX_WINDOWS} cửa sổ — cắt bớt phần dư")
                break
            piece = [bos] + ids[start:start + window] + [eos]
            input_ids = torch.tensor([piece], device=self.device)
            attn = torch.ones_like(input_ids)
            with torch.no_grad():
                outputs = self.model(input_ids=input_ids, attention_mask=attn)
            # [CLS] token embedding của cửa sổ này
            embeddings.append(outputs.last_hidden_state[:, 0, :])

        # Mean-pool qua các cửa sổ → 1 vector đại diện toàn chunk
        return torch.mean(torch.stack(embeddings, dim=0), dim=0)

    def analyze(self, text: str, topic_requirements: list[str] | None = None, job_id: str | None = None) -> dict:
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
            # Chunk trên TEXT GỐC (giữ \n để detect heading); normalize + window-embed từng chunk
            chunks = chunk_text(text)
            init_job(job_id, total=len(chunks) + len(topic_requirements), chunks=len(chunks))
            chunk_embeddings = []
            for i, chunk in enumerate(chunks):
                emb = self._get_embedding(normalize_text(chunk.content))
                chunk_embeddings.append(emb)
                update_job(job_id, current=i + 1, stage='embedding_chunks')
            logger.info(f"[AI] analyze() chunking | chunks={len(chunks)} | requirements={len(topic_requirements)}")

            for j, req in enumerate(topic_requirements):
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
                update_job(job_id, current=len(chunks) + j + 1, stage='scoring')

            total_hits = max(hits, semantic_hits)
            # Trần: base 5.0 + keyword 1.5 + semantic 2.5 = 9.0 (luồng không rubrics tối đa 9)
            keyword_density_score = (total_hits / len(topic_requirements)) * 1.5
            semantic_bonus = 2.5 * min(1.0, (total_hits / len(topic_requirements)))

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
        finish_job(job_id)

        return {
            "score": score,
            "feedback": feedback,
            "issues": issues,
            "model": self.model_name,
        }

    def analyze_with_rubrics(self, text: str, rubrics: list[dict], job_id: str | None = None) -> dict:
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

        # === BƯỚC 1: CHUNKING (trên TEXT GỐC giữ \n để detect heading) ===
        chunks = chunk_text(text)
        init_job(job_id, total=len(chunks) + len(rubrics), chunks=len(chunks))
        logger.info(f"[AI] Rubrics chunking | chunks={len(chunks)} | criteria={len(rubrics)} | textLength={len(clean_text)}")

        # === BƯỚC 2: EMBED TẤT CẢ CHUNKS (normalize + window-embed, đọc hết chunk) ===
        chunk_embeddings = []
        for i, chunk in enumerate(chunks):
            emb = self._get_embedding(normalize_text(chunk.content))
            chunk_embeddings.append(emb)
            update_job(job_id, current=i + 1, stage='embedding_chunks')

        # === BƯỚC 3+4+5: EMBED TIÊU CHÍ + SIMILARITY MATRIX + MAX ===
        results = []
        total_weighted_score = 0

        for ridx, rubric in enumerate(rubrics):
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

            # Chuyển blended_sim → điểm (scale 1.5 + clamp ≤ DiemToiDa, không tràn >10)
            diem_toi_da = rubric.get('DiemToiDa', 10)
            raw_score = max(0, min(diem_toi_da, blended_sim * diem_toi_da * 1.5))
            score = round(raw_score, 2)

            # Trọng số
            trong_so = rubric.get('TrongSo', 0)
            if diem_toi_da > 0:
                total_weighted_score += score / diem_toi_da * trong_so

            # === NHẬN XÉT BÁM ĐIỂM THỰC TẾ của tiêu chí (không dùng adaptive threshold —
            # adaptive hỏng khi chỉ 1 chunk: std=0 → luôn "Tốt"). score_ratio ∈ [0,1] ===
            score_ratio = (score / diem_toi_da) if diem_toi_da > 0 else 0.0
            if score_ratio >= 0.7:
                nhan_xet = f"Tốt: '{best_chunk.heading}' thể hiện rõ nội dung '{rubric['TenTieuChi']}'"
            elif score_ratio >= 0.5:
                nhan_xet = f"Khá: Có đề cập '{rubric['TenTieuChi']}' tại '{best_chunk.heading}' nhưng chưa sâu"
            else:
                nhan_xet = f"Yếu: Thiếu nội dung liên quan đến '{rubric['TenTieuChi']}'"

            # Log top-3 chunks cho tiêu chí này để debug
            sorted_sims = sorted(chunk_similarities, key=lambda x: x[1], reverse=True)[:3]
            top3_str = ' | '.join([f"chunk{idx}='{chunks[idx].heading}'({sim:.4f})" for idx, sim in sorted_sims])
            logger.info(f"[AI] Criteria '{rubric['TenTieuChi']}' | bestSim={best_sim:.4f} | blended={blended_sim:.4f} | score={score} | ratio={score_ratio:.2f} | BEST='{best_chunk.heading}' | TOP3: {top3_str}")

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
            update_job(job_id, current=len(chunks) + ridx + 1, stage='scoring')

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

        finish_job(job_id)

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
