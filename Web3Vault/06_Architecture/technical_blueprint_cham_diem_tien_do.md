# Technical Blueprint — Hoàn thiện Chấm Điểm, Tiến Độ Hàng Tuần và Chấm Báo Cáo Tuần

> **Loại tài liệu**: Blueprint / Kế hoạch triển khai  
> **Trạng thái**: Sẵn sàng để AI Coder thực thi  
> **Ngày tạo**: 2026-05-10  
> **Phạm vi**: Không sửa code — chỉ phân tích, thiết kế, lập kế hoạch

---

## 1. Source Analysis Summary

### 1.1. Models hiện có (xác nhận từ source)

**`backend/models/DiemSo.js`**
- Fields: `BaoCao`, `GiangVienCam` (typo nghi ngờ là `GiangVienCham`), `SinhVien`, `DeTai`, `Diem`, `NhanXet`, `AI_Score`, `AI_Feedback`, `RubricsResult[]`, `TxHash`.
- **Không có**: validate 0–10, không có unique index, không có enum trạng thái.

**`backend/models/TienDo.js`**
- Fields: `DeTai`, `SinhVien`, `NoiDung`, `PhanTramHoanThanh` (0–100), `LoaiCapNhat` (free string, default `Khác`), `FileDinhKem`, `NhanXetGV`.
- **Không có**: `TuanSo`, ngày tuần, mục tiêu, khó khăn, kế hoạch, điểm tiến độ, trạng thái đánh giá, rubrics tuần.

**`backend/models/BaoCao.js`**
- Mỗi SV có thể có nhiều bản ghi `BaoCao` theo `DeTai + SinhVien` (không unique) → `submissionIndex = 0` đang là sai khi có >1 bài.

**`backend/models/DeTai.js`**
- Có `Rubrics[]` (`TenTieuChi`, `MoTa`, `TrongSo`, `DiemToiDa`, `GoiYChoAI`), `SuDungRubrics`, `HienThiChiTietChoSV`.
- Có thể tái sử dụng cho rubrics báo cáo cuối kỳ; cần tách rubrics tuần riêng.

**`backend/models/DangKyDeTai.js`**
- Có `ThanhVien[]` với `VaiTro`, `TrangThaiTV` → đã hỗ trợ làm nhóm.

### 1.2. APIs hiện có (xác nhận từ `backend/server.js` dòng 131–139)

| Endpoint | Controller | Ghi chú |
|---|---|---|
| `POST /api/diemso` | `diemSoController.chamDiem` | Chấm điểm cuối kỳ |
| `GET /api/diemso/sinhvien/:svId` | `getDiemBySinhVien` | SV xem điểm |
| `GET /api/diemso/comparison/:gvId` | `getComparison` | So sánh AI vs GV |
| `POST /api/tiendo` | `createProgressEntry` | SV tạo tiến độ |
| `GET /api/tiendo/:svId` | `getProgressBySV` | **Route legacy, không có namespace** |
| `GET /api/tiendo/detai/:deTaiId` | `getProgressByTopic` | GV xem |
| `PUT /api/tiendo/:id/nhanxet` | `commentProgress` | GV nhận xét |

### 1.3. Flow frontend hiện có

- `frontend/src/services/aiService.js` (dòng 156–171): có `createProgressEntry`, `getProgressBySV`, `getProgressByTopic`, `commentProgress`. **Không có** API tuần / đánh giá tuần.
- `frontend/src/components/student/ProgressLog.js`: SV nhập `loaiCapNhat`, `phanTramHoanThanh`, `noiDung`, `fileDinhKem`. Không có khái niệm tuần.
- `frontend/src/components/lecturer/SubmissionReview.js` (dòng 36–49): GV chỉ nhập `nhanXet` plain text, không có rubrics / điểm tuần / trạng thái.
- `frontend/src/components/lecturer/SubmissionReview.js` (dòng 165–213): `handleBlockchainMint` gửi payload chấm điểm cuối kỳ (`baoCaoId`, `deTaiId`, `sinhVienId`, `giangVienId`, `diem`, `nhanXet`, `aiScore`, `aiFeedback`, `rubricsResult`).
- `ProgressTracking.js` và `StudentDashboard.js`: chỉ hiển thị `Diem` / `AI_Score` cuối kỳ; không hiển thị tiến độ tuần.

### 1.4. Lệch giữa frontend ↔ backend

| Vị trí | Frontend gửi | Backend nhận | Ghi chú |
|---|---|---|---|
| `chamDiem` | `diem`, `nhanXet`, `aiScore`, `aiFeedback`, `rubricsResult` | destructure đúng → map sang field PascalCase khi save | OK nhưng dễ nhầm khi đọc |
| `RubricsResult` shape | `{ AI_DiemTieuChi, GV_DiemTieuChi, ... }` | Schema dùng cùng key | OK |
| `commentProgress` body | `{ nhanXet }` | `{ nhanXet }` | OK |
| `GiangVienCam` | FE không tham chiếu trực tiếp | DB dùng tên này | Typo cần xử lý có kế hoạch backward compat |

### 1.5. Rủi ro logic hiện tại

1. `chamDiem` không validate 0–10, không validate quyền GV, không kiểm tra `BaoCao` thực sự thuộc đúng `SinhVien + DeTai`.
2. `existingGrade` chỉ kiểm tra theo `BaoCao + SinhVien` — nếu SV nộp nhiều `BaoCao` thì có thể chấm trùng cho cùng `DeTai`.
3. `submissionIndex = 0` hardcoded (`diemSoController.js` dòng 17) → V2 contract cần index thật.
4. Blockchain lỗi trong `finalizeGradeOnChain` ném exception trước khi save DB → không lưu → mất dấu vết. Không có chiến lược pending/retry.
5. `TienDo` không có khái niệm tuần → chấm tuần không thể quy ước.
6. `commentProgress` không kiểm tra GV có sở hữu đề tài.
7. `createProgressEntry` không check duplicate tuần, không validate `phanTramHoanThanh` không giảm.
8. Field encoding/mojibake (ví dụ `'Khac'` vs `'Khác'`) — cần normalization khi compare.

