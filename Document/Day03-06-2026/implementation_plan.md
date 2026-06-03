# Nâng cấp `analyze()` — Chunking toàn bộ PDF thay vì chỉ 256 tokens

## Vấn đề hiện tại

Khi giảng viên **không thiết lập Rubrics**, hệ thống gọi `analyze()` chỉ embed **1 lần duy nhất** với `max_length=256` → PhoBERT chỉ đọc **~150-200 từ đầu** (khoảng nửa trang PDF). Phần còn lại bị cắt bỏ hoàn toàn.

Trong khi đó, `analyze_with_rubrics()` đã có cơ chế chunking đọc **toàn bộ PDF** rất tốt.

## Mục tiêu

Áp dụng cơ chế **chunking tương tự** cho `analyze()` để đọc hết PDF, **giữ nguyên API contract** (input/output không thay đổi → không cần sửa frontend/backend).

---

## Proposed Changes

### [MODIFY] [phobert_analyzer.py](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/ml-service/models/phobert_analyzer.py)

#### Thay đổi trong method `analyze()` (dòng 44-110)

**Hiện tại:**
```python
doc_emb = self._get_embedding(clean_text)  # 1 lần, 256 tokens, bỏ phần còn lại

for req in topic_requirements:
    req_emb = self._get_embedding(req_norm)
    sim = F.cosine_similarity(doc_emb, req_emb).item()
    if sim > 0.45:
        semantic_hits += 1
```

**Đề xuất:**
```python
# Chunk text giống analyze_with_rubrics()
chunks = chunk_text(clean_text)

# Embed tất cả chunks
chunk_embeddings = []
for chunk in chunks:
    chunk_content = chunk.content[:2000] if len(chunk.content) > 2000 else chunk.content
    emb = self._get_embedding(chunk_content)
    chunk_embeddings.append(emb)

for req in topic_requirements:
    req_emb = self._get_embedding(req_norm)
    # Tìm MAX similarity across ALL chunks (thay vì chỉ 1 embedding)
    best_sim = max(
        F.cosine_similarity(chunk_emb, req_emb).item()
        for chunk_emb in chunk_embeddings
    )
    if best_sim > 0.45:
        semantic_hits += 1
```

#### Logic chi tiết:

1. Gọi `chunk_text(clean_text)` để chia document thành chunks theo heading (Chương, Mục, Sub-section) — **tái sử dụng code đã có**
2. Embed **từng chunk** riêng biệt (mỗi chunk ≤ 256 tokens)
3. Khi so sánh với mỗi requirement → lấy **MAX similarity** across tất cả chunks
4. Ngưỡng `> 0.45` giữ nguyên
5. Phần tính điểm (base_score, keyword_density, semantic_bonus, repetition_penalty) **giữ nguyên hoàn toàn**
6. Output format **không đổi** → frontend/backend không cần sửa

#### Những gì KHÔNG thay đổi:
- `_get_embedding()` — giữ nguyên
- `_calc_repetition_ratio()` — giữ nguyên (vẫn chạy trên toàn bộ text)
- `extract_requirement_hits()` — giữ nguyên (keyword matching trên toàn bộ text, không bị truncate)
- `analyze_with_rubrics()` — giữ nguyên hoàn toàn
- API request/response schema — giữ nguyên
- Frontend/Backend — **không cần sửa**

---

## Phạm vi ảnh hưởng

| Component | Cần sửa? | Lý do |
|---|---|---|
| `phobert_analyzer.py` | ✅ Sửa method `analyze()` | Thêm chunking |
| `pdf_chunker.py` | ❌ Không | Đã có sẵn, tái sử dụng |
| `text_preprocessing.py` | ❌ Không | Không thay đổi |
| `routes/analyze.py` | ❌ Không | API contract giữ nguyên |
| Backend Node.js | ❌ Không | Không thay đổi |
| Frontend React | ❌ Không | Không thay đổi |

---

## Verification Plan

### Automated Tests
- Chạy `ml-service` (uvicorn port 8001)
- Gọi POST `/analyze-report` qua Postman với text dài (>1000 từ) + topic_requirements
- So sánh kết quả trước/sau:
  - Score nên chính xác hơn (vì đọc hết nội dung)
  - Response format phải giống y hệt (không breaking change)

### Manual Verification
- Trên giao diện SubmissionReview, chọn đề tài **không có Rubrics**
- Bấm AI chấm điểm
- Kiểm tra score/feedback có phản ánh nội dung toàn bộ báo cáo
