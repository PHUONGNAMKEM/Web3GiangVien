# Refactor Backend & Frontend — Kế Hoạch Chi Tiết

> [!IMPORTANT]
> **Nguyên tắc:** GIỮ NGUYÊN logic lõi. Chỉ thêm field mới (additive), cập nhật UI và refactor code. Không xóa logic cũ. DB đã có data → cần migration script.

---

## Phase 1: Schema Migration (Thêm field mới + Migration script)

### 1.1 [DeTai.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/models/DeTai.js)

**Hiện tại (dòng 27-28):**
```javascript
GiangVienHuongDan: { type: ObjectId, ref: 'GiangVien', required: true },
MonHoc: { type: ObjectId, ref: 'MonHoc' },
// KHÔNG có trường LopHoc
```

**Thay đổi → Thêm 1 field sau dòng 28:**
```javascript
MonHoc: { type: ObjectId, ref: 'MonHoc' },
LopHoc: [{ type: ObjectId, ref: 'LopHoc' }],  // MỚI: đề tài thuộc lớp nào (N:N)
```

**Lý do:** Đề tài cần gắn trực tiếp vào lớp. Hiện tại `lopHocController.getDetail` phải query gián tiếp qua `MonHoc` (dòng 43: `DeTai.find({ MonHoc: lopHoc.MonHoc._id })`) — không chính xác vì 1 MonHoc có nhiều lớp.

---

### 1.2 [Nhom.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/models/Nhom.js)

**Hiện tại (dòng 3-4):**
```javascript
const nhomSchema = new mongoose.Schema({
  TenNhom: { type: String, default: '' },
  TruongNhom: { type: ObjectId, ref: 'SinhVien', required: true },
  // KHÔNG có trường LopHoc
```

**Thay đổi → Thêm 1 field sau `TenNhom` (dòng 4):**
```javascript
  TenNhom: { type: String, default: '' },
  LopHoc: { type: ObjectId, ref: 'LopHoc' },  // MỚI: nhóm thuộc lớp nào
  TruongNhom: { type: ObjectId, ref: 'SinhVien', required: true },
```

**Lý do:** Ràng buộc "chỉ SV cùng lớp mới vào nhóm" cần nhóm biết thuộc lớp nào.

> [!NOTE]
> `LopHoc` ở đây **KHÔNG required** vì DB đã có nhóm cũ chưa có field này. Migration script sẽ cố gắng map nhóm cũ vào LopHoc dựa trên data hiện có.

---

### 1.3 [BaoCao.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/models/BaoCao.js)

**Hiện tại (dòng 3-5):**
```javascript
const baoCaoSchema = new mongoose.Schema({
  DeTai: { type: ObjectId, ref: 'DeTai', required: true },
  SinhVien: { type: ObjectId, ref: 'SinhVien', required: true },
  // KHÔNG có trường Nhom
```

**Thay đổi → Thêm 1 field sau `SinhVien` (dòng 5):**
```javascript
  SinhVien: { type: ObjectId, ref: 'SinhVien', required: true },  // Giữ nguyên = NguoiNop
  Nhom: { type: ObjectId, ref: 'Nhom' },  // MỚI: báo cáo thuộc nhóm nào
```

**Lý do:** Báo cáo là của nhóm, `SinhVien` giữ nguyên ý nghĩa "người thực hiện upload".

---

### 1.4 [TienDo.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/models/TienDo.js)

**Hiện tại (dòng 3-5):**
```javascript
const tienDoSchema = new mongoose.Schema({
    DeTai: { type: ObjectId, ref: 'DeTai', required: true },
    SinhVien: { type: ObjectId, ref: 'SinhVien', required: true },
    // KHÔNG có trường Nhom
```

**Thay đổi → Thêm 1 field sau `SinhVien` (dòng 5):**
```javascript
    SinhVien: { type: ObjectId, ref: 'SinhVien', required: true },  // Giữ nguyên
    Nhom: { type: ObjectId, ref: 'Nhom' },  // MỚI: tiến độ theo nhóm
```

**Thêm index mới (dòng 58):**
```javascript
tienDoSchema.index({ DeTai: 1, Nhom: 1, TuanSo: 1 }, { sparse: true });  // MỚI
```

---

### 1.5 [DiemSo.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/models/DiemSo.js)

