# Hướng Dẫn Test — Chấm Điểm & Tiến Độ Tuần

> **Phạm vi**: Kiểm thử toàn bộ tính năng đã triển khai theo 2 tài liệu:
> - **Plan 1 — Blueprint**: `technical_blueprint_cham_diem_tien_do.md` (tiến độ tuần, chấm rubrics tuần, chấm điểm cuối kỳ).
> - **Plan 2 — Kế hoạch fix**: `ke_hoach_fix_cham_diem_tien_do.md` (sửa lỗi MinhChung, luồng "Không Đạt", nhận xét rubrics).
>
> **Ngày tạo**: 2026-05-17
> **Cách dùng**: Làm tuần tự từ Mục 0 → Mục B. Mỗi case có ô `[ ]` để tick khi đạt.

---

## 0. Chuẩn bị môi trường

### 0.1. Khởi động hệ thống

| Thành phần | Lệnh (PowerShell) | Cổng |
|---|---|---|
| MongoDB | Chạy service MongoDB (hoặc MongoDB Compass) | 27017 |
| Backend | `cd backend` → `npm start` | 5000 |
| ML Service (PhoBERT) | Khởi động FastAPI (xem `huong_dan_chay_project.md`) | 8001 |
| Frontend | `cd frontend` → `npm start` | 3000 |

> ML Service không bắt buộc cho phần tiến độ tuần, nhưng cần cho AI phân tích báo cáo cuối kỳ. Nếu tắt, AI sẽ trả điểm fallback 7.0.

### 0.2. Kiểm tra schema không lỗi

```powershell
cd backend
node -e "require('./models/DiemSo'); require('./models/TienDo'); console.log('schema ok')"
```
✅ Kết quả mong đợi: in ra `schema ok`, không crash.

### 0.3. Tài khoản cần chuẩn bị

- **1 Giảng viên (GV)** — ví dụ: GV hướng dẫn đề tài.
- **1 Sinh viên (SV-A)** — đã đăng ký 1 đề tài của GV trên và **được duyệt** (`TrangThai = DaDuyet`).
- **1 Sinh viên (SV-B)** — *tùy chọn*, dùng cho case kiểm tra phân quyền (đề tài của GV khác).

> Để SV cập nhật tiến độ được, đăng ký đề tài **bắt buộc** ở trạng thái `DaDuyet`. Trong ảnh hiện trạng đề tài đang "Chờ Duyệt" → GV phải vào trang quản lý đăng ký bấm **Duyệt** trước khi test.

### 0.4. Công cụ kiểm tra dữ liệu (khuyến nghị)

- **MongoDB Compass** hoặc `mongosh` — để xác minh dữ liệu lưu trong collection `tiendos`, `diemsos`.
- **DevTools trình duyệt** (F12 → Network) — để xem request/response API.

---

## PHẦN A — Test Plan 1 (Blueprint)

### A1. Sinh viên tạo báo cáo tiến độ tuần

**Trang**: Đăng nhập SV-A → menu **Nhật Ký Tiến Độ**.

- [ ] **A1.1** — Bấm **Cập Nhật Tiến Độ** → modal mở. Nhập:
  - Tuần số: `1`
  - Thời gian tuần: chọn khoảng ngày
  - Mục tiêu tuần: "Hoàn thành module đăng nhập MetaMask"
  - Nội dung đã làm: nhập đoạn văn **dài hơn 30 ký tự**
  - Kế hoạch tuần sau: nhập nội dung (để tránh cảnh báo)
  - Mức độ hoàn thành: `40`
  → Bấm **Cập Nhật**.
  ✅ Mong đợi: thông báo "Cập nhật tiến độ thành công"; card **Tuần 1** xuất hiện dưới mục "Tuần 1".

- [ ] **A1.2** — Tạo tiếp **Tuần 2**, % = `70`, đầy đủ thông tin.
  ✅ Mong đợi: card "Tuần 2" hiện ở nhóm riêng, sắp xếp tuần tăng dần.

- [ ] **A1.3** — Tạo entry **không nhập Tuần số** (chỉ điền phần "Cập nhật ngắn": loại công việc + % + nội dung).
  ✅ Mong đợi: entry rơi vào nhóm **"Cập nhật khác"**, không bị nhóm theo tuần.

