# 🏆 Plan Thiết Kế Lại Competition System

> Ngày: 09/05/2026
> Tham khảo: [kaggle_comparison.md](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/Document/Day08-05-2026/kaggle_comparison.md)

---

## Tổng quan thay đổi

Chuyển từ mô hình **"1 đề tài = 1 nhóm, auto-approve/reject"** sang mô hình **"Cạnh tranh Kaggle-style"**:

```
┌─ Tạo nhóm trước ──────────────────────────────────────────────────────────┐
│  SV tạo nhóm → mời thành viên → chốt nhóm                                │
└────────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Đăng ký đề tài ──────────────────────────────────────────────────────────┐
│  Danh sách đề tài hiện:                                                    │
│    - Số nhóm đang cạnh tranh                                               │
│    - Disable nếu SoLuongSV ≠ số TV nhóm mình                              │
│    - Disable nếu đề tài đã được chốt (DaChot)                             │
│  Nhiều nhóm cùng đăng ký 1 đề tài → Tất cả vào làm test                  │
└────────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─ Làm bài test (cạnh tranh real-time) ─────────────────────────────────────┐
│  Trưởng nhóm đại diện làm test                                            │
│  Ai submit xong trước + đạt ngưỡng ≥ 75% → THẮNG → auto duyệt           │
│  WebSocket thông báo real-time cho các nhóm khác → dừng làm bài           │
│  Nhóm không thắng → trạng thái "Thua" → có thể đăng ký đề tài khác      │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: Quản Lý Nhóm (Tách riêng khỏi Đăng Ký Đề Tài)

### Ý tưởng

Hiện tại nhóm được tạo **kèm theo đăng ký đề tài** (ThanhVien nằm trong DangKyDeTai). Cần tách ra thành model riêng **Nhom** để SV tạo nhóm TRƯỚC khi đăng ký.

### [NEW] Model: `backend/models/Nhom.js`

```javascript
const nhomSchema = new mongoose.Schema({
  TenNhom: { type: String, default: '' },           // Tên nhóm (tuỳ chọn)
  TruongNhom: { type: ObjectId, ref: 'SinhVien', required: true },
  ThanhVien: [{
    SinhVien: { type: ObjectId, ref: 'SinhVien' },
    VaiTro: { type: String, enum: ['TruongNhom', 'ThanhVien'], default: 'ThanhVien' },
    TrangThai: { type: String, enum: ['DaMoi', 'DaChapNhan', 'TuChoi'], default: 'DaMoi' },
    NgayThamGia: { type: Date, default: Date.now }
  }],
  SoLuong: { type: Number, required: true, min: 1 },  // Số TV tối đa
  DaChot: { type: Boolean, default: false },            // Đã chốt nhóm chưa
}, { timestamps: true });
```

### [NEW] Controller: `backend/controllers/nhomController.js`

| API | Method | Mô tả |
|-----|--------|-------|
| `/api/nhom` | POST | SV tạo nhóm mới (tự động làm trưởng nhóm) |
| `/api/nhom/sinhvien/:svId` | GET | Lấy nhóm của SV (nếu có) |
| `/api/nhom/:id` | GET | Xem chi tiết nhóm |
| `/api/nhom/:id/invite` | POST | Trưởng nhóm mời thành viên (qua MaSV) |
| `/api/nhom/:id/respond` | POST | Thành viên chấp nhận/từ chối lời mời |
| `/api/nhom/:id/kick/:svId` | DELETE | Trưởng nhóm xóa thành viên |
| `/api/nhom/:id/leave` | POST | Thành viên rời nhóm (nếu trưởng nhóm → phải chỉ định người thay) |
| `/api/nhom/:id/transfer-leader` | POST | Trưởng nhóm chuyển quyền |
| `/api/nhom/:id/chot` | POST | Chốt nhóm (đủ số lượng) |
| `/api/nhom/:id` | DELETE | Xoá nhóm (chỉ trưởng nhóm, khi chưa đăng ký đề tài) |

### [NEW] Frontend: `frontend/src/components/student/GroupManagement.js`

Tab mới trong navbar SV: **"Nhóm Của Tôi"**

Giao diện gồm:
- **Chưa có nhóm**: Nút "Tạo Nhóm Mới" (nhập số lượng SV) + "Lời mời đang chờ" (từ nhóm khác)
- **Đã có nhóm**: Danh sách thành viên, trạng thái mời, nút mời thêm, nút chốt nhóm
- **Trưởng nhóm**: Thêm/Xoá thành viên, Chuyển quyền trưởng nhóm, Chốt nhóm
- **Thành viên**: Rời nhóm

### Sửa files có sẵn

#### [MODIFY] `frontend/src/App.js`
- Thêm route: `<Route path="group" element={<GroupManagement />} />`

#### [MODIFY] `frontend/src/components/layout/MainLayout.js`
- Thêm menu item "Nhóm Của Tôi" vào sidebar cho SV

#### [MODIFY] `backend/server.js`
- Thêm routes cho nhomController

---

## PHASE 2: Đăng Ký Đề Tài Cạnh Tranh

### Thay đổi logic

| Hiện tại | Mới |
|----------|-----|
| SV cá nhân đăng ký | Trưởng nhóm đại diện nhóm đăng ký |
| 1 đề tài = tối đa 1 nhóm | Nhiều nhóm đăng ký cùng 1 đề tài |
| Đề tài ẩn khi có nhóm | Đề tài hiển thị số nhóm đang cạnh tranh |
| Disable cho SV khác | Disable khi SoLuongSV ≠ SoLuong nhóm mình, hoặc đã DaChot |

### [MODIFY] `backend/controllers/deTaiController.js` — registerTopic

```javascript
// Logic mới:
// 1. Kiểm tra SV có nhóm chưa + nhóm đã chốt chưa
// 2. Kiểm tra nhóm đã đăng ký đề tài khác chưa
// 3. Kiểm tra SoLuongSinhVien đề tài === SoLuong nhóm
// 4. CHO PHÉP nhiều nhóm đăng ký cùng 1 đề tài (bỏ check topicTaken)
// 5. Nếu đề tài có bài test → TrangThai = 'ChoTest'
// 6. Nếu không có test → TrangThai = 'ChoDuyet'
```

### [MODIFY] `backend/controllers/deTaiController.js` — getAll

```javascript
// Thêm thông tin:
// - SoDangKy: số nhóm đang đăng ký (không TuChoi)
// - DaChot: đề tài đã được chốt cho 1 nhóm chưa
```

### [MODIFY] `frontend/src/components/student/TopicRegistration.js`

Thay đổi giao diện:
- **Chưa có nhóm / Nhóm chưa chốt**: Hiện thông báo "Hãy tạo và chốt nhóm trước khi đăng ký đề tài"
- **Card đề tài**: Hiện badge "X nhóm đang cạnh tranh"
- **Disable**: Khi `SoLuongSinhVien ≠ SoLuong nhóm` (tooltip giải thích), hoặc `DaChot`
- **Sau đăng ký**: Nếu có bài test → navigate thẳng tới trang test luôn (không chỉ hiện Alert)
- **Nút Hủy Đăng Ký**: Cho phép hủy và chọn đề tài khác (chỉ khi chưa submit test)

### [MODIFY] `backend/models/DangKyDeTai.js`

```javascript
// Thay đổi:
// - SinhVien → giữ lại cho backward compat, thêm Nhom
// - Bỏ ThanhVien array (đã có trong Nhom)
// - Thêm ThoiGianSubmit để so sánh ai submit sớm hơn
// - Thêm trạng thái mới
const dangKyDeTaiSchema = new mongoose.Schema({
  DeTai: { type: ObjectId, ref: 'DeTai', required: true },
  Nhom: { type: ObjectId, ref: 'Nhom', required: true },
  TruongNhom: { type: ObjectId, ref: 'SinhVien', required: true },
  TrangThai: { 
    type: String, 
    enum: ['ChoTest', 'DangLamTest', 'DaSubmit', 'DaDuyet', 'TuChoi', 'Thua'], 
    default: 'ChoTest' 
  },
  ThoiGianSubmit: { type: Date },  // Thời điểm nộp bài (dùng so sánh ai nhanh hơn)
}, { timestamps: true });
```

> **Trạng thái mới:**
> - `ChoTest` → Đã đăng ký, chưa bắt đầu làm test
> - `DangLamTest` → Đang làm bài test
> - `DaSubmit` → Đã nộp, chờ AI chấm
> - `DaDuyet` → Thắng! Đạt ngưỡng + sớm nhất
> - `TuChoi` → Không đạt ngưỡng
> - `Thua` → Đạt ngưỡng nhưng có người nộp sớm hơn, hoặc bị dừng do người khác thắng

---

## PHASE 3: Bài Test Real-time + WebSocket

### Cốt lõi: "Ai đạt ngưỡng + submit sớm nhất = Thắng"

```
Nhóm A bấm Submit lúc 10:05:30 → AI chấm mất 5s → điểm ra lúc 10:05:35 → 85% ✅
Nhóm B bấm Submit lúc 10:05:28 → AI chấm mất 8s → điểm ra lúc 10:05:36 → 90% ✅

