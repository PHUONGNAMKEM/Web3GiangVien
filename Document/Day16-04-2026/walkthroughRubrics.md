# Walkthrough: Triển Khai AI Rubrics Chấm Điểm

## Tổng quan

Đã triển khai **hoàn chỉnh** hệ thống Rubrics chấm điểm AI cho nền tảng Web3 Giảng Viên. Hệ thống cho phép giảng viên tạo bộ tiêu chí đánh giá, áp dụng cho đề tài, và sử dụng PhoBERT AI để phân tích báo cáo theo **từng tiêu chí riêng biệt** thông qua chiến lược **Smart Chunking**.

---

## Sprint 1: Backend + ML Service

### 1. Models (3 files)

#### [NEW] [RubricsTemplate.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/models/RubricsTemplate.js)
- Model lưu trữ Rubrics Template tái sử dụng
- Fields: `TenMau`, `MoTaMau`, `GiangVien`, `TieuChi[]`, `MacDinh`
- Immutability tracking: `DaApDung`, `SoLuotDung` — ngăn chặn sửa/xóa template đã áp dụng

```diff:RubricsTemplate.js
===
const mongoose = require('mongoose');

const rubricsTemplateSchema = new mongoose.Schema({
  TenMau: { type: String, required: true },             // VD: "Rubrics Đồ án CNTT"
  MoTaMau: { type: String, default: '' },               // Mô tả ngắn
  GiangVien: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  TieuChi: [{
    TenTieuChi: { type: String, required: true },
    MoTa: { type: String, default: '' },
    TrongSo: { type: Number, required: true, min: 0, max: 100 },
    DiemToiDa: { type: Number, default: 10 },
    GoiYChoAI: [{ type: String }]                       // Keywords cho AI matching
  }],
  MacDinh: { type: Boolean, default: false },            // GV đánh dấu đây là mẫu mặc định

  // === IMMUTABILITY TRACKING ===
  DaApDung: { type: Boolean, default: false },           // Đã áp dụng vào ≥1 đề tài chưa
  SoLuotDung: { type: Number, default: 0 }              // Số đề tài đã dùng template này
}, { timestamps: true });

// Index cho truy vấn theo GV
rubricsTemplateSchema.index({ GiangVien: 1, MacDinh: 1 });

module.exports = mongoose.model('RubricsTemplate', rubricsTemplateSchema);
```

#### [MODIFY] [DeTai.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/models/DeTai.js)
- Thêm `Rubrics[]` — embedded array tiêu chí (copy từ template)
- Thêm `SuDungRubrics` — flag bật/tắt Rubrics
- Thêm `HienThiChiTietChoSV` — GV quyết định SV xem chi tiết không
- Mỗi tiêu chí: `TenTieuChi`, `MoTa`, `TrongSo`, `DiemToiDa`, `GoiYChoAI[]`

