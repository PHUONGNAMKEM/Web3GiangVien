# CHANGELOG

## [2026-05-23] — Business Logic Fixes + Contract Redeploy

### Yêu cầu bắt buộc với mọi thành viên

#### 1. Cập nhật `.env`

Thêm / cập nhật các biến sau vào `backend/.env`:

```env
# Contract mới — địa chỉ cũ (0x571c...) không còn hợp lệ
THESIS_CONTRACT_ADDRESS=0x1a828360B971409677a5280912fED2bE846cB025

# Bật ghi tiến độ tuần lên blockchain
PROGRESS_ONCHAIN_ENABLED=true
```

> Nếu không cập nhật `THESIS_CONTRACT_ADDRESS`, mọi thao tác ghi blockchain (đăng ký đề tài, chấm điểm, nộp báo cáo) sẽ thất bại.

---

#### 2. Chạy lại `npm install` (nếu có lỗi module)

```bash
cd backend && npm install
cd frontend && npm install
```

---

#### 3. Route mới — cập nhật Postman / tài liệu API

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| `POST` | `/api/baitest/:id/start` | Trưởng nhóm bắt đầu bài test cạnh tranh | JWT (sinh viên trưởng nhóm) |
| `GET` | `/api/tiendo/:id/ai-suggest` | AI (PhoBERT) gợi ý điểm tiến độ tuần | JWT (giảng viên) |

---

#### 4. Breaking: tất cả write routes yêu cầu JWT

Từ phiên bản này, **tất cả** các route tạo/sửa/xóa đều bắt buộc header:

```
Authorization: Bearer <token>
```

Các route bị ảnh hưởng (một số ví dụ):

- `POST /api/detai` — tạo đề tài
- `PUT /api/detai/:id` — sửa đề tài
- `POST /api/detai/:id/register` — đăng ký đề tài
- `PUT /api/dangky/:id/approve` — duyệt đăng ký
- `POST /api/baocao/upload` — nộp báo cáo
- `POST /api/diemso` — chấm điểm
- `PUT /api/tiendo/:id/danhgia` — đánh giá tiến độ
- `POST /api/baitest/:id/start` — bắt đầu bài test
- `POST /api/baitest/:id/submit` — nộp bài test

> Test bằng Postman: lấy token qua `/api/auth/verify`, sau đó thêm vào tab **Authorization → Bearer Token**.

---

### Thay đổi trong code (tóm tắt cho dev)

#### Backend

| File | Thay đổi |
|------|----------|
| `middleware/authz.js` | **Mới** — middleware `requireRole('LECTURER'/'STUDENT')` |
| `server.js` | Áp dụng `requireRole` cho tất cả write routes |
| `controllers/deTaiController.js` | Kiểm tra deadline `HanDangKy` khi đăng ký; `sinhVienId` lấy từ token (không nhận từ body) |
| `controllers/baoCaoController.js` | Kiểm tra deadline `HanNopBaoCao` khi nộp báo cáo |
| `controllers/nhomController.js` | `sinhVienId` lấy từ token; `transferLeader` block sau `DaChot` |
| `controllers/baiTestController.js` | Chỉ trưởng nhóm mới `start`/`submit`; `sinhVienId` từ token |
| `controllers/diemSoController.js` | Chấm điểm tự động lan sang toàn bộ thành viên nhóm; auto-complete đề tài khi đủ điểm |
| `controllers/tienDoController.js` | `sinhVienId` từ token; ghi blockchain nếu `PROGRESS_ONCHAIN_ENABLED=true` |
| `models/DeTai.js` | Thêm field `HanDangKy`, `HanNopBaoCao` (Date, optional) |
| `models/TienDo.js` | Thêm field `TxHash`, `TrangThaiBlockchain`, `LoiBlockchain` (optional) |
| `contracts/ThesisManagementV2.sol` | Thêm `submitProgress()`, `getProgressLogs()`, struct `ProgressRecord` |
| `services/thesisContractService.js` | Thêm `submitProgressOnChain()` |

#### Frontend

| File | Thay đổi |
|------|----------|
| `services/aiService.js` | Thêm `startBaiTest()`, `aiSuggestProgress()` |
| `components/student/EntranceTest.js` | Chỉ trưởng nhóm thấy nút bắt đầu bài test |
| `components/lecturer/TopicManagement.js` | Form tạo/sửa đề tài có thêm 2 trường `HanDangKy`, `HanNopBaoCao` |
| `components/lecturer/SubmissionReview.js` | Nút "AI gợi ý điểm (PhoBERT)" trong modal đánh giá tiến độ tuần |

---

### Smart Contract

| | |
|-|-|
| **Contract** | `ThesisManagementV2` |
| **Network** | Sepolia Testnet |
| **Address mới** | `0x1a828360B971409677a5280912fED2bE846cB025` |
| **Address cũ** | `0x571cDa9353107de84E58D313022d02bF2efAc5E5` (không dùng nữa) |
| **Deployer** | `0xD6aB1D7521A6cd96317bd2d04d89d431b888a7F0` |

Hàm mới trong contract:

```solidity
function submitProgress(bytes32 topicHash, bytes32 studentDID, uint16 week, uint16 score) public
function getProgressLogs(bytes32 topicHash, bytes32 studentDID) public view returns (ProgressRecord[])
```

---

### Ghi chú nghiệp vụ

- **Chấm điểm nhóm**: Khi GV chấm 1 sinh viên trong nhóm, điểm tự động được ghi cho tất cả thành viên có đăng ký `DaDuyet`.
- **Hoàn thành đề tài**: Khi tất cả thành viên đã có điểm, trạng thái đề tài tự chuyển sang `HoanThanh`.
- **Deadline**: Sinh viên đăng ký sau `HanDangKy` hoặc nộp báo cáo sau `HanNopBaoCao` sẽ bị từ chối (nếu GV đã thiết lập).
- **Tiến độ blockchain**: Mỗi lần GV đánh giá tiến độ tuần, điểm sẽ được ghi lên Sepolia nếu `PROGRESS_ONCHAIN_ENABLED=true`.
