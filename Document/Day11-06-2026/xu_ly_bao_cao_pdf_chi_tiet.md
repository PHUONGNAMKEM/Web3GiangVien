# Quy Trình Xử Lý Báo Cáo PDF → PhoBERT Chấm Điểm → Nhận Xét (Chi Tiết)

> [!NOTE]
> Tài liệu mô tả **toàn bộ hành trình** của một file báo cáo PDF: từ lúc đọc, chia nhỏ, đưa qua PhoBERT để chấm, đến lúc sinh nhận xét. Bao gồm **2 luồng** (CÓ và KHÔNG có Rubrics) và **chức năng nhận xét mới bằng Gemini (LLM)**.
> Phản ánh trạng thái mã nguồn **sau các cập nhật ngày 11/06/2026** (đã sửa bug heading, đọc hết chunk, hệ số 1.5, trần 9, cache bền, thanh tiến độ %).

---

## 1. Bức Tranh Tổng Quát

```mermaid
flowchart TD
    A["📄 PDF báo cáo (IPFS)"] --> B["Trích xuất text<br/>pdfplumber + OCR fallback"]
    B --> C["Lưu ExtractedText vào DB (BaoCao)"]
    C --> D{"Có cache AI hợp lệ?<br/>(textHash khớp)"}
    D -- "Có" --> Z["Khôi phục kết quả cũ<br/>(KHÔNG gọi lại AI)"]
    D -- "Không" --> E["chunk_text() — chia nhỏ"]
    E --> F["_get_embedding() — sliding window<br/>biến mỗi chunk thành vector PhoBERT"]
    F --> G{"Đề tài có Rubrics?"}
    G -- "Không" --> H["analyze()"]
    G -- "Có" --> I["analyze_with_rubrics()"]
    H --> J["Điểm + Feedback (hard-code)"]
    I --> J
    J --> K{"GV bật toggle<br/>Nhận xét AI (Gemini)?"}
    K -- "Không" --> L["Hiện nhận xét hard-code PhoBERT"]
    K -- "Có" --> M["Gemini diễn giải điểm<br/>→ nhận xét tự nhiên"]
    L --> N["Lưu cache (phiên + DB)"]
    M --> N
```

**Phân vai rõ ràng:**

| Công đoạn | Ai làm | Ghi chú |
|-----------|--------|---------|
| Đọc PDF → text | Code (`pdfplumber`/OCR) | Đọc đủ mọi trang |
| Chia chunk | Code (`pdf_chunker.py`) | Phủ 100% nội dung |
| Hiểu nghĩa tiếng Việt | **PhoBERT (AI)** | Tạo embedding 768 chiều |
| Đo độ giống | Công thức cosine similarity | Chuẩn toán học |
| Quy ra điểm | Code (hệ số, base, blend) | Không phải AI |
| Nhận xét mặc định | Code (if/else theo điểm) | Hard-code |
| **Nhận xét nâng cao** | **Gemini (LLM)** ✨ | Mới — diễn giải điểm thành văn xuôi |

---

## 2. Trích Xuất Text Từ PDF — `pdf_extractor.py`

```mermaid
flowchart LR
    A["PDF bytes"] --> B["pdfplumber: đọc TỪNG trang"]
    B --> C{"Text ≥ 200 ký tự?"}
    C -- "Có" --> D["method = native"]
    C -- "Không" --> E["OCR mọi trang<br/>(pytesseract vie+eng)"]
    E --> F{"OCR ≥ 50 ký tự?"}
    F -- "Có" --> G["method = ocr"]
    F -- "Không" --> H["method = failed"]
```

| Đặc điểm | Chi tiết |
|----------|----------|
| Đọc đủ trang | Lặp qua **tất cả** `pdf.pages`, nối bằng `\n\n` |
| PDF scan (ảnh) | Tự fallback OCR toàn bộ trang |
| Cảnh báo bảo mật | Phát hiện text ẩn (font < 1px), dấu hiệu prompt injection |
| Kết quả lưu | `ExtractedText`, `PageCount`, `ExtractionMethod`, `ExtractionWarnings` |

> [!IMPORTANT]
> **Đảm bảo đọc 100% nội dung, không sót trang** — kể cả PDF scan (qua OCR). Số trang đọc được hiển thị trên UI ("Hệ thống đã đọc N trang bài làm").

---

## 3. Chia Nhỏ Nội Dung (Chunking) — `pdf_chunker.py`

> [!IMPORTANT]
> **Bản sửa 11/06:** trước đây `normalize_text()` được gọi **trước** `chunk_text()` → xóa mọi `\n` → regex heading không bao giờ khớp (chunk luôn tên "Khối N" vô nghĩa). Nay `chunk_text(text)` chạy trên **text gốc giữ `\n`**, chỉ `normalize_text()` **từng chunk** lúc embed → heading detection sống lại.

