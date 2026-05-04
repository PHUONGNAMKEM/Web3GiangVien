# Implementation Plan — Hoàn Chỉnh

## Tổng quan 4 Features

| # | Feature | Files mới | Files sửa | Độ khó |
|:---|:---|:---|:---|:---|
| 1 | Bảng so sánh AI vs GV | 1 | 3 | ⭐⭐ |
| 2 | Ghi blockchain khi SV nộp bài | 0 | 2 | ⭐ |
| 3 | Bài test cạnh tranh đầu vào | 6 | 7 | ⭐⭐⭐⭐ |
| 4 | Smart Contract V2 | 1 | 3 | ⭐⭐⭐ |

**Thứ tự**: Feature 1 → Feature 2 → Feature 4 → Feature 3

---

## Feature 1: Bảng So Sánh Điểm AI vs GV

> Chỉ thêm vào trang **Giảng viên**

### Backend

#### [MODIFY] [diemSoController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/controllers/diemSoController.js)
Thêm hàm `getComparison`:
- Input: `gvId` (từ URL param)
- Query: `DiemSo.find()` populate DeTai, SinhVien, lọc theo đề tài của GV
- Return: Danh sách `[{ student, topic, gvScore, aiScore, diff, rubricsDetail }]` + thống kê `{ avgGV, avgAI, avgDiff, correlation }`

#### [MODIFY] [server.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/server.js)
Thêm: `app.get('/api/diemso/comparison/:gvId', diemSoController.getComparison);`

### Frontend

#### [NEW] `frontend/src/components/lecturer/ScoreComparison.js`
- Bảng Ant Design: cột SV, Đề tài, Điểm AI, Điểm GV, Chênh lệch (Tag color)
- Biểu đồ cột đôi (dùng recharts hoặc Chart.js) AI vs GV
- Thống kê: trung bình GV, trung bình AI, chênh lệch, % AI thấp hơn/cao hơn
- Filter theo đề tài

#### [MODIFY] [MainLayout.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/layout/MainLayout.js)
Thêm menu item cho GV: `{ key: '/lecturer/comparison', icon: <BarChart2 />, label: 'So Sánh AI vs GV' }`

#### [MODIFY] [App.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/App.js)
Thêm route: `<Route path="comparison" element={<ScoreComparison />} />`

#### [MODIFY] [aiService.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/services/aiService.js)
Thêm: `getScoreComparison: async (gvId) => axios.get(...)`

---

## Feature 2: Ghi Blockchain Khi SV Nộp Bài

> Hiện tại `baoCaoController.uploadBaoCao` chỉ upload IPFS + lưu MongoDB. Cần thêm gọi smart contract.

### Backend

#### [MODIFY] [baoCaoController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/controllers/baoCaoController.js)
Trong hàm `uploadBaoCao`, sau khi tạo BaoCao trong MongoDB, thêm:
```javascript
// Ghi submission lên blockchain
const contractService = require('../services/thesisContractService');
try {
    const timestamp = Math.floor(Date.now() / 1000);
    const txHash = await contractService.submitReportOnChain(
        requesterId, deTaiId, ipfsCid, timestamp
    );
    // Cập nhật txHash vào BaoCao
    await BaoCao.updateMany(
        { _id: { $in: createdReports.map(r => r._id) } },
        { SubmitTxHash: txHash }
    );
} catch (bcErr) {
    logger.warn(`[REPORT] Blockchain submit failed (non-blocking): ${bcErr.message}`);
}
```
> Non-blocking: nếu blockchain lỗi, vẫn nộp bài thành công (IPFS + MongoDB đủ)

#### [MODIFY] [BaoCao.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/models/BaoCao.js)
Thêm field: `SubmitTxHash: { type: String, default: null }`

---

## Feature 3: Bài Test Cạnh Tranh Đầu Vào

### 3A. Backend — Models

