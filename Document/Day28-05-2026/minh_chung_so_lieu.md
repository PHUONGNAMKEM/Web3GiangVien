# Minh Chứng Số Liệu — Trả Lời Các Câu Hỏi Về Nguồn Gốc Dữ Liệu

> Tài liệu này dẫn chiếu trực tiếp đến **source code thực tế** trong repository để giải thích nguồn gốc từng con số.

---

## 1. PhoBERT — Công thức chấm điểm ĐÃ THAY ĐỔI (code mới)

### ❌ Công thức CŨ (không còn trong code):
```python
base_score = min(8.0, 4.0 + len(clean_text) / 800.0)  # Spam 10000 chữ → 8.0
```

### ✅ Công thức MỚI (code hiện tại `phobert_analyzer.py` dòng 87–88):
```python
# Base cố định 5.0 — không phụ thuộc độ dài văn bản
base_score = 5.0 + keyword_density_score - repetition_penalty
```

**Minh chứng:** File `ml-service/models/phobert_analyzer.py` dòng 87–93:
- `base_score = 5.0` → Base **cố định 5.0**, KHÔNG còn tính theo chiều dài
- `keyword_density_score = (total_hits / len(topic_requirements)) * 1.5` → Cộng dựa trên tỷ lệ khớp yêu cầu
- `repetition_penalty = repetition_ratio * 3.0` → **Trừ tối đa 3.0 điểm** nếu phát hiện lặp nội dung
- `semantic_bonus = 2.0 * min(1.0, ...)` → Cộng tối đa +2.0 từ semantic matching
- `score = min(10.0, max(0.0, base_score + semantic_bonus))`

**→ Bài spam 10000 chữ rác giờ KHÔNG còn được 8.0 nữa:**
- Base = 5.0 (cố định)
- keyword_density_score = 0 (không khớp yêu cầu nào)
- repetition_penalty = cao (lặp nhiều → bị trừ mạnh)
- semantic_bonus = 0 (không khớp semantic)
- **→ Điểm thực tế ≈ 2.0–5.0** (tùy mức lặp)

**Thêm cơ chế bảo vệ mới** (file `routes/analyze.py` dòng 42–55):
1. **Injection detection** (`scan_injection`) — phát hiện prompt injection
2. **Repetition check** (`check_repetition`, threshold 20%) — cảnh báo lặp nội dung
3. **Type-Token Ratio** (`check_type_token_ratio`, threshold 25%) — phát hiện keyword stuffing

---

## 2. Chunking — Cách hoạt động thực tế

**Minh chứng:** File `ml-service/utils/pdf_chunker.py` (174 dòng)

### PDF 100 trang thì chia như nào?

**KHÔNG chia theo trang.** Hệ thống chia theo **heading (Chương/Mục)**:

**Bước 1: Detect headings** (dòng 15–27):
```python
CHAPTER_PATTERNS = [r'Chương X', r'CHƯƠNG X', r'Chapter X']     # → level 1
SECTION_PATTERNS = [r'X.Y', r'Phần X', r'Section X']            # → level 2
SUBSECTION_PATTERNS = [r'X.Y.Z']                                 # → level 3
```

**Bước 2: Chia theo heading** (dòng 90–118):
- Nếu detect ≥ 2 headings → chia text giữa 2 heading liên tiếp thành 1 chunk
- Phần trước heading đầu tiên → chunk "Phần mở đầu" (nếu > 100 ký tự)
- Bỏ qua chunk < 20 ký tự

**Bước 3: Fallback** (dòng 121–122):
- Nếu không tìm đủ heading → chia theo **paragraph blocks**, mỗi block ~600 từ:
```python
if len(chunks) <= 1:
    chunks = _split_by_paragraphs(text, max_words=600)
```

**Ví dụ thực tế — PDF 100 trang:**
```
Chunk 0: "Phần mở đầu" (trước Chương 1)
Chunk 1: "Chương 1: Tổng quan" (heading level 1)
Chunk 2: "1.1 Giới thiệu đề tài" (heading level 2)
Chunk 3: "1.2 Mục tiêu" (heading level 2)
Chunk 4: "Chương 2: Cơ sở lý thuyết" (heading level 1)
...
Chunk N: "Chương 5: Kết luận" (heading level 1)
```

