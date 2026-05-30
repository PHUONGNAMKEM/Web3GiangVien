# Hướng Dẫn Test Luồng Mới — Web3 Competition Platform

**Ngày:** 2026-05-30  
**Dữ liệu sẵn có:**
- GV: **PGS.TS Phong** (GV003) — wallet `0xf56ca4...`
- SV1: **Phong Le** (SVEDA301) — wallet `0x0f662e...`
- SV2: **Diễm My** (SV4C2231) — wallet `0xd26a77...`
- SV3: **Trần Minh Anh** (SV25ADD9) — wallet `0x44c832...`
- SV4: **Nguyễn Thanh Tuấn** (SV0A9E53) — wallet `0x186cda...`

---

## Tổng quan luồng test

```
Bước 1: GV đăng nhập → Tạo Môn Học
Bước 2: GV tạo Lớp Học (thuộc Môn Học) → Thêm SV vào lớp
Bước 3: GV tạo Đề Tài gắn với Lớp Học
    ├── Đề tài A: Không có bài test (đăng ký tự do)
    └── Đề tài B: Có bài test cạnh tranh (CoBaiTest = true)
Bước 4: SV đăng nhập → Tạo nhóm (gắn lớp) → Đăng ký đề tài
Bước 5: (Đề tài B) SV làm bài test cạnh tranh
Bước 6: GV duyệt đăng ký
Bước 7: SV nộp báo cáo
Bước 8: GV chấm điểm (cả nhóm)
Bước 9: GV điều chỉnh điểm riêng cho 1 SV
```

---

## BƯỚC 1: Giảng viên đăng nhập

1. Mở trình duyệt → `http://localhost:3000`
2. Nhấn **"Đăng nhập bằng MetaMask"**
3. Chọn tài khoản MetaMask có wallet address `0xf56ca4437a2c3ae3a594ff8a2dd9aed8ec3f1289` (PGS.TS Phong)
4. Ký xác thực → hệ thống nhận diện là **Giảng Viên** và hiển thị Dashboard GV

---

## BƯỚC 2: Tạo Môn Học + Lớp Học

### 2a. Tạo Môn Học
1. Vào menu **"Quản Lý Môn Học"** (hoặc "Subject Management")
2. Nhấn **"Thêm Môn Học"**
3. Nhập:
   - Mã Môn Học: `CNTT_TEST_01`
   - Tên Môn Học: `Đồ Án Chuyên Ngành CNTT`
4. Nhấn **Lưu**

### 2b. Tạo Lớp Học
1. Vào menu **"Quản Lý Lớp Học"** (hoặc "Class Management")
2. Nhấn **"Tạo Lớp Học"**
3. Nhập:
   - Mã Lớp: `LOP_TEST_A`
   - Tên Lớp: `Lớp CNTT K22A`
   - Chọn Môn Học: `Đồ Án Chuyên Ngành CNTT`
4. Nhấn **Lưu**

### 2c. Thêm Sinh Viên vào Lớp
Có 2 cách:

**Cách 1 — Thêm từng SV:**
1. Trong chi tiết lớp học, nhấn **"Thêm sinh viên"**
2. Chọn sinh viên từ danh sách hoặc nhập Mã SV

**Cách 2 — Import hàng loạt bằng Mã SV (MỚI):**
1. Nhấn **"Import SV"**
2. Nhập danh sách Mã SV (cách nhau bằng dấu phẩy hoặc xuống dòng):
   ```
   SVEDA301
   SV4C2231
   SV25ADD9
   SV0A9E53
   ```
3. Nhấn **"Import"** → hệ thống tìm SV theo MaSV và thêm vào lớp

> **Kết quả mong đợi:** Lớp `LOP_TEST_A` có 4 sinh viên: Phong Le, Diễm My, Trần Minh Anh, Nguyễn Thanh Tuấn.

---

## BƯỚC 3: Tạo Đề Tài gắn Lớp Học

### 3a. Đề tài A — Không có bài test
1. Vào menu **"Quản Lý Đề Tài"** (Topic Management)
2. Nhấn **"Tạo Đề Tài"**
3. Nhập:
   - Tên: `Xây dựng Web App quản lý sinh viên`
   - Mô tả: `(nhập mô tả tùy ý)`
   - Số lượng SV: `2` (đề tài nhóm 2 người)
   - Deadline: `(chọn ngày trong tương lai)`
   - **Lớp Học: Chọn `Lớp CNTT K22A`** ← **ĐÂY LÀ BƯỚC MỚI**
   - Bài test cạnh tranh: **TẮT**
4. Nhấn **Lưu**