**Hiện tại (dòng 3-8):**
```javascript
const diemSoSchema = new mongoose.Schema({
  BaoCao: { type: ObjectId, ref: 'BaoCao', required: true },
  GiangVienCam: { type: ObjectId, ref: 'GiangVien', required: true },
  GiangVienCham: { type: ObjectId, ref: 'GiangVien' },
  SinhVien: { type: ObjectId, ref: 'SinhVien', required: true },  // Điểm gắn với 1 SV cụ thể
  DeTai: { type: ObjectId, ref: 'DeTai', required: true },
  // KHÔNG có trường Nhom
  // Unique index: { BaoCao: 1 } — 1 BaoCao chỉ có 1 DiemSo
```

**Logic chấm điểm hiện tại** (`diemSoController.chamDiem` dòng 193-296):
1. GV chấm 1 BaoCao → tạo 1 DiemSo cho SV đó
2. Nếu đề tài nhóm (`SoLuongSinhVien > 1`) → **loop qua từng thành viên** → tìm BaoCao của từng SV → tạo DiemSo **riêng** cho mỗi SV với **CÙNG điểm**
3. Mỗi SV có 1 DiemSo riêng, không có DiemSo tổng cho nhóm
4. **Vấn đề:** GV không thể điều chỉnh điểm riêng cho 1 SV trong nhóm (vì auto copy hết)

**Thay đổi → Thêm field + refactor logic:**
```javascript
const diemSoSchema = new mongoose.Schema({
  BaoCao: { type: ObjectId, ref: 'BaoCao', required: true },
  GiangVienCam: { type: ObjectId, ref: 'GiangVien', required: true },
  GiangVienCham: { type: ObjectId, ref: 'GiangVien' },
  SinhVien: { type: ObjectId, ref: 'SinhVien', required: true },
  DeTai: { type: ObjectId, ref: 'DeTai', required: true },
  Nhom: { type: ObjectId, ref: 'Nhom' },  // MỚI: điểm thuộc nhóm nào
  DiemGoc: { type: Number, min: 0, max: 10 },  // MỚI: điểm gốc nhóm (trước điều chỉnh)
  LaDieuChinh: { type: Boolean, default: false },  // MỚI: true = GV đã điều chỉnh riêng cho SV này
```

**Logic chấm điểm MỚI:**
1. GV chấm 1 BaoCao → tạo DiemSo cho **tất cả thành viên nhóm** (CÙNG điểm) — giữ nguyên như cũ
2. **MỚI:** GV có thể **điều chỉnh điểm riêng** cho 1 SV → update DiemSo của SV đó + set `LaDieuChinh = true`, `DiemGoc = điểm gốc nhóm`
3. Khi xem điểm nhóm: hiển thị điểm gốc + các SV bị điều chỉnh (nếu có)

> [!NOTE]
> Giữ nguyên unique index `{ BaoCao: 1 }`. Mỗi SV vẫn có DiemSo riêng (1 BaoCao/SV = 1 DiemSo/SV). Logic loop auto-copy giữ nguyên. Chỉ thêm khả năng GV update lại điểm riêng cho từng SV sau khi đã chấm nhóm.

---

### 1.6 [NEW] Migration Script

Tạo file `backend/scripts/migrate-add-lophoc-nhom.js` để cập nhật data hiện có:

```javascript
// Logic migration:
// 1. DeTai: Tìm tất cả DeTai có MonHoc → tìm LopHoc nào có cùng MonHoc → gắn LopHoc vào DeTai
// 2. Nhom: Tìm DangKyDeTai có Nhom → lấy DeTai → lấy LopHoc → gắn LopHoc vào Nhom
// 3. BaoCao: Tìm DangKyDeTai có Nhom và SinhVien khớp → gắn Nhom vào BaoCao
// 4. TienDo: Tương tự BaoCao
// Script chạy 1 lần, có dry-run mode, có log chi tiết
```

---

## Phase 2: Backend Controller Cập Nhật

> **Nguyên tắc Phase 2:** Giữ nguyên logic lõi. Chỉ thêm populate mới + validate mới khi có field LopHoc/Nhom.

---

### 2.1 [deTaiController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/deTaiController.js)