#### [NEW] `backend/models/BaiTest.js`
```javascript
{
  DeTai: { type: ObjectId, ref: 'DeTai', required: true },
  TieuDe: String,
  MoTa: String,
  CauHoi: [{
    LoaiCauHoi: { type: String, enum: ['TracNghiem', 'Code'] },
    NoiDung: String,           // Đề bài
    // Trắc nghiệm
    LuaChon: [String],         // ['A. ...', 'B. ...', 'C. ...', 'D. ...']
    DapAnDung: String,         // 'A' hoặc 'B'...
    // Code
    NgonNgu: String,           // 'python', 'javascript', 'java', 'cpp'
    DapAnMau: String,          // Code mẫu GV nhập (SBERT sẽ so sánh)
    Diem: { type: Number, default: 1 }
  }],
  ThoiGianLam: Number,        // phút
  TrangThai: { type: String, enum: ['MoNop', 'DaDong'], default: 'MoNop' }
}
```

#### [NEW] `backend/models/KetQuaTest.js`
```javascript
{
  BaiTest: { type: ObjectId, ref: 'BaiTest' },
  DeTai: { type: ObjectId, ref: 'DeTai' },
  SinhVien: { type: ObjectId, ref: 'SinhVien' },
  DangKyDeTai: { type: ObjectId, ref: 'DangKyDeTai' },
  TraLoi: [{
    CauHoiIndex: Number,
    LoaiCauHoi: String,
    TraLoiText: String,        // Đáp án chọn hoặc code viết
    Diem: Number,              // Điểm đạt
    DiemToiDa: Number,
    AI_Similarity: Number      // SBERT similarity (cho code)
  }],
  TongDiem: Number,
  DiemToiDa: Number,
  TxHash: String,
  ThoiGianBatDau: Date,
  ThoiGianNop: Date
}
```

### 3B. Backend — Controller

#### [NEW] `backend/controllers/baiTestController.js`
Các hàm:
- `createTest(req, res)` — GV tạo bài test cho đề tài
- `getTestByTopic(req, res)` — Lấy bài test theo đề tài
- `submitTest(req, res)` — SV nộp bài test → AI chấm tự động:
  - Trắc nghiệm: so khớp `TraLoi === DapAnDung` → đúng = full điểm
  - Code: gọi SBERT qua FastAPI `/match-student` (tái sử dụng) hoặc tạo endpoint mới `/compare-code` → trả similarity score → quy ra điểm
  - Ghi kết quả lên blockchain: `submitTestResult(topicId, studentDID, score, timestamp)`
- `getTestResults(req, res)` — GV xem bảng xếp hạng tất cả SV
- `selectWinner(req, res)` — GV chọn nhóm thắng → auto-approve

### 3C. Backend — Sửa files hiện có

#### [MODIFY] [DeTai.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/models/DeTai.js)
Thêm: `CoBaiTest: { type: Boolean, default: false }`

#### [MODIFY] [DangKyDeTai.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/models/DangKyDeTai.js)
Sửa enum TrangThai: `['ChoDuyet', 'ChoTest', 'DaDuyet', 'TuChoi']`

#### [MODIFY] [deTaiController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/controllers/deTaiController.js)
Sửa `registerTopic`: nếu `DeTai.CoBaiTest === true` → trạng thái = `'ChoTest'` thay vì `'ChoDuyet'`

#### [MODIFY] [server.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/server.js)
Thêm routes:
```javascript
app.post('/api/baitest', baiTestController.createTest);
app.get('/api/baitest/detai/:deTaiId', baiTestController.getTestByTopic);
app.post('/api/baitest/:id/submit', authController.authenticateToken, baiTestController.submitTest);
app.get('/api/baitest/:id/results', baiTestController.getTestResults);
app.post('/api/baitest/:id/select-winner', baiTestController.selectWinner);
```

### 3D. Backend — AI Service cho Code

#### [NEW] `ml-service/routes/compare_code.py` (FastAPI)
Endpoint mới: `POST /compare-code`
```python
# Input: { student_code: str, answer_code: str }
# Output: { similarity: 0.85, feedback: "..." }
# Dùng SBERT encode cả 2 → cosine similarity
```