### 3b. Đề tài B — Có bài test cạnh tranh
1. Nhấn **"Tạo Đề Tài"** lần nữa
2. Nhập:
   - Tên: `Nghiên cứu ứng dụng AI trong y tế`
   - Số lượng SV: `2` (đề tài nhóm 2 người)
   - Deadline: `(chọn ngày trong tương lai)`
   - **Lớp Học: Chọn `Lớp CNTT K22A`**
   - **Bài test cạnh tranh: BẬT** ← CoBaiTest = true
3. Nhấn **Lưu**

### 3c. GV tạo bài test cho Đề tài B
1. Mở chi tiết **Đề tài B**
2. Vào tab/phần **"Bài Test Cạnh Tranh"**
3. Tạo bài test với câu hỏi (ví dụ):
   - Câu 1: "Machine Learning là gì?" — 4 đáp án, đáp án đúng: A
   - Câu 2: "Convolutional Neural Network dùng cho?" — đáp án đúng: C
4. Nhấn **Lưu bài test**

> **Kết quả mong đợi:** 2 đề tài thuộc Lớp `LOP_TEST_A`, một cái có bài test cạnh tranh.

---

## BƯỚC 4: Sinh Viên đăng nhập + Tạo Nhóm + Đăng ký

### 4a. SV1 (Phong Le) đăng nhập
1. **Đổi tài khoản MetaMask** sang wallet `0x0f662eca...` (Phong Le)
2. Đăng nhập → hệ thống nhận diện là **Sinh Viên**

### 4b. SV1 tạo Nhóm
1. Vào menu **"Nhóm"** hoặc "Group Management"
2. Nhấn **"Tạo Nhóm"**
3. Nhập:
   - Tên nhóm: `Nhóm Alpha`
   - **Lớp Học: Chọn `Lớp CNTT K22A`** ← **RÀNG BUỘC MỚI: Nhóm gắn lớp**
   - Số lượng: `2`
4. Nhấn **Tạo**

### 4c. SV1 mời SV2 vào nhóm
1. Trong trang nhóm, nhấn **"Mời thành viên"**
2. Nhập Mã SV: `SV4C2231` (Diễm My)
3. Nhấn **Mời**

> **Lưu ý MỚI:** Nếu bạn cố mời SV không thuộc lớp `LOP_TEST_A`, hệ thống sẽ **từ chối** với thông báo lỗi.

### 4d. SV2 (Diễm My) chấp nhận lời mời
1. **Đổi tài khoản MetaMask** sang wallet `0xd26a77...` (Diễm My)
2. Đăng nhập → vào trang chính sẽ thấy **lời mời vào nhóm**
3. Nhấn **"Chấp nhận"**

### 4e. SV1 đăng ký Đề tài A
1. Đăng nhập lại bằng SV1 (Phong Le)
2. Vào **"Đăng Ký Đề Tài"** (Topic Registration)
3. Hệ thống hiển thị danh sách đề tài — **chỉ hiện đề tài thuộc lớp `LOP_TEST_A`** ← LỌC MỚI
4. Nhấn **"Đăng ký"** cho đề tài A (`Xây dựng Web App...`)
5. Hệ thống tự gắn nhóm `Nhóm Alpha` vào đăng ký

> **Ràng buộc MỚI:** Nếu SV1 đã đăng ký Đề tài A trong lớp này, khi cố đăng ký Đề tài B cùng lớp sẽ bị **chặn** ("Đã đăng ký đề tài trong lớp này").

---

## BƯỚC 5: Bài Test Cạnh Tranh (Đề tài B)

### 5a. SV3 + SV4 tạo nhóm và đăng ký Đề tài B
1. **SV3 (Trần Minh Anh)** đăng nhập → tạo nhóm `Nhóm Beta` (gắn lớp `LOP_TEST_A`)
2. Mời **SV4 (Nguyễn Thanh Tuấn)** → SV4 chấp nhận
3. SV3 đăng ký **Đề tài B** (`Nghiên cứu AI trong y tế`)
4. Vì đề tài B có `CoBaiTest = true`, trạng thái đăng ký sẽ thành **"ChoTest"** (Chờ làm bài test) thay vì "ChoDuyet"

### 5b. SV3 làm bài test
1. Vào trang đề tài → thấy nút **"Làm Bài Test"**
2. Trưởng nhóm (SV3) nhấn **"Bắt đầu"** → trạng thái chuyển sang **"DangLamTest"**
3. Trả lời các câu hỏi
4. Nhấn **"Nộp bài"** → trạng thái chuyển sang **"DaSubmit"**

### 5c. GV chọn nhóm thắng
1. **GV** đăng nhập lại
2. Vào **"Bài Test"** của Đề tài B → xem kết quả
3. Nhấn **"Chọn đội thắng"** cho nhóm có điểm cao nhất
4. Nhóm thắng: trạng thái → **"DaDuyet"**; nhóm thua: trạng thái → **"Thua"**