| Hàm | Hiện tại | Thay đổi |
|-----|----------|----------|
| `getAll` (dòng 7) | `.populate('GiangVienHuongDan')` | Thêm `.populate('LopHoc', 'MaLopHoc TenLopHoc')` |
| `getById` (dòng 37) | `.populate('GiangVienHuongDan')` | Thêm `.populate('LopHoc', 'MaLopHoc TenLopHoc')` |
| `create` (dòng 47) | Nhận body, lưu trực tiếp | Nhận thêm `body.LopHoc` (mảng ObjectId), lưu vào DeTai |
| `update` (dòng 94) | `findByIdAndUpdate(id, req.body)` | Giữ nguyên — body đã hỗ trợ `LopHoc` |
| `registerTopic` (dòng 117) | Kiểm tra nhóm đã đăng ký đề tài khác chưa (dòng 154-160) | **Thêm:** Kiểm tra nhóm thuộc cùng LopHoc với đề tài. Kiểm tra SV chỉ đăng ký 1 đề tài trong mỗi lớp |

**Chi tiết `registerTopic` — thêm validate (sau dòng 152, trước dòng 154):**
```javascript
// MỚI: Kiểm tra nhóm thuộc cùng LopHoc với đề tài
if (nhom.LopHoc && deTai.LopHoc && deTai.LopHoc.length > 0) {
  const nhomLopStr = nhom.LopHoc.toString();
  const deTaiLopStrs = deTai.LopHoc.map(l => l.toString());
  if (!deTaiLopStrs.includes(nhomLopStr)) {
    return res.status(400).json({ error: 'Nhóm không thuộc lớp có đề tài này.' });
  }
}

// MỚI: SV chỉ đăng ký 1 đề tài trong mỗi lớp (theo LopHoc)
if (nhom.LopHoc) {
  const lopHocDeTais = await DeTai.find({ LopHoc: nhom.LopHoc }).select('_id');
  const lopDeTaiIds = lopHocDeTais.map(d => d._id);
  const existingInLop = await DangKyDeTai.findOne({
    Nhom: nhomId,
    DeTai: { $in: lopDeTaiIds },
    TrangThai: { $nin: ['TuChoi', 'Thua'] }
  });
  if (existingInLop) {
    return res.status(400).json({ error: 'Nhóm đã đăng ký 1 đề tài khác trong cùng lớp này.' });
  }
}
```

---

### 2.2 [nhomController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/nhomController.js)

| Hàm | Hiện tại | Thay đổi |
|-----|----------|----------|
| `createNhom` (dòng 7) | Nhận `{ tenNhom, soLuong }` | Nhận thêm `lopHocId`. Validate SV thuộc lớp đó. Lưu `LopHoc` vào Nhom |
| `inviteMember` (dòng 84) | Kiểm tra SV đã ở nhóm khác chưa | **Thêm:** Nếu nhóm có LopHoc → kiểm tra SV được mời phải thuộc cùng LopHoc |
| `getNhomBySinhVien` (dòng 53) | `.populate('TruongNhom').populate('ThanhVien.SinhVien')` | Thêm `.populate('LopHoc', 'MaLopHoc TenLopHoc')` |
| `getNhomById` (dòng 70) | `.populate('TruongNhom').populate('ThanhVien.SinhVien')` | Thêm `.populate('LopHoc', 'MaLopHoc TenLopHoc')` |

**Chi tiết `createNhom` — hiện tại (dòng 9-10):**
```javascript
// HIỆN TẠI:
const { tenNhom, soLuong } = req.body;
const sinhVienId = req.user?.id || req.body.sinhVienId;
```

**Thay đổi thành:**
```javascript
const { tenNhom, soLuong, lopHocId } = req.body;
const sinhVienId = req.user?.id || req.body.sinhVienId;

// MỚI: Validate SV thuộc lớp (nếu có lopHocId)
if (lopHocId) {
  const LopHoc = require('../models/LopHoc');
  const lop = await LopHoc.findById(lopHocId);
  if (!lop) return res.status(404).json({ error: 'Không tìm thấy lớp học.' });
  if (!lop.SinhVien.some(sv => sv.toString() === sinhVienId)) {
    return res.status(400).json({ error: 'Bạn không thuộc lớp học này.' });
  }
}
```

**Và thêm `LopHoc: lopHocId` vào `new Nhom({...})` (dòng 28-37):**
```javascript
const nhom = new Nhom({
  TenNhom: tenNhom || '',
  LopHoc: lopHocId || undefined,  // MỚI
  TruongNhom: sinhVienId,
  ...
});
```

---

### 2.3 [lopHocController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/lopHocController.js)

