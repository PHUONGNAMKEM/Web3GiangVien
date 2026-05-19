# 🏆 Competition System — Implementation Plan

> Ngày: 19/05/2026
> Dựa trên: [competition_redesign_plan.md (09/05)](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/Document/Day09-05-2026/competition_redesign_plan.md)
> Cơ chế xác định Winner: **Hybrid** (so sánh `ThoiGianSubmit`, chỉ chờ khi có nhóm submit trước chưa có kết quả)

---

## Hiện trạng codebase (19/05/2026)

### Những gì ĐÃ CÓ

| Thành phần | Trạng thái |
|------------|-----------|
| Model `BaiTest.js` | ✅ Có field `NguongDat` (default 75%) |
| Model `KetQuaTest.js` | ✅ Lưu kết quả test theo SinhVien |
| Model `DangKyDeTai.js` | ⚠️ Đăng ký theo SV cá nhân, ThanhVien nằm trong đây |
| Controller `baiTestController.js` | ⚠️ Auto approve/reject đơn giản (không có cơ chế cạnh tranh) |
| Controller `deTaiController.js` | ⚠️ Check `topicTaken` (1 nhóm/đề tài) — **cần revert** |
| Frontend `TopicRegistration.js` | ⚠️ Filter `DaCoDangKy` — **cần revert** |
| Socket.IO | ✅ Đã setup trong `server.js` (chỉ log connect/disconnect) |
| Model `Nhom.js` | ❌ Chưa có |
| WebSocket competition events | ❌ Chưa có |

### Những gì CẦN REVERT trước khi bắt đầu

1. `deTaiController.js` → Bỏ check `topicTaken` (cho phép nhiều nhóm đăng ký cùng đề tài)
2. `TopicRegistration.js` → Bỏ filter `DaCoDangKy` (hiện tất cả đề tài, kèm badge số nhóm)

---

## Tổng quan Flow mới

