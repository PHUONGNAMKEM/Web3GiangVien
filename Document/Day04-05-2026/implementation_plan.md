# Kế Hoạch Triển Khai — Cập Nhật Sau Phản Hồi

## Phát Hiện Quan Trọng Về Flow Hiện Tại

> [!WARNING]
> **Khi SV nộp báo cáo** → backend chỉ upload PDF lên IPFS + lưu CID vào MongoDB. **KHÔNG ghi blockchain**.
> **Khi GV chấm điểm** → mới ghi blockchain (auto-register topic + auto-submit report + finalizeGrade).
> → Bước nộp bài **thiếu** ghi on-chain. Đây chính là chỗ thầy muốn bổ sung JSON.

---

## Feature 1: Bảng So Sánh Điểm AI vs GV (Trang Giảng Viên)

✅ Xác nhận: Chỉ thêm vào **trang Giảng viên**, không ở trang sinh viên.

**Backend**: Thêm `GET /api/diemso/comparison/:gvId` trả bảng tổng hợp + thống kê trung bình.

**Frontend**: Thêm component `ScoreComparison.js` trong thư mục `lecturer/` với bảng + biểu đồ cột.

**Độ khó**: ⭐⭐ — Data đã có sẵn trong DiemSo model.

---

## Feature 2: Nộp JSON Khi Sinh Viên Nộp Bài

### Phân tích lại đúng ý thầy

Hiện tại khi SV nộp bài, hệ thống lưu:
- **MongoDB**: `{ DeTai, SinhVien, TieuDe, IPFS_CID, NgayNop }` — chỉ 5 field
- **IPFS**: File PDF gốc
- **Blockchain**: ❌ KHÔNG ghi gì

Ý thầy: Khi SV nộp bài cuối cùng, cần **tạo file JSON metadata** chứa thông tin đầy đủ → upload lên IPFS → **ghi CID lên blockchain** ngay tại bước nộp bài (không đợi GV chấm).

```json
{
  "type": "submission_metadata",
  "student": { "maSV": "2024001", "hoTen": "...", "wallet": "0x..." },
  "topic": { "maDeTai": "DT001", "tenDeTai": "...", "deadline": "..." },
  "submission": {
    "reportCID": "QmXyz...",
    "submittedAt": "2026-05-04T...",
    "title": "Báo cáo đồ án"
  }
}
```

### Kế hoạch

**Backend**:
- Sửa `baoCaoController.uploadBaoCao`: Sau upload PDF → tạo JSON metadata → upload JSON lên IPFS → gọi `submitReportOnChain(studentDID, topicId, jsonCID, timestamp)` → lưu thêm `Metadata_CID` và `TxHash` vào BaoCao
- Sửa model `BaoCao.js`: Thêm `Metadata_CID` và `SubmitTxHash`

**Độ khó**: ⭐⭐ — IPFS service + contract function đều đã có sẵn, chỉ cần kết nối.

---

## Feature 3: Bài Test Đầu Vào Cạnh Tranh Web3

### Các dạng bài test cho SV CNTT

| Dạng | Mô tả | Cách AI chấm | Nên làm? |
|:---|:---|:---|:---|
| **Trắc nghiệm** | GV nhập câu hỏi + đáp án đúng, SV chọn | So khớp đáp án tự động (không cần AI) | ✅ Nên — đơn giản, chấm chính xác |
| **Tự luận ngắn** | GV nhập câu hỏi + đáp án mẫu, SV viết | PhoBERT so semantic similarity với đáp án mẫu | ✅ Nên — phù hợp CNTT |
| **Code** | GV nhập đề + test cases (input/output), SV viết code | Chạy code trong sandbox, so output vs expected | ⚠️ Phức tạp — cần sandbox |