> **Files đã đọc để xác nhận**: `server.js`, `DiemSo.js`, `TienDo.js`, `BaoCao.js`, `DeTai.js`, `DangKyDeTai.js`, `diemSoController.js`, `tienDoController.js`, `thesisContractService.js`, `aiService.js`, `ProgressLog.js`, `ProgressTracking.js`, `StudentDashboard.js`, `SubmissionReview.js`.

---

## 2. Target Architecture

Giữ nguyên kiến trúc hiện tại (Express + Mongoose + React + AntD + ethers). Chỉ **mở rộng** chứ không rewrite:

| Tầng | Hành động |
|---|---|
| Backend models | Bổ sung field mới cho `DiemSo` (alias `GiangVienCham`) và `TienDo` (đầy đủ field tuần + rubrics). Giữ nguyên field cũ để backward compat. |
| Backend controllers | Thêm helper `validateChamDiem`, `validateTienDoTuan`, `assertGiangVienOwnsDeTai`, `assertSinhVienInDangKy`. Giữ chữ ký hàm cũ. |
| Backend routes | Thêm `POST /api/tiendo/:id/danhgia`, `GET /api/tiendo/sinhvien/:svId`, `GET /api/tiendo/detail/:id`. Giữ luôn `GET /api/tiendo/:svId` và `PUT /api/tiendo/:id/nhanxet` (legacy). |
| Frontend service | Thêm methods mới cho weekly progress. Không xoá method cũ. |
| Frontend components | Nâng `ProgressLog.js` hỗ trợ form tuần (vẫn render record cũ). `SubmissionReview.js` thêm modal đánh giá tuần (rubrics + điểm tuần). |
| Blockchain | Chỉ điểm **cuối kỳ** ghi blockchain. Điểm tuần **không** ghi chain. Sửa `submissionIndex` thành dynamic. |
| AI / rubrics | Chấm tuần dùng rubrics tuần (mặc định 5 tiêu chí); chấm cuối kỳ tiếp tục dùng rubrics đề tài hiện có. |

---

## 3. Data Schema Design

### 3.1. `DiemSo`

**Giữ nguyên**: `BaoCao`, `SinhVien`, `DeTai`, `Diem`, `NhanXet`, `AI_Score`, `AI_Feedback`, `RubricsResult[]`, `TxHash`, `timestamps`.

**Bổ sung**:

```js
GiangVienCham: { type: ObjectId, ref: 'GiangVien' }, // alias chuẩn cho GiangVienCam
Diem: { type: Number, required: true, min: 0, max: 10 }, // thêm constraint
TrangThaiBlockchain: {
  type: String,
  enum: ['ChuaGhi', 'Pending', 'DaGhi', 'LoiGhi'],
  default: 'ChuaGhi'
},
SubmissionIndex: { type: Number, default: 0 }, // index thật của BaoCao trong stream nộp
LoiBlockchain: { type: String }, // chi tiết lỗi nếu LoiGhi
```

**Xử lý `GiangVienCam`**:
- Không xoá. Thêm field mới `GiangVienCham` và **giữ song song**.
- Trong controller mới: ghi đồng thời `GiangVienCam = GiangVienCham = giangVienId`.
- Khi đọc: ưu tiên `GiangVienCham`, fallback `GiangVienCam`.
- Sau khi FE/code mới ổn định, có thể migrate sau (KHÔNG làm trong phạm vi này).

**Index/unique**:

```js
diemSoSchema.index({ BaoCao: 1 }, { unique: true });
diemSoSchema.index({ DeTai: 1, SinhVien: 1 }); // không unique vì có thể nộp lại nhiều bản
```

> Chỉ thêm `unique` cho `BaoCao` vì mỗi báo cáo chỉ chấm 1 lần. Không unique theo `(DeTai, SinhVien)` để vẫn cho phép trường hợp re-grade qua bản BaoCao mới.

**Validation Mongoose**:
- `Diem` min 0 max 10.
- `RubricsResult.GV_DiemTieuChi` ≤ `DiemToiDa`.
- Pre-save validate tổng `(DiemGV/DiemToiDa)*TrongSo` lệch `Diem` không quá 0.5 nếu đề tài bật `SuDungRubrics`.

---

### 3.2. `TienDo` (báo cáo tuần)

**Giữ nguyên** (backward compat): `DeTai`, `SinhVien`, `NoiDung`, `PhanTramHoanThanh`, `LoaiCapNhat`, `FileDinhKem`, `NhanXetGV`, `timestamps`.

**Bổ sung field thông tin tuần**:

```js
TuanSo: { type: Number, min: 1, max: 30 }, // optional → backward compat với log cũ
NgayBatDauTuan: { type: Date },
NgayKetThucTuan: { type: Date },
MucTieuTuan: { type: String, default: '' },
NoiDungDaLam: { type: String, default: '' }, // thay thế dần NoiDung cho báo cáo tuần; vẫn ghi NoiDung để FE legacy đọc được
KhoKhan: { type: String, default: '' },
KeHoachTuanSau: { type: String, default: '' },
MinhChung: [{
  TenFile: { type: String },
  Url: { type: String },       // hoặc IPFS_CID
  GhiChu: { type: String, default: '' }
}],
```

**Bổ sung field đánh giá GV**:

```js
TrangThaiDanhGia: {
  type: String,
  enum: ['ChoDanhGia', 'Dat', 'CanBoSung', 'KhongDat'],
  default: 'ChoDanhGia'
},
DiemTienDo: { type: Number, min: 0, max: 10 }, // điểm tuần
RubricsTuan: [{
  MaTieuChi: { type: String },          // 'DUNG_HAN', 'HOAN_THANH', 'CHAT_LUONG', 'KHO_KHAN', 'KE_HOACH'
  TenTieuChi: { type: String },
  TrongSo: { type: Number, min: 0, max: 100 }, // tổng = 100
  DiemToiDa: { type: Number, default: 10 },
  DiemGV: { type: Number, min: 0 },
  NhanXetTieuChi: { type: String, default: '' }
}],
GiangVienDanhGia: { type: ObjectId, ref: 'GiangVien' },
NgayDanhGia: { type: Date },
LanNopLai: { type: Number, default: 0 }, // số lần SV nộp lại sau CanBoSung
CanhBaoTienDo: [{ type: String }], // ['GIAM_PHAN_TRAM', 'TANG_BAT_THUONG', ...]
```

**Index/unique**:

```js
tienDoSchema.index(
  { DeTai: 1, SinhVien: 1, TuanSo: 1, LanNopLai: 1 },
  { unique: true, partialFilterExpression: { TuanSo: { $type: 'number' } } }
);
tienDoSchema.index({ DeTai: 1, SinhVien: 1, createdAt: -1 });
```

> `partialFilterExpression` bảo đảm các record cũ không có `TuanSo` không vi phạm unique.

**Backward compatibility**:
- Tất cả field mới đều `optional`.
- API legacy `POST /api/tiendo` không truyền `tuanSo` vẫn hoạt động → tạo record kiểu cũ.
- Frontend render: nếu không có `TuanSo` thì hiển thị block "Cập nhật chung" như hiện tại; có `TuanSo` thì render block "Tuần X".

---

## 4. Weekly Report Grading Design

### 4.1. Lưu rubrics tuần

- Rubrics tuần lưu trực tiếp trong từng record `TienDo.RubricsTuan` (snapshot khi GV chấm), không lưu trong `DeTai`.
- Mặc định **không** có rubrics khi SV mới tạo. Khi GV mở modal đánh giá lần đầu, controller `evaluateProgress` sẽ tự seed `RubricsTuan` từ default template phía dưới (nếu chưa có).

### 4.2. Default rubrics tuần (thang 10)

| Mã | Tên tiêu chí | Trọng số | DiemToiDa |
|---|---|---:|---:|
| `DUNG_HAN` | Đúng hạn và đầy đủ | 15% | 10 |
| `HOAN_THANH` | Mức độ hoàn thành mục tiêu tuần | 30% | 10 |
| `CHAT_LUONG` | Chất lượng nội dung và minh chứng | 25% | 10 |
| `KHO_KHAN` | Xử lý khó khăn và tư duy phản hồi | 15% | 10 |
| `KE_HOACH` | Kế hoạch tuần sau | 15% | 10 |

> Tổng `TrongSo` phải = 100. Helper `validateRubricsTuan` phải kiểm tra trước khi save.

### 4.3. Công thức tính `DiemTienDo`

```
DiemTienDo = sum( (DiemGV / DiemToiDa) * TrongSo ) / 100 * 10
```

Làm tròn 2 chữ số thập phân (`Math.round(x * 100) / 100`).

### 4.4. Validate rubrics

| Trường | Điều kiện |
|---|---|
| `TrongSo` | 0 ≤ x ≤ 100; tổng tất cả tiêu chí = 100 (sai số ±0.01) |
| `DiemToiDa` | > 0 |
| `DiemGV` | 0 ≤ x ≤ `DiemToiDa` |
| `DiemTienDo` | Backend tự tính lại; FE chỉ gửi rubrics, không tin số FE gửi |

### 4.5. Khi nào dùng rubrics chi tiết / chấm nhanh

- **Chấm nhanh**: chỉ set `TrangThaiDanhGia` + `NhanXetGV`, không yêu cầu rubrics → `DiemTienDo` không cập nhật. Cho phép khi GV chỉ muốn nhận xét lướt.
- **Chấm rubrics đầy đủ**: bắt buộc nếu `body.rubricsTuan` được gửi; lúc đó tính `DiemTienDo` và yêu cầu `TrangThaiDanhGia ∈ {Dat, CanBoSung, KhongDat}`.

### 4.6. Quy ước trạng thái đánh giá

| Trạng thái | SV có sửa được không | Ghi chú |
|---|---|---|
| `ChoDanhGia` | Được sửa (PUT) | Trạng thái mặc định khi tạo mới hoặc sau nộp lại |
| `Dat` | Không | Khoá vĩnh viễn |
| `KhongDat` | Không sửa record cũ; tạo record mới `LanNopLai+1` | Unique index mới theo `{DeTai, SinhVien, TuanSo, LanNopLai}` |
| `CanBoSung` | Được sửa (PUT) → `LanNopLai += 1`, reset về `ChoDanhGia` | GV ghi ý kiến cụ thể |

---

## 5. Anomaly Detection Rules

Helper `detectAnomalies(currentEntry, previousEntries)` chạy ở backend khi SV tạo/sửa tiến độ và khi GV xem chi tiết.