---

## BƯỚC 6: GV Duyệt Đăng Ký (Đề tài A)

1. GV đăng nhập
2. Vào **"Quản Lý Đăng Ký"** (Registration Management)
3. Thấy Nhóm Alpha đăng ký Đề tài A — trạng thái **"ChoDuyet"**
4. Nhấn **"Duyệt"** → trạng thái chuyển sang **"DaDuyet"**

---

## BƯỚC 7: SV Nộp Báo Cáo

1. **SV1 (Phong Le)** đăng nhập — vai trò **Trưởng nhóm**
2. Vào **"Nộp Báo Cáo"** (Report Upload)
3. Kéo thả file PDF
4. Nhấn **"Xác Nhận Nộp Bài"**
5. Hệ thống:
   - Upload file lên IPFS (Pinata)
   - Trích xuất text bằng AI
   - Tạo `BaoCao` cho **CẢ 2 thành viên** nhóm (Phong Le + Diễm My) với **cùng IPFS CID**
   - **MỚI:** Gắn `Nhom` vào mỗi bản ghi BaoCao
   - Ghi transaction lên Blockchain

> **Lưu ý:** Chỉ trưởng nhóm mới được nộp. SV2 (Diễm My) sẽ thấy "Đợi trưởng nhóm nộp bài".

---

## BƯỚC 8: GV Chấm Điểm (Cả Nhóm)

1. **GV** đăng nhập
2. Vào **"Xem Bài Nộp"** (Submission Review)
3. Thấy submission của Nhóm Alpha — hiển thị cả 2 thành viên
4. Nhấn **"Chấm điểm"** cho submission
5. GV nhập:
   - Điểm: `7.5`
   - Nhận xét: `"Báo cáo tốt, cần cải thiện phần thiết kế"`
6. Nhấn **Lưu**

> **Kết quả MỚI:**
> - Hệ thống tạo `DiemSo` cho **CẢ HAI** SV trong nhóm
> - Mỗi `DiemSo`: `Diem = 7.5`, `DiemGoc = 7.5`, `LaDieuChinh = false`
> - Ghi điểm lên Blockchain cho từng SV

---

## BƯỚC 9: GV Điều Chỉnh Điểm Riêng (MỚI) ⭐

Đây là tính năng hoàn toàn MỚI trong refactor.

1. GV vẫn ở trang **Submission Review**
2. Nhìn thấy danh sách thành viên nhóm và điểm:
   - Phong Le: 7.5 (gốc)
   - Diễm My: 7.5 (gốc)
3. GV thấy **Diễm My đóng góp ít hơn** → nhấn nút **"Điều chỉnh"** bên cạnh tên Diễm My
4. Modal hiện ra, GV nhập:
   - Điểm mới: `6.0`
   - Lý do: `"Đóng góp ít hơn so với trưởng nhóm"`
5. Nhấn **Xác nhận**

> **Kết quả:**
> - `DiemSo` của Diễm My cập nhật: `Diem = 6.0`, `DiemGoc = 7.5` (vẫn giữ), `LaDieuChinh = true`
> - Ghi lại lên Blockchain (ghi đè điểm mới)
> - `DiemSo` của Phong Le: **KHÔNG thay đổi** — vẫn `7.5`

---

## Kiểm Tra Kết Quả

### Phía SV
1. Đăng nhập bằng SV1 (Phong Le) → vào **"Tiến Độ"** hoặc **Dashboard** → thấy điểm `7.5`
2. Đăng nhập bằng SV2 (Diễm My) → thấy điểm `6.0` + ghi chú "Đã điều chỉnh"

### Phía GV
1. Vào **"So Sánh Điểm"** (Score Comparison) → thấy cả điểm AI, điểm GV, và cờ `LaDieuChinh`

### Blockchain
1. Trên Dashboard, điểm có **TxHash** — click để xem transaction trên Blockchain explorer

---

## Lỗi Mong Đợi (Happy Path Validation)

Những lỗi sau là **đúng hành vi mới**, không phải bug:

| Hành động | Kết quả mong đợi |
|---|---|
| SV lớp B đăng ký đề tài lớp A | ❌ Bị chặn: "Không thuộc lớp học" |
| SV đăng ký 2 đề tài cùng 1 lớp | ❌ Bị chặn: "Đã đăng ký đề tài trong lớp" |
| Mời SV lớp khác vào nhóm | ❌ Bị chặn: "SV không thuộc lớp học của nhóm" |
| SV2 (không phải trưởng nhóm) nộp bài | ❌ Bị chặn: "Chỉ trưởng nhóm nộp báo cáo" |
| GV chấm lại đề tài đã chấm | ❌ Bị skip: "Đã chấm rồi" |