- [ ] **A1.4** — Nút **Cập Nhật Tiến Độ** bị **disable** khi SV chưa có đề tài `DaDuyet` (test bằng tài khoản SV chưa được duyệt).

### A2. Phát hiện bất thường (Anomaly Detection)

- [ ] **A2.1 — GIAM_PHAN_TRAM (chặn cứng)**: Tạo Tuần 3 với % = `50` (thấp hơn Tuần 2 = 70%).
  ✅ Mong đợi: hiện hộp thoại xác nhận *"Tiến độ thấp hơn tuần trước"*. Bấm **Hủy** → không gửi. Bấm **Xác nhận** → gửi thành công (`confirmGiam=true`).

- [ ] **A2.2 — NOI_DUNG_NGAN**: Tạo 1 tuần với "Nội dung đã làm" **dưới 30 ký tự**.
  ✅ Mong đợi: tạo thành công, card hiển thị Alert vàng "Cảnh báo tiến độ" chứa mã `NOI_DUNG_NGAN`.

- [ ] **A2.3 — THIEU_KE_HOACH**: Tạo 1 tuần để trống "Kế hoạch tuần sau".
  ✅ Mong đợi: cảnh báo `THIEU_KE_HOACH` xuất hiện.

- [ ] **A2.4 — KHONG_MINH_CHUNG_NHUNG_CAO**: Tạo tuần có % ≥ `70` nhưng **không thêm minh chứng**.
  ✅ Mong đợi: cảnh báo `KHONG_MINH_CHUNG_NHUNG_CAO`.

- [ ] **A2.5 — TRUNG_TUAN (chặn cứng)**: Tạo lại đúng **Tuần 1** (đã tồn tại, chưa bị KhongDat).
  ✅ Mong đợi: lỗi **409**, thông báo "Trùng tuần đã tồn tại".

### A3. Giảng viên chấm rubrics tuần

**Trang**: Đăng nhập GV → **Duyệt Báo Cáo & Chấm Điểm** → cột Thao Tác bấm **Tiến Độ** (Drawer tiến độ mở).

- [ ] **A3.1** — Drawer hiển thị tiến độ **nhóm theo tuần** ("Tiến độ theo tuần" + "Cập nhật khác").

- [ ] **A3.2** — Bấm **Đánh Giá Tuần** trên 1 card → Modal "Đánh giá tuần X" mở, hiển thị: thời gian tuần, mục tiêu, đã làm, khó khăn, kế hoạch, panel cảnh báo (nếu có).

- [ ] **A3.3 — Chấm rubrics đầy đủ**: Trong modal, nhập điểm `DiemGV` cho cả 5 tiêu chí (DUNG_HAN, HOAN_THANH, CHAT_LUONG, KHO_KHAN, KE_HOACH). Quan sát dòng **"Điểm tuần (rubrics): X / 10"** cập nhật **realtime**.
  - Chọn Trạng thái = **Đạt** → bấm **Lưu kèm Rubrics**.
  ✅ Mong đợi: "Lưu đánh giá tuần thành công"; card tuần hiển thị Tag **"Điểm tuần: X"**.
  ✅ Kiểm chứng công thức: `DiemTienDo = Σ(DiemGV/DiemToiDa × TrongSo) / 100 × 10`, làm tròn 2 số lẻ. Ví dụ tất cả DiemGV=8 → DiemTienDo = 8.

- [ ] **A3.4 — Chấm nhanh (không rubrics)**: Mở modal tuần khác → chỉ chọn trạng thái + nhập nhận xét → bấm **Lưu nhanh**.
  ✅ Mong đợi: lưu thành công, `TrangThaiDanhGia` + `NhanXetGV` cập nhật, **không** thay đổi `DiemTienDo`.

- [ ] **A3.5 — Phân quyền GV**: Dùng GV khác (không sở hữu đề tài) gọi đánh giá tuần của SV-A.
  ✅ Mong đợi: lỗi **403** `KHONG_PHAI_GV_HUONG_DAN`. (Có thể test bằng API ở Mục D.)

