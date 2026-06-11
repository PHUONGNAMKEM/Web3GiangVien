# Changelog & Kế hoạch — Ngày 11/06/2026

> Tổng hợp toàn bộ phân tích, kế hoạch và thay đổi đã thực hiện trong ngày.
> Chủ đề chính: **Cải thiện hệ thống chấm điểm PhoBERT + Tích hợp LLM (Gemini) sinh nhận xét**, kèm 2 tinh chỉnh UI.

---

## A. Bối cảnh & các câu hỏi ban đầu

Người dùng đặt 5 câu hỏi về luồng chấm điểm PhoBERT:

1. Luồng **không rubrics** chỉ đạt tối đa **8.5/10** — có hợp lý không?
2. Trước khi PhoBERT chấm, PDF của SV có được chia chunk + đọc **100% nội dung** (kể cả khi không detect được heading) không?
3. Luồng có rubrics match vào các **câu nhận xét hard-code** — có hợp lý với đồ án "dùng AI chấm" không?
4. Hệ số scale điểm thô đã đổi từ `1.3` lên `1.6` chưa?
5. 4 vấn đề trong file `phobert_scoring_analysis` đã giải quyết chưa?

### Kết luận điều tra (theo code thực tế trước khi sửa)

| # | Phát hiện |
|---|-----------|
| 1 | Trần 8.5 là **thật** (5.0 + 1.5 + 2.0). Bất hợp lý — bài hoàn hảo không chạm 9–10. |
| 2 | Trích xuất PDF **đọc đủ mọi trang** (pdfplumber + OCR fallback). Chunk force-split phủ 100%. **NHƯNG** phát hiện 2 bug nghiêm trọng (xem mục B). |
| 3 | "AI" chỉ làm 1 việc: đo cosine similarity. Điểm + nhận xét đều là **if/else hard-code**. Hợp lý kỹ thuật với encoder như PhoBERT, nhưng muốn nhận xét "thông minh" thật thì cần ghép thêm LLM sinh văn bản. |
| 4 | Vẫn `× 1.3`, **chưa đổi**. |
| 5 | Chưa vấn đề nào được giải quyết trọn vẹn. |

---

## B. Hai bug nghiêm trọng phát hiện thêm (ngoài tài liệu cũ)

### Bug 1 — Heading detection ĐANG CHẾT
- Cả 2 luồng gọi `normalize_text(text)` **trước** rồi mới `chunk_text()`.
- `normalize_text` có `re.sub(r"\s+", " ", text)` → **xóa sạch mọi `\n`**.
- Toàn bộ regex heading (Chương, PHẦN, I., a)...) cần `\n` để khớp → **không bao giờ detect được** → luôn rơi xuống force-split, mọi chunk tên "Khối N" vô nghĩa.

### Bug 2 — PhoBERT chỉ đọc 256 token mỗi chunk
- `_get_embedding` đặt `max_length=256, truncation=True` → phần sau 256 token của mỗi chunk **bị bỏ** khi tính similarity.

---

## C. Kế hoạch đã chốt (chia phần, duyệt từng phần)

| Phần | Nội dung |
|------|----------|
| **A** | Fix triệt để 2 bug nghiêm trọng (heading + 256 token) |
| **B** | Hệ số 1.5 + trần điểm hợp lý (ràng ≤10) + fix nhận xét tiêu chí |
| **C1** | Backend service Gemini + route + env |
| **C2** | Cache bền DB (`AI_LLM_Feedback`) |
| **C3** | Toggle UI bật/tắt nhận xét LLM + cache 3 tầng |

**Quyết định chốt:**
- Hệ số rubrics: **1.5** (không phải 1.6 — tránh saturate sớm).
- Trần luồng **không rubrics: 9.0** (theo yêu cầu, không để 10).
- LLM: **`gemini-2.5-flash`** (free tier, GA, ổn định). `gemini-3.5-flash` KHÔNG free. Model cấu hình qua `.env`.

---

## D. Chi tiết thay đổi theo từng phần

### Part A — Fix 2 bug nghiêm trọng
**File:** `ml-service/models/phobert_analyzer.py`

- **A1:** `chunk_text(text)` dùng **text gốc** (giữ `\n`); `normalize_text(chunk.content)` chỉ áp **từng chunk** lúc embed. Áp cho cả `analyze()` và `analyze_with_rubrics()`. → Heading detection sống lại, vẫn phủ 100% nội dung.
- **A2:** Viết lại `_get_embedding` thành **sliding-window**: chunk >256 token → cắt nhiều cửa sổ 254 token, embed từng cửa sổ rồi **mean-pool** (`MAX_WINDOWS=12`). → PhoBERT đọc hết chunk.

### Part B — Hệ số & trần điểm
**File:** `ml-service/models/phobert_analyzer.py`