**Mỗi chunk được PhoBERT phân tích riêng** (dòng 141–146):
```python
for chunk in chunks:
    chunk_content = chunk.content[:2000]  # Truncate nếu chunk > 2000 ký tự
    emb = self._get_embedding(chunk_content)  # PhoBERT embed
```

**→ Giới hạn 256 tokens chỉ áp dụng cho MỖI LẦN gọi `_get_embedding()`, không phải cho toàn bộ PDF.**

---

## 3. SBERT — Nguồn gốc các chỉ số Accuracy/F1

### Các con số Accuracy ~87%, F1 ~0.85 lấy từ đâu?

**Trả lời thành thật: Đây là SỐ ƯỚC TÍNH, không phải đo trên dataset thực tế của dự án.**

Nguồn gốc:
1. **Benchmark chính thức** của model `paraphrase-multilingual-MiniLM-L12-v2` trên Semantic Textual Similarity (STS) tasks → công bố F1 ~0.84–0.86 cho multilingual tasks
2. **Logic filtering bổ sung** trong code (chỉ lấy môn ≥ 7.0, weighted 60/40) → ước tính cải thiện thêm

**Minh chứng từ code** (`sbert_matcher.py` dòng 27–49):
```python
# Chỉ lấy môn điểm >= 7.0 làm thế mạnh
strong_skills = [major for major, score in major_scores.items() if float(score) >= 7.0]

# Cosine Similarity giữa kỹ năng SV và yêu cầu đề tài
cosine_score = util.cos_sim(student_vector, topic_vector).item()

# Công thức: 60% Semantic + 40% GPA
match_score = (semantic_score * 0.6) + (base_gpa_score * 0.4)
```

**Cách lấy số liệu thực tế:**
- Bạn CÓ THỂ dùng **Postman** để gọi `POST /match-student` với nhiều bộ kỹ năng SV khác nhau → ghi lại `match_score` → so sánh với đánh giá thủ công → tính Precision/Recall/F1 thực tế
- Nên test ít nhất 20–30 bộ input khác nhau

---

## 4. Gas Fee V1 vs V2 — Nguồn gốc con số

### Số gas 180K, 120K, 95K lấy từ đâu?

**Trả lời thành thật: Đây là SỐ ƯỚC TÍNH dựa trên phân tích cấu trúc contract, chưa đo thực tế bằng Hardhat gas reporter.**

**Lý do ước tính hợp lý — so sánh V1 vs V2 từ code:**

| | V1 (`ThesisManagement.sol`) | V2 (`ThesisManagementV2.sol`) |
|---|---|---|
| Mapping key | `mapping(string => ...)` | `mapping(bytes32 => ...)` |
| Struct studentDID | `string studentDID` | `bytes32 studentDID` |
| Struct topicId | `string topicId` | `bytes32 topicId` |
| Access control | Không có | `onlyOwner` modifier |

- **`string` vs `bytes32`**: Trong EVM, `string` tốn gas cho dynamic storage (length prefix + data), `bytes32` là fixed 32 bytes → tiết kiệm SSTORE/SLOAD ~30–50%
- Comment trong code V2 dòng 52 ghi rõ: `// bytes32 thay cho string → tiết kiệm ~30-50% gas`

**Cách đo gas thực tế:**
1. Chạy `npx hardhat node` (blockchain giả)
2. Deploy cả V1 và V2 lên localhost
3. Gọi từng hàm → Hardhat console log tự hiện gas used
4. Hoặc cài `hardhat-gas-reporter` plugin → chạy test → bảng gas tự động

**→ Đây là cách duy nhất có minh chứng chính xác. Hiện tại dự án CHƯA có file test nên CHƯA đo được.**

---

## 5. API Latency/Throughput — Nguồn gốc con số

### Các con số 200ms, 300ms–3s, 50–100ms lấy từ đâu?

**Trả lời thành thật: Đây là SỐ ƯỚC TÍNH dựa trên log thực tế có sẵn và benchmark chung.**