### A4. Trạng thái đánh giá tuần & sửa lại

- [ ] **A4.1 — CanBoSung**: GV chấm 1 tuần với trạng thái **Cần bổ sung**.
  ✅ Mong đợi: phía SV, card tuần đó hiện Tag "CanBoSung" + nút **"Sửa & nộp lại"**.

- [ ] **A4.2** — SV bấm "Sửa & nộp lại" → sửa nội dung → gửi lại.
  ✅ Mong đợi: cập nhật thành công; `LanNopLai` tăng +1, trạng thái về `ChoDanhGia` (kiểm tra trong DB hoặc Drawer GV thấy Tag "Nộp lại lần 1").

- [ ] **A4.3 — Khóa khi Dat**: SV thử sửa 1 tuần đã được chấm **Đạt**.
  ✅ Mong đợi: không có nút sửa; nếu gọi API trực tiếp → lỗi **403** `KHONG_DUOC_SUA_DA_DAT`.

### A5. Chấm điểm cuối kỳ (chamDiem) + Blockchain

**Chuẩn bị**: SV-A vào **Nộp Báo Cáo** → nộp 1 file PDF (lên IPFS).
**Trang GV**: **Duyệt Báo Cáo & Chấm Điểm** → bấm **Chấm Điểm & Review**.

- [ ] **A5.1** — Drawer mở, AI PhoBERT phân tích (hoặc fallback nếu tắt ML). Hiển thị card **"Tóm tắt tiến độ tuần"**: tổng số tuần, số tuần đạt, điểm TB tuần đạt.

- [ ] **A5.2 — Chấm điểm thành công**: Nhập điểm (0–10) → bấm **Ký Số MetaMask & Ghi Blockchain**.
  ✅ Mong đợi: thông báo thành công; record `DiemSo` được tạo.
  ✅ Kiểm tra DB collection `diemsos`: có `Diem`, `GiangVienCham` **và** `GiangVienCam` cùng giá trị, `SubmissionIndex` là số thật, `TrangThaiBlockchain`.

- [ ] **A5.3 — Validate điểm**: Gọi API chấm điểm với `diem = 15` (ngoài 0–10).
  ✅ Mong đợi: lỗi **400** `INVALID_DIEM`. (Test qua API Mục D.)

- [ ] **A5.4 — Idempotency**: Chấm lại đúng báo cáo đã chấm.
  ✅ Mong đợi: lỗi **409** `DA_CHAM_BAOCAO_NAY`.

- [ ] **A5.5 — Blockchain lỗi vẫn lưu DB**: Sửa `.env` backend đặt `PRIVATE_KEY` sai → restart backend → chấm điểm 1 báo cáo mới.
  ✅ Mong đợi: vẫn trả **201**, `blockchain.status = 'LoiGhi'`; record `DiemSo` **vẫn được lưu** với `TrangThaiBlockchain = 'LoiGhi'` và `LoiBlockchain` có nội dung lỗi. (Nhớ khôi phục `.env` sau khi test.)

### A6. Hiển thị tiến độ cho sinh viên

- [ ] **A6.1** — Trang **Kết Quả & Điểm** (`/student/progress`): card **"Tiến độ tuần gần nhất"** hiển thị Tuần, % hoàn thành, trạng thái, điểm tuần (nếu có).

- [ ] **A6.2** — Trang **Dashboard Sinh Viên**: card "Tiến Độ & Điểm" hiển thị dòng **"Điểm quá trình TB"** = trung bình `DiemTienDo` các tuần `Dat` (chỉ hiện khi có ≥1 tuần Đạt).

### A7. Tương thích ngược (Regression)

- [ ] **A7.1** — Record cũ chỉ có `NoiDung` (không `TuanSo`) → vẫn render trong nhóm "Cập nhật khác".
- [ ] **A7.2** — `GET /api/diemso/sinhvien/:svId` vẫn trả đúng cho màn hình điểm.
- [ ] **A7.3** — `PUT /api/tiendo/:id/nhanxet` (legacy) vẫn cập nhật `NhanXetGV`, **không** đổi `TrangThaiDanhGia`. (Drawer GV: ở mục "Cập nhật khác" có ô nhập nhận xét nhanh + nút Gửi.)