→ Nhóm B thắng vì ThoiGianSubmit sớm hơn (10:05:28 < 10:05:30)
  (Dù điểm AI ra sau, ta dùng ThoiGianSubmit chứ KHÔNG dùng thời gian AI xử lý)
```

### [MODIFY] `backend/controllers/baiTestController.js` — submitTest

```javascript
// Flow mới:
// 1. Ghi ThoiGianSubmit = new Date() NGAY KHI NHẬN REQUEST (trước khi AI chấm)
// 2. Cập nhật DangKyDeTai.TrangThai = 'DaSubmit'
// 3. AI chấm điểm (có thể mất vài giây)
// 4. Sau khi có kết quả:
//    a. Nếu < ngưỡng → TrangThai = 'TuChoi'
//    b. Nếu >= ngưỡng → Kiểm tra xem có ai khác đã DaDuyet cho đề tài này chưa:
//       - Nếu chưa ai thắng → DaDuyet (WINNER!)
//         → emit socket: 'competition:winner' { deTaiId, nhomId }
//         → Tất cả DangKy khác cho đề tài → 'Thua'
//         → DeTai.TrangThai = 'DaChot'
//       - Nếu đã có người thắng → 'Thua' (dù đạt ngưỡng nhưng chậm hơn)
// 5. Trả kết quả cho SV
```

### Xử lý race condition

```javascript
// Dùng MongoDB findOneAndUpdate với điều kiện atomic:
const winner = await DangKyDeTai.findOneAndUpdate(
  { DeTai: deTaiId, _id: dangKyId, TrangThai: 'DaSubmit' },
  { TrangThai: 'DaDuyet' },
  { new: true }
);
// Nếu winner === null → đã có người khác thắng trước → 'Thua'