```
┌─ PHASE 1: Quản lý nhóm ─────────────────────────────────────────────────────┐
│  SV tạo nhóm → mời thành viên → chốt nhóm                                  │
│  Tab mới "Nhóm Của Tôi" trong sidebar SV                                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─ PHASE 2: Đăng ký đề tài cạnh tranh ────────────────────────────────────────┐
│  Trưởng nhóm đại diện đăng ký → Nhiều nhóm cùng 1 đề tài                   │
│  Card đề tài hiện: "X nhóm đang cạnh tranh"                                │
│  Disable nếu SoLuongSV ≠ SoLuong nhóm hoặc đã DaChot                      │
└──────────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─ PHASE 3: Bài test real-time (Hybrid) ───────────────────────────────────────┐
│  Trưởng nhóm làm test → Submit → Ghi ThoiGianSubmit ngay                   │
│  AI chấm → Đạt ngưỡng?                                                      │
│    → Có nhóm submit TRƯỚC mình chưa có kết quả? → Chờ (ChoDoi)             │
│    → Không ai trước / ai trước đều trượt → THẮNG!                           │
│  WebSocket thông báo real-time → Nhóm khác dừng bài                         │
└──────────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─ PHASE 4: Cập nhật view Giảng viên ─────────────────────────────────────────┐
│  Bảng kết quả theo nhóm | Drawer hiện nhóm + trạng thái chi tiết           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: Quản Lý Nhóm

### [NEW] `backend/models/Nhom.js`

```javascript
const nhomSchema = new mongoose.Schema({
  TenNhom: { type: String, default: '' },
  TruongNhom: { type: ObjectId, ref: 'SinhVien', required: true },
  ThanhVien: [{
    SinhVien: { type: ObjectId, ref: 'SinhVien' },
    VaiTro: { type: String, enum: ['TruongNhom', 'ThanhVien'], default: 'ThanhVien' },
    TrangThai: { type: String, enum: ['DaMoi', 'DaChapNhan', 'TuChoi'], default: 'DaMoi' },
    NgayThamGia: { type: Date, default: Date.now }
  }],
  SoLuong: { type: Number, required: true, min: 1 },
  DaChot: { type: Boolean, default: false },
}, { timestamps: true });
```

### [NEW] `backend/controllers/nhomController.js`

| API | Method | Mô tả |
|-----|--------|-------|
| `/api/nhom` | POST | Tạo nhóm mới (tự động làm trưởng nhóm) |
| `/api/nhom/sinhvien/:svId` | GET | Lấy nhóm của SV |
| `/api/nhom/:id` | GET | Chi tiết nhóm |
| `/api/nhom/:id/invite` | POST | Mời thành viên (qua MaSV) |
| `/api/nhom/:id/respond` | POST | Chấp nhận/từ chối lời mời |
| `/api/nhom/:id/kick/:svId` | DELETE | Xóa thành viên |
| `/api/nhom/:id/leave` | POST | Rời nhóm |
| `/api/nhom/:id/transfer-leader` | POST | Chuyển quyền trưởng nhóm |
| `/api/nhom/:id/chot` | POST | Chốt nhóm |
| `/api/nhom/:id` | DELETE | Xoá nhóm (chỉ khi chưa đăng ký đề tài) |

### [NEW] `frontend/src/components/student/GroupManagement.js`

Tab mới **"Nhóm Của Tôi"** trong sidebar SV:
- **Chưa có nhóm**: Nút "Tạo Nhóm Mới" + "Lời mời đang chờ"
- **Đã có nhóm**: Danh sách thành viên, trạng thái, nút mời/chốt
- **Trưởng nhóm**: Mời/Xoá TV, chuyển quyền, chốt nhóm
- **Thành viên**: Chỉ rời nhóm

### [NEW] `frontend/src/services/nhomService.js`

API service cho tất cả endpoint nhóm.

### [MODIFY] `frontend/src/App.js`

Thêm route: `<Route path="group" element={<GroupManagement />} />`

### [MODIFY] `frontend/src/components/layout/MainLayout.js`

Thêm menu item `{ key: '/student/group', icon: <Users />, label: 'Nhóm Của Tôi' }` vào `studentMenuItems`.

### [MODIFY] `backend/server.js`

Thêm import `nhomController` + routes `/api/nhom/*`.

---

## PHASE 2: Đăng Ký Đề Tài Cạnh Tranh

### [MODIFY] `backend/models/DangKyDeTai.js`

```javascript
// THAY ĐỔI:
// - Thêm Nhom ref (bắt buộc cho đăng ký mới)
// - Giữ SinhVien + ThanhVien cho backward compat (migration dần)
// - Thêm ThoiGianSubmit, thêm trạng thái mới
const dangKyDeTaiSchema = new mongoose.Schema({
  DeTai: { type: ObjectId, ref: 'DeTai', required: true },
  Nhom: { type: ObjectId, ref: 'Nhom' },               // NEW
  SinhVien: { type: ObjectId, ref: 'SinhVien' },        // Giữ lại
  TruongNhom: { type: ObjectId, ref: 'SinhVien' },      // NEW
  ThanhVien: [{ /* giữ nguyên cấu trúc cũ */ }],
  TrangThai: {
    type: String,
    enum: ['ChoDuyet', 'ChoTest', 'DangLamTest', 'DaSubmit', 'ChoDoi', 'DaDuyet', 'TuChoi', 'Thua'],
    default: 'ChoDuyet'
  },
  ThoiGianSubmit: { type: Date },                        // NEW — ghi ngay khi nhận submit
}, { timestamps: true });

