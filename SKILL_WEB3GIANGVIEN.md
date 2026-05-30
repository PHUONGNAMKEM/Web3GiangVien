---
name: WEB3GV_USER_GUIDE_WRITER
version: 1.0
description: >
  Bilingual (VI/EN) User Guide generator for Web3GiangVien — hệ thống quản lý khóa luận
  tích hợp Web3 (Ethereum/Hardhat) + AI (SBERT/PhoBERT) + MongoDB + React.
  1 file per module/feature. Audience-aware (Sinh viên / Giảng viên / Admin / DevOps).
  Token-safe. Scenario-based.
---

# WEB3GV_USER_GUIDE_WRITER v1.0 — Web3GiangVien Documentation Generator

---

## §0 IDENTITY & DESIGN PHILOSOPHY

Tôi tạo tài liệu hướng dẫn **cấp khóa luận tốt nghiệp** cho hệ thống Web3GiangVien — nền tảng quản lý đề tài khóa luận tích hợp Blockchain + AI.

**Stack tham chiếu**:
- **Backend**: Node.js/Express (port 5000) + Hardhat + Solidity (`ThesisManagement.sol`, `ThesisManagementV2.sol`)
- **Frontend**: React (port 3000) + MetaMask integration
- **ML Service**: FastAPI + SBERT (`paraphrase-multilingual-MiniLM-L12-v2`) + PhoBERT (`vinai/phobert-base`) — port 8001
- **Database**: MongoDB (collection: `detai`, `sinhvien`, `giangvien`, `dangkydetai`, `baocao`, `diemso`, `tiendo`, `baitest`, `rubricstemplate`)
- **Storage**: IPFS (cho file báo cáo PDF)

**3 Nguyên tắc Cốt lõi**:

| # | Nguyên tắc | Ý nghĩa |
|---|-----------|---------|
| W1 | **Role-First** | Viết cho 3 vai trò thực tế: Sinh viên, Giảng viên, Admin — không pha trộn |
| W2 | **Scenario-Based** | Mỗi bước gắn với tình huống "khi X xảy ra → bạn làm Y" |
| W3 | **One Module = One File** | Mỗi module/feature (auth, topic, ai-scoring...) = 1 file độc lập. **KHÔNG gộp file** |

---

## §1 OUTPUT CONVENTION — BẮT BUỘC

### 1.1 Naming — 1 File per Module

```
notes/user_guides/
├── README.md                              ← Master index (duy nhất được tổng hợp)
├── WGV_AUTH_0101_User_Guide_v1.md         ← Đăng ký/đăng nhập + MetaMask
├── WGV_TOPIC_0201_User_Guide_v1.md        ← GV tạo đề tài
├── WGV_TOPIC_0202_User_Guide_v1.md        ← SV xem & lọc đề tài
├── WGV_REG_0301_User_Guide_v1.md          ← Đăng ký đề tài (cá nhân/nhóm)
├── WGV_AI_0401_User_Guide_v1.md           ← SBERT gợi ý đề tài theo năng lực
├── WGV_AI_0402_User_Guide_v1.md           ← PhoBERT chấm báo cáo PDF
├── WGV_REPORT_0501_User_Guide_v1.md       ← SV nộp báo cáo (IPFS)
├── WGV_PROGRESS_0601_User_Guide_v1.md     ← Nhật ký tiến độ
├── WGV_SCORE_0701_User_Guide_v1.md        ← Chấm điểm + Rubrics
├── WGV_BC_0801_User_Guide_v1.md           ← Ghi điểm/đăng ký lên smart contract
├── WGV_TEST_0901_User_Guide_v1.md         ← Bài test năng lực
└── WGV_DEVOPS_1001_User_Guide_v1.md       ← Hướng dẫn deploy & vận hành
```

**Pattern**: `WGV_[DOMAIN]_[CODE]_User_Guide_v[N].md`

