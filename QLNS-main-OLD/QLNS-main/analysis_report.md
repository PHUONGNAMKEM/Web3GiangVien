# Phân Tích & Kế Hoạch Xây Dựng Hệ Thống Web3 Hỗ Trợ Giảng Viên

## 1. Đánh Giá Source Code Hiện Tại (QLNS-main)

### Hệ thống hiện tại là gì?
Đây là **Web3 HR Management System** (Hệ thống Quản lý Nhân sự Web3) với domain nghiệp vụ:
- Chấm công, tính lương, KPI cho nhân viên
- QR Authentication, Consent Management
- Thanh toán token ERC-20 (USDT) qua Smart Contract

### Kiến trúc hiện tại

| Lớp | Công nghệ | Tình trạng |
|-----|-----------|------------|
| **Frontend** | React.js + MUI + Ethers.js + MetaMask | ✅ Hoàn chỉnh |
| **Backend** | Node.js + Express.js + Mongoose | ✅ Hoàn chỉnh |
| **Blockchain** | Hardhat + Solidity + Sepolia | ✅ 5 Smart Contracts |
| **Database** | MongoDB Atlas | ✅ 9 Models |
| **ML Service** | PhoBERT (planned) | ⚠️ Chỉ có README, chưa có code |
| **IPFS** | Pinata Gateway (config only) | ⚠️ Config sẵn, chưa tích hợp upload |
| **Deploy** | Render + Docker | ✅ Cấu hình sẵn |

### Các thành phần tái sử dụng được

| Thành phần | Tái sử dụng? | Lý do |
|------------|:---:|--------|
| [hardhat.config.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/QLNS-main/backend/hardhat.config.js) | ✅ | Config Sepolia + localhost giữ nguyên |
| [config/web3.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/QLNS-main/backend/config/web3.js) | ✅ | Web3 provider, signer, contract helper - dùng lại 80% |
| [config/db.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/QLNS-main/backend/config/db.js) | ✅ | MongoDB connection - giữ nguyên |
| [middleware/cspHeader.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/QLNS-main/backend/middleware/cspHeader.js) | ✅ | Security header - giữ nguyên |
| Auth (JWT + MetaMask) | ✅ | [authController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/QLNS-main/backend/controllers/authController.js) + [authService.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/QLNS-main/backend/services/authService.js) dùng lại |
| Frontend auth flow | ✅ | [LoginPage.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/QLNS-main/frontend/src/components/LoginPage.js), [AuthContext.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/QLNS-main/frontend/src/AuthContext.js), MetaMask guide |
| Ethers.js integration | ✅ | Frontend + Backend đều đã có Ethers.js v6 |
| Deploy scripts pattern | ✅ | `scripts/deploy-*.js` làm template |
| Docker config | ✅ | Dockerfiles + docker-compose dùng lại |
| Smart Contracts | ❌ | Domain khác hoàn toàn (HR ≠ Giảng viên) → viết mới |
| MongoDB Models | ❌ | Cần models mới (DeTai, BaoCao, SinhVien...) |
| Controllers/Routes | ❌ | Logic nghiệp vụ khác 100% → viết mới |
| ML Service | ❌ | Chưa có code, cần xây từ đầu |
| Frontend pages | ❌ | UI/UX khác (dashboard giảng viên ≠ HR) → viết mới |

---

## 2. Kết Luận: Nên TÁI SỬ DỤNG hay XÂY MỚI?

> [!IMPORTANT]
> **Khuyến nghị: TÁI SỬ DỤNG codebase hiện tại làm nền tảng (scaffold), sau đó viết mới phần nghiệp vụ.**

### Lý do:
1. **~30% có thể tái sử dụng trực tiếp**: Hardhat config, Web3 setup, Auth flow, Deploy pattern, Docker
2. **Stack hoàn toàn trùng khớp**: Node.js + Express + React + Ethers.js + Hardhat + MongoDB + Sepolia
3. **Tiết kiệm 1-2 tuần** so với setup từ đầu (không cần config lại MetaMask integration, Hardhat, Docker...)
4. **Đã có pattern mẫu**: Deploy scripts, contract interaction pattern, frontend-backend Web3 flow