// Sửa unique index: 1 nhóm chỉ đăng ký 1 đề tài 1 lần
dangKyDeTaiSchema.index({ DeTai: 1, Nhom: 1 }, { unique: true, sparse: true });
```

**Trạng thái mới:**

| Trạng thái | Ý nghĩa |
|------------|---------|
| `ChoTest` | Đã đăng ký, chưa bắt đầu test |
| `DangLamTest` | Đang làm bài test |
| `DaSubmit` | Đã nộp, AI đang chấm |
| `ChoDoi` | Đạt ngưỡng nhưng có nhóm submit trước chưa có kết quả → chờ |
| `DaDuyet` | **THẮNG** — submit sớm nhất + đạt ngưỡng |
| `TuChoi` | Không đạt ngưỡng |
| `Thua` | Đạt ngưỡng nhưng có nhóm khác thắng |

### [MODIFY] `backend/controllers/deTaiController.js`

**`registerTopic`** — Logic mới:
1. Check SV có nhóm chưa + nhóm đã chốt chưa
2. Check nhóm đã đăng ký đề tài khác chưa
3. Check `SoLuongSinhVien` đề tài === `SoLuong` nhóm
4. **BỎ** check `topicTaken` → cho phép nhiều nhóm cùng 1 đề tài
5. Nếu có bài test → `TrangThai = 'ChoTest'`

**`getAll`** — Thêm:
- `SoDangKy`: số nhóm đang đăng ký (không tính `TuChoi`, `Thua`)
- `DaChot`: đề tài đã có nhóm `DaDuyet` chưa

### [MODIFY] `frontend/src/components/student/TopicRegistration.js`

- Chưa có nhóm / Nhóm chưa chốt → Alert "Hãy tạo và chốt nhóm trước"
- Card đề tài: Badge "X nhóm đang cạnh tranh"
- Disable khi `SoLuongSV ≠ SoLuong nhóm` hoặc `DaChot`
- Sau đăng ký có test → navigate thẳng tới trang test
- Cho hủy đăng ký khi chưa submit test

---

## PHASE 3: Bài Test Real-time — Cơ chế Hybrid

### Nguyên tắc cốt lõi

> **"Ai submit sớm nhất + đạt ngưỡng = Thắng. Chỉ chờ khi có nhóm submit TRƯỚC mình mà chưa có kết quả."**

### Flow chi tiết

```
Nhóm submit bài
    │
    ├─ 1. Ghi ThoiGianSubmit = now() NGAY LẬP TỨC
    ├─ 2. TrangThai → 'DaSubmit'
    ├─ 3. AI chấm điểm (mất vài giây)
    │
    ├─ 4a. Điểm < ngưỡng → TrangThai = 'TuChoi'
    │      └─ Gọi resolveWaitingGroups() → giải phóng nhóm ChoDoi
    │
    └─ 4b. Điểm >= ngưỡng → tryClaimWinner()
           │
           ├─ Có nhóm DaDuyet rồi? → TrangThai = 'Thua'
           │
           ├─ Có nhóm DaSubmit submit TRƯỚC mình + chưa có kết quả?
           │      → TrangThai = 'ChoDoi' (chờ nhóm đó xong)
           │
           └─ Không ai trước / ai trước đều trượt
                  → TrangThai = 'DaDuyet' (THẮNG!)
                  → Tất cả nhóm khác → 'Thua'
                  → Emit 'competition:winner'
                  → DeTai.TrangThai = 'DaChot'
```

### Ví dụ minh hoạ

```
Nhóm A submit lúc 10:05:30 → AI chấm mất 5s → điểm: 85% ✅
Nhóm B submit lúc 10:05:28 → AI chấm mất 8s → điểm: 90% ✅

Timeline:
  10:05:28 — B submit, ghi ThoiGianSubmit
  10:05:30 — A submit, ghi ThoiGianSubmit
  10:05:35 — A có kết quả (85% ≥ 75%)
             → Check: B submit trước A (10:05:28 < 10:05:30) + B chưa có kết quả
             → A vào trạng thái 'ChoDoi'
  10:05:36 — B có kết quả (90% ≥ 75%)
             → Check: Không ai submit trước B + đạt ngưỡng
             → B = THẮNG! → A chuyển sang 'Thua'
