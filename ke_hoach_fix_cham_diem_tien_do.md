# Kế Hoạch Fix — Chấm Điểm & Tiến Độ Tuần (cho Codex)

> **Loại tài liệu**: Kế hoạch sửa lỗi / hoàn thiện
> **Ngày tạo**: 2026-05-17
> **Tài liệu gốc**: `technical_blueprint_cham_diem_tien_do.md`
> **Phạm vi**: Sửa code thật. Chia theo phase, làm tuần tự.

---

## 0. Kết quả kiểm tra blueprint

Blueprint đã được triển khai **gần như đầy đủ**. Trạng thái 9 bước:

| Bước | Nội dung | Trạng thái |
|---|---|---|
| 1 | Schema `DiemSo.js`, `TienDo.js` (field mới + index/unique) | ✅ Đã làm đúng |
| 2 | Helper validate/permission/anomaly inline trong controller | ✅ Đã có |
| 3 | `chamDiem` nâng cấp; `evaluateProgress`, `getProgressDetail`, `updateProgressEntry`, `getProgressBySinhVien` | ✅ Đã có |
| 4 | 4 route mới trong `server.js`, đúng thứ tự ưu tiên | ✅ Đã đúng |
| 5 | `aiService.js` thêm method mới | ✅ Đã có đủ |
| 6 | `ProgressLog.js` form tuần + group theo tuần | ⚠️ Có 1 lỗi (Phase 1) |
| 7 | `SubmissionReview.js` modal đánh giá tuần + card tóm tắt | ⚠️ Có 2 lỗi (Phase 1, 2, 3) |
| 8 | Payload `chamDiem` thêm `submissionIndex` | ✅ Đã đúng (best-effort, BE tự tính) |

**Còn 3 nhóm vấn đề cần fix** → chia thành 3 phase chính + 1 phase polish tùy chọn.

### Tổng hợp vấn đề phát hiện

| # | Mức độ | Vấn đề | Phase |
|---|---|---|---|
| 1 | 🔴 Nghiêm trọng | `MinhChung` lệch casing key giữa FE (camelCase) và schema (PascalCase) → **mất dữ liệu minh chứng khi lưu**, link hỏng khi hiển thị, mất dữ liệu khi sửa | Phase 1 |
| 2 | 🟠 Trung bình | Luồng trạng thái `KhongDat` chưa hoàn chỉnh: GV không chọn được "Không đạt" trên UI; SV nộp lại tuần `KhongDat` gây **lỗi 500** (đụng unique index) | Phase 2 |
| 3 | 🟡 Thấp | Modal đánh giá tuần đọc sai field nhận xét tiêu chí (`GV_NhanXet` thay vì `NhanXetTieuChi`); không có ô nhập nhận xét theo tiêu chí | Phase 3 |
| 4 | ⚪ Tùy chọn | Polish nhỏ: thiếu dòng disclaimer điểm quá trình, encoding `'Khac'` vs `'Khác'` | Phase 4 |

---

## Phase 1 — 🔴 Sửa lỗi mất dữ liệu `MinhChung` (sai casing key)

### 1.0. Mô tả lỗi

- Schema `TienDo.MinhChung` định nghĩa subdocument key **PascalCase**: `{ TenFile, Url, GhiChu }` (`backend/models/TienDo.js:21-25`).
- Form `ProgressLog.js` (`Form.List name="minhChung"`) sinh ra key **camelCase**: `{ tenFile, url, ghiChu }` (`frontend/src/components/student/ProgressLog.js:462-483`).
- Controller `createProgressEntry` / `updateProgressEntry` lưu thẳng mảng `minhChung` vào `MinhChung` **không map key**.
- → Mongoose cast subdocument: key camelCase không khớp schema → **bị loại bỏ** → `MinhChung` lưu thành mảng object rỗng. **Mất toàn bộ dữ liệu minh chứng.**
- Hệ quả phụ: `SubmissionReview.js` render `MinhChung` như chuỗi string → link `[object Object]`.