| Hàm | Hiện tại | Thay đổi |
|-----|----------|----------|
| `getDetail` (dòng 30) | Query đề tài gián tiếp: `DeTai.find({ MonHoc: lopHoc.MonHoc._id })` (dòng 43) | Thay bằng: `DeTai.find({ LopHoc: id })` — query trực tiếp theo LopHoc. **Fallback**: nếu không có kết quả, vẫn query theo MonHoc (backward compat) |
| `addSinhVien` (dòng 138) | Chỉ nhận `sinhVienId` (ObjectId) | **Thêm fallback:** Nếu gửi `maSV` thay vì `sinhVienId` → tìm SV qua MaSV |
| **MỚI** | Không có | `importSinhVien` — nhận mảng MaSV, thêm batch vào lớp |

**Chi tiết `getDetail` dòng 43 — Hiện tại:**
```javascript
// HIỆN TẠI: Query gián tiếp qua MonHoc (không chính xác)
const deTais = await DeTai.find({ MonHoc: lopHoc.MonHoc._id }).select('_id MaDeTai TenDeTai TrangThai');
```

**Thay đổi thành:**
```javascript
// MỚI: Query trực tiếp theo LopHoc, fallback MonHoc cho data cũ
let deTais = await DeTai.find({ LopHoc: id }).select('_id MaDeTai TenDeTai TrangThai SoLuongSinhVien');
if (deTais.length === 0) {
  // Fallback: data cũ chưa migration, query qua MonHoc
  deTais = await DeTai.find({ MonHoc: lopHoc.MonHoc._id }).select('_id MaDeTai TenDeTai TrangThai SoLuongSinhVien');
}
```

---

### 2.4 [baoCaoController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/baoCaoController.js)

| Hàm | Hiện tại | Thay đổi |
|-----|----------|----------|
| `uploadBaoCao` | Lưu `DeTai` + `SinhVien` | Thêm: nếu body có `nhomId` → lưu `Nhom` vào BaoCao |
| `getBaoCaoByDeTai` | `.populate('SinhVien')` | Thêm `.populate('Nhom')` |
| `getMyBaoCao` | Query `{ SinhVien: svId }` | Thêm: query cả theo Nhom nếu SV thuộc nhóm |

---

### 2.5 [tienDoController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/tienDoController.js)

| Hàm | Hiện tại | Thay đổi |
|-----|----------|----------|
| `createProgressEntry` | Lưu `DeTai` + `SinhVien` | Thêm: nếu body có `nhomId` → lưu `Nhom` vào TienDo |
| `getProgressBySinhVien` | Query `{ SinhVien: svId }` | Thêm populate `Nhom` |
| `getProgressByTopic` | `.populate('SinhVien')` | Thêm `.populate('Nhom')` |

---

### 2.6 [diemSoController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/diemSoController.js)

| Hàm | Hiện tại | Thay đổi |
|-----|----------|----------|
| `createGradeForReport` (dòng 11) | Tạo DiemSo cho 1 SV, không lưu Nhom | Thêm: lưu `Nhom` vào DiemSo nếu có |
| `chamDiem` (dòng 193) | Chấm 1 BaoCao → auto copy CÙNG điểm cho cả nhóm → KHÔNG cho điều chỉnh | **Giữ nguyên** logic auto-copy. Chỉ thêm field `Nhom` + `DiemGoc` khi tạo |
| **MỚI** `adjustGrade` | Không có | GV điều chỉnh điểm riêng cho 1 SV trong nhóm |
| `getDiemBySinhVien` (dòng 298) | Query `{ SinhVien: svId }` | Thêm populate `Nhom` |
| `getComparison` (dòng 385) | Chỉ populate SinhVien, DeTai | Thêm populate `Nhom` |

**Chi tiết `createGradeForReport` — Hiện tại (dòng 22-36):**
```javascript
// HIỆN TẠI:
const diemSo = new DiemSo({
    BaoCao: baoCao._id,
    GiangVienCam: giangVienId,
    GiangVienCham: giangVienId,
    SinhVien: sinhVienId,
    DeTai: deTaiId,
    Diem: diem,
    // ... không có Nhom, DiemGoc, LaDieuChinh
});
```