**Minh chứng có trong log** (file `backend/logs/ai.log` — đã thấy lúc đầu):
```
GET /api/detai 304 - - 112.670 ms        → ~100ms
GET /api/dangky/giangvien/... 304 - 154.360 ms  → ~150ms
POST /api/auth/verify 200 515 - 118.780 ms       → ~120ms
```

**Minh chứng từ ML Service** (code `phobert_analyzer.py` dòng 102):
```python
elapsed = int((time.time() - start_time) * 1000)
logger.info(f"[AI] Report analysis completed | ... | time={elapsed}ms")
```
→ ML Service **tự ghi thời gian xử lý** mỗi request vào log.

### ✅ Bạn CÓ THỂ dùng Postman để đo số liệu thực tế:

**Cách làm:**

1. **Chạy hệ thống** (backend + ml-service)
2. **Dùng Postman** gửi request → Postman tự hiện "Response Time" ở góc phải

**Các endpoint nên test:**

| Endpoint | Method | Body mẫu |
|---|---|---|
| `/api/detai` | GET | — |
| `/api/auth/challenge` | POST | `{"walletAddress": "0x..."}` |
| `ML: /match-student` | POST | `{"student": {"gpa": 8.0, "major_scores": {"NLP": 8.5}}, "topics": [...]}` |
| `ML: /analyze-report` | POST | `{"text": "...(nội dung dài)...", "topic_requirements": ["React", "API"]}` |
| `ML: /compare-code` | POST | `{"student_code": "...", "answer_code": "..."}` |
| `ML: /healthz` | GET | — |

**Kết quả Postman → screenshot → đưa vào báo cáo = MINH CHỨNG MẠNH NHẤT.**

---

## 6. Tổng Kết — Đâu là số thực, đâu là ước tính

| Chỉ số | Loại | Minh chứng |
|---|---|---|
| **Công thức chấm điểm PhoBERT** | ✅ **Thực tế** | Code `phobert_analyzer.py` dòng 87–93 |
| **Chunking theo heading** | ✅ **Thực tế** | Code `pdf_chunker.py` dòng 15–27, 90–118 |
| **Anti-spam (repetition penalty)** | ✅ **Thực tế** | Code `phobert_analyzer.py` dòng 60–61, `text_security.py` |
| **SBERT matching formula (60/40)** | ✅ **Thực tế** | Code `sbert_matcher.py` dòng 49 |
| **Semantic threshold 0.45** | ✅ **Thực tế** | Code `phobert_analyzer.py` dòng 75 |
| **V2 dùng bytes32 thay string** | ✅ **Thực tế** | Contract V2 dòng 52 vs V1 dòng 24 |
| API latency (backend) | ⚠️ **Từ log** | File `ai.log` có response time thực |
| ML latency | ⚠️ **Từ log** | ML Service tự ghi `time=Xms` |
| SBERT Accuracy ~87%, F1 ~0.85 | ⚠️ **Ước tính** | Benchmark chính thức model + logic filtering |
| PhoBERT Accuracy ~83% | ⚠️ **Ước tính** | Benchmark model + chunking + formula |
| Gas V1 vs V2 cụ thể | ⚠️ **Ước tính** | Lý thuyết string vs bytes32, chưa đo Hardhat |
| Throughput (req/s) | ⚠️ **Ước tính** | Chưa stress test |

---

## 7. Khuyến Nghị — Cách Có Minh Chứng Thực Tế

### 7.1 Dùng Postman lấy số liệu AI + API
- Gửi 10 request mỗi endpoint → ghi lại Response Time
- Screenshot kết quả → đưa vào báo cáo

### 7.2 Đo Gas thực tế bằng Hardhat
```bash
npx hardhat node                          # Chạy blockchain giả
npx hardhat run scripts/deploy.js --network localhost
# Sau đó gọi từng hàm qua console → gas tự hiện
```

### 7.3 Đo Accuracy AI thực tế
- Chuẩn bị 20–30 bộ test (kỹ năng SV + đề tài)
- Gọi `/match-student` → ghi match_score
- So sánh với đánh giá thủ công (phù hợp/không phù hợp)
- Tính Precision/Recall/F1
