# 📋 Nhật Ký Phát Triển — Ngày 04/05/2026

## Tổng Quan

Hoàn thành **4 Feature chính** cho hệ thống quản lý luận văn Web3-GiangVien:
- Feature 1: Bảng So Sánh Điểm AI vs GV
- Feature 2: Ghi Blockchain Khi SV Nộp Bài
- Feature 3: Bài Test Cạnh Tranh Đầu Vào (SBERT)
- Feature 4: Smart Contract V2 Modernization

---

## Feature 1: Bảng So Sánh Điểm AI vs Giảng Viên ✅

**Mục tiêu:** Cho phép GV xem trực quan sự chênh lệch giữa điểm AI gợi ý và điểm GV chấm thực tế.

| Thành phần | File | Mô tả |
|:---|:---|:---|
| Backend | `controllers/diemSoController.js` | API `getComparison` tổng hợp dữ liệu so sánh |
| Frontend | `components/lecturer/ScoreComparison.js` | Bảng + Biểu đồ Recharts + Drawer chi tiết |
| Service | `services/aiService.js` | `getScoreComparison()` |
| Dependency | `recharts` | Thư viện biểu đồ |

**Giao diện bao gồm:**
- 7 card thống kê tổng quan (TB Điểm GV, TB Điểm AI, Chênh lệch, Khớp, GV cao hơn, AI cao hơn)
- Biểu đồ cột so sánh trực quan
- Bảng chi tiết có filter theo đề tài, sort theo điểm
- Drawer xem chi tiết Rubrics từng sinh viên

---

## Feature 2: Ghi Blockchain Khi SV Nộp Bài ✅

**Mục tiêu:** Tự động ghi metadata bài nộp lên Blockchain Sepolia khi SV upload báo cáo.

| Thành phần | File | Mô tả |
|:---|:---|:---|
| Backend | `controllers/baoCaoController.js` | Ghi `txHash` lên MongoDB sau khi blockchain confirm |
| Backend | `models/BaoCao.js` | Thêm field `blockchainStatus`, `txHash` |
| Frontend | Hiển thị badge trạng thái blockchain | On-chain / Pending / Failed |

**Thiết kế Non-Blocking:**
- Blockchain transaction chạy async, không block workflow chính
- Nếu blockchain lỗi (hết ETH, network) → dữ liệu vẫn lưu MongoDB + IPFS
- Hiển thị thông báo cho user biết trạng thái

---

## Feature 3: Bài Test Cạnh Tranh Đầu Vào ✅

**Mục tiêu:** GV tạo bài test (Trắc nghiệm + Code), SV làm bài cạnh tranh, AI SBERT chấm tự động, kết quả ghi blockchain.

### Backend — Files MỚI

| File | Mô tả |
|:---|:---|
| `models/BaiTest.js` | Schema bài test: câu hỏi TracNghiem + Code, thời gian, trạng thái |
| `models/KetQuaTest.js` | Schema kết quả: điểm, chi tiết từng câu, txHash, unique index |
| `controllers/baiTestController.js` | 8 endpoints: CRUD + submitTest + AI grading + selectWinner |
| `ml-service/routes/compare_code.py` | SBERT so sánh semantic similarity code SV vs đáp án mẫu |

### Backend — Files SỬA

| File | Thay đổi |
|:---|:---|
| `models/DeTai.js` | Thêm `CoBaiTest: Boolean` |
| `models/DangKyDeTai.js` | Thêm trạng thái `'ChoTest'` vào enum |
| `controllers/deTaiController.js` | `registerTopic()` → set `ChoTest` nếu đề tài có test |
| `server.js` | 8 routes mới cho `/api/baitest/*` |
| `ml-service/app.py` | Register `compare_code_router` |

### Frontend — Files MỚI

| File | Mô tả |
|:---|:---|
| `components/lecturer/EntranceTestManager.js` | GV tạo câu hỏi (Monaco Editor cho code), xem bảng xếp hạng, chọn nhóm thắng |
| `components/student/EntranceTest.js` | SV làm bài: countdown timer, radio MCQ, Monaco code editor, kết quả realtime |

### Frontend — Files SỬA

| File | Thay đổi |
|:---|:---|
| `App.js` | Routes `/lecturer/entrance-test/:deTaiId` và `/student/entrance-test/:deTaiId` |
| `TopicManagement.js` | Tag "🏆 Test", nút Test (chỉ hiện khi Mở ĐK), nút Sửa đề tài |
| `TopicRegistration.js` | Tag "🏆 Có bài test", Alert + nút "Bắt Đầu Làm Bài Test" khi ChoTest |
| `services/aiService.js` | 8 API methods mới + `updateTopic()` |

### Luồng hoạt động
```
GV tạo đề tài → GV vào "Test" → Thêm câu Trắc Nghiệm + Code → Lưu
                                                    ↓
SV đăng ký đề tài (có test) → Trạng thái "ChoTest" → Làm bài test
                                                    ↓
            AI SBERT chấm tự động → Ghi blockchain → Bảng xếp hạng
                                                    ↓
                            GV xem ranking → Chọn nhóm thắng → Auto-approve
```

### Dependency mới
- `@monaco-editor/react` — Code editor chuyên nghiệp
- `sentence-transformers` (ML-service) — SBERT semantic similarity

---

## Feature 4: Smart Contract V2 Modernization ✅

**Mục tiêu:** Tối ưu gas, thêm access control, hỗ trợ ghi kết quả test on-chain.

| Thành phần | File | Mô tả |
|:---|:---|:---|
| Contract | `contracts/ThesisManagementV2.sol` | `onlyOwner`, `bytes32` keys thay `string`, `submitTestResult()` |
| Deploy | Sepolia Testnet | Address: `0x85AA2D7Dc5EC09bbe297a908b0551C8a5b305d9B` |
| Service | `services/thesisContractService.js` | Auto-detect V1/V2, backward compatible |
| Config | `.env` | `THESIS_CONTRACT_ADDRESS` updated |

**Cải tiến so với V1:**
- Gas tối ưu: `bytes32` key mapping thay `string`
- Access control: `onlyOwner` modifier cho grading/registration
- Hàm mới: `submitTestResultOnChain()` cho Feature 3

---

## UI/UX Improvements

| Sửa đổi | Chi tiết |
|:---|:---|
| Bảng Quản Lý Đề Tài | Cố định width cột, compact tags, 2-line clamp tên đề tài, layout action buttons tách [Duyệt/Test] vs [Sửa/Xóa] |
| Bảng So Sánh Điểm | 2-line clamp đề tài, cột điểm gọn hơn, `size=small` |
| EntranceTestManager | Nút "Quay về Đề Tài", sửa chữ trắng trên nút tím |
| TopicManagement | Thêm chức năng Sửa đề tài (Edit), fix InputNumber bug (không gõ được số) |

---

## Cách Chạy

```bash
# 1. Backend (port 5000)
cd backend
npm run dev

# 2. Frontend (port 3000)
cd frontend
npm start

# 3. ML Service (port 8001)
cd ml-service
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

## Biến Môi Trường (.env)

```
THESIS_CONTRACT_ADDRESS=0x85AA2D7Dc5EC09bbe297a908b0551C8a5b305d9B
PRIVATE_KEY=<your-wallet-private-key>
SEPOLIA_RPC_URL=<your-sepolia-rpc>
```