**Thay đổi → Thêm 3 field:**
```javascript
const diemSo = new DiemSo({
    BaoCao: baoCao._id,
    GiangVienCam: giangVienId,
    GiangVienCham: giangVienId,
    SinhVien: sinhVienId,
    DeTai: deTaiId,
    Nhom: nhomId || undefined,       // MỚI
    Diem: diem,
    DiemGoc: diem,                    // MỚI: lưu điểm gốc để so sánh khi điều chỉnh
    LaDieuChinh: false,               // MỚI: chưa điều chỉnh
    // ... giữ nguyên phần còn lại
});
```

**Chi tiết hàm MỚI `adjustGrade`:**
```javascript
// MỚI: GV điều chỉnh điểm riêng cho 1 SV trong nhóm
exports.adjustGrade = async (req, res) => {
    const { id } = req.params;  // DiemSo ID
    const { diem, nhanXet } = req.body;
    const giangVienId = req.user?.id;

    const grade = await DiemSo.findById(id);
    if (!grade) return res.status(404).json({ error: 'Không tìm thấy điểm số' });

    // Kiểm tra GV sở hữu đề tài
    const ownerCheck = await assertGiangVienOwnsDeTai(grade.DeTai, giangVienId);
    if (!ownerCheck.ok) return res.status(403).json({ error: ownerCheck.error });

    // Lưu điểm gốc nếu lần đầu điều chỉnh
    if (!grade.LaDieuChinh) {
        grade.DiemGoc = grade.Diem;  // Giữ lại điểm nhóm ban đầu
    }
    grade.Diem = diem;
    grade.NhanXet = nhanXet || grade.NhanXet;
    grade.LaDieuChinh = true;
    await grade.save();

    res.json({ message: 'Đã điều chỉnh điểm cho SV', data: grade });
};
```

---

## Phase 3: API Routes Bổ Sung

### [server.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/server.js)

**Hiện tại (dòng 320-327):**
```javascript
// 14. Quản Lý Lớp Học
app.get('/api/lophoc/giangvien/:gvId', lopHocController.getByGiangVien);
app.get('/api/lophoc/:id/detail', lopHocController.getDetail);
app.post('/api/lophoc', lopHocController.create);
app.put('/api/lophoc/:id', lopHocController.update);
app.post('/api/lophoc/:id/sinhvien', lopHocController.addSinhVien);
app.delete('/api/lophoc/:id/sinhvien/:svId', lopHocController.removeSinhVien);
app.delete('/api/lophoc/:id', lopHocController.delete);
```

**Thay đổi → Thêm 2 route mới + bảo vệ quyền:**
```javascript
// 14. Quản Lý Lớp Học
app.get('/api/lophoc/giangvien/:gvId', ...requireLecturer, lopHocController.getByGiangVien);  // THÊM requireLecturer
app.get('/api/lophoc/sinhvien/:svId', ...requireAuth, lopHocController.getBySinhVien);  // MỚI: SV xem lớp mình
app.get('/api/lophoc/:id/detail', ...requireAuth, lopHocController.getDetail);  // THÊM requireAuth
app.post('/api/lophoc', ...requireLecturer, lopHocController.create);  // THÊM requireLecturer
app.put('/api/lophoc/:id', ...requireLecturer, lopHocController.update);
app.post('/api/lophoc/:id/sinhvien', ...requireLecturer, lopHocController.addSinhVien);
app.post('/api/lophoc/:id/import-sinhvien', ...requireLecturer, lopHocController.importSinhVien);  // MỚI: import batch
app.delete('/api/lophoc/:id/sinhvien/:svId', ...requireLecturer, lopHocController.removeSinhVien);
app.delete('/api/lophoc/:id', ...requireLecturer, lopHocController.delete);
```

**Hiện tại — DiemSo routes (dòng 219-223):**
```javascript
// 7. Điểm Số
app.post('/api/diemso', ...requireLecturer, aiLimiter, diemSoController.chamDiem);
app.put('/api/diemso/:id/retry-blockchain', ...requireLecturer, aiLimiter, diemSoController.retryBlockchain);
app.get('/api/diemso/sinhvien/:svId', ...requireAuth, diemSoController.getDiemBySinhVien);
app.get('/api/diemso/comparison/:gvId', ...requireLecturer, diemSoController.getComparison);
```

**Thay đổi → Thêm 1 route điều chỉnh điểm cá nhân:**
```javascript
app.put('/api/diemso/:id/adjust', ...requireLecturer, diemSoController.adjustGrade);  // MỚI: GV điều chỉnh điểm riêng cho SV
```

---

## Phase 4: Frontend UI Refactor