```diff:DeTai.js
const mongoose = require('mongoose');

const deTaiSchema = new mongoose.Schema({
  MaDeTai: { type: String, required: true, unique: true },
  TenDeTai: { type: String, required: true },
  MoTa: { type: String },
  MoTaChiTiet: { type: String, default: '' },
  YeuCau: [{ type: String }],
  ChiTietBoSung: [{
    TieuDe: { type: String, default: '' },
    NoiDung: { type: String, default: '' }
  }],
  SoLuongSinhVien: { type: Number, default: 1, min: 1 },
  Deadline: { type: Date, required: true },
  GiangVienHuongDan: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  TrangThai: { type: String, enum: ['MoDangKy', 'DaChot', 'HoanThanh'], default: 'MoDangKy' }
}, { timestamps: true });

module.exports = mongoose.model('DeTai', deTaiSchema);
===
const mongoose = require('mongoose');

const deTaiSchema = new mongoose.Schema({
  MaDeTai: { type: String, required: true, unique: true },
  TenDeTai: { type: String, required: true },
  MoTa: { type: String },
  MoTaChiTiet: { type: String, default: '' },
  YeuCau: [{ type: String }],
  ChiTietBoSung: [{
    TieuDe: { type: String, default: '' },
    NoiDung: { type: String, default: '' }
  }],
  // === RUBRICS CHẤM ĐIỂM ===
  Rubrics: [{
    TenTieuChi: { type: String, required: true },          // VD: "Nội dung kỹ thuật"
    MoTa: { type: String, default: '' },                   // VD: "Đánh giá mức độ hiểu biết kỹ thuật"
    TrongSo: { type: Number, required: true, min: 0, max: 100 },  // % trọng số (tổng = 100)
    DiemToiDa: { type: Number, default: 10 },              // Thang điểm tối đa tiêu chí này
    GoiYChoAI: [{ type: String }]                          // Keywords cho AI matching (VD: ["React","API"])
  }],
  SuDungRubrics: { type: Boolean, default: false },        // Có dùng Rubrics không
  HienThiChiTietChoSV: { type: Boolean, default: false },  // GV quyết định SV có xem chi tiết không
  SoLuongSinhVien: { type: Number, default: 1, min: 1 },
  Deadline: { type: Date, required: true },
  GiangVienHuongDan: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  TrangThai: { type: String, enum: ['MoDangKy', 'DaChot', 'HoanThanh'], default: 'MoDangKy' }
}, { timestamps: true });

module.exports = mongoose.model('DeTai', deTaiSchema);
```

#### [MODIFY] [DiemSo.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/models/DiemSo.js)
- Thêm `RubricsResult[]` — lưu kết quả chấm theo tiêu chí
- Mỗi item: `AI_DiemTieuChi`, `GV_DiemTieuChi`, `AI_NhanXetTieuChi`, `MatchedChunk`

```diff:DiemSo.js
const mongoose = require('mongoose');

const diemSoSchema = new mongoose.Schema({
  BaoCao: { type: mongoose.Schema.Types.ObjectId, ref: 'BaoCao', required: true },
  GiangVienCam: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien', required: true },
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  Diem: { type: Number, required: true },
  NhanXet: { type: String },
  AI_Score: { type: Number },      // Điểm đánh giá dự kiến từ AI
  AI_Feedback: { type: String },   // Feedback từ mô hình AI
  TxHash: { type: String }         // Mã giao dịch lưu trên Blockchain
}, { timestamps: true });

module.exports = mongoose.model('DiemSo', diemSoSchema);
===
const mongoose = require('mongoose');

const diemSoSchema = new mongoose.Schema({
  BaoCao: { type: mongoose.Schema.Types.ObjectId, ref: 'BaoCao', required: true },
  GiangVienCam: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien', required: true },
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  Diem: { type: Number, required: true },
  NhanXet: { type: String },
  AI_Score: { type: Number },      // Điểm đánh giá dự kiến từ AI
  AI_Feedback: { type: String },   // Feedback từ mô hình AI
  RubricsResult: [{
    TenTieuChi: { type: String },
    TrongSo: { type: Number },
    DiemToiDa: { type: Number },
    AI_DiemTieuChi: { type: Number },          // Điểm AI gợi ý cho tiêu chí này
    GV_DiemTieuChi: { type: Number },          // Điểm GV chấm thực tế
    AI_NhanXetTieuChi: { type: String },       // Feedback AI riêng cho tiêu chí này
    MatchedChunk: {                             // Chunk nào AI đã match
      index: { type: Number },
      heading: { type: String }
    }
  }],
  TxHash: { type: String }         // Mã giao dịch lưu trên Blockchain
}, { timestamps: true });

module.exports = mongoose.model('DiemSo', diemSoSchema);
```

---

### 2. Controllers (3 files)

#### [NEW] [rubricsController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/controllers/rubricsController.js)
- **CRUD** hoàn chỉnh: `getTemplatesByGV`, `createTemplate`, `updateTemplate`, `deleteTemplate`
- **Immutability guard**: Block sửa/xóa khi `DaApDung = true`
- **Validation**: Tổng trọng số = 100%
- **applyTemplate**: Copy tiêu chí vào đề tài + update tracking