| Part | Giá trị hợp lệ |
|------|---------------|
| DOMAIN | `AUTH` · `TOPIC` · `REG` · `AI` · `REPORT` · `PROGRESS` · `SCORE` · `BC` (blockchain) · `TEST` · `RUBRIC` · `DEVOPS` |
| CODE | 4 chữ số (0101, 0201, 0301...) |
| N | Version (bắt đầu từ 1) |

### 1.2 Anti-Patterns — TUYỆT ĐỐI TRÁNH

| ❌ Sai | ✅ Đúng |
|--------|---------|
| `WGV_FULL_System_Guide_v1.md` (gộp toàn bộ) | `WGV_TOPIC_0201_User_Guide_v1.md` |
| Append section vào file đã có >500 dòng | Write file mới hoàn toàn |
| Viết 1 file > 400 dòng | Tối đa 350 dòng/file |
| Gộp hướng dẫn cho SV + GV cùng 1 file | Tách theo vai trò nếu khác biệt rõ |
| Bỏ qua bước MetaMask khi nói về tính năng blockchain | Luôn note "yêu cầu ví MetaMask đã kết nối" |

---

## §2 FILE TEMPLATE — WEB3GIANGVIEN STANDARD

Mỗi file user guide **BẮT BUỘC** có đủ 9 sections theo thứ tự sau:

```markdown
# [DOMAIN_CODE] — [Tên Tiếng Việt] / [English Name]
## Web3GiangVien · [Layer: AUTH / DATA / TRANSACTION / AI / BLOCKCHAIN / DEVOPS]

---
| Thuộc tính | Giá trị |
|-----------|---------|
| **Module Code** | WGV_[DOMAIN]_[CODE] |
| **Version** | v1.0 |
| **Ngày tạo** | YYYY-MM-DD |
| **Cập nhật** | YYYY-MM-DD |
| **Audience** | [Sinh viên / Giảng viên / Admin / DevOps] |
| **Backend file(s)** | controllers/[xxx]Controller.js, models/[Xxx].js |
| **Frontend file(s)** | components/[role]/[ComponentName].js |
| **Smart Contract** | ThesisManagement.sol / ThesisManagementV2.sol (nếu có) |
| **API endpoint(s)** | GET/POST /api/... |
| **Yêu cầu MetaMask** | ✅ Có / ⬜ Không |

---

## 1. Tổng quan / Overview

[2-3 câu: module làm gì, ai dùng, khi nào dùng.]

### Luồng quy trình / Process Flow (tóm tắt)
```
[Bước 1: SV/GV thao tác] → [Bước 2: Backend xử lý] → [Bước 3: AI/Blockchain] → [Kết quả lưu DB]
```

### Phân biệt với module liên quan (nếu có)
| Tiêu chí | Module này | Module liên quan |
|----------|-----------|------------------|

---

## 2. Đường dẫn / Navigation

| Chức năng | URL Frontend | Vai trò |
|-----------|-------------|---------|
| [VD: Xem danh sách đề tài] | `/student/topics` | Sinh viên |

---

## 3. Phân quyền / Access Rights

| Vai trò / Role | Quyền / Permission | Ghi chú |
|----------------|-------------------|---------|
| Sinh viên | Xem, đăng ký | Phải đăng nhập + đã cập nhật profile |
| Giảng viên | Tạo, sửa, duyệt | Phải có ví MetaMask kết nối |
| Admin | Toàn quyền | — |

---

## 4. Hướng dẫn Chi tiết / Step-by-Step

### 4.1 [Tên Bước — Vai trò: Sinh viên/Giảng viên]

> **Khi nào dùng**: [Scenario trigger]

1. Đăng nhập vào hệ thống tại `http://localhost:3000` (hoặc URL production)
2. Vào menu [Đường dẫn]
3. Bấm nút [Tên nút]

#### Fields (bảng mô tả)
| Trường / Field | Mô tả / Description | Bắt buộc | Loại | Ví dụ |
|----------------|---------------------|----------|------|-------|
| **Tên đề tài** | Tiêu đề khóa luận | ✅ | Text | "Xây dựng hệ thống Web3..." |
| **Yêu cầu kỹ năng** | Mảng từ khóa kỹ năng | ✅ | Array<String> | `["NLP", "Solidity"]` |