### 3E. Frontend — Giảng Viên

#### [NEW] `frontend/src/components/lecturer/EntranceTestManager.js`
Trang quản lý bài test đầu vào:
- **Tab 1 — Tạo Bài Test**: Form tạo câu hỏi
  - Nút "Thêm câu trắc nghiệm": input nội dung + 4 lựa chọn + tick đáp án đúng
  - Nút "Thêm câu code": input đề bài + code editor (Monaco) cho đáp án mẫu + chọn ngôn ngữ
  - Cài thời gian làm bài
- **Tab 2 — Bảng Xếp Hạng**: Table kết quả các SV/nhóm đã thi, sắp xếp theo điểm
  - Cột: Rank, SV, Điểm TN, Điểm Code, Tổng, AI Similarity
  - Nút "Chọn nhóm này" → auto-approve

#### [MODIFY] [TopicManagement.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/TopicManagement.js)
Khi tạo đề tài: thêm Switch "Yêu cầu bài test cạnh tranh"
Trong danh sách: hiển thị Tag "Có Test" / nút "Quản lý Test"

### 3F. Frontend — Sinh Viên

#### [NEW] `frontend/src/components/student/EntranceTest.js`
Giao diện làm bài test:
- Header: Tên đề tài + Countdown timer
- Phần trắc nghiệm: Radio group A/B/C/D
- Phần code: **Monaco Editor** (`@monaco-editor/react`, miễn phí)
  - Syntax highlighting, số dòng, chọn ngôn ngữ
  - Giao diện giống IDE nhưng KHÔNG compile/run
- Nút "Nộp bài" → gọi API → hiển thị kết quả

#### [MODIFY] [TopicRegistration.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/student/TopicRegistration.js)
Khi đề tài có test + SV đã đăng ký (trạng thái ChoTest):
- Hiển thị Alert "Bạn cần làm bài test cạnh tranh"
- Nút "Bắt Đầu Làm Bài Test" → navigate `/student/entrance-test/:deTaiId`

### 3G. Frontend — Routing & Navigation

#### [MODIFY] [App.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/App.js)
```jsx
// Lecturer
<Route path="entrance-test/:deTaiId" element={<EntranceTestManager />} />
// Student
<Route path="entrance-test/:deTaiId" element={<EntranceTest />} />
```

#### [MODIFY] [aiService.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/services/aiService.js)
Thêm các API methods:
```javascript
createBaiTest: async (data) => axios.post('.../baitest', data),
getBaiTestByTopic: async (deTaiId) => axios.get(`.../baitest/detai/${deTaiId}`),
submitBaiTest: async (testId, answers) => axios.post(`.../baitest/${testId}/submit`, answers),
getTestResults: async (testId) => axios.get(`.../baitest/${testId}/results`),
selectTestWinner: async (testId, dangKyId) => axios.post(`.../baitest/${testId}/select-winner`, { dangKyId }),
```

### 3H. Dependencies cần cài

```bash
# Frontend — Code Editor
cd frontend && npm install @monaco-editor/react

# Frontend — Biểu đồ (cho Feature 1)
npm install recharts
```

---

## Feature 4: Smart Contract V2

#### [NEW] `backend/contracts/ThesisManagementV2.sol`

Cải tiến so với V1:

**1. Access Control**
```solidity
address public owner;
modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

// registerTopic → onlyOwner
// finalizeGrade → onlyOwner  
// submitReport → public (ai cũng gọi được)
// submitTestResult → public
```

**2. Gas Optimization (string → bytes32)**
```solidity
// Trước: mapping(string => Topic) → tốn ~50k gas/call
// Sau:   mapping(bytes32 => Topic) → tốn ~25k gas/call
mapping(bytes32 => Topic) public topics;
// Backend hash trước: keccak256(abi.encodePacked(topicId))
```