- **B1:** Rubrics scale `1.3 → 1.5` (giữ `min(DiemToiDa, …)` → không tràn >10).
  - Phổ điểm mới: blended 0.45→6.75, 0.55→8.25, 0.65→9.75, ≥0.70→10.
- **B2:** Trần luồng **không rubrics** `8.5 → 9.0`: keyword giữ `1.5`, semantic `2.0 → 2.5`. Tổng max = 5.0 + 1.5 + 2.5 = **9.0**.
- **B3:** Nhận xét **từng tiêu chí** bỏ adaptive threshold (mean±std → std=0 khi 1 chunk → luôn "Tốt"). Thay bằng `score_ratio = score/DiemToiDa`: ≥0.7 "Tốt", ≥0.5 "Khá", <0.5 "Yếu". → Hết mâu thuẫn "Tốt nhưng điểm thấp".
- Gỡ `import numpy` thừa.

### Part C1 — Backend LLM service
**Files:** `backend/services/llmFeedbackService.js` (mới), `backend/controllers/aiController.js`, `backend/server.js`, `backend/.env`, `backend/.env.example`

- Service gọi **Gemini REST API qua axios** (không cần SDK mới).
- `generateFeedback({score, isRubrics, rubricsResult, issues, topicName, phobertFeedback})` → `{feedback, usedLLM, provider, model}`.
- LLM **không chấm điểm** — chỉ diễn giải điểm + kết quả PhoBERT thành nhận xét giảng viên (3–5 câu tiếng Việt). Prompt ràng buộc: không bịa, không đổi điểm, không markdown.
- **Fallback an toàn:** thiếu key / lỗi / timeout → trả `phobertFeedback`, `usedLLM=false`.
- Đã thêm `thinkingConfig: { thinkingBudget: 0 }` + `maxOutputTokens: 800` (vì gemini-2.5-flash bật "thinking" mặc định làm cụt nhận xét).
- Route: `POST /api/ai/llm-feedback` (requireAuth + aiLimiter).
- `.env`: thêm `GEMINI_API_KEY=`, `GEMINI_MODEL=gemini-2.5-flash`.
- **Đã test chạy thật:** Gemini phản hồi ~2.1s, nhận xét đầy đủ, bám đúng dữ liệu chấm.

### Part C2 — Cache bền DB
**Files:** `backend/models/DiemSo.js`, `backend/controllers/diemSoController.js`

- Thêm field `AI_LLM_Feedback` (nhận xét Gemini) + `AI_LLM_Provider` vào `DiemSo`.
- Wire `aiLlmFeedback`/`aiLlmProvider` qua `chamDiem` → `gradePayload` → `createGradeForReport` → lưu DB (áp cho cả nhóm).
- Mở lại bài **đã chấm** → đọc thẳng từ DB, **không gọi lại Gemini**.

### Part C3 — Toggle UI + cache 3 tầng
**Files:** `frontend/src/services/aiService.js`, `frontend/src/components/lecturer/SubmissionReview.js`

- Thêm method `getLlmFeedback(...)` ở frontend service.
- Nút **toggle "Nhận xét AI (Gemini)"** trong card *PhoBERT AI Phân Tích*.
  - ON → gọi `/api/ai/llm-feedback` **1 lần**, hiện nhận xét Gemini + tag tím `Gemini`.
  - OFF → hiện nhận xét PhoBERT hard-code.
- **Chống tốn phí — cache 3 tầng:**
  1. State phiên: toggle qua lại không gọi lại.
  2. `aiCacheRef`: đóng/mở lại drawer bài chưa chấm.
  3. DB `AI_LLM_Feedback`: bài đã chấm.
- Khi chấm: nếu toggle ON → `NhanXet` chính thức = nhận xét Gemini; lưu `aiLlmFeedback`/`aiLlmProvider`.
- Hỗ trợ **cả 2 luồng**. Luồng không rubrics truyền thêm `issues` cho Gemini (đã bổ sung trong `buildPrompt`).

---

## E. Hai tinh chỉnh UI (không liên quan PhoBERT)

### E1 — Nút "Làm mới" trang SV "Đăng Ký Đề Tài"
**File:** `frontend/src/components/student/TopicRegistration.js`
- Thêm nút "Làm mới" (icon `RefreshCw`) cạnh tiêu đề, dùng `refetch()` + `isFetching`. Làm mới điểm AI SBERT, trạng thái đăng ký, danh sách đề tài.

### E2 — Nút "Làm mới" GV cập nhật cả badge Sĩ Số
**File:** `frontend/src/components/lecturer/ClassManagement.js`
- Nút "Làm mới" trong *Chi Tiết Lớp* nay gọi `handleRefreshDetail`:
  1. Refetch danh sách SV trong modal.
  2. `invalidateQueries(['classes'])` + `refreshClasses()` → bảng lớp ngoài refetch → **badge Sĩ Số cập nhật** theo số SV thực.