### 1.1. Backend — `backend/controllers/tienDoController.js`

Thêm helper chuẩn hóa (đặt cạnh các helper hiện có, ví dụ sau `isNumber`):

```js
// Chuẩn hóa minh chứng: chấp nhận cả camelCase (API contract) lẫn PascalCase
const normalizeMinhChung = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
        .map(m => ({
            TenFile: m.TenFile ?? m.tenFile ?? '',
            Url: m.Url ?? m.url ?? '',
            GhiChu: m.GhiChu ?? m.ghiChu ?? ''
        }))
        .filter(m => m.Url || m.TenFile);
};
```

**Trong `createProgressEntry`** — sửa dòng `MinhChung` trong `draftEntry`:

```js
// Cũ:
MinhChung: Array.isArray(minhChung) ? minhChung : []
// Mới:
MinhChung: normalizeMinhChung(minhChung)
```

**Trong `updateProgressEntry`** — sửa khối cập nhật `minhChung`:

```js
// Cũ:
if (minhChung !== undefined) {
    progress.MinhChung = Array.isArray(minhChung) ? minhChung : [];
}
// Mới:
if (minhChung !== undefined) {
    progress.MinhChung = normalizeMinhChung(minhChung);
}
```

### 1.2. Frontend — `frontend/src/components/student/ProgressLog.js`

Trong `openEditModal` (~dòng 181-197), khi nạp dữ liệu vào form, map PascalCase → camelCase cho `minhChung`:

```js
// Cũ:
minhChung: log.MinhChung || []
// Mới:
minhChung: (log.MinhChung || []).map(m => ({
    tenFile: m.TenFile || '',
    url: m.Url || '',
    ghiChu: m.GhiChu || ''
}))
```

### 1.3. Frontend — `frontend/src/components/lecturer/SubmissionReview.js`

Trong Drawer tiến độ, khối render `item.MinhChung` (~dòng 767-776) đang coi mỗi phần tử là string. Sửa thành render object:

```jsx
{Array.isArray(item.MinhChung) && item.MinhChung.length > 0 && (
  <Paragraph>
    <Text strong>Minh chứng:</Text>{' '}
    {item.MinhChung.map((mc, idx) => (
      <a key={idx} href={mc.Url} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>
        {mc.TenFile || `Link ${idx + 1}`}
      </a>
    ))}
  </Paragraph>
)}
```

### 1.4. Test Phase 1

1. SV tạo báo cáo tuần có ≥1 minh chứng (URL + ghi chú) → mở lại danh sách → minh chứng hiển thị đúng tên + link bấm được.
2. SV bấm "Sửa & nộp lại" một record → form hiện lại đúng minh chứng đã nhập.
3. GV mở Drawer tiến độ → link minh chứng bấm được, không còn `[object Object]`.

---

## Phase 2 — 🟠 Hoàn thiện luồng trạng thái "Không Đạt" (`KhongDat`)

### 2.0. Mô tả lỗi

Theo blueprint §4.6: khi GV chấm tuần `KhongDat`, SV **không sửa record cũ** mà **tạo record mới với `LanNopLai + 1`** (unique index `{DeTai, SinhVien, TuanSo, LanNopLai}`).

Hai thiếu sót:
- **A.** `SubmissionReview.js` — `Select` trạng thái đánh giá tuần chỉ có `ChoDanhGia / Dat / CanBoSung`, **thiếu `KhongDat`** → GV không đánh trượt tuần được.
- **B.** `createProgressEntry` luôn tạo record với `LanNopLai = 0` (default). Khi SV nộp lại một tuần đã `KhongDat`: record mới vẫn `LanNopLai = 0` → đụng unique index `{DeTai, SinhVien, TuanSo, 0}` → Mongoose ném `E11000` → controller trả **500** (không phải 409 thân thiện). `detectAnomalies` không chặn vì `TRUNG_TUAN` đã loại trừ record `KhongDat`.

### 2.1. Backend — `backend/controllers/tienDoController.js` (`createProgressEntry`)