**3. Thêm struct & function cho Test**
```solidity
struct TestResult {
    bytes32 studentDID;
    bytes32 topicId;
    uint16 score;        // Điểm (x10 để tránh thập phân)
    uint256 timestamp;
}

mapping(bytes32 => TestResult[]) public testResults; // topicId => results

event TestResultSubmitted(bytes32 indexed topicId, bytes32 indexed studentDID, uint16 score);

function submitTestResult(bytes32 topicId, bytes32 studentDID, uint16 score) public {
    testResults[topicId].push(TestResult(studentDID, topicId, score, block.timestamp));
    emit TestResultSubmitted(topicId, studentDID, score);
}
```

#### [MODIFY] [thesisContractService.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/services/thesisContractService.js)
- Cập nhật ABI path cho V2
- Thêm helper `toBytes32(str)`: `ethers.keccak256(ethers.toUtf8Bytes(str))`
- Sửa tất cả hàm: hash topicId/studentDID trước khi gọi contract
- Thêm `submitTestResultOnChain(topicId, studentDID, score)`

#### [MODIFY] [hardhat.config.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/hardhat.config.js)
Không cần sửa (config đã đúng)

#### [MODIFY] `.env`
Sau deploy: cập nhật `THESIS_CONTRACT_ADDRESS` thành address mới

---

## Tổng hợp tất cả Files

### Files MỚI cần tạo (8 files)

| File | Feature |
|:---|:---|
| `frontend/src/components/lecturer/ScoreComparison.js` | F1 |
| `backend/models/BaiTest.js` | F3 |
| `backend/models/KetQuaTest.js` | F3 |
| `backend/controllers/baiTestController.js` | F3 |
| `ml-service/routes/compare_code.py` | F3 |
| `frontend/src/components/lecturer/EntranceTestManager.js` | F3 |
| `frontend/src/components/student/EntranceTest.js` | F3 |
| `backend/contracts/ThesisManagementV2.sol` | F4 |

### Files SỬA (10 files)

| File | Feature | Thay đổi |
|:---|:---|:---|
| `backend/controllers/diemSoController.js` | F1 | Thêm `getComparison` |
| `backend/server.js` | F1+F3 | Thêm routes mới |
| `backend/controllers/baoCaoController.js` | F2 | Thêm gọi `submitReportOnChain` |
| `backend/models/BaoCao.js` | F2 | Thêm `SubmitTxHash` |
| `backend/models/DeTai.js` | F3 | Thêm `CoBaiTest` |
| `backend/models/DangKyDeTai.js` | F3 | Thêm trạng thái `ChoTest` |
| `backend/controllers/deTaiController.js` | F3 | Sửa `registerTopic` logic |
| `backend/services/thesisContractService.js` | F4 | Cập nhật ABI + bytes32 |
| `frontend/src/App.js` | F1+F3 | Thêm routes |
| `frontend/src/components/layout/MainLayout.js` | F1 | Thêm menu item |
| `frontend/src/services/aiService.js` | F1+F3 | Thêm API methods |
| `frontend/src/components/lecturer/TopicManagement.js` | F3 | Thêm "Có bài test" |
| `frontend/src/components/student/TopicRegistration.js` | F3 | Thêm nút làm test |

---

## Verification Plan

### Feature 1
- `npm start` backend → `curl /api/diemso/comparison/:gvId` → kiểm tra JSON trả về
- Frontend: mở trang So Sánh → kiểm tra bảng + biểu đồ

### Feature 2
- Upload báo cáo → kiểm tra log `[BLOCKCHAIN] submitReport success`
- Kiểm tra BaoCao trong MongoDB có `SubmitTxHash`

### Feature 3
- GV tạo bài test (3 câu TN + 1 câu code) → SV làm bài → kiểm tra điểm
- Kiểm tra SBERT similarity cho code
- Kiểm tra TxHash ghi blockchain

### Feature 4
- `npx hardhat compile` → không lỗi
- Deploy Sepolia: `npx hardhat run scripts/deployV2.js --network sepolia`
- Test gọi function qua Etherscan