### Cách tiếp cận đề xuất:
```
Fork/Copy QLNS-main → Xóa phần nghiệp vụ HR → Giữ skeleton → Xây nghiệp vụ Giảng viên lên trên
```

---

## 3. Các Bước Thực Hiện Chi Tiết

### GIAI ĐOẠN 0: Chuẩn bị môi trường

#### Bước 0.1 - Cài đặt công cụ cần thiết

```
1. Node.js >= 18.x          → https://nodejs.org/
2. Git                       → https://git-scm.com/
3. MongoDB Atlas account     → https://www.mongodb.com/atlas
4. MetaMask Extension        → Chrome Web Store
5. Python >= 3.9             → https://www.python.org/ (cho ML Service)
6. VS Code + Solidity ext    → Extensions: "Solidity" by Juan Blanco
7. Postman                   → https://www.postman.com/
```

#### Bước 0.2 - Tạo tài khoản dịch vụ

```
1. Infura account            → https://infura.io/ (lấy Sepolia RPC URL)
2. Pinata account            → https://www.pinata.cloud/ (IPFS cho file báo cáo)
3. Sepolia Faucet            → https://sepoliafaucet.com/ (lấy ETH test)
4. Vercel account            → https://vercel.com/ (deploy frontend)
5. Render account            → https://render.com/ (deploy backend)
```

---

### GIAI ĐOẠN 1: Dọn dẹp & Thiết lập Skeleton

#### Bước 1.1 - Fork/Copy source code
```bash
# Copy toàn bộ project
cp -r QLNS-main/ Web3-GiangVien/
cd Web3-GiangVien/
git init
```

#### Bước 1.2 - Giữ lại các file cơ sở (KHÔNG XÓA)
```
✅ backend/hardhat.config.js
✅ backend/config/db.js
✅ backend/config/web3.js           → Sửa contract addresses
✅ backend/middleware/cspHeader.js
✅ backend/controllers/authController.js
✅ backend/services/authService.js
✅ backend/package.json              → Thêm dependencies mới
✅ frontend/src/AuthContext.js
✅ frontend/src/components/LoginPage.js
✅ frontend/src/services/authService.js
✅ docker/
✅ render.yaml
✅ .env.example
```

#### Bước 1.3 - Xóa phần nghiệp vụ HR
```
❌ backend/contracts/ (tất cả .sol) → Viết Smart Contract mới
❌ backend/models/ (trừ auth)       → Models mới
❌ backend/controllers/ (trừ auth)  → Controllers mới
❌ backend/services/ (trừ auth)     → Services mới
❌ frontend/src/components/admin/   → Pages mới
❌ frontend/src/components/dashboard/ → Pages mới
❌ frontend/src/components/AdminDashboard.js
❌ frontend/src/components/EmployeeDashboard.js
```

---

### GIAI ĐOẠN 2: Smart Contract (Solidity)

#### Bước 2.1 - Viết Smart Contract `ThesisManagement.sol`
```solidity
// Chức năng cần có:
- registerTopic(string title, string advisorDID, uint256 deadline, string[] requirements)
- submitReport(string studentDID, string topicId, string ipfsCID, uint256 timestamp)
- finalizeGrade(string studentDID, string topicId, uint8 grade, string feedback)
- getTopicsByAdvisor(string advisorDID) → Topic[]
- getSubmissionHistory(string studentDID, string topicId) → Submission[]
```

#### Bước 2.2 - Compile & Test
```bash
cd backend
npx hardhat compile
npx hardhat test
```

#### Bước 2.3 - Deploy lên Sepolia
```bash
npx hardhat run scripts/deploy-thesis.js --network sepolia
# Lưu contract address vào .env
```

---

### GIAI ĐOẠN 3: Backend (Node.js + Express)