| Mã cảnh báo | Mô tả | Hành vi |
|---|---|---|
| `GIAM_PHAN_TRAM` | `PhanTramHoanThanh` < tuần trước | **Chặn cứng** trừ khi SV xác nhận `confirmGiam=true` |
| `TANG_BAT_THUONG` | Tăng >40% so với tuần trước nhưng `MinhChung` rỗng hoặc `NoiDungDaLam.length < 80` | Cảnh báo (không chặn) |
| `KHONG_MINH_CHUNG_NHUNG_CAO` | `PhanTramHoanThanh ≥ 70` và `MinhChung` rỗng | Cảnh báo |
| `NOI_DUNG_NGAN` | `NoiDungDaLam.length < 30` | Cảnh báo |
| `NOP_DON` | ≥3 tuần được tạo trong 30 phút cho cùng SV+đề tài | Cảnh báo |
| `THIEU_KE_HOACH` | `KeHoachTuanSau` rỗng và không phải tuần cuối | Cảnh báo |
| `TRUNG_TUAN` | Đã có record cùng `(DeTai, SinhVien, TuanSo, LanNopLai)` chưa `KhongDat` | **Chặn cứng** (409) |

### Hiển thị ở frontend

- **Phía SV**: Alert warning dưới form trước khi submit.
- **Phía GV** (modal đánh giá tuần): Panel "Cảnh Báo Tiến Độ" (Ant Design Alert type="warning") liệt kê từng mã + diễn giải tiếng Việt.
- Backend trả thêm field `canhBao: string[]` trong response POST/PUT tiến độ và trong GET detail.

---

## 6. API Contracts

> Tất cả response error chuẩn: `{ error: string, code?: string, details?: object }`.

### 6.1. `POST /api/diemso` — Chấm điểm cuối kỳ (giữ + nâng)

**Request body**:
```json
{
  "baoCaoId": "ObjectId",
  "deTaiId": "ObjectId",
  "sinhVienId": "ObjectId",
  "giangVienId": "ObjectId",
  "diem": 8.5,
  "nhanXet": "Báo cáo tốt, logic rõ ràng.",
  "aiScore": 7.8,
  "aiFeedback": "...",
  "rubricsResult": [
    {
      "TenTieuChi": "Nội dung kỹ thuật",
      "TrongSo": 30,
      "DiemToiDa": 10,
      "GV_DiemTieuChi": 8.5,
      "AI_DiemTieuChi": 7,
      "AI_NhanXetTieuChi": ""
    }
  ],
  "submissionIndex": 0
}
```

**Response 201**:
```json
{
  "message": "Chấm điểm thành công",
  "data": { "...DiemSo doc..." },
  "blockchain": {
    "status": "DaGhi",
    "txHash": "0x..."
  }
}
```

**Errors**:
- `400 INVALID_DIEM` — `diem` ngoài [0, 10].
- `400 INVALID_RUBRICS_TONG` — tổng trọng số rubrics ≠ 100.
- `400 BAOCAO_KHONG_KHOP_SV` — `BaoCao.SinhVien` ≠ `sinhVienId`.
- `400 RUBRICS_LECH_DIEM_TONG` — điểm rubrics lệch > 0.5 so với `diem`.
- `403 KHONG_PHAI_GV_HUONG_DAN` — `DeTai.GiangVienHuongDan` ≠ `giangVienId`.
- `404 BAOCAO_KHONG_TON_TAI`.
- `409 DA_CHAM_BAOCAO_NAY`.

**Chiến lược blockchain**:
1. Tính `submissionIndex` thật: đếm `BaoCao.find({DeTai, SinhVien}).sort({NgayNop:1})` → `indexOf(baoCaoId)`.
2. Lưu DB với `TrangThaiBlockchain='Pending'` **trước**.
3. Gọi `finalizeGradeOnChain`:
   - Thành công → update `TxHash`, `TrangThaiBlockchain='DaGhi'`.
   - Thất bại → `TrangThaiBlockchain='LoiGhi'`, lưu `LoiBlockchain=err.message`. **Không xoá record DB**.
4. Trả response phản ánh trạng thái thực.

**Permission**: `BaoCao.SinhVien === sinhVienId` AND `BaoCao.DeTai === deTaiId` AND `DeTai.GiangVienHuongDan === giangVienId`.

---

### 6.2. `GET /api/diemso/sinhvien/:svId` — SV xem điểm (giữ nguyên behaviour)

Trả thêm `TrangThaiBlockchain`, `SubmissionIndex`. FE cũ ignore field thừa → an toàn.

---

### 6.3. `POST /api/tiendo` — SV tạo báo cáo tuần (mở rộng)

**Request body**:
```json
{
  "deTaiId": "ObjectId",
  "sinhVienId": "ObjectId",
  "tuanSo": 5,
  "ngayBatDauTuan": "2026-05-04",
  "ngayKetThucTuan": "2026-05-10",
  "mucTieuTuan": "Hoàn thành module đăng nhập MetaMask",
  "noiDungDaLam": "Đã implement kết nối ví MetaMask, xử lý sự kiện accountChanged...",
  "khoKhan": "Gặp lỗi CORS khi test trên Chrome",
  "keHoachTuanSau": "Hoàn thiện đăng ký đề tài, viết test unit",
  "phanTramHoanThanh": 65,
  "minhChung": [
    { "tenFile": "demo.png", "url": "https://...", "ghiChu": "Screenshot giao diện" }
  ],
  "loaiCapNhat": "Lập Trình",
  "noiDung": "Legacy text...",
  "fileDinhKem": "https://... (legacy)",
  "confirmGiam": false
}
```

**Response 201**:
```json
{
  "message": "Tạo báo cáo tiến độ thành công",
  "data": { "...TienDo doc..." },
  "canhBao": ["THIEU_KE_HOACH"]
}
```

**Errors**:
- `400 GIAM_PHAN_TRAM_KHONG_XAC_NHAN` — % giảm mà `confirmGiam` không phải `true`.
- `403` — SV chưa có đăng ký `DaDuyet` cho đề tài.
- `409 TRUNG_TUAN_DA_TON_TAI` — cùng `(DeTai, SinhVien, TuanSo, LanNopLai)`.