Sau khi lấy `existingEntries` và **trước khi tạo `draftEntry`**, thêm logic tính `LanNopLai`:

```js
// Tính LanNopLai cho báo cáo tuần: cho phép nộp lại sau khi bị KhongDat
let lanNopLai = 0;
if (isNumber(tuanSo)) {
    const sameWeek = existingEntries.filter(e => isNumber(e.TuanSo) && e.TuanSo === tuanSo);
    if (sameWeek.length > 0) {
        const allKhongDat = sameWeek.every(e => e.TrangThaiDanhGia === 'KhongDat');
        if (!allKhongDat) {
            return res.status(409).json({ error: 'Trùng tuần đã tồn tại', code: 'TRUNG_TUAN_DA_TON_TAI' });
        }
        lanNopLai = Math.max(...sameWeek.map(e => e.LanNopLai || 0)) + 1;
    }
}
```

Thêm `LanNopLai: lanNopLai` vào `draftEntry`.

Bọc `tienDo.save()` để chuyển lỗi trùng index thành 409:

```js
// Cũ:
await tienDo.save();
// Mới:
try {
    await tienDo.save();
} catch (saveErr) {
    if (saveErr && saveErr.code === 11000) {
        return res.status(409).json({ error: 'Trùng tuần đã tồn tại', code: 'TRUNG_TUAN_DA_TON_TAI' });
    }
    throw saveErr;
}
```

> Lưu ý: khối check `blockers.includes('TRUNG_TUAN')` hiện có giữ nguyên làm lớp phòng vệ — không xung đột vì logic mới đã xử lý trước.

### 2.2. Frontend — `frontend/src/components/lecturer/SubmissionReview.js`

Trong Modal đánh giá tuần, thêm option `KhongDat` vào `Select` trạng thái (~dòng 906-912):

```jsx
options={[
  { value: 'ChoDanhGia', label: 'Chờ đánh giá' },
  { value: 'Dat', label: 'Đạt' },
  { value: 'CanBoSung', label: 'Cần bổ sung' },
  { value: 'KhongDat', label: 'Không đạt' },
]}
```

### 2.3. Frontend — `frontend/src/components/student/ProgressLog.js`

Thêm nút "Nộp lại tuần" cho card có `TrangThaiDanhGia === 'KhongDat'` (record `KhongDat` không sửa được, phải tạo mới).

Thêm handler:

```js
const openResubmitModal = (log) => {
    setEditingLog(null); // tạo mới → gọi createProgressEntry, BE tự tính LanNopLai
    form.resetFields();
    form.setFieldsValue({ tuanSo: log.TuanSo });
    setIsModalVisible(true);
};
```

Trong phần render card tuần, bổ sung nhánh cho `KhongDat` (cạnh nhánh `CanBoSung` hiện có, ~dòng 349-355):

```jsx
{item.TrangThaiDanhGia === 'KhongDat' && (
    <div style={{ marginTop: 12 }}>
        <Button danger onClick={() => openResubmitModal(item)}>
            Nộp lại tuần {item.TuanSo}
        </Button>
    </div>
)}
```

### 2.4. Test Phase 2

1. GV mở modal đánh giá tuần → chọn được "Không đạt" → lưu → record chuyển `KhongDat`.
2. SV thấy nút "Nộp lại tuần X" trên card `KhongDat` → bấm → modal tạo mới hiện `tuanSo` đã điền sẵn.
3. SV nộp lại tuần đó → tạo thành công record mới `LanNopLai = 1`, **không còn lỗi 500**.
4. SV nộp trùng tuần đang `ChoDanhGia`/`Dat`/`CanBoSung` → trả **409** `TRUNG_TUAN_DA_TON_TAI`.

---

## Phase 3 — 🟡 Nhận xét rubrics theo tiêu chí (tuần)

### 3.0. Mô tả

Modal đánh giá tuần (`SubmissionReview.js` ~dòng 952) hiển thị `criteria.GV_NhanXet` — **field không tồn tại**. Schema `TienDo.RubricsTuan` dùng `NhanXetTieuChi` (`backend/models/TienDo.js:38`). Đồng thời chưa có ô để GV nhập nhận xét cho từng tiêu chí.