#### Bước 3.1 - Cài thêm dependencies
```bash
cd backend
npm install pinata-sdk ipfs-http-client multer
```

#### Bước 3.2 - Tạo MongoDB Models mới
```
models/
├── DeTai.js          # Đề tài (tiêu đề, mô tả, yêu cầu, deadline, giảng viên)
├── SinhVien.js       # Thông tin sinh viên (GPA, điểm chuyên ngành, wallet)
├── BaoCao.js         # File báo cáo (CID IPFS, ngày nộp, trạng thái)
├── DiemSo.js         # Điểm số (giá trị, phản hồi AI, on-chain hash)
├── GiangVien.js      # Thông tin giảng viên (chuyên ngành, wallet)
└── DangKyDeTai.js    # Bảng đăng ký đề tài (sinh viên - đề tài mapping)
```

#### Bước 3.3 - Tạo Controllers mới
```
controllers/
├── deTaiController.js       # CRUD đề tài, chốt danh sách
├── baoCaoController.js      # Upload IPFS, lấy CID, lịch sử nộp
├── diemSoController.js      # Chấm điểm, ghi on-chain
├── sinhVienController.js    # CRUD sinh viên
├── giangVienController.js   # CRUD giảng viên
├── aiController.js          # Gọi ML Service (PhoBERT/SBERT)
└── ipfsController.js        # Upload/Download file IPFS
```

#### Bước 3.4 - Tạo Services mới
```
services/
├── ipfsService.js           # Upload file lên Pinata/IPFS
├── thesisContractService.js # Tương tác Smart Contract
├── aiService.js             # Gọi ML Service API
└── matchingService.js       # So khớp năng lực SV với đề tài (SBERT)
```

#### Bước 3.5 - Cập nhật server.js
- Giữ lại: Auth routes, CORS, Socket.IO, Multer config
- Thêm mới: Routes cho DeTai, BaoCao, DiemSo, AI, IPFS

---

### GIAI ĐOẠN 4: ML Service (Python - PhoBERT & SBERT)

#### Bước 4.1 - Setup Python Service
```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn torch transformers sentence-transformers
```

#### Bước 4.2 - Cấu trúc ML Service
```
ml-service/
├── app.py                    # FastAPI main app
├── requirements.txt
├── models/
│   ├── phobert_analyzer.py   # PhoBERT: Phân tích nội dung báo cáo tiếng Việt
│   └── sbert_matcher.py      # SBERT: So khớp năng lực SV ↔ yêu cầu đề tài
├── routes/
│   ├── analyze.py            # POST /analyze-report → Phản hồi tự động
│   └── match.py              # POST /match-student  → Gợi ý đề tài phù hợp
└── utils/
    └── text_preprocessing.py # Tiền xử lý văn bản tiếng Việt
```

#### Bước 4.3 - API Endpoints
```
POST /analyze-report
  Body: { "text": "Nội dung báo cáo...", "topic_requirements": [...] }
  Response: { "score": 7.5, "feedback": "...", "issues": [...] }

POST /match-student
  Body: { "student": { "gpa": 3.2, "major_scores": {...} }, "topics": [...] }
  Response: { "recommendations": [{ "topic_id": "...", "match_score": 0.85 }] }

GET /healthz
  Response: { "status": "ok", "models_loaded": true }
```

#### Bước 4.4 - Chạy ML Service
```bash
uvicorn app:app --host 0.0.0.0 --port 8001
```

---

### GIAI ĐOẠN 5: Frontend (React.js)

#### Bước 5.1 - Cài thêm dependencies
```bash
cd frontend
npm install @pinata/sdk file-saver
```