### Thứ tự ưu tiên chia chunk

```mermaid
flowchart TD
    A["Text gốc (giữ \n)"] --> B["_detect_headings()"]
    B --> C{">= 2 heading?"}
    C -- "Có" --> D["Chia theo heading thật<br/>(Chương, PHẦN, I., 1.1, a)...)"]
    C -- "Không" --> E["_split_by_paragraphs()<br/>(double newline, ≤400 từ/chunk)"]
    E --> F{"> 1 chunk?"}
    F -- "Không" --> G["_split_by_lines()<br/>(single newline)"]
    G --> H{"> 1 chunk?"}
    H -- "Không" --> I["_force_split_by_chars()<br/>(cắt mỗi ≤2000 ký tự)"]
```

| Mức | Heading nhận diện |
|-----|-------------------|
| 1 | `Chương X`, `CHƯƠNG`, `Chapter`, `PHẦN I/1`, `MỞ ĐẦU`, `KẾT LUẬN`, `TÀI LIỆU THAM KHẢO`... |
| 2 | `X.Y` (1.1, 2.3), `Phần X`, `Mục X`, số La Mã `I.` `II.` `III.` |
| 3 | `X.Y.Z`, `a)` `b)`, `a.` `b.`, `1)` `2)` |

> [!NOTE]
> **Phủ 100% nội dung, không sót:** nếu không detect được heading, hệ thống lần lượt fallback xuống paragraph → line → **force-split theo ký tự** (cắt tại dấu câu gần nhất). Force-split chạy liên tục từ đầu đến cuối text nên **không mất chữ nào**.

---

## 4. Biến Chunk Thành Vector — `_get_embedding()` (Sliding Window)

> [!IMPORTANT]
> **Bản sửa 11/06:** PhoBERT-base giới hạn cứng **256 token/lần forward**. Trước đây chunk dài bị cắt còn 256 token → phần sau bị bỏ. Nay dùng **cửa sổ trượt**: chunk dài được cắt thành nhiều cửa sổ ≤254 token, embed từng cửa sổ rồi **lấy trung bình (mean-pool)** → PhoBERT thật sự "đọc hết" chunk.

```mermaid
flowchart LR
    A["Chunk (có thể dài)"] --> B["Tokenize toàn bộ"]
    B --> C{"> 254 token?"}
    C -- "Không" --> D["Embed 1 lần → vector [CLS]"]
    C -- "Có" --> E["Cắt nhiều cửa sổ 254 token"]
    E --> F["Embed từng cửa sổ"]
    F --> G["Mean-pool → 1 vector đại diện"]
```

Kết quả: mỗi chunk → 1 vector 768 chiều đại diện cho toàn bộ ý nghĩa của nó.

---

## 5. LUỒNG 1 — KHÔNG CÓ RUBRICS: `analyze()`

> Dùng khi đề tài **không** gắn Rubrics. Giống "chấm nhanh": kiểm tra bài có đúng chủ đề không.

### Các thành phần điểm

| # | Thành phần | Cách tính | Khoảng |
|---|-----------|-----------|--------|
| 1 | Keyword hit | Đếm `topic_requirements` xuất hiện trong text (substring) | — |
| 2 | Semantic hit | Mỗi requirement so cosine với MAX của tất cả chunks; `> 0.45` = hit | — |
| 3 | `keyword_density_score` | `(total_hits / số_req) × 1.5` | 0 → **1.5** |
| 4 | `semantic_bonus` | `2.5 × min(1, total_hits/số_req)` | 0 → **2.5** |
| 5 | `repetition_penalty` | `tỷ_lệ_câu_lặp × 3.0` | 0 → −3.0 |

### Công thức

```
total_hits   = max(keyword_hits, semantic_hits)
base_score   = 5.0 + keyword_density_score − repetition_penalty
final_score  = clamp(base_score + semantic_bonus, 0, 10)
```

| Thành phần | Giá trị |
|-----------|---------|
| Base cố định | **5.0** (điểm sàn) |
| + keyword tối đa | +1.5 |
| + semantic tối đa | +2.5 |
| **Trần thực tế** | **= 9.0** |

> [!NOTE]
> **Bản sửa 11/06:** trần nâng từ **8.5 → 9.0** (`semantic_bonus` 2.0→2.5). Theo yêu cầu, luồng không rubrics **không vượt 9.0** (để dành 9–10 cho luồng rubrics có chấm chi tiết).

### Nhận xét (hard-code)

- Có vấn đề → `"Cần cải thiện: " + danh sách issues`
- Không → `"Nội dung đạt yêu cầu."`