---

## PHẦN B — Test Plan 2 (Kế hoạch fix)

### B1. Phase 1 — Minh chứng không bị mất dữ liệu

> Lỗi cũ: form gửi key `tenFile/url/ghiChu` (camelCase) nhưng schema dùng `TenFile/Url/GhiChu` → minh chứng bị lưu rỗng.

- [ ] **B1.1 — Lưu minh chứng**: SV tạo báo cáo tuần, trong phần **Minh chứng** bấm "Thêm minh chứng", nhập:
  - Tên file: `demo.png`
  - URL: `https://example.com/demo.png`
  - Ghi chú: `Ảnh giao diện`
  → Gửi.
  ✅ Mong đợi: card tuần hiển thị mục **Minh chứng** với link `demo.png` bấm được.
  ✅ Kiểm tra DB `tiendos`: field `MinhChung` có object `{ TenFile: "demo.png", Url: "https://...", GhiChu: "Ảnh giao diện" }` — **đầy đủ, không rỗng**.

- [ ] **B1.2 — Sửa giữ nguyên minh chứng**: SV bấm "Sửa & nộp lại" (trên tuần `CanBoSung`) hoặc mở lại form sửa.
  ✅ Mong đợi: ô minh chứng **hiện lại đúng** Tên file / URL / Ghi chú đã nhập trước đó (không trống).

- [ ] **B1.3 — GV xem minh chứng**: GV mở Drawer tiến độ.
  ✅ Mong đợi: mục "Minh chứng" hiển thị link bấm được, **không** còn `[object Object]`.

### B2. Phase 2 — Luồng trạng thái "Không Đạt" (KhongDat)

- [ ] **B2.1 — GV đánh trượt tuần**: Mở modal "Đánh giá tuần", mở dropdown Trạng thái.
  ✅ Mong đợi: có đủ 4 lựa chọn: Chờ đánh giá / Đạt / Cần bổ sung / **Không đạt**.
  → Chọn **Không đạt** → Lưu.

- [ ] **B2.2 — SV thấy nút nộp lại**: Đăng nhập SV-A, vào Nhật Ký Tiến Độ.
  ✅ Mong đợi: card tuần `KhongDat` hiển thị Tag đỏ + nút **"Nộp lại tuần X"** (KHÔNG có nút "Sửa & nộp lại" vì record cũ bị khóa).

- [ ] **B2.3 — Nộp lại thành công (không còn lỗi 500)**: Bấm "Nộp lại tuần X" → modal tạo mới mở với **Tuần số đã điền sẵn** → nhập nội dung → Gửi.
  ✅ Mong đợi: tạo thành công, **không** lỗi 500.
  ✅ Kiểm tra DB: có record mới cùng `TuanSo` nhưng `LanNopLai = 1` (record `KhongDat` cũ vẫn còn, `LanNopLai = 0`).

- [ ] **B2.4 — Chặn trùng tuần đang hoạt động**: Tạo lại một tuần đang ở trạng thái `ChoDanhGia` / `Dat` / `CanBoSung`.
  ✅ Mong đợi: lỗi **409** `TRUNG_TUAN_DA_TON_TAI` (không phải 500).

### B3. Phase 3 — Nhận xét rubrics theo tiêu chí

- [ ] **B3.1** — GV mở modal "Đánh giá tuần" → mỗi dòng rubrics có **ô nhập nhận xét tiêu chí** (TextArea "Nhận xét tiêu chí (tùy chọn)").
  → Nhập nhận xét cho 1–2 tiêu chí → chọn trạng thái → **Lưu kèm Rubrics**.

- [ ] **B3.2** — Mở lại modal đánh giá tuần đó.
  ✅ Mong đợi: nhận xét tiêu chí **được giữ lại**, hiển thị đúng (không trống).

- [ ] **B3.3** — Phía SV: mở Collapse **"Chi tiết rubrics tuần"** trên card.
  ✅ Mong đợi: từng tiêu chí hiển thị `DiemGV/DiemToiDa` + nhận xét tiêu chí đã nhập.

---

## PHẦN C — Bảng checklist tổng hợp