#### Bước 5.2 - Tạo các Pages mới
```
src/components/
├── LoginPage.js                  # ✅ Tái sử dụng (MetaMask login)
├── MetaMaskGuideModal.js         # ✅ Tái sử dụng
├── lecturer/
│   ├── LecturerDashboard.js      # Dashboard tổng quan cho giảng viên
│   ├── TopicManagement.js        # Quản lý đề tài
│   ├── SubmissionReview.js       # Xem & chấm bài nộp
│   ├── GradeFinalization.js      # Chốt điểm + ký MetaMask
│   └── AIInsights.js             # Xem gợi ý từ AI
├── student/
│   ├── StudentDashboard.js       # Dashboard sinh viên
│   ├── TopicRegistration.js      # Đăng ký đề tài
│   ├── ReportUpload.js           # Upload báo cáo → IPFS
│   ├── ProgressTracking.js       # Theo dõi tiến độ
│   └── GradeView.js              # Xem điểm đã chốt on-chain
├── shared/
│   ├── IPFSFileViewer.js         # Xem file từ IPFS
│   ├── TransactionHistory.js     # Lịch sử giao dịch blockchain
│   └── Web3Status.js             # Hiển thị trạng thái kết nối Web3
```

#### Bước 5.3 - Tạo Services frontend
```
src/services/
├── authService.js      # ✅ Tái sử dụng
├── apiService.js       # Tạo mới (gọi backend API)
├── web3Service.js      # Tương tác Smart Contract từ frontend
├── ipfsService.js      # Upload file lên IPFS
└── aiService.js        # Gọi AI endpoints
```

#### Bước 5.4 - Cập nhật Routing
```javascript
// App.js
<Route path="/lecturer" element={<LecturerDashboard />} />
<Route path="/lecturer/topics" element={<TopicManagement />} />
<Route path="/lecturer/review" element={<SubmissionReview />} />
<Route path="/student" element={<StudentDashboard />} />
<Route path="/student/register" element={<TopicRegistration />} />
<Route path="/student/upload" element={<ReportUpload />} />
```

---

### GIAI ĐOẠN 6: Tích hợp IPFS

#### Bước 6.1 - Setup Pinata
```bash
# Tạo API key tại https://app.pinata.cloud/keys
# Thêm vào .env:
PINATA_API_KEY=your-key
PINATA_SECRET_KEY=your-secret
```

#### Bước 6.2 - Luồng Upload File
```
Student upload PDF → Backend nhận file (Multer)
  → Backend upload lên Pinata → Nhận CID
  → CID được lưu vào MongoDB + ghi vào Smart Contract
  → Frontend hiển thị link IPFS: https://gateway.pinata.cloud/ipfs/{CID}
```

---

### GIAI ĐOẠN 7: Tích hợp toàn bộ & Test

#### Bước 7.1 - Luồng hoạt động hoàn chỉnh
```
1. Giảng viên đăng nhập qua MetaMask → Tạo đề tài (deadline, yêu cầu)
2. Sinh viên đăng nhập → Xem danh sách đề tài (AI gợi ý phù hợp theo GPA)
3. Sinh viên đăng ký đề tài → Backend lưu MongoDB
4. Sinh viên upload báo cáo PDF → IPFS (lấy CID) → Lưu CID on-chain
5. PhoBERT phân tích nội dung → Đưa phản hồi tự động
6. Giảng viên review → Chấm điểm → Ký MetaMask xác nhận
7. Điểm + CID + Deadline ghi vĩnh viễn vào Smart Contract (Sepolia)
```

#### Bước 7.2 - Test với Postman
```
- Test auth flow (MetaMask challenge/verify)
- Test CRUD đề tài
- Test upload file → IPFS
- Test AI analyze/match
- Test ghi điểm on-chain
```

#### Bước 7.3 - Test trên trình duyệt
```
- Kết nối MetaMask (Sepolia network)
- Upload file, xác nhận giao dịch
- Kiểm tra transaction trên https://sepolia.etherscan.io/
```

---

### GIAI ĐOẠN 8: Deploy

#### Bước 8.1 - Backend → Render
```bash
# Đã có render.yaml - chỉ cần update
# Push code lên GitHub → Kết nối Render
```

#### Bước 8.2 - Frontend → Vercel
```bash
cd frontend
npm run build
# Deploy qua Vercel CLI hoặc GitHub integration
```