Issues khả dĩ: thiếu kiến thức cốt lõi (`total_hits == 0`), lặp nội dung (`repetition > 0.3`), bài quá ngắn (`< 300` ký tự).

---

## 6. LUỒNG 2 — CÓ RUBRICS: `analyze_with_rubrics()`

> Dùng khi đề tài gắn Rubrics (danh sách tiêu chí + trọng số). Giống "chấm theo barem".

```mermaid
flowchart TD
    A["Text → N chunks → N vector"] --> F["Ma trận similarity N×M"]
    B["M tiêu chí → M vector<br/>(Tên + Mô tả + GợiÝchoAI)"] --> F
    F --> G["Mỗi tiêu chí: lấy MAX similarity<br/>→ chunk phản ánh tốt nhất"]
    G --> H["blended_sim = 0.7×sim + 0.3×keywordRate"]
    H --> I["score = clamp(blended × DiemToiDa × 1.5, 0, DiemToiDa)"]
    I --> J["Tổng có trọng số → final_score"]
```

### Bước tính điểm mỗi tiêu chí

```
criteria_text = TenTieuChi + MoTa + GoiYChoAI
blended_sim   = 0.7 × best_sim + 0.3 × keyword_hit_rate
score         = clamp(blended_sim × DiemToiDa × 1.5, 0, DiemToiDa)
```

| Thành phần | Trọng số |
|-----------|---------|
| Cosine similarity (PhoBERT) | 70% |
| Keyword hit rate (GoiYChoAI) | 30% |

> [!NOTE]
> **Bản sửa 11/06:** hệ số scale **1.3 → 1.5**. Phổ điểm mới (DiemToiDa = 10):

| blended_sim | điểm (×1.5) |
|-------------|-------------|
| 0.45 | 6.75 |
| 0.55 | 8.25 |
| 0.65 | 9.75 |
| ≥ 0.70 | 10.0 (clamp) |

### Tổng điểm có trọng số

```
weighted_i  = (score_i / DiemToiDa_i) × TrongSo_i
final_score = (Σ weighted_i) / 10
```

### Nhận xét TỪNG tiêu chí — theo điểm thực tế

> [!IMPORTANT]
> **Bản sửa 11/06:** bỏ "adaptive threshold" (mean±std). Lý do: khi chỉ 1 chunk → `std = 0` → luôn ra "Tốt" dù điểm thấp (mâu thuẫn). Nay bám **tỷ lệ điểm thật** `score_ratio = score / DiemToiDa`:

| Điều kiện | Nhận xét |
|-----------|---------|
| `score_ratio ≥ 0.7` | **Tốt:** thể hiện rõ nội dung |
| `score_ratio ≥ 0.5` | **Khá:** có đề cập nhưng chưa sâu |
| `< 0.5` | **Yếu:** thiếu nội dung liên quan |

### Nhận xét tổng hợp (theo `final_score`)

| final_score | Phản hồi |
|-------------|---------|
| < 5.0 | Chưa đạt yêu cầu + liệt kê tiêu chí Yếu/Khá |
| 5.0 – 6.99 | Trung bình + cần cải thiện |
| 7.0 – 8.49 | Khá tốt |
| ≥ 8.5 | Tốt, đáp ứng đầy đủ tiêu chí |

---

## 7. NHẬN XÉT NÂNG CAO BẰNG GEMINI (LLM) — *mới*

> [!NOTE]
> PhoBERT là mô hình **encoder** (chỉ hiểu nghĩa, không sinh văn bản). Nhận xét hard-code khá khô. Vì vậy bổ sung **Gemini** để *diễn giải* điểm + kết quả tiêu chí thành đoạn nhận xét tự nhiên kiểu giảng viên. **Gemini KHÔNG chấm điểm** — điểm vẫn 100% do PhoBERT.

### Cơ chế bật/tắt + chống tốn phí

```mermaid
flowchart TD
    A["GV bật toggle 'Nhận xét AI (Gemini)'"] --> B{"Đã có nhận xét LLM<br/>trong state/cache/DB?"}
    B -- "Có" --> C["Hiện ngay — KHÔNG gọi API"]
    B -- "Không" --> D["Gọi POST /api/ai/llm-feedback (1 lần)"]
    D --> E["Gemini sinh nhận xét"]
    E --> F["Lưu cache 3 tầng"]
    G["GV tắt toggle"] --> H["Hiện lại nhận xét hard-code PhoBERT"]
```