| Nhóm | Case | Kết quả mong đợi | Đạt |
|---|---|---|:--:|
| Blueprint | A1 Tạo tiến độ tuần | Group theo tuần, record legacy vào "Cập nhật khác" | [ ] |
| Blueprint | A2 Anomaly | GIAM/TRUNG chặn cứng; còn lại cảnh báo | [ ] |
| Blueprint | A3 Rubrics tuần | DiemTienDo đúng công thức | [ ] |
| Blueprint | A4 Trạng thái | CanBoSung sửa được, Dat bị khóa | [ ] |
| Blueprint | A5 Chấm cuối kỳ | Validate + 409 + blockchain LoiGhi vẫn lưu | [ ] |
| Blueprint | A6 Hiển thị SV | Card tuần gần nhất + Điểm quá trình TB | [ ] |
| Blueprint | A7 Regression | Endpoint legacy vẫn chạy | [ ] |
| Fix | B1 MinhChung | Lưu/sửa/hiển thị đầy đủ, không mất dữ liệu | [ ] |
| Fix | B2 KhongDat | Nộp lại được, LanNopLai+1, không lỗi 500 | [ ] |
| Fix | B3 Nhận xét rubrics | Nhập + lưu + hiển thị nhận xét tiêu chí | [ ] |

---

## PHẦN D — Test nhanh bằng API (cho case khó tái hiện qua UI)

Dùng PowerShell. Thay `<...>` bằng ObjectId thật (lấy từ MongoDB Compass).

### D1. Chấm điểm sai khoảng (INVALID_DIEM)

```powershell
$body = @{ baoCaoId='<id>'; deTaiId='<id>'; sinhVienId='<id>'; giangVienId='<id>'; diem=15 } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5000/api/diemso' -Method Post -Body $body -ContentType 'application/json'
```
✅ Mong đợi: HTTP 400, `code = INVALID_DIEM`.

### D2. GV không sở hữu đề tài chấm tuần (403)

```powershell
$body = @{ giangVienId='<id_GV_khac>'; trangThaiDanhGia='Dat' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5000/api/tiendo/<tienDoId>/danhgia' -Method Put -Body $body -ContentType 'application/json'
```
✅ Mong đợi: HTTP 403, `code = KHONG_PHAI_GV_HUONG_DAN`.

### D3. Rubrics tuần tổng trọng số ≠ 100

```powershell
$body = @{
  giangVienId='<id>'; trangThaiDanhGia='Dat';
  rubricsTuan=@(@{ MaTieuChi='DUNG_HAN'; TrongSo=50; DiemToiDa=10; DiemGV=8 })
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri 'http://localhost:5000/api/tiendo/<tienDoId>/danhgia' -Method Put -Body $body -ContentType 'application/json'
```
✅ Mong đợi: HTTP 400, `code = RUBRICS_TONG_TRONGSO_KHAC_100`.

### D4. Kiểm tra route legacy còn sống

```powershell
Invoke-RestMethod -Uri 'http://localhost:5000/api/tiendo/<svId>' -Method Get          # legacy
Invoke-RestMethod -Uri 'http://localhost:5000/api/tiendo/sinhvien/<svId>' -Method Get  # mới
Invoke-RestMethod -Uri 'http://localhost:5000/api/tiendo/detai/<deTaiId>' -Method Get  # GV xem
```
✅ Mong đợi: cả 3 đều trả `{ data: [...] }`, không lỗi định tuyến.

---

## Lưu ý khi test

- Sau khi test **A5.5** (blockchain lỗi), nhớ **khôi phục `PRIVATE_KEY`** trong `.env` và restart backend.
- Cảnh báo `NOP_DON` chỉ xuất hiện khi tạo ≥3 tuần trong vòng 30 phút — bình thường khó gặp, có thể bỏ qua nếu không cần.
- Nếu ML Service (cổng 8001) tắt: AI phân tích báo cáo cuối kỳ trả điểm fallback `7.0` — không ảnh hưởng phần tiến độ tuần.
- Mọi mã cảnh báo (`GIAM_PHAN_TRAM`, `NOI_DUNG_NGAN`...) hiển thị nguyên mã tiếng Anh trong Alert — đúng thiết kế hiện tại.