// Sau đó update tất cả đăng ký khác:
await DangKyDeTai.updateMany(
  { DeTai: deTaiId, _id: { $ne: dangKyId }, TrangThai: { $in: ['ChoTest', 'DangLamTest', 'DaSubmit'] } },
  { TrangThai: 'Thua' }
);
```

### WebSocket Events

| Event | Direction | Data | Mô tả |
|-------|-----------|------|-------|
| `competition:join` | Client→Server | `{ deTaiId, nhomId }` | Nhóm bắt đầu làm test, join room |
| `competition:submit` | Client→Server | `{ deTaiId, nhomId }` | Nhóm submit bài (thông báo đang chấm) |
| `competition:winner` | Server→Clients | `{ deTaiId, winnerNhomId, winnerName, score }` | Có nhóm thắng! |
| `competition:status` | Server→Clients | `{ deTaiId, nhomId, status }` | Cập nhật trạng thái |

### [MODIFY] `backend/server.js` — Socket.IO

```javascript
io.on('connection', (socket) => {
  // Nhóm join room theo đề tài đang cạnh tranh
  socket.on('competition:join', ({ deTaiId, nhomId }) => {
    socket.join(`competition:${deTaiId}`);
    socket.nhomId = nhomId;
    logger.info(`[SOCKET] Nhom ${nhomId} joined competition room: ${deTaiId}`);
  });
});
```

### [MODIFY] `frontend/src/components/student/EntranceTest.js`

Thêm Socket.IO listener:
```javascript
// Khi nhận event 'competition:winner':
// - Nếu winnerNhomId === nhóm mình → Hiện "🎉 Chúc mừng! Nhóm bạn thắng!"
// - Nếu winnerNhomId !== nhóm mình → Hiện modal:
//   "⚠️ Đã có nhóm khác hoàn thành trước! Bài test đã kết thúc."
//   Chỉ cho nút "Thoát" (không cho submit nữa)
//   Disable toàn bộ form trả lời
```

Thêm trạng thái "Đang chờ kết quả":
```javascript
// Sau khi submit → hiện "Đang chấm điểm..." spinner
// Kết quả trả về → hiện Đạt/Không đạt
// Nếu đạt ngưỡng + là người đầu tiên → "🏆 Nhóm bạn giành được đề tài!"
// Nếu đạt ngưỡng nhưng chậm → "Đạt ngưỡng nhưng đã có nhóm khác nhanh hơn"
```

---

## PHASE 4: Cập nhật view Giảng viên

### [MODIFY] `frontend/src/components/lecturer/EntranceTestManager.js`

Tab "Kết Quả Test":
- Hiện danh sách tất cả nhóm đã submit
- Cột: Tên nhóm | Trưởng nhóm | Thời gian submit | Điểm | Kết quả (Đạt/Không đạt/Thắng/Thua)
- Highlight nhóm thắng (nếu có)

### [MODIFY] `frontend/src/components/lecturer/TopicManagement.js`

Drawer đăng ký:
- Hiện danh sách nhóm (thay vì cá nhân)
- Trạng thái chi tiết: ChoTest | DangLamTest | DaSubmit | DaDuyet | TuChoi | Thua

---

## Tóm tắt toàn bộ files cần thay đổi

### Files MỚI (4 files)

| # | File | Mô tả |
|---|------|-------|
| 1 | `backend/models/Nhom.js` | Model quản lý nhóm SV |
| 2 | `backend/controllers/nhomController.js` | CRUD nhóm + mời/kick/rời/chuyển quyền |
| 3 | `frontend/src/components/student/GroupManagement.js` | Giao diện quản lý nhóm (tab mới) |
| 4 | `frontend/src/services/nhomService.js` | API service cho nhóm |

### Files SỬA (11 files)

| # | File | Thay đổi chính |
|---|------|----------------|
| 1 | `backend/models/DangKyDeTai.js` | Thay SinhVien→Nhom, thêm ThoiGianSubmit, thêm trạng thái |
| 2 | `backend/controllers/deTaiController.js` | registerTopic theo nhóm, getAll + SoDangKy, bỏ check 1 nhóm/đề tài |
| 3 | `backend/controllers/baiTestController.js` | submitTest real-time logic + emit socket |
| 4 | `backend/server.js` | Socket.IO rooms + events, routes nhomController |
| 5 | `frontend/src/App.js` | Thêm route /student/group |
| 6 | `frontend/src/components/layout/MainLayout.js` | Thêm menu "Nhóm Của Tôi" |
| 7 | `frontend/src/components/student/TopicRegistration.js` | Check nhóm, disable logic, navigate test |
| 8 | `frontend/src/components/student/EntranceTest.js` | Socket listener, chờ kết quả, dừng khi ai thắng |
| 9 | `frontend/src/components/lecturer/EntranceTestManager.js` | Hiện nhóm thay vì cá nhân |
| 10 | `frontend/src/components/lecturer/TopicManagement.js` | Drawer hiện nhóm + trạng thái chi tiết |
| 11 | `frontend/src/services/aiService.js` | Sửa registerTopic gửi nhomId |

---

## Thứ tự thực hiện đề xuất

| Phase | Nội dung | Ước lượng |
|-------|----------|-----------|
| **P1** | Model Nhom + Controller + GroupManagement UI | Lớn |
| **P2** | Sửa DangKyDeTai + TopicRegistration (đăng ký theo nhóm) | Trung bình |
| **P3** | submitTest logic + WebSocket real-time | Lớn |
| **P4** | Cập nhật view GV (EntranceTestManager, TopicManagement) | Nhỏ |

> **Lưu ý quan trọng:** Cần revert lại thay đổi "1 đề tài = 1 nhóm" đã làm trước đó ở `deTaiController.js` (xoá check `topicTaken`).

## Verification Plan

1. Tạo 2 tài khoản SV → mỗi SV tạo nhóm → chốt nhóm
2. Cả 2 nhóm đăng ký cùng 1 đề tài có test
3. Nhóm A làm test xong, submit, đạt ngưỡng → auto duyệt
4. Nhóm B đang làm → nhận WebSocket → hiện thông báo dừng
5. GV xem kết quả: nhóm A = thắng, nhóm B = thua
6. Đề tài hiển thị "Đã chốt" cho các nhóm khác