| Đặc điểm | Chi tiết |
|----------|----------|
| Model | `gemini-2.5-flash` (free tier, cấu hình qua `.env` `GEMINI_MODEL`) |
| Đầu vào | `score`, `isRubrics`, `rubricsResult` (hoặc `issues` nếu không rubrics), tên đề tài |
| Ràng buộc prompt | Không bịa nội dung, không đổi điểm, 3–5 câu tiếng Việt, không markdown |
| Tắt "thinking" | `thinkingConfig.thinkingBudget = 0` (tránh nhận xét bị cụt) |
| Fallback | Thiếu API key / lỗi / timeout → tự dùng nhận xét hard-code (`usedLLM=false`) |
| 2 luồng | Hỗ trợ cả CÓ và KHÔNG rubrics |

### Chống gọi lại API (cache 3 tầng)

| Tầng | Phạm vi | Mục đích |
|------|---------|----------|
| State + `aiCacheRef` | Trong phiên | Toggle qua lại không gọi lại |
| `BaoCao.AICache` (DB) | Bài **chưa chấm**, qua reload | Reload không gọi lại Gemini |
| `DiemSo.AI_LLM_Feedback` (DB) | Bài **đã chấm** | Mở lại đọc thẳng từ điểm đã lưu |

---

## 8. Cache Kết Quả AI (Không Chấm Lại Khi Reload)

> [!IMPORTANT]
> **Plan B (11/06):** trước đây reload trang là bài chưa chấm bị PhoBERT chấm lại (lãng phí) và Gemini có thể bị gọi lại (tốn phí). Nay lưu kết quả vào `BaoCao.AICache` kèm `textHash`.

```mermaid
flowchart TD
    A["GV mở bài"] --> B{"Đã chấm (DaCham)?"}
    B -- "Có" --> C["Đọc từ DiemSo (điểm + AI_LLM_Feedback)"]
    B -- "Không" --> D{"BaoCao.AICache có & textHash khớp?"}
    D -- "Có" --> E["Khôi phục — KHÔNG gọi AI"]
    D -- "Không" --> F["Gọi PhoBERT → lưu AICache"]
    F --> G["GV bật Gemini → cập nhật AICache.llmFeedback"]
```

> [!NOTE]
> `textHash` = SHA-256 của `ExtractedText`. SV **nộp lại bài** (nội dung đổi) → hash đổi → cache **tự vô hiệu** → chấm mới.

---

## 9. Thanh Tiến Độ % Thật (Job + Polling)

> [!NOTE]
> Thay spinner xoay vòng bằng **vòng tròn % thật** (gradient màu Google) + dòng "đã xử lý X/Y phần • N chunk • số trang".

```mermaid
flowchart LR
    A["Frontend sinh job_id"] --> B["Gọi analyze (kèm job_id)"]
    A --> C["Poll GET /analyze-progress/{job_id} mỗi 0.5s"]
    B --> D["ml-service cập nhật tiến độ<br/>mỗi chunk embed + mỗi tiêu chí"]
    D --> C
    C --> E["Vẽ vòng % = (chunk xong + tiêu chí xong)/tổng"]
```

| Thành phần | Vị trí |
|-----------|--------|
| Store tiến độ in-memory | `ml-service/utils/progress.py` |
| Cập nhật theo job_id | `phobert_analyzer.py` (vòng lặp chunk + tiêu chí) |
| Endpoint trả tiến độ | `GET /analyze-progress/{job_id}` (không rate-limit) |
| Proxy backend | `GET /api/ai/analyze-progress/:jobId` |

> [!CAUTION]
> Store là in-memory trong **1 tiến trình**. Nếu chạy uvicorn **nhiều worker**, cần chuyển sang Redis để poll không trúng worker khác.

---

## 10. Bản Đồ Endpoint Liên Quan

| Method | Endpoint | Vai trò |
|--------|----------|---------|
| POST | `/api/ai/analyze-report` | Chấm không rubrics |
| POST | `/api/ai/analyze-rubrics` | Chấm có rubrics |
| POST | `/api/ai/llm-feedback` | Sinh nhận xét Gemini |
| GET | `/api/ai/analyze-progress/:jobId` | Tiến độ % |
| GET | `/api/baocao/:id/extracted` | Lấy text + `aiCache` |
| POST | `/api/baocao/:id/ai-cache` | Lưu cache AI bền |
| POST | `/api/diemso` | Chốt điểm (lưu `AI_LLM_Feedback`) |

---

## 11. Tóm Tắt Một Câu

> File PDF được **đọc đủ mọi trang** → **chia chunk phủ 100%** → **PhoBERT đọc hết từng chunk** → tính điểm theo **1 trong 2 luồng** (không rubrics tối đa 9, có rubrics tối đa 10) → nhận xét **hard-code mặc định**, hoặc bật **Gemini** để có nhận xét tự nhiên — tất cả được **cache bền** để reload không chấm lại, và hiển thị **tiến độ % thật** khi đang chấm.