```

### Xử lý Race Condition (MongoDB atomic)

```javascript
// Khi tryClaimWinner xác định nhóm thắng:
const winner = await DangKyDeTai.findOneAndUpdate(
  {
    DeTai: deTaiId,
    Nhom: nhomId,
    TrangThai: { $in: ['DaSubmit', 'ChoDoi'] }
  },
  { TrangThai: 'DaDuyet' },
  { new: true }
);
// winner === null → đã có người claim trước → 'Thua'

// Đánh thua tất cả nhóm khác:
await DangKyDeTai.updateMany(
  {
    DeTai: deTaiId,
    Nhom: { $ne: nhomId },
    TrangThai: { $in: ['ChoTest', 'DangLamTest', 'DaSubmit', 'ChoDoi'] }
  },
  { TrangThai: 'Thua' }
);
```

### Hàm resolveWaitingGroups()

```javascript
// Gọi sau khi 1 nhóm bị TuChoi (không đạt ngưỡng)
// → Check các nhóm đang ChoDoi xem có thể claim winner chưa
async function resolveWaitingGroups(deTaiId) {
  const waitingGroups = await DangKyDeTai.find({
    DeTai: deTaiId,
    TrangThai: 'ChoDoi'
  }).sort({ ThoiGianSubmit: 1 }); // Sớm nhất trước

  for (const group of waitingGroups) {
    // Check còn ai submit trước group mà chưa có kết quả?
    const earlierPending = await DangKyDeTai.findOne({
      DeTai: deTaiId,
      _id: { $ne: group._id },
      TrangThai: 'DaSubmit',
      ThoiGianSubmit: { $lt: group.ThoiGianSubmit }
    });

    if (!earlierPending) {
      // Không còn ai trước → nhóm này THẮNG
      await claimWinner(group, deTaiId);
      break;
    }
  }
}
```

### [MODIFY] `backend/controllers/baiTestController.js`

- `submitTest`: implement flow Hybrid ở trên
- Emit socket events sau khi xác định winner
- Gọi `resolveWaitingGroups()` khi nhóm bị `TuChoi`

### [MODIFY] `backend/models/KetQuaTest.js`

```javascript
// Thêm ref Nhom:
Nhom: { type: ObjectId, ref: 'Nhom' },
// Sửa unique index: 1 nhóm 1 bài test
ketQuaTestSchema.index({ BaiTest: 1, Nhom: 1 }, { unique: true, sparse: true });
```

### WebSocket Events

| Event | Direction | Data | Mô tả |
|-------|-----------|------|-------|
| `competition:join` | Client→Server | `{ deTaiId, nhomId }` | Join room khi bắt đầu test |
| `competition:submit` | Client→Server | `{ deTaiId, nhomId }` | Thông báo đang chấm |
| `competition:winner` | Server→Clients | `{ deTaiId, winnerNhomId, winnerName, score }` | Có nhóm thắng |
| `competition:status` | Server→Clients | `{ deTaiId, nhomId, status }` | Cập nhật trạng thái |

### [MODIFY] `backend/server.js`

Thêm Socket.IO room management cho competition:
```javascript
socket.on('competition:join', ({ deTaiId, nhomId }) => {
  socket.join(`competition:${deTaiId}`);
  socket.nhomId = nhomId;
});
```

### [MODIFY] `frontend/src/components/student/EntranceTest.js`

- Socket listener cho `competition:winner`:
  - `winnerNhomId === nhóm mình` → "🏆 Chúc mừng!"
  - `winnerNhomId !== nhóm mình` → "⚠️ Đã có nhóm khác thắng!" + disable form
- Hiện "Đang chấm điểm..." spinner sau submit
- Hiện "Đang chờ kết quả nhóm submit trước..." khi `ChoDoi`

---

## PHASE 4: Cập nhật view Giảng viên

### [MODIFY] `frontend/src/components/lecturer/EntranceTestManager.js`

Tab "Kết Quả Test":
- Hiện danh sách **nhóm** (thay vì cá nhân)
- Cột: Tên nhóm | Trưởng nhóm | Thời gian submit | Điểm | Kết quả
- Highlight nhóm thắng

### [MODIFY] `frontend/src/components/lecturer/TopicManagement.js`

Drawer đăng ký:
- Hiện danh sách nhóm thay vì SV cá nhân
- Trạng thái chi tiết: ChoTest | DangLamTest | DaSubmit | ChoDoi | DaDuyet | TuChoi | Thua

---

## Tổng hợp files

### Files MỚI (4)

| # | File | Mô tả |
|---|------|-------|
| 1 | `backend/models/Nhom.js` | Model nhóm SV |
| 2 | `backend/controllers/nhomController.js` | CRUD nhóm |
| 3 | `frontend/src/components/student/GroupManagement.js` | UI quản lý nhóm |
| 4 | `frontend/src/services/nhomService.js` | API service nhóm |

### Files SỬA (11)

| # | File | Phase | Thay đổi chính |
|---|------|-------|----------------|
| 1 | `backend/models/DangKyDeTai.js` | P2 | +Nhom, +ThoiGianSubmit, +trạng thái mới |
| 2 | `backend/models/KetQuaTest.js` | P3 | +Nhom ref, sửa unique index |
| 3 | `backend/controllers/deTaiController.js` | P2 | registerTopic theo nhóm, getAll +SoDangKy |
| 4 | `backend/controllers/baiTestController.js` | P3 | Hybrid submit logic + socket emit |
| 5 | `backend/server.js` | P1,P3 | Routes nhom + Socket rooms |
| 6 | `frontend/src/App.js` | P1 | Route /student/group |
| 7 | `frontend/src/components/layout/MainLayout.js` | P1 | Menu "Nhóm Của Tôi" |
| 8 | `frontend/src/components/student/TopicRegistration.js` | P2 | Check nhóm, badge, disable |
| 9 | `frontend/src/components/student/EntranceTest.js` | P3 | Socket listener, ChoDoi UI |
| 10 | `frontend/src/components/lecturer/EntranceTestManager.js` | P4 | Hiện nhóm thay vì cá nhân |
| 11 | `frontend/src/components/lecturer/TopicManagement.js` | P4 | Drawer nhóm + trạng thái |

---

## Thứ tự thực hiện

| Phase | Nội dung | Ước lượng | Phụ thuộc |
|-------|----------|-----------|-----------|
| **Revert** | Bỏ check topicTaken + filter DaCoDangKy | Nhỏ | — |
| **P1** | Model Nhom + Controller + GroupManagement UI | Lớn | — |
| **P2** | Sửa DangKyDeTai + TopicRegistration (đăng ký theo nhóm) | Trung bình | P1 |
| **P3** | Hybrid submit logic + WebSocket real-time | Lớn | P1, P2 |
| **P4** | Cập nhật view GV | Nhỏ | P2, P3 |

---

## Verification Plan

1. Tạo 2 tài khoản SV → mỗi SV tạo nhóm → chốt nhóm
2. Cả 2 nhóm đăng ký cùng 1 đề tài có test
3. Nhóm A submit trước, nhưng AI chấm chậm hơn
4. Nhóm B submit sau, AI chấm nhanh hơn → B vào `ChoDoi` (vì A submit trước)
5. A có kết quả, đạt ngưỡng → A THẮNG (submit sớm hơn)
6. B nhận WebSocket → hiện "Đã có nhóm khác thắng"
7. GV xem kết quả: A = Thắng, B = Thua
8. Đề tài hiển thị "Đã chốt"

### Edge cases cần test

| Case | Kịch bản | Kết quả mong đợi |
|------|----------|-------------------|
| 1 | A submit trước, A đạt ngưỡng | A thắng ngay |
| 2 | A submit trước, A trượt, B đạt | B thắng (resolveWaitingGroups) |
| 3 | A và B submit cùng lúc (±1s), cả 2 đạt | Ai submit sớm hơn (ThoiGianSubmit) thắng |
| 4 | A submit, B submit, cả 2 trượt | Không ai thắng, đề tài vẫn MoDangKy |
| 5 | Chỉ có 1 nhóm đăng ký + đạt | Thắng ngay, không cần chờ |
