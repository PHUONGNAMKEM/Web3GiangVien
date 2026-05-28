# Luồng Nghiệp Vụ: Quản lý Môn học → Lớp học → Đề tài → Nhóm SV

Ngày tạo: 2026-05-21

---

## Sơ đồ tổng thể

```
👨‍🏫 Giảng Viên (VD: PGS.TS Phong)
  │
  ├── 📘 Môn Học 1: "Công nghệ Blockchain" (COMP1413)
  │     │
  │     ├── 🏫 Lớp 21DHT01 ── có 30 SV
  │     ├── 🏫 Lớp 21DHT02 ── có 25 SV
  │     │
  │     ├── 📝 Đề tài: "Xây dựng DApp bất động sản"
  │     └── 📝 Đề tài: "Ví điện tử Web3 mobile"
  │
  └── 📘 Môn Học 2: "Trí tuệ nhân tạo" (COMP1520)
        │
        ├── 🏫 Lớp 22DHT01 ── có 35 SV
        │
        ├── 📝 Đề tài: "Phân tích sentiment crypto"
        └── 📝 Đề tài: "Dự đoán giá token bằng LSTM"
```

---

## Giải thích từng mối quan hệ

### 1. Giảng Viên → Môn Học (1 : Nhiều)

- Một giảng viên có thể **phụ trách nhiều môn học** khác nhau.
- VD: Thầy Phong dạy cả môn "Blockchain" lẫn môn "Trí tuệ nhân tạo".

### 2. Môn Học → Lớp Học (1 : Nhiều)

- Mỗi môn học có thể mở ra **nhiều lớp** (vì sinh viên đông, chia thành nhiều lớp).
- VD: Môn "Blockchain" có 2 lớp: 21DHT01 và 21DHT02.
- Mỗi lớp chứa **danh sách sinh viên** thuộc lớp đó.

### 3. Môn Học → Đề Tài (1 : Nhiều)

- Mỗi môn học có thể có **nhiều đề tài** để sinh viên chọn đăng ký.
- VD: Môn "Blockchain" có 2 đề tài cho SV chọn.
- Trường `MonHoc` trong `DeTai` là **optional** (tùy chọn). Đề tài cũ tạo trước khi có tính năng này vẫn hoạt động bình thường.

### 4. Lớp Học → Sinh Viên (Nhiều : Nhiều)

- Một lớp có **nhiều sinh viên**.
- Một sinh viên cũng có thể thuộc **nhiều lớp** khác nhau (nếu học nhiều môn).

### 5. Sinh Viên → Nhóm → Đề Tài (đăng ký)

- Sinh viên trong lớp tự lập nhóm (model `Nhom`).
- Nhóm đăng ký đề tài (model `DangKyDeTai`).
- Khi giảng viên xem chi tiết lớp học, hệ thống hiển thị: SV nào thuộc nhóm nào, đăng ký đề tài nào, trạng thái ra sao.

---

## Luồng nghiệp vụ theo thứ tự

```
Bước 1: GV tạo Môn Học
         ↓
Bước 2: GV tạo Lớp Học cho môn đó
         ↓
Bước 3: GV thêm Sinh Viên vào lớp
         ↓
Bước 4: GV tạo Đề Tài cho môn (gắn field MonHoc)
         ↓
Bước 5: SV trong lớp lập Nhóm
         ↓
Bước 6: Nhóm đăng ký Đề Tài
         ↓
Bước 7: GV vào Chi Tiết Lớp → xem nhóm nào chọn đề tài nào
```

---

## Mapping với MongoDB Models

| Bước | Model | Collection |
|------|-------|------------|
| Tạo môn học | `MonHoc` | `monhocs` |
| Tạo lớp học | `LopHoc` | `lophocs` |
| Thêm SV vào lớp | `LopHoc.SinhVien[]` | `lophocs` |
| Tạo đề tài | `DeTai` (field MonHoc) | `detais` |
| Lập nhóm | `Nhom` | `nhoms` |
| Đăng ký đề tài | `DangKyDeTai` | `dangkydetais` |

---

## Ghi chú

- Đề tài cũ (chưa gắn MonHoc) vẫn hoạt động bình thường — trường MonHoc là optional.
- Khi xem chi tiết lớp, backend lọc đăng ký chỉ liên quan SV trong lớp đó (không lẫn lộn với lớp khác).
- Một SV có thể thuộc nhiều lớp nhưng mỗi nhóm chỉ đăng ký được 1 đề tài tại một thời điểm.