**Backward compat**: thiếu `tuanSo` → tạo record kiểu cũ, không kiểm tra unique tuần, không tính cảnh báo `GIAM_PHAN_TRAM`.

---

### 6.4. `PUT /api/tiendo/:id` — SV cập nhật khi `CanBoSung` (mới)

**Request body**: tương tự POST nhưng partial update.

**Permission**: `TienDo.SinhVien === user.id` AND `TrangThaiDanhGia ∈ {ChoDanhGia, CanBoSung}`.

**Logic**: nếu trạng thái trước là `CanBoSung` → `LanNopLai += 1`, reset `TrangThaiDanhGia = 'ChoDanhGia'`.

**Errors**:
- `403 KHONG_DUOC_SUA_DA_DAT`.
- `403 KHONG_DUOC_SUA_KHONG_DAT`.

---

### 6.5. `GET /api/tiendo/sinhvien/:svId` — Lấy tiến độ theo SV (mới, namespace rõ ràng)

Trả `{ data: TienDo[] }` sort `TuanSo asc, createdAt desc`. Hỗ trợ query `?deTaiId=...`.

---

### 6.6. `GET /api/tiendo/:svId` — Legacy (giữ y nguyên)

Behaviour cũ. Internally gọi cùng handler như 6.5 (không filter).

---

### 6.7. `GET /api/tiendo/detai/:deTaiId` — GV xem tất cả tiến độ đề tài (giữ + sort)

Sort `TuanSo asc, SinhVien, LanNopLai desc`. Hỗ trợ `?tuanSo=5` filter. Trả thêm `CanhBaoTienDo` cho mỗi record.

---

### 6.8. `GET /api/tiendo/detail/:id` — Chi tiết 1 record tiến độ (mới)

**Response**:
```json
{
  "data": { "...TienDo (populated)..." },
  "lichSu": [ "...các LanNopLai cũ cùng tuần..." ],
  "tuanTruoc": { "...TienDo|null..." },
  "canhBao": ["TANG_BAT_THUONG"]
}
```

**Permission**: GV sở hữu `DeTai` hoặc SV chính chủ.

---

### 6.9. `PUT /api/tiendo/:id/danhgia` — GV chấm rubrics tuần (mới)

**Request body**:
```json
{
  "giangVienId": "ObjectId",
  "trangThaiDanhGia": "Dat",
  "nhanXetGV": "Tiến độ tốt, minh chứng rõ ràng.",
  "rubricsTuan": [
    {
      "MaTieuChi": "DUNG_HAN",
      "TenTieuChi": "Đúng hạn và đầy đủ",
      "TrongSo": 15,
      "DiemToiDa": 10,
      "DiemGV": 9,
      "NhanXetTieuChi": "Nộp đúng giờ"
    }
  ]
}
```

**Logic**:
1. Validate GV sở hữu `DeTai`.
2. Nếu `rubricsTuan` được gửi → validate tổng `TrongSo = 100`, `DiemGV ∈ [0, DiemToiDa]`. Tính `DiemTienDo` server-side.
3. Nếu **không** gửi `rubricsTuan` → "chấm nhanh", chỉ cập nhật `TrangThaiDanhGia`, `NhanXetGV`.
4. Cập nhật `GiangVienDanhGia`, `NgayDanhGia`, `RubricsTuan`, `DiemTienDo`.

**Errors**:
- `400 RUBRICS_TONG_TRONGSO_KHAC_100`.
- `400 DIEM_VUOT_TOIDA`.
- `403 KHONG_PHAI_GV_HUONG_DAN`.

---

### 6.10. `PUT /api/tiendo/:id/nhanxet` — Legacy GV nhận xét (giữ)

Giữ nguyên: chỉ cập nhật `NhanXetGV`. **Không** tự đặt `TrangThaiDanhGia`. Bổ sung kiểm tra GV sở hữu đề tài nếu có header auth — fail-open nếu thiếu user (giữ behaviour cũ).

---

## 7. Frontend UX Plan

### 7.1. `ProgressLog.js` (sinh viên)

**Form tạo/sửa báo cáo tuần (Modal mở rộng)**:
- Fields mới: `TuanSo` (InputNumber 1–30, required), `NgayBatDauTuan` + `NgayKetThucTuan` (DatePicker hoặc RangePicker), `MucTieuTuan`, `NoiDungDaLam`, `KhoKhan`, `KeHoachTuanSau`.
- `MinhChung[]`: danh sách dynamic (thêm/xoá dòng), mỗi dòng gồm URL + GhiChu.
- Field cũ giữ trong collapse "Cập nhật ngắn (không theo tuần)" — vẫn cho phép tạo entry kiểu cũ.
- Khi `phanTramHoanThanh` < tuần trước → confirm dialog "Bạn nhập thấp hơn Tuần X. Xác nhận?" → gửi `confirmGiam: true`.

**Danh sách báo cáo tuần**:
- Group theo `TuanSo`. Record không có `TuanSo` đặt vào group "Cập nhật khác".
- Mỗi card hiển thị: Tuần, % hoàn thành, `TrangThaiDanhGia` (Tag màu), `DiemTienDo` (nếu có), nút "Sửa & nộp lại" khi `CanBoSung`.
- Nếu `RubricsTuan` có dữ liệu → Collapse để xem chi tiết từng tiêu chí.
- Nếu `CanhBaoTienDo` có → Alert warning bên dưới card.
- Nút "Cập Nhật Tiến Độ" disable khi không `DaDuyet`.

### 7.2. `SubmissionReview.js` (giảng viên)