### 4.1 [TopicManagement.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/lecturer/TopicManagement.js)

**Hiện tại — Form tạo đề tài (dòng 478-531):**
- Không có dropdown chọn LopHoc
- Chỉ có: Tên, Mô tả, Yêu cầu, Số SV, Deadline, Hạn ĐK, Hạn nộp

**Thay đổi → Thêm multi-select LopHoc vào form (sau field Yêu cầu, trước Số SV):**
```jsx
<Form.Item name="lopHoc" label="Lớp học áp dụng"
  tooltip="Chọn các lớp học mà đề tài này thuộc về. Chỉ SV trong lớp mới thấy đề tài.">
  <Select mode="multiple" placeholder="Chọn lớp học..."
    options={lopHocList.map(lh => ({
      value: lh._id, label: `${lh.MaLopHoc} - ${lh.TenLopHoc}`
    }))} />
</Form.Item>
```

**Hiện tại — Cột bảng (dòng 261-371):**
- Không hiển thị lớp học

**Thay đổi → Thêm 1 cột "Lớp học" sau cột Tên Đề Tài:**
```jsx
{
  title: 'Lớp',
  key: 'lopHoc',
  width: 120,
  render: (_, record) => (
    <Space size={2} wrap>
      {(record.LopHoc || []).map(lh => (
        <Tag key={lh._id} color="cyan">{lh.MaLopHoc || lh.TenLopHoc}</Tag>
      ))}
    </Space>
  ),
}
```

**Cần thêm state + fetch:**
```javascript
// MỚI: Fetch danh sách lớp học của GV để hiển thị trong form
const [lopHocList, setLopHocList] = useState([]);
// Trong fetchData(): 
const lhRes = await managementService.getLopHocByGV(user.id);
setLopHocList(lhRes.data || []);
```

---

### 4.2 [ClassManagement.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/lecturer/ClassManagement.js)

**Hiện tại:**
- Hiển thị danh sách lớp, chi tiết lớp
- Thêm SV bằng ObjectId selector

**Thay đổi:**
- Chi tiết lớp: Thêm tab/section hiển thị đề tài gắn trực tiếp vào lớp (data từ API mới)
- Thêm SV: Hỗ trợ nhập MaSV trực tiếp (ngoài chọn từ dropdown)
- Thêm nút "Import danh sách SV" (nhập text area hoặc CSV)

---

### 4.3 [GroupManagement.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/student/GroupManagement.js)

**Hiện tại — Tạo nhóm (gọi nhomService.createNhom):**
```javascript
// Chỉ gửi: { tenNhom, soLuong, sinhVienId }
```

**Thay đổi → Thêm dropdown chọn LopHoc:**
```javascript
// Gửi thêm: { tenNhom, soLuong, sinhVienId, lopHocId }
// + Dropdown chỉ hiển thị lớp mà SV đang thuộc
// + Cần gọi API mới: GET /api/lophoc/sinhvien/:svId
```

---

### 4.4 [TopicRegistration.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/student/TopicRegistration.js)

**Hiện tại:**
- Hiển thị toàn bộ đề tài

**Thay đổi:**
- Thêm bộ lọc theo lớp học (dropdown)
- Hiển thị tag lớp trên mỗi đề tài
- Ưu tiên hiển thị đề tài thuộc lớp của SV trước

---

### 4.5 [SubmissionReview.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/lecturer/SubmissionReview.js)

**Hiện tại — Bảng submissions (dòng 503-605):**
- Mỗi hàng = 1 SV cá nhân + 1 BaoCao
- Cột: Sinh Viên, Đề Tài, Trạng Thái Nộp, Thời Gian Nộp, Điểm Số, Thao Tác
- Khi GV chấm → auto copy điểm cho cả nhóm → không UI cho điều chỉnh

**Hiện tại — Drawer chấm điểm (dòng 623-800+):**
- Hiển thị: Tên SV, Đề tài, AI phân tích, Rubrics, Nút "Chấm Điểm"
- Không hiển thị danh sách nhóm
- Không có UI điều chỉnh riêng cho từng SV

**Thay đổi:**

1. **Bảng submissions — Thêm hiển thị nhóm:**
   - Hiện tại cột "Sinh Viên" chỉ show 1 SV
   - Thêm: Nếu đề tài nhóm → hiển thị tên nhóm + số thành viên bên cạnh tên SV