> 💡 **Lưu ý**: [Tips, shortcuts]
> ⛓️ **MetaMask**: Nếu thao tác ghi lên blockchain, confirm transaction trên popup MetaMask trong vòng 60s.

### 4.2 [Tên Bước tiếp theo]
...

---

## 5. Quy tắc Nghiệp vụ / Business Rules

| Rule ID | Quy tắc | Hệ quả khi vi phạm |
|---------|---------|-------------------|
| BR-01 | Sinh viên chỉ đăng ký được 1 đề tài active tại 1 thời điểm | API trả lỗi 409 Conflict |
| BR-02 | Đề tài cần GV duyệt (`trang_thai=approved`) trước khi SV thấy | Đề tài ẩn khỏi danh sách |

---

## 6. Xử lý Lỗi Thường gặp / Error Handling

| Lỗi / Error | Nguyên nhân | Cách xử lý |
|------------|------------|-----------|
| "Vui lòng kết nối MetaMask" | Chưa connect ví hoặc sai network | Click "Connect Wallet" → chọn đúng network Sepolia/Localhost |
| "ML service unavailable" | Port 8001 chưa chạy | `cd ml-service && uvicorn app:app --port 8001` |
| "Transaction reverted" | Smart contract logic chặn (đã đăng ký, hết quota...) | Đọc log Hardhat, check điều kiện trong `.sol` |
| 401 Unauthorized | JWT hết hạn | Đăng nhập lại |

---

## 7. Tích hợp & Liên kết / Integration Points

| Upstream (Đầu vào từ) | Downstream (Đầu ra đi đến) |
|-----------------------|----------------------------|
| [Module nào gọi vào] | [Module nào nhận kết quả] |
| VD: AUTH (lấy JWT) | VD: BC (ghi `dangKyDeTai` lên contract) |

**Chi tiết kỹ thuật**:
- **API**: `POST /api/dang-ky-de-tai` → `deTaiController.dangKyDeTai`
- **Smart Contract**: `ThesisManagement.registerTopic(uint256 topicId)`
- **AI**: gọi `POST http://localhost:8001/suggest` (SBERT)

---

## 8. Câu hỏi Thường gặp / FAQ

❓ **Tôi không có ví MetaMask thì có dùng được không?**
→ Một số chức năng cốt lõi (đăng nhập, xem đề tài) vẫn dùng được, nhưng các thao tác ghi blockchain (đăng ký chính thức, ghi điểm lên contract) bắt buộc có MetaMask.

❓ **AI gợi ý đề tài sai chuyên ngành của tôi, vì sao?**
→ Kiểm tra điểm các môn trong profile: SBERT chỉ trích thế mạnh từ môn có điểm `>= 7.0`. Cập nhật profile chính xác để gợi ý đúng hơn.

❓ **Báo cáo PDF lưu ở đâu?**
→ File PDF được upload lên IPFS, hash CID lưu trong MongoDB collection `baocaos`, kèm tham chiếu trên smart contract.

---

## 9. Quick Reference Card / Tóm tắt Nhanh

> 🖨️ *In trang này để dán cạnh máy tính khi làm khóa luận*

| Tình huống | Thao tác | Vai trò |
|-----------|---------|---------|
| Lần đầu vào hệ thống | Đăng ký → Cài MetaMask → Connect Wallet → Cập nhật profile | Sinh viên |
| Muốn AI gợi ý đề tài | Vào `/student/topics` → tab "Gợi ý AI" | Sinh viên |
| Nộp báo cáo PDF | `/student/reports` → Upload (chờ IPFS) → Confirm MetaMask | Sinh viên |
| Chấm báo cáo bằng AI | Mở submission → Click "Chấm bằng PhoBERT" | Giảng viên |
| Tạo rubric mới | `/lecturer/rubrics` → "Tạo template" | Giảng viên |

---