**Drawer Tiến Độ** (đã có, nâng cấp):
- Chuyển List đơn → render group theo tuần.
- Mỗi tuần là card header `Tuần X — % — Trạng thái`.
- Nút "Đánh Giá Tuần" mở **Modal `WeeklyEvaluationModal`** (viết inline trong cùng file, không tạo file mới).
- Nội dung modal:
  - Panel readonly: `MucTieuTuan`, `NoiDungDaLam`, `KhoKhan`, `KeHoachTuanSau`, `MinhChung`, cảnh báo tiến độ.
  - Form: select `TrangThaiDanhGia`, textarea `NhanXetGV`.
  - Bảng rubrics 5 dòng (default mặc định nếu trống), mỗi dòng có InputNumber `DiemGV`, hiển thị `DiemTienDo` tính realtime.
  - Nút "Lưu nhanh" (không gửi rubrics) và "Lưu kèm Rubrics".

**Drawer chấm điểm cuối kỳ** (đã có, bổ sung):
- Thêm card **"Tóm tắt tiến độ tuần"** phía trên rubrics đề tài: liệt kê số tuần đã chấm, `DiemTienDo` trung bình, cảnh báo nếu có.
- Hiển thị gợi ý: *"Điểm quá trình trung bình: 7.4 — chỉ tham khảo, không tự cộng vào điểm cuối kỳ"*.

**Sửa `handleBlockchainMint`**: thêm `submissionIndex` vào payload (FE best-effort; BE là nguồn sự thật).

### 7.3. `ProgressTracking.js`, `StudentDashboard.js`

**`ProgressTracking.js`**: thêm card "Tiến độ tuần gần nhất" (lấy `TienDo` mới nhất) — hiển thị `TuanSo`, `PhanTramHoanThanh`, `TrangThaiDanhGia`, `DiemTienDo`. Đặt giữa Card AI và Card Điểm.

**`StudentDashboard.js`**: trong card "Tiến Độ & Điểm" thêm dòng "Điểm quá trình TB" = average `DiemTienDo` các record `Dat` (chỉ hiển thị nếu có ≥ 1 record `Dat`). Không đụng vào logic AI/PhoBERT hiện có.

---

## 8. Business Logic Rules

| STT | Quy tắc |
|---|---|
| 1 | **Điểm cuối kỳ** = `DiemSo.Diem`. Đây là điểm duy nhất ghi blockchain. |
| 2 | **AI là gợi ý**. `AI_Score` không tự ghi vào `Diem`; GV phải nhập tay (có thể init từ AI). |
| 3 | **Điểm tuần (`DiemTienDo`) KHÔNG ghi blockchain**, KHÔNG gọi `finalizeGradeOnChain`. |
| 4 | **Điểm tuần KHÔNG tự cộng vào điểm cuối kỳ**. Chỉ hiển thị tham khảo trong Drawer GV. |
| 5 | SV **không được sửa** báo cáo tuần khi `TrangThaiDanhGia ∈ {Dat, KhongDat}`. |
| 6 | SV **được sửa** khi `ChoDanhGia` hoặc `CanBoSung`. PUT → `LanNopLai += 1` nếu từ `CanBoSung`. |
| 7 | **GV chỉ chấm/nhận xét** record thuộc `DeTai` mà `DeTai.GiangVienHuongDan === giangVienId`. Áp dụng cho cả `evaluateProgress` và `commentProgress`. |
| 8 | **Dữ liệu cũ không có `TuanSo`** vẫn render được: backend không bắt buộc, frontend group vào "Cập nhật khác". |
| 9 | **Quyền GV chấm điểm cuối kỳ**: sở hữu `DeTai` + `BaoCao` tồn tại + `BaoCao.SinhVien === sinhVienId` + `BaoCao.DeTai === deTaiId`. |
| 10 | **Validate rubrics đề tài**: nếu `DeTai.SuDungRubrics === true`, `chamDiem` yêu cầu `rubricsResult` không rỗng; tổng có trọng số lệch `Diem` không quá 0.5. |
| 11 | **Blockchain pending**: không xoá record `DiemSo` khi blockchain fail. SV vẫn thấy điểm với `TrangThaiBlockchain='LoiGhi'`. |
| 12 | **Idempotency**: `POST /api/diemso` cùng `BaoCao` lần 2 → 409. |
| 13 | `PUT /api/tiendo/:id/nhanxet` (legacy) **không** thay đổi `TrangThaiDanhGia`. |

---

## 9. Implementation Roadmap For AI Coder

> Thứ tự cứng. Mỗi bước phải hoàn thành trước khi sang bước kế tiếp.

### Bước 1 — Schema backend

| | |
|---|---|
| **Files** | `backend/models/DiemSo.js`, `backend/models/TienDo.js` |
| **Mục tiêu** | Thêm field theo §3 mà KHÔNG xoá field cũ. Thêm index/unique theo §3. |
| **Logic** | Thêm field optional, validators min/max, partial unique index. |
| **Rủi ro** | Phá unique cũ. Phải dùng `partialFilterExpression` đúng. |
| **Test** | `node -e "require('./models/TienDo')"` không crash; smoke insert qua REPL. |

### Bước 2 — Validation helpers

| | |
|---|---|
| **File** | Inline trong controller, HOẶC `backend/utils/validation.js` NẾU folder `utils` đã tồn tại. **Kiểm tra trước khi tạo.** |
| **Mục tiêu** | Hàm `validateDiem`, `validateRubricsResult`, `validateRubricsTuan`, `assertGiangVienOwnsDeTai`, `assertSinhVienBelongsToDangKy`, `detectAnomalies`. |
| **Rủi ro** | Tạo file/folder mới trái yêu cầu. Trước khi tạo hãy `ls` kiểm tra. |