2. **Drawer chấm điểm — Thêm section "Điểm nhóm":**
   - Sau khi chấm điểm → hiển thị bảng danh sách thành viên nhóm + điểm
   - GV có thể click vào từng SV → điều chỉnh điểm riêng
   - UI:
```jsx
{/* MỚI: Section danh sách thành viên nhóm */}
{existingGrade && isGroupTopic && (
  <div style={{ padding: 16, background: '#f6ffed', borderRadius: 8, marginBottom: 16 }}>
    <Text strong>👥 Điểm các thành viên trong nhóm</Text>
    <Text type="secondary"> (Điểm gốc: {existingGrade.Diem})</Text>
    <List
      dataSource={groupMembers}
      renderItem={member => (
        <List.Item actions={[
          <Button size="small" onClick={() => openAdjustModal(member)}>
            Điều chỉnh
          </Button>
        ]}>
          <Space>
            <Text>{member.HoTen} ({member.MaSV})</Text>
            <Tag color={member.LaDieuChinh ? 'warning' : 'success'}>
              {member.Diem}/10 {member.LaDieuChinh ? '(đã chỉnh)' : ''}
            </Tag>
          </Space>
        </List.Item>
      )}
    />
  </div>
)}
```

3. **Modal điều chỉnh điểm cá nhân (MỚI):**
```jsx
<Modal title={`Điều chỉnh điểm: ${adjustTarget?.HoTen}`}>
  <Space direction="vertical">
    <Text>Điểm gốc nhóm: {adjustTarget?.DiemGoc}/10</Text>
    <InputNumber min={0} max={10} step={0.5}
      value={adjustScore} onChange={setAdjustScore} />
    <Input.TextArea placeholder="Lý do điều chỉnh..." />
    <Button type="primary" onClick={handleAdjustGrade}>
      Xác nhận điều chỉnh
    </Button>
  </Space>
</Modal>
```

4. **Cần thêm API call trong aiService.js:**
```javascript
// MỚI: GV điều chỉnh điểm riêng cho SV trong nhóm
adjustGrade: async (gradeId, diem, nhanXet) => {
    const response = await axios.put(`${API_URL}/diemso/${gradeId}/adjust`, {
        diem, nhanXet
    }, { headers: getAuthHeaders() });
    return response.data;
},
```

---

### 4.6 [nhomService.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/services/nhomService.js)

**Hiện tại:**
```javascript
async createNhom(data) {
  const res = await apiService.post('/nhom', data);
  return res.data;
}
```

**Thay đổi:** Giữ nguyên API call. Chỉ cần component gửi thêm `lopHocId` trong data body.

---

### 4.6 [managementService.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/services/managementService.js)

**Hiện tại (69 dòng):** Có CRUD MonHoc + LopHoc + getAllSinhVien

**Thay đổi → Thêm 3 hàm mới:**
```javascript
// MỚI: SV xem lớp mình thuộc
async getLopHocBySinhVien(svId) {
  const res = await apiService.get(`/lophoc/sinhvien/${svId}`);
  return res.data;
},

// MỚI: Import batch SV vào lớp
async importSinhVienToLop(lopId, danhSachMaSV) {
  const res = await apiService.post(`/lophoc/${lopId}/import-sinhvien`, { danhSachMaSV });
  return res.data;
},
```

---

## Phase 5: Legacy Cleanup

### 5.1 [apiService.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/services/apiService.js)

**Hiện tại:** 681 dòng, trong đó **~500 dòng là code HR legacy** không sử dụng:
- `getEmployeeProfile`, `updateEmployeeProfile` (dòng 138-152) — thuật ngữ HR cũ
- `getAttendanceByEmployee`, `checkIn`, `checkOut`... (dòng 155-193) — chức năng chấm công
- `getDepartments`, `createDepartment`... (dòng 272-409) — quản lý phòng ban
- `getTasksByEmployee`, `createTask`, `approveTask`... (dòng 422-568) — quản lý công việc
- `calculateDailyKpi`, `calculateKpiForRange`... (dòng 641-677) — tính KPI
- `getSupportMessages`, `sendSupportMessage` (dòng 234-265) — chat hỗ trợ HR
- `giveConsent`, `revokeConsent` (dòng 331-360) — quản lý đồng ý
- Tổng: **employee**, **department**, **attendance**, **payroll**, **task**, **KPI**, **consent**, **support** — toàn bộ KHÔNG thuộc domain hiện tại