### 3.1. Frontend — `frontend/src/components/lecturer/SubmissionReview.js`

Trong khối render từng `criteria` của `weeklyRubrics` (~dòng 927-956):

- Sửa dòng hiển thị nhận xét: `criteria.GV_NhanXet` → `criteria.NhanXetTieuChi`.
- Thêm `Input.TextArea` (1 dòng) để nhập `NhanXetTieuChi`, `onChange` cập nhật vào `weeklyRubrics[idx].NhanXetTieuChi`:

```jsx
<Input.TextArea
  rows={1}
  placeholder="Nhận xét tiêu chí (tùy chọn)"
  value={criteria.NhanXetTieuChi || ''}
  style={{ marginTop: 8 }}
  onChange={e => {
    const updated = [...weeklyRubrics];
    updated[idx] = { ...updated[idx], NhanXetTieuChi: e.target.value };
    setWeeklyRubrics(updated);
  }}
/>
```

> `weeklyRubrics` đã được gửi nguyên trong payload `rubricsTuan` khi bấm "Lưu kèm Rubrics" → backend `evaluateProgress` lưu thẳng vào `RubricsTuan` (schema có sẵn `NhanXetTieuChi`). Không cần sửa backend.

### 3.2. Test Phase 3

1. GV nhập nhận xét cho 1 tiêu chí → "Lưu kèm Rubrics" → mở lại modal thấy nhận xét được giữ.
2. SV xem Collapse "Chi tiết rubrics tuần" trong `ProgressLog.js` → nhận xét tiêu chí hiển thị đúng (component này đã dùng đúng `NhanXetTieuChi`).

---

## Phase 4 — ⚪ Polish nhỏ (tùy chọn)

Không bắt buộc, làm nếu còn thời gian.

1. **Disclaimer điểm quá trình** — `SubmissionReview.js`, card "Tóm tắt tiến độ tuần" trong Drawer chấm cuối kỳ (~dòng 529-559): thêm dòng ghi chú theo blueprint §7.2:
   > *"Điểm quá trình chỉ mang tính tham khảo — KHÔNG tự cộng vào điểm cuối kỳ."*

2. **Encoding `LoaiCapNhat`** — `tienDoController.createProgressEntry` đang default `loaiCapNhat || 'Khac'` (không dấu) trong khi schema default `'Khác'` (có dấu). Đổi default trong controller thành `'Khác'` cho nhất quán. Không sửa hàng loạt file để fix encoding (theo rule blueprint).

3. **`ProgressLog.js` form tuần** — blueprint §7.1 đề xuất tách phần "Cập nhật ngắn (không theo tuần)" vào `Collapse`. Hiện form gộp chung vẫn hoạt động đúng cho cả 2 loại record; chỉ là khác biệt UX nhỏ. Có thể bỏ qua.

---

## Ghi chú quan trọng cho Codex

- **KHÔNG** đổi tên field cũ, **KHÔNG** xóa endpoint/method cũ, **KHÔNG** thêm dependency npm mới.
- **KHÔNG** ghi blockchain cho điểm tuần.
- Giữ nguyên contract response (chỉ thêm field, không bớt).
- Helper `normalizeMinhChung` phải nhận được cả 2 dạng key (camelCase và PascalCase) để tương thích dữ liệu cũ.
- Routes `/api/tiendo/*` hiện **không có** middleware `authenticateToken` → các permission check dựa trên `req.user` đang fail-open; đây là thiết kế sẵn có của repo, **không nằm trong phạm vi** kế hoạch này (không tự thêm auth middleware).

## Lệnh kiểm tra sau khi xong

```powershell
# backend (thư mục backend)
node -e "require('./models/DiemSo'); require('./models/TienDo'); console.log('schema ok')"

# frontend (thư mục frontend)
npm run build
```

Sau đó chạy lại checklist test của từng Phase ở trên.