### Bước 3 — Backend controllers

| | |
|---|---|
| **Files** | `backend/controllers/diemSoController.js`, `backend/controllers/tienDoController.js` |
| **Mục tiêu** | `chamDiem`: thêm validate, permission, dynamic `submissionIndex`, blockchain pending strategy, ghi `GiangVienCham` & `GiangVienCam` song song. Thêm `getProgressBySinhVien`, `getProgressDetail`, `updateProgressEntry`, `evaluateProgress` trong tienDoController. `createProgressEntry` mở rộng. `commentProgress` giữ nguyên contract. |
| **Rủi ro** | Đổi behaviour endpoint cũ → fail FE legacy. Phải giữ shape response cũ; field mới thêm vào, không xoá. |

### Bước 4 — Backend routes

| | |
|---|---|
| **File** | `backend/server.js` |
| **Mục tiêu** | Thêm 4 route mới (xem §6). |
| **Thứ tự** | Route `/api/tiendo/sinhvien/:svId` và `/api/tiendo/detail/:id` phải đăng ký **TRƯỚC** route `/api/tiendo/:svId`. |
| **Test** | `curl` từng endpoint với token hợp lệ. |

### Bước 5 — Frontend service

| | |
|---|---|
| **File** | `frontend/src/services/aiService.js` |
| **Mục tiêu** | Thêm `getProgressBySinhVien`, `getProgressDetail`, `updateProgressEntry`, `evaluateProgress`. Giữ nguyên method cũ. |
| **Rủi ro** | Đặt method mới ngay sau khối tiến độ cũ để giữ thứ tự đọc dễ. |

### Bước 6 — Student weekly progress UI

| | |
|---|---|
| **File** | `frontend/src/components/student/ProgressLog.js` |
| **Mục tiêu** | Form tuần đầy đủ; danh sách group theo tuần; vẫn render record không có `TuanSo`. |
| **Test** | Tạo record `tuanSo=1`, sửa lại. Tạo record không có `tuanSo` (legacy) → render bình thường. |

### Bước 7 — Lecturer weekly grading UI

| | |
|---|---|
| **File** | `frontend/src/components/lecturer/SubmissionReview.js` |
| **Mục tiêu** | Modal `WeeklyEvaluationModal` inline; card tóm tắt tiến độ trong drawer chấm cuối kỳ. |
| **Rủi ro** | State explosion. Tách state cho weekly riêng, không trộn với state chấm cuối kỳ. |

### Bước 8 — Final grading payload fix

| | |
|---|---|
| **File** | `frontend/src/components/lecturer/SubmissionReview.js` (dòng 173–184) |
| **Mục tiêu** | Thêm `submissionIndex` vào payload. Nếu không tính được → bỏ field; backend tự tính. |
| **Rủi ro** | Index lệch FE vs DB. **Backend là nguồn sự thật** — luôn override. |

### Bước 9 — Regression checks

**Checklist manual** (10 case bắt buộc):

1. SV cũ chỉ có `NoiDung` → ProgressLog vẫn render bình thường.
2. SV tạo record tuần mới → backend trả `data` + `canhBao=[]`.
3. SV tạo trùng `(DeTai, SinhVien, TuanSo, LanNopLai)` lần 2 → 409.
4. SV giảm % không xác nhận → 400.
5. GV chấm rubrics tuần đủ 5 tiêu chí → `DiemTienDo` đúng công thức.
6. GV cố chấm tiến độ tuần của đề tài không phải mình → 403.
7. GV chấm điểm cuối kỳ thành công → `TrangThaiBlockchain='DaGhi'` + `TxHash` lưu DB.
8. Mô phỏng blockchain fail (sai PRIVATE_KEY) → record `DiemSo` vẫn lưu với `TrangThaiBlockchain='LoiGhi'`.
9. `GET /api/diemso/sinhvien/:svId` vẫn trả đúng cho FE legacy.
10. `PUT /api/tiendo/:id/nhanxet` legacy vẫn cập nhật `NhanXetGV` thành công.

**Tự động** (chỉ nếu script tồn tại):
- `npm run lint` và `npm test` ở backend.
- `npm run build` ở frontend.

---

## 10. Prompt Cho Executor