**Thay đổi → Xóa toàn bộ code HR legacy. GIỮ LẠI:**
- Constructor + interceptors (dòng 1-64) ✅
- Generic HTTP methods `get/post/put/delete` (dòng 66-85) ✅
- Socket.IO management (dòng 87-135) ✅
- QR authentication (dòng 196-220) ✅

**Kết quả:** ~681 dòng → ~150 dòng. Sạch sẽ, không còn thuật ngữ HR vi phạm quy ước.

---

## Tổng kết thay đổi

| Phase | Hành động | File | Mức độ |
|-------|-----------|------|--------|
| 1 | Thêm `LopHoc: [ref]` | DeTai.js | +1 dòng |
| 1 | Thêm `LopHoc: ref` | Nhom.js | +1 dòng |
| 1 | Thêm `Nhom: ref` | BaoCao.js | +1 dòng |
| 1 | Thêm `Nhom: ref` + index | TienDo.js | +2 dòng |
| 1 | Thêm `Nhom, DiemGoc, LaDieuChinh` | DiemSo.js | +3 dòng |
| 1 | Migration script | scripts/migrate-add-lophoc-nhom.js | MỚI |
| 2 | Thêm populate + validate LopHoc | deTaiController.js | ~20 dòng |
| 2 | Thêm lopHocId vào createNhom + validate | nhomController.js | ~15 dòng |
| 2 | Thay query MonHoc → LopHoc | lopHocController.js | ~10 dòng |
| 2 | Thêm Nhom populate | baoCaoController.js | ~5 dòng |
| 2 | Thêm Nhom populate | tienDoController.js | ~5 dòng |
| 2 | Thêm Nhom + DiemGoc + adjustGrade | diemSoController.js | ~40 dòng |
| 3 | Thêm 3 route + bảo vệ quyền | server.js | ~6 dòng |
| 4 | Thêm LopHoc dropdown + cột bảng | TopicManagement.js | ~30 dòng |
| 4 | Thêm import SV + hiển thị đề tài | ClassManagement.js | ~50 dòng |
| 4 | Thêm dropdown LopHoc | GroupManagement.js | ~20 dòng |
| 4 | Thêm lọc theo lớp + tag | TopicRegistration.js | ~20 dòng |
| 4 | Thêm UI điều chỉnh điểm nhóm + modal | SubmissionReview.js | ~80 dòng |
| 4 | Thêm adjustGrade API call | aiService.js | ~5 dòng |
| 4 | Thêm 2 hàm API mới | managementService.js | ~10 dòng |
| 5 | Xóa ~500 dòng code HR legacy | apiService.js | -500 dòng |

---

## Verification Plan

### Sau Phase 1 (Schema + Migration):
```bash
cd D:\HocTap\KLKS_Web3\Web3GiangVien\backend
node scripts/migrate-add-lophoc-nhom.js --dry-run   # Kiểm tra trước
node scripts/migrate-add-lophoc-nhom.js              # Chạy migration
```

### Sau Phase 2-3 (Backend):
```bash
cd D:\HocTap\KLKS_Web3\Web3GiangVien\backend
node -e "require('dotenv').config(); require('./config/db')().then(() => { require('./models/DeTai'); require('./models/Nhom'); require('./models/BaoCao'); require('./models/TienDo'); require('./models/DiemSo'); console.log('OK'); process.exit(0); })"
```

### Sau Phase 4 (Frontend):
```bash
cd D:\HocTap\KLKS_Web3\Web3GiangVien\frontend
npm start   # Verify compile thành công
```

### Manual Test (sau tất cả Phase):
1. GV tạo Đề tài → chọn LopHoc → verify đề tài hiển thị đúng lớp
2. SV tạo Nhóm → chọn LopHoc → verify chỉ SV cùng lớp mới mời được
3. SV xem Đề tài → verify chỉ thấy đề tài thuộc lớp mình
4. Nộp BaoCao → verify có Nhom gắn kèm
5. Báo cáo TienDo → verify có Nhom gắn kèm
6. **GV chấm điểm nhóm → verify tất cả thành viên nhận cùng điểm**
7. **GV điều chỉnh điểm riêng 1 SV → verify chỉ SV đó bị thay đổi + hiển thị tag "đã chỉnh"**
8. **SV xem điểm → verify thấy điểm gốc nhóm + điểm cá nhân (nếu đã chỉnh)**
