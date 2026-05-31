# TÀI LIỆU TỔNG HỢP HỆ THỐNG WEB3 GIẢNG VIÊN
## Khóa Luận Kỹ Sư — Web3 + AI Competition Platform Hỗ Trợ Giảng Dạy

> **Ngày tạo**: 24/05/2026  
> **Phiên bản tài liệu**: 1.0  
> **Mục đích**: Tài liệu phân tích toàn diện để đưa vào Google NotebookLM  

---

## MỤC LỤC

1. [Tổng Quan Đề Tài](#1-tổng-quan-đề-tài)
2. [Công Nghệ Sử Dụng](#2-công-nghệ-sử-dụng)
3. [Kiến Trúc Hệ Thống](#3-kiến-trúc-hệ-thống)
4. [Database Schema (MongoDB)](#4-database-schema-mongodb)
5. [API Endpoints](#5-api-endpoints)
6. [Backend Services](#6-backend-services)
7. [Smart Contract (Blockchain)](#7-smart-contract-blockchain)
8. [AI / ML Service](#8-ai--ml-service)
9. [Frontend Pages & Components](#9-frontend-pages--components)
10. [Workflow Nghiệp Vụ Trọng Tâm](#10-workflow-nghiệp-vụ-trọng-tâm)
11. [Bảng Tổng Hợp Chức Năng Theo Role](#11-bảng-tổng-hợp-chức-năng-theo-role)
12. [Chức Năng Bổ Sung](#12-chức-năng-bổ-sung)
13. [Cơ Chế Bảo Mật & Phân Quyền](#13-cơ-chế-bảo-mật--phân-quyền)

---

## 1. TỔNG QUAN ĐỀ TÀI

### 1.1 Tên đề tài
**Hệ thống Web3 + AI Competition Platform hỗ trợ giảng dạy** (Web3GiangVien)

### 1.2 Mục tiêu
Xây dựng một nền tảng Web3 Competition lấy mô hình Kaggle Competition làm tham chiếu trải nghiệm nghiệp vụ, nhưng toàn bộ dữ liệu, workflow và ranking vận hành trên MongoDB platform riêng. Hệ thống phục vụ:

- **Giảng viên**: Tạo đề tài/challenge, thiết lập điều kiện tiên quyết, rubrics chấm điểm, bài test cạnh tranh, quản lý lớp/môn học, theo dõi tiến độ sinh viên, chấm điểm đa thành phần (GV + AI).
- **Sinh viên**: Đăng nhập bằng MetaMask, đăng ký nhóm, đăng ký đề tài theo Level/điều kiện, nộp báo cáo/submission, nhận feedback AI realtime, xem điểm và tiến độ.
- **Hệ thống AI**: Phân tích báo cáo bằng PhoBERT, matching đề tài bằng SBERT, so sánh code bằng SBERT, chấm điểm theo Rubrics tự động.
- **Blockchain**: Xác thực danh tính qua MetaMask, lưu vết đăng ký đề tài, nộp bài, chốt điểm lên Ethereum Sepolia.

### 1.3 Đặc điểm nổi bật
1. **Competition-style**: Nhiều nhóm cạnh tranh đăng ký cùng 1 đề tài (Kaggle-style), có bài test đầu vào, nhóm nào đạt ngưỡng + submit sớm nhất thì thắng.
2. **AI đánh giá đa thành phần**: PhoBERT phân tích nội dung báo cáo, SBERT matching kỹ năng sinh viên ↔ yêu cầu đề tài, AI chấm theo từng tiêu chí Rubrics với chunking.
3. **Web3 Verification**: MetaMask authentication, giao dịch ghi blockchain khi nộp bài, chốt điểm.
4. **IPFS Storage**: File báo cáo được upload lên Pinata/IPFS, lưu CID hash trên database và blockchain.
5. **Realtime**: Socket.IO cho competition room, thông báo kết quả cạnh tranh realtime.

### 1.4 Bối cảnh nghiệp vụ (Mapping thuật ngữ)

| Thuật ngữ hệ thống | Vai trò nghiệp vụ |
|---|---|
| GiangVien | Người tạo competition / challenge |
| SinhVien | Participant / Team member |
| DeTai | Competition / Challenge |
| DangKyDeTai | Registration / Participation |
| Nhom | Team |
| BaoCao | Submission |
| DiemSo | Evaluation Result |
| TienDo | Progress tracking |
| BaiTest | Entrance Test (cạnh tranh đầu vào) |
| KetQuaTest | Test result |
| MonHoc | Course / Subject |
| LopHoc | Class |
| RubricsTemplate | Rubrics template library |

---

## 2. CÔNG NGHỆ SỬ DỤNG

### 2.1 Frontend
| Công nghệ | Phiên bản | Vai trò |
|---|---|---|
| **React** | 18.2.0 | UI framework chính |
| **Material-UI (MUI)** | 5.14.19 | Component library, thiết kế giao diện |
| **Ant Design** | 6.3.5 | Component bổ sung |
| **React Router DOM** | 6.22.3 | Client-side routing |
| **Ethers.js** | 6.8.1 | Tương tác MetaMask, ký message |
| **Axios** | 1.6.0 | HTTP client gọi API |
| **Framer Motion** | 12.23.24 | Animation |
| **Recharts** | 3.8.1 | Biểu đồ, chart |
| **Socket.IO Client** | 4.8.3 | Realtime WebSocket |
| **Monaco Editor** | 4.7.0 | Code editor cho bài test code |
| **Lucide React** | 1.7.0 | Icon library |
| **XLSX** | 0.18.5 | Import/Export Excel |
| **date-fns** | 2.30.0 | Xử lý ngày tháng |
| **@zxing/library + jsqr** | — | QR code scanning |

### 2.2 Backend
| Công nghệ | Phiên bản | Vai trò |
|---|---|---|
| **Node.js** | ≥ 18.0.0 | Runtime |
| **Express** | 4.18.2 | Web framework |
| **MongoDB + Mongoose** | 8.0.0 | Database ORM |
| **JSON Web Token (JWT)** | 9.0.2 | Authentication token |
| **Ethers.js** | 6.8.0 | Blockchain interaction (backend) |
| **Hardhat** | 2.28.6 | Smart Contract dev framework |
| **Socket.IO** | 4.6.1 | Realtime WebSocket server |
| **Multer** | 1.4.5 | File upload handling |
| **Pinata Web3 SDK** | 0.5.4 | IPFS upload (Pinata) |
| **Winston** | 3.19.0 | Structured logging |
| **Morgan** | 1.10.1 | HTTP request logging |
| **CORS** | 2.8.5 | Cross-origin handling |
| **UUID** | 9.0.1 | Unique ID generation |
| **csv-parser** | 3.2.0 | CSV import |
| **node-cron** | 4.2.1 | Scheduled tasks |
| **@openzeppelin/contracts** | 4.9.5 | Smart contract library |

### 2.3 ML Service (AI)
| Công nghệ | Phiên bản | Vai trò |
|---|---|---|
| **Python** | 3.10+ | Runtime |
| **FastAPI** | ≥ 0.115.0 | API framework |
| **Uvicorn** | ≥ 0.30.6 | ASGI server |
| **PyTorch** | ≥ 2.4.1 | Deep learning framework |
| **Transformers (HuggingFace)** | ≥ 4.45.2 | Model loading & inference |
| **Sentence Transformers** | ≥ 3.1.1 | SBERT models |
| **Underthesea** | ≥ 6.8.0 | Vietnamese NLP |
| **scikit-learn** | ≥ 1.5.2 | ML utilities |
| **Pydantic** | ≥ 2.9.2 | Data validation |

### 2.4 AI Models sử dụng
| Model | Nguồn | Vai trò |
|---|---|---|
| **vinai/phobert-base** | VinAI (HuggingFace) | Phân tích ngữ nghĩa báo cáo tiếng Việt, chấm theo Rubrics |
| **paraphrase-multilingual-MiniLM-L12-v2** | Sentence-Transformers | Matching kỹ năng SV ↔ yêu cầu đề tài, so sánh code SV ↔ đáp án mẫu |

### 2.5 Blockchain
| Công nghệ | Chi tiết |
|---|---|
| **Network** | Ethereum Sepolia Testnet (chainId: 11155111), Localhost Hardhat (chainId: 31337) |
| **Smart Contract** | Solidity 0.8.19, optimizer enabled (200 runs, viaIR) |
| **Contract Version** | ThesisManagementV2 (gas-optimized, bytes32 keys) |
| **Wallet** | MetaMask (browser extension) |
| **Provider** | Infura (Sepolia RPC) |
| **Block Explorer** | Etherscan Sepolia |

### 2.6 Infrastructure & DevOps
| Công nghệ | Vai trò |
|---|---|
| **IPFS / Pinata** | Lưu trữ file báo cáo phi tập trung |
| **Docker** | Containerization (có thư mục docker/) |
| **Render** | Cloud deployment (render.yaml) |
| **Netlify** | Frontend deployment (netlify.toml) |

---

## 3. KIẾN TRÚC HỆ THỐNG

### 3.1 Tổng quan kiến trúc

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    FRONTEND      │     │     BACKEND       │     │   ML SERVICE     │
│  React + MUI     │────▶│  Node.js/Express  │────▶│  FastAPI/Python  │
│  Port: 3000      │     │  Port: 5000       │     │  Port: 8001      │
│                  │     │                   │     │                  │
│  • MetaMask Auth │     │  • REST API       │     │  • PhoBERT       │
│  • Socket.IO     │     │  • JWT Auth       │     │  • SBERT         │
│  • Ethers.js     │     │  • Socket.IO      │     │  • Code Compare  │
└────────┬─────────┘     └────────┬──────────┘     └──────────────────┘
         │                        │
         │                        ├────────────────────┐
         │                        │                    │
         ▼                        ▼                    ▼
┌─────────────────┐     ┌──────────────────┐  ┌───────────────────┐
│    MetaMask       │     │    MongoDB        │  │   Blockchain       │
│    (Browser)      │     │    (Database)     │  │   Ethereum Sepolia │
│                   │     │                   │  │                    │
│  • Sign message   │     │  • 13 Collections │  │  • ThesisV2.sol    │
│  • Verify wallet  │     │  • Mongoose ODM   │  │  • Hardhat deploy  │
└───────────────────┘     └───────────────────┘  └────────┬───────────┘
                                                          │
                                                 ┌────────▼───────────┐
                                                 │    IPFS / Pinata    │
                                                 │  File storage       │
                                                 └────────────────────┘
```

### 3.2 Luồng dữ liệu chính

```
MetaMask Wallet ──sign──▶ Backend (verify signature) ──▶ JWT Token
                                    │
                           MongoDB (user lookup)
                                    │
                         ┌──────────┴──────────┐
                         │ LECTURER_ROLE        │ STUDENT_ROLE
                         │                      │
                    Tạo đề tài            Đăng ký nhóm
                    Tạo Rubrics           Đăng ký đề tài
                    Tạo bài test          Làm bài test
                    Duyệt đăng ký         Nộp báo cáo ──▶ IPFS
                    Chấm điểm ──▶ Chain   Xem tiến độ
                    Xem comparison        Xem điểm
```

---

## 4. DATABASE SCHEMA (MongoDB)

### 4.1 GiangVien (Giảng viên)
```javascript
{
  MaGV:           String,     // Mã giảng viên (unique, required)
  HoTen:          String,     // Họ tên (required)
  Email:          String,     // Email (unique, required)
  ChuyenNganh:    String,     // Chuyên ngành
  WalletAddress:  String,     // Địa chỉ ví MetaMask (unique, required, lowercase)
  createdAt:      Date,       // Timestamps tự động
  updatedAt:      Date
}
```
**Vai trò**: Lưu thông tin giảng viên. WalletAddress dùng để xác thực qua MetaMask.

---

### 4.2 SinhVien (Sinh viên)
```javascript
{
  MaSV:            String,     // Mã sinh viên (unique, required)
  HoTen:           String,     // Họ tên (required)
  Email:           String,     // Email (unique, required)
  GPA:             Number,     // Điểm trung bình tích lũy (default: 0)
  ChuyenNganh:     String,     // Chuyên ngành (default: '')
  KyNang:          [String],   // Danh sách kỹ năng (array of strings)
  WalletAddress:   String,     // Địa chỉ ví MetaMask (unique, required, lowercase)
  DaCapNhatHoSo:   Boolean,    // Đã hoàn tất hồ sơ bắt buộc chưa (default: false)
  createdAt:       Date,
  updatedAt:       Date
}
```
**Vai trò**: Lưu thông tin sinh viên. GPA, KyNang, ChuyenNganh là dữ liệu đầu vào cho AI matching. DaCapNhatHoSo kiểm soát bắt buộc cập nhật hồ sơ trước khi đăng ký đề tài.

---

### 4.3 DeTai (Đề tài / Challenge)
```javascript
{
  MaDeTai:            String,                // Mã đề tài (unique, required)
  TenDeTai:           String,                // Tên đề tài (required)
  MoTa:               String,                // Mô tả ngắn
  MoTaChiTiet:        String,                // Mô tả chi tiết (default: '')
  YeuCau:             [String],              // Danh sách yêu cầu kỹ thuật
  ChiTietBoSung:      [{TieuDe, NoiDung}],   // Chi tiết bổ sung (tiêu đề + nội dung)
  Rubrics:            [{                      // Rubrics chấm điểm (nhúng trực tiếp)
    TenTieuChi:   String,                    //   Tên tiêu chí (VD: "Nội dung kỹ thuật")
    MoTa:         String,                    //   Mô tả
    TrongSo:      Number,                    //   Trọng số % (tổng = 100)
    DiemToiDa:    Number,                    //   Thang điểm tối đa (default: 10)
    GoiYChoAI:    [String]                   //   Keywords cho AI matching
  }],
  SuDungRubrics:      Boolean,               // Có dùng Rubrics không (default: false)
  HienThiChiTietChoSV: Boolean,              // GV quyết định SV có xem chi tiết Rubrics không
  SoLuongSinhVien:    Number,                // Số SV tối đa/nhóm (default: 1, min: 1)
  Deadline:           Date,                  // Hạn nộp (required)
  GiangVienHuongDan:  ObjectId → GiangVien,  // Ref đến giảng viên tạo đề tài (required)
  MonHoc:             ObjectId → MonHoc,      // Ref đến môn học
  CoBaiTest:          Boolean,               // Có yêu cầu bài test cạnh tranh không (default: false)
  TrangThai:          Enum['MoDangKy','DaChot','HoanThanh'], // Trạng thái (default: 'MoDangKy')
  createdAt:          Date,
  updatedAt:          Date
}
```
**Vai trò**: Lõi nghiệp vụ. Mỗi đề tài là 1 competition. Rubrics được nhúng trực tiếp (copy từ template hoặc nhập thủ công). MonHoc liên kết đề tài với môn học.

---

### 4.4 DangKyDeTai (Đăng ký đề tài / Registration)
```javascript
{
  DeTai:       ObjectId → DeTai,             // Đề tài đăng ký (required)
  Nhom:        ObjectId → Nhom,              // Nhóm đăng ký (Phase 2)
  TruongNhom:  ObjectId → SinhVien,          // Trưởng nhóm
  SinhVien:    ObjectId → SinhVien,           // Backward compat (cũ)
  ThanhVien:   [{                             // Danh sách thành viên
    SinhVien:     ObjectId → SinhVien,
    VaiTro:       Enum['TruongNhom','ThanhVien'],
    TrangThaiTV:  Enum['DaMoi','DaChapNhan','TuChoi'],
    NgayThamGia:  Date
  }],
  TrangThai:   Enum[                          // Trạng thái đăng ký
    'ChoDuyet',     // Chờ GV duyệt (không có bài test)
    'ChoTest',      // Chờ làm bài test
    'DangLamTest',  // Đang làm bài test
    'DaSubmit',     // Đã submit bài test (chờ AI chấm xong)
    'ChoDoi',       // Đạt ngưỡng nhưng chờ nhóm submit trước xong
    'DaDuyet',      // Đã được duyệt / Thắng competition
    'TuChoi',       // Bị từ chối
    'Thua'          // Thua competition (nhóm khác thắng)
  ],
  ThoiGianSubmit: Date,                      // Ghi ngay khi submit bài test
  createdAt:      Date,
  updatedAt:      Date
}
// Index: {DeTai, Nhom} unique sparse
// Index: {DeTai, SinhVien} unique sparse
```
**Vai trò**: Quản lý luồng đăng ký đề tài. Hỗ trợ cả đăng ký cá nhân (legacy) và đăng ký nhóm. TrangThai có 8 giá trị phản ánh toàn bộ lifecycle cạnh tranh.

---

### 4.5 Nhom (Nhóm sinh viên)
```javascript
{
  TenNhom:    String,                        // Tên nhóm (default: '')
  TruongNhom: ObjectId → SinhVien,           // Trưởng nhóm (required)
  ThanhVien:  [{                             // Danh sách thành viên
    SinhVien:   ObjectId → SinhVien,
    VaiTro:     Enum['TruongNhom','ThanhVien'],
    TrangThai:  Enum['DaMoi','DaChapNhan','TuChoi'],
    NgayThamGia: Date
  }],
  SoLuong:    Number,                        // Số thành viên tối đa (required, min: 1)
  DaChot:     Boolean,                       // Đã chốt nhóm chưa (default: false)
  createdAt:  Date,
  updatedAt:  Date
}
```
**Vai trò**: Quản lý nhóm sinh viên độc lập (tách khỏi đăng ký đề tài). Nhóm phải được chốt (DaChot=true) trước khi đăng ký đề tài. Khi chốt, các lời mời chưa chấp nhận bị xóa.

---

### 4.6 BaoCao (Báo cáo / Submission)
```javascript
{
  DeTai:        ObjectId → DeTai,            // Đề tài (required)
  SinhVien:     ObjectId → SinhVien,         // Sinh viên nộp (required)
  TieuDe:       String,                      // Tiêu đề báo cáo (required)
  IPFS_CID:     String,                      // Hash file trên IPFS/Pinata (required)
  SubmitTxHash: String,                      // Mã giao dịch blockchain khi nộp (default: null)
  NgayNop:      Date,                        // Ngày nộp (default: now)
  createdAt:    Date,
  updatedAt:    Date
}
```
**Vai trò**: Lưu thông tin nộp bài. File thực tế lưu trên IPFS (Pinata), chỉ lưu CID hash. Nếu đề tài nhóm, tạo 1 BaoCao cho mỗi thành viên (cùng IPFS_CID).

---

### 4.7 DiemSo (Điểm số / Evaluation Result)
```javascript
{
  BaoCao:       ObjectId → BaoCao,           // Báo cáo được chấm (required)
  GiangVienCam: ObjectId → GiangVien,        // GV chấm (required)
  SinhVien:     ObjectId → SinhVien,         // SV được chấm (required)
  DeTai:        ObjectId → DeTai,            // Đề tài (required)
  Diem:         Number,                      // Điểm GV chấm (required)
  NhanXet:      String,                      // Nhận xét GV
  AI_Score:     Number,                      // Điểm AI gợi ý
  AI_Feedback:  String,                      // Feedback từ AI
  RubricsResult: [{                          // Kết quả chấm theo từng tiêu chí Rubrics
    TenTieuChi:       String,
    TrongSo:          Number,
    DiemToiDa:        Number,
    AI_DiemTieuChi:   Number,                // Điểm AI gợi ý cho tiêu chí này
    GV_DiemTieuChi:   Number,                // Điểm GV chấm thực tế
    AI_NhanXetTieuChi: String,               // Feedback AI riêng cho tiêu chí
    MatchedChunk:     { index, heading }      // Chunk nào AI đã match (truy xuất nguồn)
  }],
  TxHash:       String,                      // Mã giao dịch blockchain khi chốt điểm
  createdAt:    Date,
  updatedAt:    Date
}
```
**Vai trò**: Điểm đánh giá đa thành phần. Lưu cả điểm GV (Diem), điểm AI (AI_Score), và chi tiết từng tiêu chí Rubrics. TxHash ghi nhận giao dịch blockchain khi chốt điểm.

---

### 4.8 TienDo (Tiến độ)
```javascript
{
  DeTai:              ObjectId → DeTai,      // Đề tài (required)
  SinhVien:           ObjectId → SinhVien,   // SV báo cáo (required)
  NoiDung:            String,                // Nội dung tiến độ (required)
  PhanTramHoanThanh:  Number,                // % hoàn thành (0-100, default: 0)
  LoaiCapNhat:        String,                // Loại (default: 'Khác')
  FileDinhKem:        String,                // File đính kèm (URL)
  NhanXetGV:          String,                // Nhận xét của GV
  createdAt:          Date,
  updatedAt:          Date
}
```
**Vai trò**: Nhật ký tiến độ. SV tạo entry, GV nhận xét.

---

### 4.9 BaiTest (Bài test cạnh tranh đầu vào)
```javascript
{
  DeTai:         ObjectId → DeTai,           // Đề tài (required)
  TieuDe:        String,                     // Tiêu đề (required)
  MoTa:          String,                     // Mô tả (default: '')
  CauHoi:        [{                          // Danh sách câu hỏi
    LoaiCauHoi:  Enum['TracNghiem','Code'],  //   Loại: trắc nghiệm hoặc code
    NoiDung:     String,                     //   Đề bài (required)
    LuaChon:     [String],                   //   Lựa chọn A,B,C,D (trắc nghiệm)
    DapAnDung:   String,                     //   Đáp án đúng (trắc nghiệm)
    NgonNgu:     String,                     //   Ngôn ngữ lập trình (code)
    DapAnMau:    String,                     //   Code mẫu GV (SBERT so sánh)
    Diem:        Number                      //   Điểm tối đa câu (default: 1)
  }],
  ThoiGianLam:   Number,                    // Phút (default: 30)
  NguongDat:     Number,                    // Ngưỡng đạt % (default: 75, min:0, max:100)
  TrangThai:     Enum['MoNop','DaDong'],    // Trạng thái (default: 'MoNop')
  createdAt:     Date,
  updatedAt:     Date
}
```
**Vai trò**: Bài test cạnh tranh. Hỗ trợ 2 loại câu hỏi: trắc nghiệm (chấm tự động) và code (SBERT so sánh với đáp án mẫu). NguongDat là ngưỡng phần trăm để tự động approve.

---

### 4.10 KetQuaTest (Kết quả bài test)
```javascript
{
  BaiTest:        ObjectId → BaiTest,        // Bài test (required)
  DeTai:          ObjectId → DeTai,          // Đề tài (required)
  SinhVien:       ObjectId → SinhVien,       // SV làm test (required)
  DangKyDeTai:    ObjectId → DangKyDeTai,    // Đăng ký liên quan
  Nhom:           ObjectId → Nhom,           // Nhóm liên quan
  TraLoi:         [{                          // Chi tiết trả lời
    CauHoiIndex:   Number,                   //   Index câu hỏi
    LoaiCauHoi:    Enum['TracNghiem','Code'],
    TraLoiText:    String,                   //   Đáp án SV chọn hoặc code viết
    Diem:          Number,                   //   Điểm đạt được
    DiemToiDa:     Number,                   //   Điểm tối đa
    DungSai:       Boolean,                  //   Đúng/Sai (trắc nghiệm)
    AI_Similarity: Number                    //   SBERT similarity score (code)
  }],
  TongDiem:       Number,                    // Tổng điểm (default: 0)
  DiemToiDa:      Number,                    // Điểm tối đa (default: 0)
  TxHash:         String,                    // Blockchain transaction
  ThoiGianBatDau: Date,                      // Thời gian bắt đầu làm
  ThoiGianNop:    Date,                      // Thời gian nộp
  createdAt:      Date,
  updatedAt:      Date
}
// Index: {BaiTest, SinhVien} unique (1 SV chỉ nộp 1 lần)
```
**Vai trò**: Lưu chi tiết kết quả bài test, bao gồm điểm từng câu, AI_Similarity cho câu code, và TxHash blockchain.

---

### 4.11 RubricsTemplate (Template Rubrics)
```javascript
{
  TenMau:     String,                        // Tên template (required, VD: "Rubrics Đồ án CNTT")
  MoTaMau:    String,                        // Mô tả ngắn (default: '')
  GiangVien:  ObjectId → GiangVien,          // GV sở hữu (required)
  TieuChi:    [{                             // Danh sách tiêu chí
    TenTieuChi: String,
    MoTa:       String,
    TrongSo:    Number,                      //   % (tổng = 100)
    DiemToiDa:  Number,                      //   Default: 10
    GoiYChoAI:  [String]                     //   Keywords cho AI
  }],
  MacDinh:    Boolean,                       // Template mặc định (default: false)
  DaApDung:   Boolean,                       // Đã áp dụng vào ≥1 đề tài (default: false)
  SoLuotDung: Number,                        // Số đề tài đã dùng (default: 0)
  createdAt:  Date,
  updatedAt:  Date
}
// Index: {GiangVien, MacDinh}
```
**Vai trò**: Thư viện template Rubrics của GV. Có cơ chế immutability: template đã áp dụng (DaApDung=true) không thể sửa/xóa, phải tạo template mới.

---

### 4.12 MonHoc (Môn học)
```javascript
{
  MaMonHoc:   String,                        // Mã môn học (unique, required)
  TenMonHoc:  String,                        // Tên môn học (required)
  MoTa:       String,                        // Mô tả (default: '')
  GiangVien:  ObjectId → GiangVien,          // GV phụ trách (required)
  createdAt:  Date,
  updatedAt:  Date
}
```
**Vai trò**: Quản lý danh sách môn học. Đề tài được liên kết với MonHoc. Không thể xóa môn học nếu còn đề tài hoặc lớp học ràng buộc.

---

### 4.13 LopHoc (Lớp học)
```javascript
{
  MaLopHoc:   String,                        // Mã lớp học (unique, required)
  TenLopHoc:  String,                        // Tên lớp học (required)
  MonHoc:     ObjectId → MonHoc,             // Môn học (required)
  GiangVien:  ObjectId → GiangVien,          // GV phụ trách (required)
  SinhVien:   [ObjectId → SinhVien],         // Danh sách SV trong lớp
  createdAt:  Date,
  updatedAt:  Date
}
```
**Vai trò**: Quản lý lớp học. Lớp thuộc về 1 MonHoc và 1 GiangVien. Có thể thêm/xóa sinh viên. Chi tiết lớp hiển thị: danh sách SV, nhóm, đề tài đã đăng ký.

---

## 5. API ENDPOINTS

Tổng cộng **14 nhóm API** với khoảng **60+ endpoints**.

### 5.1 Authentication (Auth)
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/auth/challenge` | Tạo challenge cho MetaMask sign | Public |
| POST | `/api/auth/verify` | Xác thực chữ ký, trả JWT token | Public |
| POST | `/api/auth/logout` | Đăng xuất | Authenticated |

**Flow xác thực**:
1. Frontend gửi `walletAddress` → Backend tạo challenge (nonce + timestamp)
2. MetaMask ký challenge → Frontend gửi `{challengeId, signature}`
3. Backend verify chữ ký bằng `ethers.recoverAddress`
4. Lookup user: GiangVien → `LECTURER_ROLE`, SinhVien → `STUDENT_ROLE`
5. Nếu wallet chưa có → auto-register SinhVien mới
6. Trả JWT token (24h TTL) chứa `{id, walletAddress, role_id}`

### 5.2 Sinh Viên
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | `/api/sinhvien` | Lấy danh sách tất cả SV | Any |
| GET | `/api/sinhvien/:id` | Chi tiết 1 SV | Any |
| POST | `/api/sinhvien` | Tạo SV mới | Any |
| PUT | `/api/sinhvien/:id` | Cập nhật SV | Any |
| PUT | `/api/sinhvien/:id/profile` | SV cập nhật hồ sơ bắt buộc (HoTen, MaSV, Email, GPA, KyNang) | Student |
| GET | `/api/sinhvien/masv/:maSV` | Tìm SV theo MaSV (dùng cho mời nhóm) | Any |
| DELETE | `/api/sinhvien/:id` | Xóa SV | Admin |

**Validation hồ sơ**: HoTen, MaSV, Email bắt buộc. GPA bắt buộc (cho AI matching). KyNang ≥ 1 (cho SBERT). Check trùng MaSV/Email.

### 5.3 Giảng Viên
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | `/api/giangvien` | Danh sách tất cả GV | Any |
| GET | `/api/giangvien/:id` | Chi tiết 1 GV | Any |
| POST | `/api/giangvien` | Tạo GV mới | Admin |
| PUT | `/api/giangvien/:id` | Cập nhật GV | Lecturer |
| DELETE | `/api/giangvien/:id` | Xóa GV | Admin |

### 5.4 Đề Tài (Competition/Challenge)
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | `/api/detai` | Danh sách đề tài (kèm SoDangKy, DaChotNhom) | Any |
| GET | `/api/detai/:id` | Chi tiết đề tài | Any |
| POST | `/api/detai` | Tạo đề tài mới (validate Rubrics, update template tracking) | Lecturer |
| PUT | `/api/detai/:id` | Cập nhật đề tài | Lecturer |
| DELETE | `/api/detai/:id` | Xóa đề tài + đăng ký liên quan | Lecturer |
| POST | `/api/detai/:id/register` | SV đăng ký đề tài (theo nhóm) | Student |

**Logic đăng ký đề tài**:
1. Kiểm tra đề tài tồn tại + chưa DaChot
2. Kiểm tra nhóm tồn tại + đã chốt (DaChot=true)
3. Kiểm tra SoLuongSinhVien đề tài = số thành viên nhóm (đã chấp nhận)
4. Kiểm tra nhóm chưa đăng ký đề tài khác (trạng thái active)
5. Cho phép nhiều nhóm đăng ký cùng 1 đề tài (cạnh tranh Kaggle-style)
6. Nếu đề tài CoBaiTest → TrangThai = 'ChoTest', ngược lại → 'ChoDuyet'

### 5.5 Đăng Ký Đề Tài (Registration Management)
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | `/api/dangky/sinhvien/:svId` | Lấy đăng ký hiện tại của SV | Student |
| GET | `/api/dangky/giangvien/:gvId` | Lấy tất cả đăng ký cho đề tài của GV | Lecturer |
| PUT | `/api/dangky/:id/approve` | GV duyệt/từ chối đăng ký | Lecturer |
| DELETE | `/api/dangky/:id` | SV hủy đăng ký (chỉ khi chưa submit test) | Student |

**Logic duyệt đăng ký**:
- Khi duyệt (DaDuyet): Cập nhật đề tài → DaChot, từ chối tất cả đăng ký khác cho cùng đề tài
- Chỉ cho hủy khi TrangThai ∈ ['ChoDuyet', 'ChoTest', 'DangLamTest']

### 5.6 Nhóm & Lời Mời (trong DeTai context - Legacy)
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/detai/:id/invite` | Mời SV vào nhóm (trong context đề tài) | Student (Auth) |
| GET | `/api/detai/invitations/:svId` | Lấy lời mời đang chờ | Student |
| POST | `/api/detai/invitation/:id/respond` | Trả lời lời mời (accept/reject) | Student (Auth) |

### 5.7 Báo Cáo (Submission)
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/baocao/upload` | SV nộp báo cáo (upload IPFS + ghi blockchain) | Student (Auth) |
| GET | `/api/baocao/detai/:deTaiId` | GV xem báo cáo theo đề tài | Lecturer |
| GET | `/api/baocao/sinhvien/:svId` | SV xem báo cáo của mình | Student |
| DELETE | `/api/baocao/:id` | SV hủy nộp (chỉ khi chưa chấm điểm) | Student (Auth) |
| GET | `/api/baocao/giangvien/:gvId` | GV xem tổng hợp tất cả submission | Lecturer |

**Flow nộp báo cáo**:
1. Xác thực SV là thành viên đã duyệt của đề tài
2. Nếu nhóm: chỉ trưởng nhóm mới nộp được
3. Check chưa nộp trùng
4. Upload file lên IPFS (Pinata) → nhận CID
5. Tạo BaoCao cho mỗi thành viên nhóm (cùng CID)
6. Ghi blockchain (non-blocking): `submitReport(studentDID, topicId, ipfsCID, timestamp)`
7. Trả kết quả + txHash

### 5.8 Điểm Số (Evaluation)
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/diemso` | GV chấm điểm (lưu DB + ghi blockchain) | Lecturer |
| GET | `/api/diemso/sinhvien/:svId` | SV xem điểm của mình | Student |
| GET | `/api/diemso/comparison/:gvId` | GV xem bảng so sánh điểm AI vs GV | Lecturer |

**Flow chấm điểm**:
1. Kiểm tra chưa chấm trùng
2. Ghi blockchain: `finalizeGrade(studentDID, topicId, grade, feedback, submissionIndex)`
   - Auto-register topic nếu chưa có on-chain
   - Auto-submit report nếu chưa có on-chain
3. Lưu DiemSo (Diem GV + AI_Score + RubricsResult + TxHash)

**Comparison API** trả về:
- Danh sách so sánh (gvScore, aiScore, diff, absDiff, rubricsDetail)
- Thống kê (totalGraded, avgGV, avgAI, avgDiff, aiHigherCount, gvHigherCount, matchCount)

### 5.9 Tiến Độ (Progress)
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/tiendo` | SV tạo entry tiến độ | Student |
| GET | `/api/tiendo/:svId` | SV xem tiến độ của mình | Student |
| GET | `/api/tiendo/detai/:deTaiId` | GV xem tiến độ theo đề tài | Lecturer |
| PUT | `/api/tiendo/:id/nhanxet` | GV nhận xét tiến độ | Lecturer |

### 5.10 AI / ML Services
| Method | Endpoint | Mô tả | AI Model |
|---|---|---|---|
| POST | `/api/ai/analyze-report` | Phân tích báo cáo (score + feedback) | PhoBERT |
| POST | `/api/ai/analyze-rubrics` | Phân tích theo Rubrics (chunking + per-criteria) | PhoBERT |
| POST | `/api/ai/match-student` | Matching SV ↔ đề tài | SBERT |

### 5.11 Rubrics Template
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | `/api/rubrics/giangvien/:gvId` | Danh sách template của GV | Lecturer |
| POST | `/api/rubrics` | Tạo template mới (validate tổng TrongSo=100) | Lecturer |
| PUT | `/api/rubrics/:id` | Sửa template (BLOCK nếu DaApDung) | Lecturer |
| DELETE | `/api/rubrics/:id` | Xóa template (BLOCK nếu DaApDung) | Lecturer |
| PUT | `/api/rubrics/:id/default` | Đặt template mặc định | Lecturer |
| POST | `/api/rubrics/:id/apply/:deTaiId` | Áp dụng template vào đề tài (copy + tracking) | Lecturer |

### 5.12 Bài Test Cạnh Tranh (Entrance Test)
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/baitest` | GV tạo bài test cho đề tài | Lecturer |
| GET | `/api/baitest/detai/:deTaiId` | Lấy bài test (full, cho GV) | Lecturer |
| GET | `/api/baitest/detai/:deTaiId/student` | Lấy bài test (ẩn đáp án, cho SV) | Student |
| POST | `/api/baitest/:id/submit` | SV nộp bài test → AI chấm → Hybrid competition | Student |
| GET | `/api/baitest/:id/results` | GV xem kết quả tất cả SV | Lecturer |
| POST | `/api/baitest/:id/select-winner` | GV chọn nhóm thắng (manual override) | Lecturer |
| DELETE | `/api/baitest/:id` | Xóa bài test | Lecturer |
| GET | `/api/baitest/check/:deTaiId/:sinhVienId` | Kiểm tra SV đã làm test chưa | Any |

**Hybrid Competition Logic (submitTest)**:
1. Ghi `ThoiGianSubmit` ngay lập tức (trước AI chấm)
2. AI chấm:
   - Trắc nghiệm: so sánh exact match
   - Code: gọi SBERT `/compare-code` → similarity score
3. Ghi blockchain (non-blocking): `submitTestResult(topicHash, studentHash, scoreInt)`
4. Competition logic:
   - Không đạt ngưỡng → TuChoi, resolve nhóm ChoDoi
   - Đạt ngưỡng → `tryClaimWinner()`:
     - Đã có winner → Thua
     - Có nhóm submit trước chưa có kết quả → ChoDoi
     - Không ai trước → Claim winner (atomic update) → DaDuyet
     - Winner: từ chối tất cả nhóm khác, chốt đề tài, đóng bài test
5. WebSocket emit kết quả realtime

### 5.13 Quản Lý Nhóm (Group Management)
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| POST | `/api/nhom` | Tạo nhóm mới (SV tự động là trưởng nhóm) | Student |
| GET | `/api/nhom/sinhvien/:svId` | Lấy nhóm của SV | Student |
| GET | `/api/nhom/invites/:svId` | Lấy lời mời đang chờ | Student |
| GET | `/api/nhom/:id` | Chi tiết nhóm | Any |
| POST | `/api/nhom/:id/invite` | Trưởng nhóm mời thành viên (qua MaSV) | Student |
| POST | `/api/nhom/:id/respond` | Trả lời lời mời (accept/reject) | Student |
| DELETE | `/api/nhom/:id/kick/:svId` | Trưởng nhóm kick thành viên | Student |
| POST | `/api/nhom/:id/leave` | Thành viên rời nhóm | Student |
| POST | `/api/nhom/:id/transfer-leader` | Chuyển quyền trưởng nhóm | Student |
| POST | `/api/nhom/:id/chot` | Chốt nhóm (cần đủ SoLuong thành viên DaChapNhan) | Student |
| DELETE | `/api/nhom/:id` | Xóa nhóm (chỉ khi chưa đăng ký đề tài) | Student |

### 5.14 Quản Lý Môn Học & Lớp Học
| Method | Endpoint | Mô tả | Role |
|---|---|---|---|
| GET | `/api/monhoc/giangvien/:gvId` | Danh sách môn học của GV (kèm soDeTai, soLopHoc) | Lecturer |
| POST | `/api/monhoc` | Tạo môn học (check trùng MaMonHoc) | Lecturer |
| PUT | `/api/monhoc/:id` | Cập nhật môn học | Lecturer |
| DELETE | `/api/monhoc/:id` | Xóa môn học (chặn nếu còn đề tài/lớp học) | Lecturer |
| GET | `/api/lophoc/giangvien/:gvId` | Danh sách lớp học của GV | Lecturer |
| GET | `/api/lophoc/:id/detail` | Chi tiết lớp: SV + nhóm + đăng ký đề tài | Lecturer |
| POST | `/api/lophoc` | Tạo lớp học (check trùng MaLopHoc) | Lecturer |
| PUT | `/api/lophoc/:id` | Cập nhật lớp | Lecturer |
| POST | `/api/lophoc/:id/sinhvien` | Thêm SV vào lớp | Lecturer |
| DELETE | `/api/lophoc/:id/sinhvien/:svId` | Xóa SV khỏi lớp | Lecturer |
| DELETE | `/api/lophoc/:id` | Xóa lớp học | Lecturer |

---

## 6. BACKEND SERVICES

### 6.1 aiService.js
- **analyzeReport(text, topicRequirements)**: Gọi FastAPI `/analyze-report` (PhoBERT). Trả về: `{score, feedback, issues, model}`.
- **analyzeWithRubrics(text, rubrics)**: Gọi FastAPI `/analyze-with-rubrics` (PhoBERT + chunking). Trả về: `{score, rubrics_result, chunks_info, feedback, model}`. Timeout: 60s.

### 6.2 matchingService.js
- **matchStudentToTopics(studentProfile, topics)**: Gọi FastAPI `/match-student` (SBERT). Input: GPA + KyNang + ChuyenNganh → major_scores. Output: `{recommendations: [{topicId, title, matchScore}]}`.

### 6.3 ipfsService.js
- **uploadFile(filePath, fileName)**: Upload file lên Pinata IPFS qua Pinata Web3 SDK. Đọc file từ thư mục tạm Multer → Blob → upload → trả CID. Xóa file tạm sau upload.

### 6.4 thesisContractService.js
- **registerTopicOnChain(topicId, title, advisorDID, deadline, requirements)**: Đăng ký đề tài lên blockchain (V2: bytes32 hash, V1: string fallback).
- **submitReportOnChain(studentDID, topicId, ipfsCID, timestamp)**: Ghi submission lên blockchain.
- **finalizeGradeOnChain(studentDID, topicId, grade, feedback, idx)**: Chốt điểm lên blockchain. Auto-register topic + auto-submit report nếu chưa có on-chain.
- **submitTestResultOnChain(topicId, studentDID, score)**: Ghi kết quả bài test lên blockchain (V2 only).
- **toBytes32(str)**: Helper convert string → keccak256 bytes32 (gas optimization).

### 6.5 authService.js
- **verifyToken(token)**: Verify JWT token.

---

## 7. SMART CONTRACT (Blockchain)

### 7.1 ThesisManagementV2.sol (Solidity 0.8.19)

**Gas Optimization**: Sử dụng `bytes32` keys (keccak256 hash) thay vì `string` → tiết kiệm ~30-50% gas.

**Structs**:
- `Topic`: title, advisorDID(bytes32), deadline, requirements[], exists
- `Submission`: studentDID(bytes32), topicId(bytes32), ipfsCID, timestamp, grade, feedback, graded
- `TestResult`: studentDID(bytes32), topicId(bytes32), score(uint16), timestamp

**Mappings**:
- `topics`: topicHash → Topic
- `advisorTopics`: advisorHash → topicHash[]
- `submissions`: topicHash → studentHash → Submission[]
- `testResults`: topicHash → TestResult[]

**Functions**:
1. `registerTopic(topicHash, title, advisorDID, deadline, requirements)` — onlyOwner
2. `submitReport(studentDID, topicHash, ipfsCID, timestamp)` — public
3. `finalizeGrade(studentDID, topicHash, grade, feedback, submissionIndex)` — onlyOwner
4. `submitTestResult(topicHash, studentDID, score)` — public
5. `getTopicsByAdvisor(advisorDID)` — view
6. `getSubmissionHistory(studentDID, topicHash)` — view
7. `getTestResults(topicHash)` — view
8. `getTestResultCount(topicHash)` — view

**Events**:
- `TopicRegistered(topicHash, title, advisorDID)`
- `ReportSubmitted(studentDID, topicHash, ipfsCID)`
- `GradeFinalized(studentDID, topicHash, grade)`
- `TestResultSubmitted(topicHash, studentDID, score)`

### 7.2 Deployment
- **Network**: Ethereum Sepolia Testnet (hoặc Hardhat localhost)
- **Deploy script**: `scripts/deploy-thesis-v2.js`
- **RPC**: Infura Sepolia (`SEPOLIA_RPC_URL`)
- **Signer**: Server-side wallet (`PRIVATE_KEY`)
- **Contract address**: `THESIS_CONTRACT_ADDRESS` (.env)

---

## 8. AI / ML SERVICE

### 8.1 Kiến trúc ML Service (FastAPI)

```
ml-service/
├── app.py                    # FastAPI app chính (port 8001)
├── routes/
│   ├── analyze.py            # POST /analyze-report, /analyze-with-rubrics
│   ├── match.py              # POST /match-student
│   └── compare_code.py       # POST /compare-code
├── models/
│   ├── phobert_analyzer.py   # PhoBERT analyzer class
│   └── sbert_matcher.py      # SBERT matcher class
├── utils/
│   ├── text_preprocessing.py # Normalize text, extract requirement hits
│   ├── pdf_chunker.py        # Chia text thành chunks theo heading
│   └── log_config.py         # Logging config
└── requirements.txt          # Python dependencies
```

### 8.2 PhoBERT Analyzer (`vinai/phobert-base`)

**Chức năng 1: Phân tích báo cáo (`analyze`)**
- Input: text (nội dung báo cáo), topic_requirements (yêu cầu đề tài)
- Process:
  1. Normalize text
  2. Extract requirement keyword hits
  3. Embed text bằng PhoBERT [CLS] token
  4. Embed từng requirement
  5. Tính cosine similarity (threshold > 0.45 = semantic match)
  6. base_score = min(8.0, 4.0 + textLength/800)
  7. bonus = 2.0 × min(1.0, hits/totalReqs)
  8. final_score = min(10.0, base_score + bonus)
- Output: `{score, feedback, issues, model}`

**Chức năng 2: Phân tích theo Rubrics (`analyze_with_rubrics`)**
- Input: text, rubrics (danh sách tiêu chí)
- Process:
  1. **Chunking**: Chia text thành chunks theo heading (Chương/Section/Subsection hoặc fallback chia paragraph)
  2. **Embed chunks**: PhoBERT encode mỗi chunk
  3. **Embed tiêu chí**: Kết hợp TenTieuChi + MoTa + GoiYChoAI → embed
  4. **Similarity matrix**: Tính cosine sim [chunks × criteria]
  5. **Max similarity**: Mỗi tiêu chí lấy chunk có sim cao nhất
  6. **Scoring**: raw_score = bestSim × DiemToiDa × 1.3 (clamp [0, DiemToiDa])
  7. **Feedback**: > 0.6 = "Tốt", > 0.4 = "Khá", else = "Yếu" (kèm tên chunk match)
  8. **Total**: total_weighted_score / 10
- Output: `{score, rubrics_result, chunks_info, feedback, model}`

### 8.3 SBERT Matcher (`paraphrase-multilingual-MiniLM-L12-v2`)

**Chức năng: Matching SV ↔ Đề tài (`match`)**
- Input: student {gpa, major_scores}, topics [{topic_id, requirements}]
- Process:
  1. Build skill text: "Thế mạnh của sinh viên: skill1, skill2..."
  2. Build topic text: "Đề tài yêu cầu kỹ năng: req1, req2..."
  3. Encode bằng SBERT
  4. Cosine similarity
  5. **Match formula**: 60% semantic_score + 40% base_gpa_score
  6. base_gpa_score = min(1.0, 0.4 + gpa/10)
- Output: `[{topic_id, match_score, model}]` (sorted descending)

### 8.4 SBERT Code Comparator

**Chức năng: So sánh code SV vs đáp án mẫu (`compare-code`)**
- Input: student_code, answer_code
- Process:
  1. Encode cả 2 đoạn code bằng SBERT
  2. Cosine similarity
  3. Feedback: ≥ 0.85 "rất tương đồng", ≥ 0.65 "tương tự", ≥ 0.4 "một phần", else "khác biệt"
- Output: `{similarity, feedback, model}`

### 8.5 PDF Chunker (`pdf_chunker.py`)

**Chức năng**: Chia văn bản academic thành chunks có ngữ nghĩa (cho Rubrics analysis).

**Heading patterns** (Vietnamese academic):
- Level 1: "Chương X", "CHƯƠNG X", "Chapter X", "PHẦN X"
- Level 2: "X.Y", "Phần X", "Mục X", "Section X"
- Level 3: "X.Y.Z"

**Fallback**: Nếu < 2 headings → chia theo paragraphs (max 600 words/chunk).

**Output**: `[TextChunk(index, heading, level, content, char_count)]`

---

## 9. FRONTEND PAGES & COMPONENTS

### 9.1 Shared Components
| Component | File | Mô tả |
|---|---|---|
| LoginPage | `LoginPage.js` | Trang đăng nhập bằng MetaMask (connect wallet → sign challenge → JWT) |
| MetaMaskGuideModal | `MetaMaskGuideModal.js` | Hướng dẫn cài đặt MetaMask |
| MainLayout | `layout/MainLayout.js` | Layout chung (sidebar, header, navigation) |
| QrScanner | `QrScanner.js` | Quét QR code |

### 9.2 Lecturer Pages (LECTURER_ROLE)
| Page | Route | File | Mô tả |
|---|---|---|---|
| Dashboard | `/lecturer` | `LecturerDashboard.js` | Tổng quan: số đề tài, SV đăng ký, báo cáo, thống kê |
| Quản lý đề tài | `/lecturer/topics` | `TopicManagement.js` | CRUD đề tài, thiết lập Rubrics, bật/tắt bài test, xem đăng ký, duyệt/từ chối |
| Review submission | `/lecturer/review` | `SubmissionReview.js` | Xem báo cáo SV, gọi AI phân tích, chấm điểm (GV + AI + Rubrics), ghi blockchain |
| Rubrics library | `/lecturer/rubrics` | `RubricsManagement.js` | CRUD template Rubrics, đặt mặc định, áp dụng vào đề tài |
| So sánh điểm | `/lecturer/comparison` | `ScoreComparison.js` | Bảng so sánh AI vs GV, biểu đồ, thống kê chênh lệch |
| Bài test đầu vào | `/lecturer/entrance-test/:deTaiId` | `EntranceTestManager.js` | Tạo/sửa/xóa bài test, xem kết quả, chọn nhóm thắng |
| Quản lý môn học | `/lecturer/courses` | `CourseManagement.js` | CRUD môn học |
| Quản lý lớp học | `/lecturer/classes` | `ClassManagement.js` | CRUD lớp học, thêm/xóa SV, xem chi tiết nhóm + đề tài |
| Quản lý sinh viên | `/lecturer/students` | `StudentManagement.js` | Xem danh sách SV, thông tin chi tiết |

### 9.3 Student Pages (STUDENT_ROLE)
| Page | Route | File | Mô tả |
|---|---|---|---|
| Dashboard | `/student` | `StudentDashboard.js` | Tổng quan: đề tài đăng ký, tiến độ, điểm, nhóm, lời mời |
| Đăng ký đề tài | `/student/register` | `TopicRegistration.js` | Xem đề tài, AI matching gợi ý, đăng ký, hủy đăng ký |
| Nộp báo cáo | `/student/upload` | `ReportUpload.js` | Upload file → IPFS, ghi blockchain |
| Nhật ký tiến độ | `/student/progress-log` | `ProgressLog.js` | Tạo/xem entry tiến độ |
| Theo dõi tiến độ | `/student/progress` | `ProgressTracking.js` | Chart tiến độ, xem nhận xét GV |
| Quản lý nhóm | `/student/group` | `GroupManagement.js` | Tạo nhóm, mời thành viên, chấp nhận/từ chối, chốt nhóm |
| Bài test đầu vào | `/student/entrance-test/:deTaiId` | `EntranceTest.js` | Làm bài test (trắc nghiệm + code editor), submit, xem kết quả |

### 9.4 Frontend Services
| Service | File | Mô tả |
|---|---|---|
| authService | `authService.js` | MetaMask connect, sign challenge, JWT management, role detection |
| apiService | `apiService.js` | HTTP client wrapper cho tất cả API calls |
| aiService | `aiService.js` | Gọi AI analyze, rubrics analysis, matching |
| nhomService | `nhomService.js` | API calls cho nhóm management |
| managementService | `managementService.js` | API calls cho môn học, lớp học |

---

## 10. WORKFLOW NGHIỆP VỤ TRỌNG TÂM

### Bước 1: Thiết lập đề tài (Giảng viên)
- Giảng viên tạo môn học → tạo lớp học → thêm sinh viên vào lớp
- Giảng viên tạo đề tài (gắn với môn học):
  - Nhập MaDeTai, TenDeTai, MoTa, MoTaChiTiet, YeuCau, SoLuongSinhVien, Deadline
  - Tùy chọn: thiết lập Rubrics (nhập trực tiếp hoặc chọn từ template library)
  - Tùy chọn: bật CoBaiTest (bài test cạnh tranh đầu vào)
  - Tùy chọn: thiết lập ChiTietBoSung

### Bước 2: Phân loại & Ranking (Hệ thống + AI)
- Hệ thống truy xuất GPA, KyNang, ChuyenNganh của sinh viên
- AI (SBERT) tính match_score giữa profile SV ↔ yêu cầu đề tài
- Kết quả: danh sách đề tài được sắp xếp theo độ phù hợp cho từng SV

### Bước 3: Đăng ký (Sinh viên)
- **3a. Đăng ký nhóm**:
  1. Sinh viên tạo nhóm (tự động làm trưởng nhóm)
  2. Mời thành viên qua MaSV
  3. Thành viên chấp nhận/từ chối
  4. Trưởng nhóm chốt nhóm (phải đủ SoLuong)
- **3b. Đăng ký đề tài**:
  1. Trưởng nhóm xem danh sách đề tài (đã lọc + AI gợi ý)
  2. Nhấn đăng ký → kiểm tra điều kiện (nhóm đã chốt, số lượng khớp, chưa đăng ký đề tài khác)
  3. Nếu CoBaiTest → chuyển ChoTest
  4. Nếu không → chuyển ChoDuyet → GV duyệt thủ công

### Bước 4: Bài test cạnh tranh (nếu CoBaiTest = true)
1. GV tạo bài test (trắc nghiệm + code)
2. Nhiều nhóm cùng đăng ký 1 đề tài → tất cả phải làm bài test
3. SV submit → AI chấm tự động:
   - Trắc nghiệm: exact match
   - Code: SBERT cosine similarity
4. Nếu đạt ngưỡng (NguongDat%) → Hybrid competition:
   - Nhóm submit sớm nhất + đạt ngưỡng → thắng
   - Nhóm sau thua hoặc chờ
5. WebSocket thông báo kết quả realtime
6. GV có thể manual override (selectWinner)

### Bước 5: Thực hiện & Phản hồi AI
- SV nộp báo cáo/bản nháp → upload IPFS → ghi blockchain
- GV trigger AI phân tích:
  - Không có Rubrics: PhoBERT analyze → score + feedback + issues
  - Có Rubrics: PhoBERT analyze-with-rubrics → per-criteria score + matched chunk + feedback
- SV nhận feedback → sửa đổi → nộp lại

### Bước 6: Đánh giá đa thành phần
- GV xem báo cáo + AI score gợi ý
- GV chấm điểm (có thể khác AI):
  - Điểm tổng (Diem)
  - Nhận xét (NhanXet)
  - Nếu Rubrics: chấm từng tiêu chí (GV_DiemTieuChi vs AI_DiemTieuChi)
- Ghi blockchain: `finalizeGrade` → TxHash
- Lưu DiemSo (AI_Score + Diem GV + RubricsResult + TxHash)

### Bước 7: So sánh & Leaderboard
- GV xem bảng so sánh điểm AI vs GV (ScoreComparison):
  - Biểu đồ scatter, bar chart
  - Thống kê: avgDiff, aiHigherCount, gvHigherCount, matchCount
  - Chi tiết từng tiêu chí Rubrics
- SV xem điểm + feedback + blockchain verification

---

## 11. BẢNG TỔNG HỢP CHỨC NĂNG THEO ROLE

### 11.1 LECTURER_ROLE (Giảng viên)

| # | Nhóm chức năng | Chức năng cụ thể | API liên quan |
|---|---|---|---|
| 1 | **Quản lý Môn học** | Tạo/sửa/xóa môn học | POST/PUT/DELETE /api/monhoc |
| 2 | | Xem danh sách môn học (kèm số đề tài, số lớp) | GET /api/monhoc/giangvien/:gvId |
| 3 | **Quản lý Lớp học** | Tạo/sửa/xóa lớp học | POST/PUT/DELETE /api/lophoc |
| 4 | | Thêm/xóa sinh viên vào lớp | POST/DELETE /api/lophoc/:id/sinhvien |
| 5 | | Xem chi tiết lớp (SV + nhóm + đề tài) | GET /api/lophoc/:id/detail |
| 6 | **Quản lý Sinh viên** | Xem danh sách sinh viên | GET /api/sinhvien |
| 7 | **Quản lý Đề tài** | Tạo đề tài mới (kèm Rubrics, MonHoc) | POST /api/detai |
| 8 | | Sửa/xóa đề tài | PUT/DELETE /api/detai/:id |
| 9 | | Xem danh sách đề tài (SoDangKy, DaChotNhom) | GET /api/detai |
| 10 | | Xem chi tiết đề tài | GET /api/detai/:id |
| 11 | **Quản lý Rubrics** | Tạo template Rubrics (validate TrongSo=100) | POST /api/rubrics |
| 12 | | Sửa/xóa template (block nếu DaApDung) | PUT/DELETE /api/rubrics/:id |
| 13 | | Đặt template mặc định | PUT /api/rubrics/:id/default |
| 14 | | Áp dụng template vào đề tài | POST /api/rubrics/:id/apply/:deTaiId |
| 15 | **Duyệt đăng ký** | Xem tất cả đăng ký cho đề tài của mình | GET /api/dangky/giangvien/:gvId |
| 16 | | Duyệt/từ chối đăng ký (auto-reject nhóm khác) | PUT /api/dangky/:id/approve |
| 17 | **Bài test cạnh tranh** | Tạo bài test (trắc nghiệm + code) | POST /api/baitest |
| 18 | | Xem kết quả tất cả SV | GET /api/baitest/:id/results |
| 19 | | Chọn nhóm thắng (manual override) | POST /api/baitest/:id/select-winner |
| 20 | | Xóa bài test | DELETE /api/baitest/:id |
| 21 | **Review Submission** | Xem tổng hợp báo cáo của SV | GET /api/baocao/giangvien/:gvId |
| 22 | | Xem báo cáo theo đề tài | GET /api/baocao/detai/:deTaiId |
| 23 | | Gọi AI phân tích báo cáo | POST /api/ai/analyze-report |
| 24 | | Gọi AI phân tích theo Rubrics | POST /api/ai/analyze-rubrics |
| 25 | **Chấm điểm** | Chấm điểm SV (GV + AI + Rubrics + Blockchain) | POST /api/diemso |
| 26 | | Xem bảng so sánh điểm AI vs GV | GET /api/diemso/comparison/:gvId |
| 27 | **Theo dõi tiến độ** | Xem tiến độ SV theo đề tài | GET /api/tiendo/detai/:deTaiId |
| 28 | | Nhận xét tiến độ | PUT /api/tiendo/:id/nhanxet |

### 11.2 STUDENT_ROLE (Sinh viên)

| # | Nhóm chức năng | Chức năng cụ thể | API liên quan |
|---|---|---|---|
| 1 | **Hồ sơ** | Cập nhật hồ sơ bắt buộc (HoTen, MaSV, Email, GPA, KyNang) | PUT /api/sinhvien/:id/profile |
| 2 | **Quản lý Nhóm** | Tạo nhóm mới (tự động làm trưởng nhóm) | POST /api/nhom |
| 3 | | Mời thành viên (qua MaSV) | POST /api/nhom/:id/invite |
| 4 | | Xem nhóm của mình | GET /api/nhom/sinhvien/:svId |
| 5 | | Xem lời mời đang chờ | GET /api/nhom/invites/:svId |
| 6 | | Chấp nhận/từ chối lời mời | POST /api/nhom/:id/respond |
| 7 | | Kick thành viên (trưởng nhóm) | DELETE /api/nhom/:id/kick/:svId |
| 8 | | Rời nhóm | POST /api/nhom/:id/leave |
| 9 | | Chuyển quyền trưởng nhóm | POST /api/nhom/:id/transfer-leader |
| 10 | | Chốt nhóm | POST /api/nhom/:id/chot |
| 11 | | Xóa nhóm (nếu chưa đăng ký đề tài) | DELETE /api/nhom/:id |
| 12 | **Đăng ký đề tài** | Xem danh sách đề tài | GET /api/detai |
| 13 | | AI matching gợi ý đề tài phù hợp | POST /api/ai/match-student |
| 14 | | Đăng ký đề tài (theo nhóm) | POST /api/detai/:id/register |
| 15 | | Xem đăng ký hiện tại | GET /api/dangky/sinhvien/:svId |
| 16 | | Hủy đăng ký | DELETE /api/dangky/:id |
| 17 | **Bài test cạnh tranh** | Lấy bài test (ẩn đáp án) | GET /api/baitest/detai/:deTaiId/student |
| 18 | | Làm bài test (trắc nghiệm + code editor) | POST /api/baitest/:id/submit |
| 19 | | Kiểm tra đã làm test chưa | GET /api/baitest/check/:deTaiId/:sinhVienId |
| 20 | **Nộp báo cáo** | Upload file → IPFS → Blockchain | POST /api/baocao/upload |
| 21 | | Xem báo cáo đã nộp | GET /api/baocao/sinhvien/:svId |
| 22 | | Hủy nộp (nếu chưa chấm) | DELETE /api/baocao/:id |
| 23 | **Tiến độ** | Tạo entry tiến độ | POST /api/tiendo |
| 24 | | Xem tiến độ của mình | GET /api/tiendo/:svId |
| 25 | **Xem điểm** | Xem điểm + feedback (AI + GV + Rubrics) | GET /api/diemso/sinhvien/:svId |

### 11.3 HỆ THỐNG (Tự động)

| # | Chức năng | Mô tả |
|---|---|---|
| 1 | Auto-register SV | Wallet mới đăng nhập lần đầu → tự tạo SinhVien |
| 2 | AI Matching | SBERT tính match_score SV ↔ đề tài |
| 3 | AI Report Analysis | PhoBERT phân tích nội dung báo cáo → score + feedback |
| 4 | AI Rubrics Analysis | PhoBERT chunking + per-criteria analysis |
| 5 | AI Code Compare | SBERT so sánh code SV vs đáp án mẫu |
| 6 | Auto-grade test | Trắc nghiệm: exact match, Code: SBERT similarity |
| 7 | Hybrid competition | tryClaimWinner → atomic claim → reject others → chốt đề tài |
| 8 | WebSocket realtime | Thông báo kết quả competition qua Socket.IO |
| 9 | IPFS upload | Tự động upload file lên Pinata, trả CID |
| 10 | Blockchain write | Non-blocking ghi transaction (submit, grade, test result) |
| 11 | Auto-approve winner | Bài test đạt ngưỡng + submit sớm nhất → auto-approve |

---

## 12. CHỨC NĂNG BỔ SUNG

### 12.1 Quản lý thời gian đăng ký (Đã bổ sung)
- **Đăng ký nhóm**: Có khoảng thời gian mở đăng ký nhóm. Sau thời gian cho phép → không cho xóa sửa nhóm.
- **Đăng ký đề tài**: Trong khoảng thời gian cho phép thì mới được đăng ký.
- **Tạo đề tài**: Sau khoảng thời gian bắt đầu đăng ký → GV không được tạo thêm đề tài mới.

### 12.2 Quản lý sinh viên & lớp học (Đã bổ sung)
- GV quản lý danh sách SV qua lớp học
- Lớp học gắn với môn học
- Đề tài gắn với môn học (field `MonHoc` trong DeTai schema)
- Chi tiết lớp hiển thị: danh sách SV + nhóm + đề tài đã đăng ký

### 12.3 Immutability tracking cho Rubrics
- Template đã áp dụng (DaApDung=true) không thể sửa/xóa
- Rubrics copy vào đề tài là bản copy độc lập (sửa template không ảnh hưởng đề tài)
- Tracking SoLuotDung (số đề tài đã dùng)

### 12.4 WebSocket Realtime Competition
- SV join room `competition:{deTaiId}` khi vào trang bài test
- Server emit `competition:winner` khi có nhóm thắng
- Server emit `competition:status` khi có thay đổi trạng thái

---

## 13. CƠ CHẾ BẢO MẬT & PHÂN QUYỀN

### 13.1 Authentication Flow
```
User → MetaMask.request({method: 'eth_requestAccounts'})
     → Backend POST /api/auth/challenge {walletAddress}
     ← {challengeId, challenge}
     → MetaMask.signMessage(challenge)
     → Backend POST /api/auth/verify {challengeId, signature}
     ← {token (JWT 24h), user: {id, walletAddress, role_id, name}}
```

### 13.2 Authorization
- **JWT Token**: Bearer token, 24h TTL, chứa `{id, walletAddress, role_id}`
- **Role-based routing**: Frontend ProtectedRoute kiểm tra `allowedRoles`
- **Middleware**: `authenticateToken` verify JWT trên các route cần bảo vệ
- **Wallet normalization**: Luôn lowercase khi so sánh/lưu trữ

### 13.3 Business Logic Guards
- SV không thể đăng ký đề tài nếu: chưa cập nhật hồ sơ, nhóm chưa chốt, số lượng không khớp, đã đăng ký đề tài khác
- SV không thể nộp báo cáo nếu: chưa được duyệt, đề tài nhóm nhưng không phải trưởng nhóm
- SV không thể hủy báo cáo nếu: đã được chấm điểm
- GV không thể sửa/xóa Rubrics template đã áp dụng
- Không thể xóa môn học nếu còn đề tài hoặc lớp học
- Nhóm đã chốt: không thể mời thêm, kick, rời nhóm
- Blockchain: Không ghi dữ liệu chưa hợp lệ (non-blocking, fail gracefully)

---

## PHỤ LỤC

### A. Cấu trúc thư mục dự án

```
Web3GiangVien/
├── backend/                          # Node.js Backend
│   ├── config/                       # DB, Web3, Logger config
│   │   ├── db.js                     #   MongoDB connection
│   │   ├── web3.js                   #   Web3/Ethers config
│   │   └── logger.js                 #   Winston logging
│   ├── contracts/                    # Solidity Smart Contracts
│   │   ├── ThesisManagement.sol      #   V1 (string keys)
│   │   └── ThesisManagementV2.sol    #   V2 (bytes32, gas-optimized)
│   ├── controllers/                  # Express Controllers (13 files)
│   │   ├── authController.js         #   MetaMask auth + JWT
│   │   ├── aiController.js           #   AI endpoints
│   │   ├── baiTestController.js      #   Entrance test + competition
│   │   ├── baoCaoController.js       #   Report/submission
│   │   ├── deTaiController.js        #   Topic/challenge + registration
│   │   ├── diemSoController.js       #   Grading + comparison
│   │   ├── giangVienController.js    #   Lecturer CRUD
│   │   ├── lopHocController.js       #   Class management
│   │   ├── monHocController.js       #   Course management
│   │   ├── nhomController.js         #   Group management
│   │   ├── rubricsController.js      #   Rubrics template
│   │   ├── sinhVienController.js     #   Student CRUD + profile
│   │   └── tienDoController.js       #   Progress tracking
│   ├── middleware/                    # Express middleware
│   │   └── cspHeader.js              #   Content Security Policy
│   ├── models/                       # Mongoose Models (13 files)
│   │   ├── BaiTest.js, BaoCao.js, DangKyDeTai.js, DeTai.js,
│   │   ├── DiemSo.js, GiangVien.js, KetQuaTest.js, LopHoc.js,
│   │   ├── MonHoc.js, Nhom.js, RubricsTemplate.js, SinhVien.js,
│   │   └── TienDo.js
│   ├── services/                     # Business logic services (5 files)
│   │   ├── aiService.js              #   PhoBERT API calls
│   │   ├── authService.js            #   Token verification
│   │   ├── ipfsService.js            #   Pinata IPFS upload
│   │   ├── matchingService.js        #   SBERT matching API calls
│   │   └── thesisContractService.js  #   Blockchain interactions
│   ├── scripts/                      # Deploy & seed scripts (19 files)
│   ├── server.js                     # Express app + routes + Socket.IO
│   ├── hardhat.config.js             # Hardhat configuration
│   └── package.json                  # Node.js dependencies
│
├── frontend/                         # React Frontend
│   ├── src/
│   │   ├── App.js                    #   Router + ProtectedRoute
│   │   ├── AuthContext.js            #   Auth context provider
│   │   ├── index.js                  #   Entry point + theme
│   │   ├── components/
│   │   │   ├── LoginPage.js          #   MetaMask login
│   │   │   ├── MetaMaskGuideModal.js #   Install guide
│   │   │   ├── layout/MainLayout.js  #   Sidebar + header
│   │   │   ├── lecturer/             #   9 lecturer pages
│   │   │   └── student/              #   7 student pages
│   │   ├── services/                 #   API service layer (6 files)
│   │   └── theme/                    #   MUI theme config
│   └── package.json                  # React dependencies
│
├── ml-service/                       # Python ML Service
│   ├── app.py                        #   FastAPI entry point
│   ├── routes/                       #   3 API route files
│   ├── models/                       #   PhoBERT + SBERT classes
│   ├── utils/                        #   Text processing + chunking
│   └── requirements.txt              # Python dependencies
│
├── Web3Vault/                        # Knowledge base (Obsidian)
│   ├── 00_Inbox/ → 14_References/    #   Organized knowledge
│   └── README.md
│
├── docker/                           # Docker config
├── Document/                         # Project documents
├── AGENTS.md                         # AI Agent rules
└── render.yaml                       # Render deployment config
```

### B. Environment Variables (.env)

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=your-secret-key

# Blockchain
PRIVATE_KEY=0x...
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/...
THESIS_CONTRACT_ADDRESS=0x...
ETHERSCAN_API_KEY=...

# IPFS (Pinata)
PINATA_JWT=...
PINATA_GATEWAY=...

# Frontend
FRONTEND_URL=http://localhost:3000

# Server
PORT=5000
NODE_ENV=development
```

### C. Ports

| Service | Port | Protocol |
|---|---|---|
| Frontend (React) | 3000 | HTTP |
| Backend (Express) | 5000 | HTTP + WebSocket |
| ML Service (FastAPI) | 8001 | HTTP |
| Hardhat Node (dev) | 8545 | JSON-RPC |
| MongoDB Atlas | 27017 | TCP (cloud) |

---

> **Ghi chú**: Tài liệu này được tạo từ phân tích source code thực tế của dự án Web3GiangVien, bao gồm 13 MongoDB models, 13 controllers, 5 services, 2 smart contracts, 3 AI models, 16+ frontend components, và ~60+ API endpoints.