- Lưu ý: làm mới **thủ công** (chưa realtime qua socket).

---

## F. Tổng kết trạng thái 4 vấn đề ban đầu

| # | Vấn đề | Trạng thái sau hôm nay |
|---|--------|------------------------|
| 1 | Sim ~0.5 → điểm thấp (scale 1.3) | ✅ Fixed (×1.5) |
| 2 | "Tốt" nhưng điểm 5-6 | ✅ Fixed (B3) |
| 3 | Mọi tiêu chí match "Phần 1" | ✅ Fixed (A1 — heading sống lại) |
| 4 | Max 8.5 (không rubrics) | ✅ Fixed (B2 — lên 9.0 theo yêu cầu) |
| + | Bug 256-token | ✅ Fixed (A2 — sliding window) |

---

## G. Danh sách file thay đổi

**ml-service:**
- `models/phobert_analyzer.py` (A1, A2, B1, B2, B3)

**backend:**
- `services/llmFeedbackService.js` (mới)
- `controllers/aiController.js`
- `controllers/diemSoController.js`
- `models/DiemSo.js`
- `server.js`
- `.env`, `.env.example`
- `scripts/test-gemini-feedback.js` (tiện ích test, có thể xóa)

**frontend:**
- `services/aiService.js`
- `components/lecturer/SubmissionReview.js`
- `components/student/TopicRegistration.js`
- `components/lecturer/ClassManagement.js`

---

## E3 — Plan B: Cache AI bền (không chấm lại khi reload)
**Vấn đề:** `aiCacheRef` chỉ sống trong phiên → reload trang là bài chưa chấm bị chấm lại (PhoBERT lãng phí; Gemini tốn phí).

**Giải pháp:** lưu kết quả AI vào DB theo submission, có `textHash` để tự hủy khi SV nộp lại.
- `backend/models/BaoCao.js`: thêm `AICache` (score, feedback, issues, rubricsResult, llmFeedback, textHash...).
- `getExtractedText`: trả `aiCache` (chỉ khi `textHash` khớp ExtractedText hiện tại).
- Endpoint mới `POST /api/baocao/:id/ai-cache` (`saveAiCache`) — chỉ GV phụ trách.
- `SubmissionReview.js`: `viewDetails` ưu tiên khôi phục từ `aiCache` (không gọi AI); sau khi PhoBERT chấm / sau khi sinh Gemini (bài chưa chấm) → `saveAiCache`.
- **Kết quả:** reload trang bài chưa chấm → đọc DB, không gọi lại PhoBERT/Gemini. Nộp lại bài → cache tự hủy.

## E4 — Thanh tiến độ % thật cho PhoBERT (job + polling)
Thay spinner xoay vòng bằng **thanh tròn % thật** + "đã xử lý X/Y phần, N chunk, số trang".
- `ml-service/utils/progress.py` (mới): store tiến độ in-memory theo `job_id` (thread-safe).
- `phobert_analyzer.py`: `analyze()`/`analyze_with_rubrics()` nhận `job_id`, cập nhật tiến độ theo từng chunk embed + từng tiêu chí.
- `routes/analyze.py`: request thêm `job_id`; endpoint mới `GET /analyze-progress/{job_id}` (không rate-limit).
- Backend: `aiService` thread `job_id` + `getAnalyzeProgress`; `aiController.analyzeProgress`; route `GET /api/ai/analyze-progress/:jobId` (không `aiLimiter`).
- Frontend: sinh `jobId`, poll mỗi 0.5s trong lúc phân tích, vẽ `Progress` tròn; dừng poll khi xong.
- **Màu thanh:** đổi từ xanh dương mặc định sang **gradient 4 màu kiểu Google** (`#4285F4` → `#EA4335` → `#FBBC05` → `#34A853`) qua `strokeColor`.

## H. Lưu ý triển khai & việc còn lại

1. **Restart ML service** (`uvicorn`) để nạp Part A/B; **restart backend** (`npm run dev`) để nạp C1/C2 + key Gemini.
2. Điểm các bài **đã chấm cũ** giữ nguyên thang cũ; chỉ bài chấm mới theo thang mới. Muốn đồng nhất phải chấm lại (quyết định của GV).
3. `.env` đang chứa **private key ví + Mongo URI thật** → nếu từng commit lên git nên rotate.
4. Badge sĩ số GV hiện làm mới **thủ công**; nếu cần realtime qua socket (như `grade:new`) là việc lớn hơn, chưa làm.
5. (Tùy chọn) Có thể đổi `GEMINI_MODEL` sang `gemini-3-flash-preview` nếu muốn nhận xét mạnh hơn (preview, có thể đổi).