```
Bạn là AI Coder thực hiện thay đổi code thật.
Repo: Web3GiangVien (Node.js + Express + Mongoose + React + AntD + ethers).

NHIỆM VỤ
Triển khai blueprint cải thiện chấm điểm + tiến độ tuần + chấm báo cáo tuần theo đúng thứ tự 9 bước
trong tài liệu kèm theo. Chỉ sửa code; không tạo file mới trừ khi blueprint nói rõ và folder cha đã tồn tại.

FILES BẮT BUỘC ĐỌC TRƯỚC KHI SỬA
- backend/server.js
- backend/models/DiemSo.js
- backend/models/TienDo.js
- backend/models/BaoCao.js
- backend/models/DeTai.js
- backend/models/DangKyDeTai.js
- backend/controllers/diemSoController.js
- backend/controllers/tienDoController.js
- backend/services/thesisContractService.js
- frontend/src/services/aiService.js
- frontend/src/components/student/ProgressLog.js
- frontend/src/components/student/ProgressTracking.js
- frontend/src/components/student/StudentDashboard.js
- frontend/src/components/lecturer/SubmissionReview.js

THỨ TỰ SỬA (KHÔNG BỎ QUA)
1) Mở rộng schema DiemSo, TienDo (giữ field cũ).
2) Thêm helper validation/permission/anomaly inline trong controller.
3) Sửa diemSoController.chamDiem (validate, permission, dynamic submissionIndex, blockchain pending),
   thêm getProgressBySinhVien, getProgressDetail, updateProgressEntry, evaluateProgress vào tienDoController.
   createProgressEntry mở rộng. commentProgress giữ nguyên contract.
4) Đăng ký route mới trong server.js. Route cụ thể (/sinhvien, /detail, /:id/danhgia)
   PHẢI đăng ký TRƯỚC route legacy /:svId.
5) Mở rộng aiService.js (thêm method mới, không xoá method cũ).
6) Nâng ProgressLog.js: form tuần đầy đủ field; danh sách group theo tuần;
   vẫn render record không có TuanSo.
7) Nâng SubmissionReview.js: modal đánh giá tuần với rubrics + tính DiemTienDo realtime;
   card tóm tắt tiến độ trong drawer cuối kỳ. Viết modal inline, không tạo file mới.
8) Sửa payload chamDiem để thêm submissionIndex (FE best-effort, BE là nguồn sự thật).
9) Chạy toàn bộ 10 case regression theo checklist trong blueprint.

RULES QUAN TRỌNG
- KHÔNG xoá comment có sẵn (bao gồm comment tiếng Việt không dấu, comment nghiệp vụ).
- KHÔNG mass-rewrite file để fix encoding.
- KHÔNG đổi tên field cũ. GiangVienCam giữ nguyên; thêm GiangVienCham song song; ghi cùng giá trị.
- KHÔNG xoá endpoint cũ. Tất cả endpoint legacy phải vẫn hoạt động giống trước.
- KHÔNG thêm dependency npm mới (không cài lib mới ở backend hay frontend).
- KHÔNG ghi blockchain cho điểm tuần.
- KHÔNG tự cộng điểm tuần vào điểm cuối kỳ.
- Mọi rule validation/permission trong blueprint mục 6 và 8 PHẢI được hiện thực hoá.
- Nếu blockchain ném exception trong chamDiem: VẪN lưu DiemSo với TrangThaiBlockchain='LoiGhi'
  và LoiBlockchain=err.message; KHÔNG xoá record; trả 201 kèm blockchain.status='LoiGhi'.

CÔNG THỨC ĐIỂM TUẦN
DiemTienDo = Math.round( sum( (DiemGV / DiemToiDa) * TrongSo ) / 100 * 10 * 100 ) / 100

UNIQUE INDEX TIẾN ĐỘ
Partial unique trên { DeTai, SinhVien, TuanSo, LanNopLai } khi TuanSo là number.
Dùng partialFilterExpression: { TuanSo: { $type: 'number' } }

LỆNH KIỂM TRA SAU KHI XONG (PowerShell, trong thư mục tương ứng)
- backend: node -e "require('./models/DiemSo'); require('./models/TienDo'); console.log('schema ok')"
- backend: npm run lint        (chỉ nếu script tồn tại trong package.json)
- backend: npm test            (chỉ nếu script tồn tại)
- frontend: npm run build
- Manual: chạy 10 case regression trong §9 bước 9 của blueprint.

ĐẦU RA
- Sửa file đúng theo blueprint, không tạo file thừa.
- Báo cáo cuối: liệt kê tóm tắt thay đổi mỗi file + kết quả lệnh kiểm tra.
```

---

## Files Used For Confirmation

| File | Vai trò trong phân tích |
|---|---|
| `backend/server.js` | Xác nhận danh sách endpoint hiện có để thiết kế route mới và tránh xung đột match (`/api/tiendo/:svId`). |
| `backend/models/DiemSo.js` | Lấy nguyên trạng schema chấm điểm cuối kỳ; xác định typo `GiangVienCam`, thiếu unique và validate. |
| `backend/models/TienDo.js` | Xác nhận schema tiến độ hiện đang quá tối giản, không có tuần. |
| `backend/models/BaoCao.js` | Hiểu mỗi sinh viên có thể có nhiều `BaoCao` trong cùng đề tài → căn cứ thiết kế dynamic `submissionIndex`. |
| `backend/models/DeTai.js` | Lấy schema `Rubrics`, `SuDungRubrics`, `Deadline` để tái dùng cho cuối kỳ và phân biệt với rubrics tuần. |
| `backend/models/DangKyDeTai.js` | Xác nhận model nhóm `ThanhVien[]` — căn cứ rule "SV thuộc đăng ký `DaDuyet`". |
| `backend/controllers/diemSoController.js` | Phát hiện thiếu validate, `submissionIndex=0`, không có chiến lược fallback blockchain. |
| `backend/controllers/tienDoController.js` | Phát hiện thiếu evaluation, không kiểm tra quyền GV, không hỗ trợ tuần. |
| `backend/services/thesisContractService.js` | Xác nhận `finalizeGradeOnChain` ném exception khi lỗi → cần wrap try/catch và đánh `TrangThaiBlockchain`. |
| `frontend/src/services/aiService.js` | Liệt kê API client hiện có; xác định method nào cần thêm và giữ nguyên. |
| `frontend/src/components/student/ProgressLog.js` | Xác nhận form SV chưa hỗ trợ tuần; thiết kế UX mở rộng phải tương thích record cũ. |
| `frontend/src/components/student/ProgressTracking.js` | Xác nhận stepper hiện tại chỉ phản ánh điểm cuối kỳ — căn cứ thêm card tuần gần nhất. |
| `frontend/src/components/student/StudentDashboard.js` | Xác nhận card "Tiến Độ & Điểm" — căn cứ thêm trường "Điểm quá trình TB". |
| `frontend/src/components/lecturer/SubmissionReview.js` | Lấy chi tiết flow GV chấm cuối kỳ và drawer tiến độ; căn cứ thiết kế modal đánh giá tuần và sửa payload `chamDiem`. |