#### Bước 8.3 - ML Service → Render/VPS
```bash
# Deploy FastAPI trên Render hoặc VPS Ubuntu
# Lưu ý: Cần >= 2GB RAM cho PhoBERT model
```

---

## 4. Tổng Kết Dependencies Cần Cài Đặt

### Backend (Node.js)
```json
{
  "dependencies": {
    "express": "^4.18.2",        // ✅ Đã có
    "mongoose": "^8.0.0",        // ✅ Đã có
    "ethers": "^6.8.0",          // ✅ Đã có
    "cors": "^2.8.5",            // ✅ Đã có
    "jsonwebtoken": "^9.0.2",    // ✅ Đã có
    "multer": "^1.4.5-lts.1",    // ✅ Đã có
    "dotenv": "^16.3.1",         // ✅ Đã có
    "socket.io": "^4.6.1",       // ✅ Đã có
    "axios": "^1.13.2",          // ✅ Đã có
    "pinata-sdk": "^2.1.0",      // 🆕 Upload IPFS
    "node-cron": "^4.2.1"        // ✅ Đã có
  },
  "devDependencies": {
    "hardhat": "^2.22.5",                      // ✅ Đã có
    "@nomicfoundation/hardhat-toolbox": "^5.0.0", // ✅ Đã có
    "@openzeppelin/contracts": "^4.9.5",        // ✅ Đã có
    "nodemon": "^3.0.1"                         // ✅ Đã có
  }
}
```

### Frontend (React.js)
```json
{
  "dependencies": {
    "react": "^18.2.0",          // ✅ Đã có
    "react-dom": "^18.2.0",      // ✅ Đã có
    "react-router-dom": "^6.22.3", // ✅ Đã có
    "ethers": "^6.8.1",          // ✅ Đã có
    "@mui/material": "^5.14.19", // ✅ Đã có
    "@mui/icons-material": "^5.14.19", // ✅ Đã có
    "axios": "^1.6.0",           // ✅ Đã có
    "recharts": "^3.3.0",        // ✅ Đã có (biểu đồ)
    "framer-motion": "^12.23.24", // ✅ Đã có (animation)
    "react-dropzone": "^14.2.0"  // 🆕 Drag-drop upload file
  }
}
```

### ML Service (Python)
```
fastapi==0.104.0        # 🆕 Web framework
uvicorn==0.24.0         # 🆕 ASGI server
torch>=2.0.0            # 🆕 PyTorch
transformers>=4.35.0    # 🆕 Hugging Face (PhoBERT)
sentence-transformers>=2.2.0  # 🆕 SBERT
underthesea>=6.8.0      # 🆕 Xử lý tiếng Việt (tách từ)
numpy>=1.24.0           # 🆕
scikit-learn>=1.3.0     # 🆕
```

---

## 5. Ước Tính Thời Gian

| Giai đoạn | Thời gian | Ghi chú |
|-----------|-----------|---------|
| GĐ 0: Chuẩn bị | 1 ngày | Cài tools, tạo accounts |
| GĐ 1: Dọn dẹp skeleton | 1 ngày | Copy + xóa code HR |
| GĐ 2: Smart Contract | 3-5 ngày | Viết + test + deploy Sepolia |
| GĐ 3: Backend APIs | 5-7 ngày | Models + Controllers + Services |
| GĐ 4: ML Service | 5-7 ngày | PhoBERT + SBERT tích hợp |
| GĐ 5: Frontend | 7-10 ngày | UI cho Giảng viên + Sinh viên |
| GĐ 6: IPFS | 2-3 ngày | Pinata upload + hiển thị |
| GĐ 7: Tích hợp + Test | 3-5 ngày | End-to-end testing |
| GĐ 8: Deploy | 2-3 ngày | Render + Vercel + VPS |
| **Tổng** | **~4-6 tuần** | |

> [!TIP]
> Nếu xây từ đầu (không tái sử dụng), thời gian sẽ tăng thêm **1-2 tuần** cho việc setup Hardhat, MetaMask integration, Web3 config, Docker...