#### [MODIFY] [deTaiController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/controllers/deTaiController.js)
- `create()`: Validate Rubrics (trọng số, tên tiêu chí) + update template tracking

#### [MODIFY] [diemSoController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/controllers/diemSoController.js)
- `chamDiem()`: Lưu `rubricsResult` vào DB song song với điểm tổng

---

### 3. Backend Services & Routes

#### [MODIFY] [aiService.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/services/aiService.js)
- Thêm `analyzeWithRubrics()` — gọi FastAPI endpoint `/analyze-with-rubrics`

#### [MODIFY] [aiController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/controllers/aiController.js)
- Thêm `analyzeReportWithRubrics()` handler

#### [MODIFY] [server.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/server.js)
- Route AI: `POST /api/ai/analyze-rubrics`
- Routes Rubrics Template: 6 endpoints (`GET`, `POST`, `PUT`, `DELETE`, `PUT /default`, `POST /apply`)

---

### 4. ML Service (2 files)

#### [NEW] [pdf_chunker.py](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/ml-service/utils/pdf_chunker.py)
- Detect Vietnamese headings: `Chương X`, `X.Y`, `X.Y.Z`, `Section X`
- 3 levels: Chapter (1), Section (2), Sub-section (3)
- Fallback: chia theo paragraphs nếu không detect được heading

#### [MODIFY] [phobert_analyzer.py](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/ml-service/models/phobert_analyzer.py)
- Thêm `analyze_with_rubrics()`:
  1. Chunk text → chunks
  2. Embed tất cả chunks + criteria
  3. Similarity matrix → **max(similarity)** per criteria
  4. Score + feedback per criteria

#### [MODIFY] [analyze.py](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/ml-service/routes/analyze.py)
- Route: `POST /analyze-with-rubrics`
- Models: `RubricItem`, `AnalyzeRubricsRequest`

---

## Sprint 2: Frontend

### [MODIFY] [aiService.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/services/aiService.js)
- 7 API calls mới: `getRubricsTemplates`, `createRubricsTemplate`, `updateRubricsTemplate`, `deleteRubricsTemplate`, `setDefaultRubricsTemplate`, `applyTemplate`, `analyzeReportWithRubrics`

### [NEW] [RubricsManagement.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/RubricsManagement.js)
- Tab quản lý Rubrics Template standalone
- CRUD với immutability indicators (Lock badge)
- Expand row xem chi tiết tiêu chí
- Modal tạo/sửa với form tiêu chí động + validation trọng số

### [MODIFY] [TopicManagement.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/TopicManagement.js)
- Switch bật/tắt Rubrics + toggle SV visibility
- Chọn nguồn: "Tạo mới" hoặc "Chọn từ template"
- Inline criteria editor trong modal tạo đề tài
- Expand row hiển thị Rubrics đề tài

### [MODIFY] [SubmissionReview.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/SubmissionReview.js)
- **Rubrics mode**: Khi đề tài có `SuDungRubrics` → gọi `analyzeReportWithRubrics`
- Panel chấm theo tiêu chí: AI score + GV override per criteria
- `MatchedChunk` tag hiển thị chunk nào AI đã match
- Auto-calc weighted total score
- **Legacy mode**: Vẫn giữ nguyên flow cũ cho đề tài không dùng Rubrics

### [MODIFY] [App.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/App.js) + [MainLayout.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/layout/MainLayout.js)
- Route: `/lecturer/rubrics` → `RubricsManagement`
- Navigation: Menu item "Quản Lý Rubrics" với icon `ClipboardList`

---

## Verification

| Test | Result |
|------|--------|
| Frontend production build | ✅ `Compiled successfully` |
| No syntax errors | ✅ No warnings/errors |
| Backward compatibility | ✅ Legacy mode vẫn hoạt động cho đề tài không dùng Rubrics |