> [!IMPORTANT]
> **Về test code**: Có 2 cách tiếp cận:
> - **Cách 1 (Đơn giản - Đề xuất)**: SV paste code vào textarea, AI (PhoBERT) phân tích cấu trúc code + so với đáp án mẫu GV nhập. Không chạy thật, chỉ đánh giá text similarity + keywords.
> - **Cách 2 (Phức tạp)**: Dùng Judge0 API (sandbox online) để compile & run code thật, so output. Rất chuẩn nhưng cần tích hợp thêm service bên ngoài.
>
> **Đề xuất**: Giai đoạn 1 dùng Cách 1 (text analysis). Nếu cần nâng cao sau thì tích hợp Judge0.

### Flow hoàn chỉnh

```
GV Tạo Đề Tài (tick "Có bài test") 
  → GV Tạo Bài Test (trắc nghiệm + tự luận + code)
  → GV Nhập Đáp Án Trước
  → SV Đăng Ký → Trạng thái "ChoTest"  
  → SV Làm Bài Test Online (có countdown)
  → AI Chấm Tự Động (so đáp án GV nhập)
  → Kết Quả Ghi Blockchain (minh bạch)
  → GV Xem Bảng Xếp Hạng → Chọn Nhóm Tốt Nhất → Duyệt
```

### Kế hoạch chi tiết

**Smart Contract** — Deploy contract mới `ThesisManagementV2.sol`:
- Thêm `submitTestResult(topicId, studentDID, score, metadataCID)` + event
- Thêm `getTestResults(topicId)` 
- Thêm access control (`onlyOwner` cho `finalizeGrade`)
- Đổi string key → bytes32 cho gas optimization

**Backend** — 2 model + 1 controller mới:
- `BaiTest.js`: Lưu câu hỏi + đáp án của GV
- `KetQuaTest.js`: Lưu kết quả SV làm bài
- `baiTestController.js`: CRUD bài test, nộp bài, AI chấm, chọn winner
- Sửa `DeTai.js`: Thêm `CoBaiTest: Boolean`
- Sửa `DangKyDeTai`: Thêm trạng thái `ChoTest`

**Frontend**:
- `EntranceTestManager.js` (lecturer): Tạo/quản lý test, xem kết quả, chọn nhóm
- `EntranceTest.js` (student): Làm bài test online
- Sửa `TopicManagement.js`: Checkbox "Có bài test"
- Sửa `TopicRegistration.js`: Hiển thị nút "Làm bài test"

**Độ khó**: ⭐⭐⭐⭐

---

## Feature 4: Smart Contract Improvements

### Access Control
- Thêm `modifier onlyOwner` — chỉ GV (deployer) mới gọi được `registerTopic`, `finalizeGrade`
- SV gọi `submitReport` và `submitTestResult`

### Gas Optimization (String → bytes32)
- Đổi `mapping(string => Topic)` thành `mapping(bytes32 => Topic)`
- Backend hash topicId/studentDID bằng `keccak256` trước khi gọi contract
- Tiết kiệm ~30-50% gas cho mỗi transaction

> [!WARNING]
> Cả 2 thay đổi này = deploy contract mới. Nên gộp chung với Feature 3 vào `ThesisManagementV2.sol`.

---

## Tổng Hợp Thứ Tự Triển Khai

| # | Feature | Phụ thuộc | Thứ tự |
|:---|:---|:---|:---|
| 1 | Bảng so sánh AI vs GV | Không | 🟢 Làm đầu tiên |
| 2 | JSON metadata khi nộp bài | Không | 🟢 Làm thứ hai |
| 4 | Smart contract V2 (access control + gas opt) | Cần deploy mới | 🟡 Làm thứ ba |
| 3 | Bài test cạnh tranh | Cần contract V2 | 🟡 Làm cuối cùng |

## Open Questions

> [!IMPORTANT]
> **Câu hỏi duy nhất**: Về phần test code, bạn muốn dùng Cách 1 (AI phân tích text code, không chạy thật) hay Cách 2 (tích hợp Judge0 sandbox chạy code thật)? Mình đề xuất Cách 1 cho giai đoạn đầu.

## Verification Plan

- Backend: `npm start` verify không lỗi + test API bằng curl
- Frontend: `npm start` verify UI
- Smart Contract: `npx hardhat compile` + deploy Sepolia + verify Etherscan
- E2E: Demo flow tạo test → SV làm bài → AI chấm → blockchain