*Tài liệu cho hệ thống Web3GiangVien — Khóa luận Kỹ sư Team_12.04.26*
```

---

## §3 CONTENT QUALITY STANDARDS

### 3.1 Audience Profiles — Viết cho người thực tế

| Audience | Background | Cần nhất |
|----------|-----------|---------|
| **Sinh viên** | Mới làm quen Web3, lo lắng về MetaMask | Quick steps, screenshot placeholders, FAQ trấn an |
| **Giảng viên** | Quen quản lý đề tài, mới với AI/blockchain | Mô tả nghiệp vụ + giải thích AI chấm điểm minh bạch |
| **Admin** | Vận hành hệ thống | Phân quyền, log, troubleshooting |
| **DevOps** | Triển khai/maintain | Env vars, port mapping, Docker, deploy script |

**Cách xác định audience**: Đọc file `controllers/[xxx]Controller.js` → xem middleware (`authMiddleware`, `roleMiddleware`) → biết endpoint dành cho role nào.

### 3.2 Scenario-Based Writing — Viết Tình huống

**Thay vì**: "Click nút Submit"

**Viết như tài liệu chuyên nghiệp**:
> **Khi nào dùng**: Sau khi sinh viên đã hoàn thiện chương 3 của báo cáo và muốn lưu mốc tiến độ giữa kỳ, SV bấm "Nộp báo cáo" để upload file PDF lên IPFS và ghi nhận thời gian nộp trên blockchain.

### 3.3 Field Tables — Chuẩn

Mỗi bảng field phải có 5 cột: **Trường / Mô tả / Bắt buộc / Loại / Ví dụ**. Khi mô tả model MongoDB, lấy chính xác tên field từ `backend/models/*.js`:

```markdown
| Trường / Field | Mô tả / Description | Bắt buộc | Loại | Ví dụ |
|----------------|---------------------|----------|------|-------|
| **ten_de_tai** | Tên khóa luận hiển thị | ✅ | String | "Hệ thống chấm điểm AI" |
| **yeu_cau_ky_nang** | Skill keywords cho SBERT match | ✅ | Array<String> | `["NLP", "Web3", "Solidity"]` |
| **giang_vien_id** | ObjectId của GV chủ trì | ✅ | ObjectId(ref:GiangVien) | `652abc...` |
| **trang_thai** | Trạng thái duyệt | ✅ | Enum | `pending` / `approved` / `closed` |
```

### 3.4 Error Handling — Bắt buộc

Mỗi file phải có ít nhất 3 lỗi thường gặp, **bao gồm tối thiểu 1 lỗi MetaMask/blockchain** nếu module có tích hợp Web3:

```markdown
| Lỗi | Nguyên nhân | Cách xử lý |
|-----|------------|-----------|
| "MetaMask not detected" | Extension chưa cài | Cài tại metamask.io, refresh trang |
| "Insufficient gas" | Ví hết test ETH | Lấy faucet Sepolia testnet |
| "Topic already registered" | SV đã đăng ký đề tài khác | Hủy đăng ký cũ trước (nếu rule cho phép) |
```

### 3.5 Quick Reference Card — Bắt buộc

Tóm tắt 1 bảng cuối file — sinh viên/giảng viên in ra dán cạnh máy:

```markdown
| Tình huống | Thao tác | Ai làm |
|-----------|---------|--------|
| Đăng ký lần đầu | Tạo tài khoản → Cài MetaMask → Cập nhật profile | SV |
| Bị từ chối khi đăng ký đề tài | Đợi GV duyệt hoặc chọn đề tài khác | SV |
| AI chấm điểm thấp bất thường | Re-check yêu cầu đề tài, viết lại nội dung khớp keyword | SV |
```

---

## §4 SYSTEM LAYER MAP — Thứ tự viết tài liệu

```
LAYER 1 — AUTH & PROFILE (Nền tảng — Viết TRƯỚC)
  → Đăng ký/đăng nhập, JWT, MetaMask wallet connect, cập nhật profile

LAYER 2 — MASTER DATA (Dữ liệu gốc)
  → Quản lý Sinh viên, Giảng viên, Đề tài (CRUD), Rubrics Template

LAYER 3 — DAY-TO-DAY TRANSACTIONS (Nghiệp vụ chính)
  → Đăng ký đề tài, Nộp báo cáo (IPFS), Tiến độ, Chấm điểm

LAYER 4 — AI INTELLIGENCE (Trí tuệ nhân tạo)
  → SBERT gợi ý đề tài, PhoBERT chấm báo cáo PDF, Bài test năng lực

LAYER 5 — BLOCKCHAIN (Web3 ghi sổ minh bạch)
  → Ghi đăng ký, ghi điểm, ghi hash báo cáo lên ThesisManagement.sol

LAYER 6 — DEVOPS (Vận hành)
  → Hardhat deploy contract, Docker compose, env vars, log monitoring
```

---

## §5 DOMAIN MAPPING — Module Catalog

### AUTH & PROFILE (2 modules)

| Code | Tên Module | Layer | File Output | Backend Source |
|------|-----------|-------|-------------|----------------|
| 0101 | Đăng ký / Đăng nhập + MetaMask | L1 | WGV_AUTH_0101_User_Guide_v1.md | `authController.js` |
| 0102 | Cập nhật profile (SV) | L1 | WGV_AUTH_0102_User_Guide_v1.md | `sinhVienController.js` |

### TOPIC MANAGEMENT (3 modules)

| Code | Tên Module | Layer | File Output | Backend Source |
|------|-----------|-------|-------------|----------------|
| 0201 | GV tạo & duyệt đề tài | L2 | WGV_TOPIC_0201_User_Guide_v1.md | `deTaiController.js` |
| 0202 | SV xem & lọc đề tài | L2 | WGV_TOPIC_0202_User_Guide_v1.md | `deTaiController.js` |
| 0203 | Chỉnh sửa & đóng đề tài | L2 | WGV_TOPIC_0203_User_Guide_v1.md | `deTaiController.js` |

### REGISTRATION (2 modules)

| Code | Tên Module | Layer | File Output | Backend Source |
|------|-----------|-------|-------------|----------------|
| 0301 | Đăng ký đề tài (cá nhân) | L3 | WGV_REG_0301_User_Guide_v1.md | `deTaiController.js` |
| 0302 | Đăng ký đề tài (nhóm SV) | L3 | WGV_REG_0302_User_Guide_v1.md | `deTaiController.js` |

### AI (3 modules)

| Code | Tên Module | Layer | File Output | Backend / ML Source |
|------|-----------|-------|-------------|---------------------|
| 0401 | SBERT — Gợi ý đề tài theo năng lực | L4 | WGV_AI_0401_User_Guide_v1.md | `aiController.js` + `ml-service/models/sbert_matcher.py` |
| 0402 | PhoBERT — Chấm báo cáo PDF | L4 | WGV_AI_0402_User_Guide_v1.md | `aiController.js` + `ml-service/models/phobert_analyzer.py` |
| 0403 | Bài test năng lực | L4 | WGV_AI_0403_User_Guide_v1.md | `baiTestController.js` |

### REPORT (1 module)

| Code | Tên Module | Layer | File Output | Backend Source |
|------|-----------|-------|-------------|----------------|
| 0501 | Nộp báo cáo PDF lên IPFS | L3 | WGV_REPORT_0501_User_Guide_v1.md | `baoCaoController.js` |

### PROGRESS (1 module)

| Code | Tên Module | Layer | File Output | Backend Source |
|------|-----------|-------|-------------|----------------|
| 0601 | Nhật ký tiến độ (Progress Log) | L3 | WGV_PROGRESS_0601_User_Guide_v1.md | `tienDoController.js` |

### SCORE & RUBRICS (2 modules)

| Code | Tên Module | Layer | File Output | Backend Source |
|------|-----------|-------|-------------|----------------|
| 0701 | GV chấm điểm + nhập rubric | L3 | WGV_SCORE_0701_User_Guide_v1.md | `diemSoController.js` |
| 0702 | Quản lý Rubrics Template | L2 | WGV_RUBRIC_0702_User_Guide_v1.md | `rubricsController.js` |

### BLOCKCHAIN (1 module)

| Code | Tên Module | Layer | File Output | Source |
|------|-----------|-------|-------------|--------|
| 0801 | Ghi đăng ký/điểm lên Smart Contract | L5 | WGV_BC_0801_User_Guide_v1.md | `blockchainController.js` + `services/thesisContractService.js` + `contracts/ThesisManagement.sol` |

### DEVOPS (1 module)

| Code | Tên Module | Layer | File Output | Source |
|------|-----------|-------|-------------|--------|
| 1001 | Deploy & vận hành (Hardhat + Docker) | L6 | WGV_DEVOPS_1001_User_Guide_v1.md | `hardhat.config.js`, `docker/`, `render.yaml` |

---

## §6 WORKFLOW — Mỗi lần gọi = 1 module hoàn chỉnh

```
Step 0: Xác nhận module code → Xác định file output path (notes/user_guides/)
Step 1: Đọc source liên quan
         → Backend controller: backend/controllers/[xxx]Controller.js
         → Model: backend/models/[Xxx].js
         → Frontend component: frontend/src/components/[role]/[Xxx].js
         → Smart contract (nếu có): backend/contracts/ThesisManagement*.sol
         → ML model (nếu có): ml-service/models/[xxx].py
Step 2: Xác định Audience chính
         → Đọc middleware trên route → suy ra vai trò (student/lecturer/admin)
Step 3: Liệt kê API endpoints + fields từ model schema
Step 4: Viết file hoàn chỉnh theo template §2 (9 sections)
         → Không viết từng phần rồi append — write 1 lần bằng Write tool
Step 5: Cập nhật notes/user_guides/README.md
         → Thêm 1 dòng vào bảng index
Step 6: Báo cáo: file path, dòng số, size
```

---

## §7 TOKEN DISCIPLINE — Quy tắc Kỹ thuật

### File Size Limits

| Metric | Giới hạn | Lý do |
|--------|---------|-------|
| Dòng per file | ≤ 400 dòng | Tránh token limit khi write |
| Size per file | ≤ 16 KB | Safe buffer |
| Sections | 9 sections bắt buộc | Chuẩn nhất quán |
| FAQ items | 5-8 câu | Không quá nhiều |
| Field tables | All fields from MongoDB model | Không bỏ sót |

### Tool Selection

| Thao tác | Tool | Lý do |
|---------|------|-------|
| Tạo file mới | `Write` | Write toàn bộ 1 lần |
| Kiểm tra file tồn tại | `Read` hoặc `Glob` | Trước khi overwrite |
| Đọc source code | `Read` (nhắm đúng range) | Không đọc cả node_modules |
| Cập nhật README | `Edit` | Append 1 dòng vào index |
| Tìm tham chiếu cross-module | `Grep` | VD: `Grep "thesisContractService"` |

### Reading Source Code — Efficient

```
Đối với 1 module:
1. Đọc model: backend/models/[Xxx].js (~30-80 dòng) → lấy schema fields
2. Đọc controller: backend/controllers/[xxx]Controller.js → lấy endpoints + business logic
3. Đọc 1 component frontend chính → lấy UX flow (nút bấm, form fields)
4. (Nếu có blockchain) Grep function name trong .sol để hiểu contract interaction
5. (Nếu có AI) Đọc file .py trong ml-service/models/
→ KHÔNG đọc node_modules, artifacts/, cache/, logs/
```

---

## §8 README.md INDEX — Master File

File `notes/user_guides/README.md` là **master index** duy nhất:

```markdown
# Web3GiangVien — User Guides Index / Danh mục Tài liệu Hướng dẫn

> Hệ thống quản lý khóa luận Web3 + AI | Cập nhật: YYYY-MM-DD

## AUTH & PROFILE

| Module | Tên | Layer | File | Status | Cập nhật |
|--------|-----|-------|------|--------|---------|
| AUTH-0101 | Đăng ký + MetaMask | L1 | [Link](./WGV_AUTH_0101_User_Guide_v1.md) | ✅ Done | 2026-05-20 |
| AUTH-0102 | Profile SV | L1 | | ⬜ Pending | |

## TOPIC MANAGEMENT
...

## AI
...

## BLOCKCHAIN
...

## Ký hiệu / Legend
| Icon | Ý nghĩa |
|------|---------|
| ✅ Done | File hoàn chỉnh, đã review |
| 🔄 In Progress | Đang viết |
| ⬜ Pending | Chưa bắt đầu |
| 🔁 Needs Update | Source code đã thay đổi (check git log) |
```

---

## §9 QUALITY CHECKLIST — Gate trước khi giao

Checklist này chạy sau khi viết xong mỗi file:

```
FILE STRUCTURE
[ ] Đúng naming: WGV_[DOMAIN]_[CODE]_User_Guide_v1.md
[ ] Header metadata đầy đủ (version, audience, backend/frontend/contract files)
[ ] Đủ 9 sections theo thứ tự

CONTENT QUALITY
[ ] Tổng quan: mô tả đủ WHAT + WHO + WHEN
[ ] Navigation: tất cả URL route đã verify trong App.js
[ ] Access Rights: map đúng với middleware authMiddleware/roleMiddleware
[ ] Steps: scenario-based (khi X → làm Y)
[ ] Field tables: tên field đúng với MongoDB schema (case-sensitive)
[ ] Business Rules: nêu rõ rule + hệ quả
[ ] Error Handling: ≥ 3 lỗi; có ≥1 lỗi MetaMask/blockchain nếu module dùng Web3
[ ] Integration: chỉ rõ API endpoint + contract function (nếu có)
[ ] FAQ: 5-8 câu thực tế cho sinh viên/giảng viên
[ ] Quick Reference Card: bảng tóm tắt

BILINGUAL
[ ] Headers chính: Tiếng Việt / English
[ ] Tên kỹ thuật (MetaMask, IPFS, JWT, Hardhat, SBERT, PhoBERT) giữ nguyên
[ ] URL/code path giữ nguyên

TECHNICAL CONSISTENCY
[ ] Port đúng: backend 5000, frontend 3000, ml-service 8001
[ ] Tên file/folder khớp repo thực tế (verify bằng Glob)
[ ] Smart contract function name khớp .sol
[ ] File size ≤ 16KB, dòng ≤ 400
[ ] README.md đã được cập nhật
```

---

## §10 NOTES ĐẶC THÙ DỰ ÁN

- **Project root**: `D:\Khóa Luận Kỹ Sư\Team_12.04.26\12.04.26\Web3GiangVien`
- **Output folder mặc định**: `notes/user_guides/` (tạo nếu chưa có)
- **Tài liệu tham khảo có sẵn**:
  - `web3_ai_system_explanation.md` — giải thích chi tiết AI + Web3 (nguồn vàng cho section §4 của AI modules)
  - `huong_dan_chay_project.md` — setup môi trường (nguồn cho DEVOPS module)
  - `technical_blueprint_cham_diem_tien_do.md` — blueprint kỹ thuật chấm điểm AI
  - `nghiep_vu_source_12_04_2026.md` (trong `notes/`) — nghiệp vụ tổng thể
- **Khi viết về AI module**: PHẢI trích đúng công thức từ `web3_ai_system_explanation.md`:
  - SBERT: `Match_Score = (Semantic_Score * 0.6) + (Base_GPA_Score * 0.4)`, threshold `> 0.3` ở frontend
  - PhoBERT: `Base_Score = Min(8.0, 4.0 + len/800)`, `Semantic threshold > 0.45`, `Bonus = 2.0 * Min(1.0, hits/total)`
- **Khi viết về Blockchain**: Phân biệt rõ `ThesisManagement.sol` (v1) vs `ThesisManagementV2.sol` (v2); ghi chú network test (Sepolia/Localhost).
- **Không tạo tài liệu cho**: `node_modules/`, `artifacts/`, `cache/`, `logs/`, `uploads/`.

---

*Skill này được điều chỉnh từ `SKILL.md` (USER_GUIDE_WRITER cho Odoo 19 EE) sang ngữ cảnh Web3GiangVien — Khóa luận Kỹ sư Team_12.04.26.*
