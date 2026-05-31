# Tri Thức Khắc Phục Lỗi "Chỉ trưởng nhóm được làm bài test đại diện cho nhóm"

## 1. Vấn Đề Ban Đầu
Sinh viên **Trần Minh Anh** là Trưởng nhóm của nhóm **"Cá mập"** (thành viên gồm Trần Minh Anh và Phong Le).
Khi Phong Le (hoặc một thành viên khác) tiến hành nhấn nút đăng ký đề tài cạnh tranh cho nhóm, đăng ký thành công.
Tuy nhiên, khi trưởng nhóm Trần Minh Anh đăng nhập vào hệ thống và nhấn nút **"Bắt Đầu Làm Bài"** test cạnh tranh đầu vào, hệ thống bắn ra thông báo lỗi toast:
`"Chỉ trưởng nhóm được làm bài test đại diện cho nhóm."` và không cho phép làm bài.

---

## 2. Nguyên Nhân
Lỗi xảy ra do sự không đồng bộ giữa **Trưởng nhóm thực tế của Nhóm (`Nhom.TruongNhom`)** và **Trưởng nhóm ghi nhận trên bản đăng ký đề tài (`DangKyDeTai.TruongNhom`)**:

1. Trong file controller [deTaiController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/deTaiController.js) dòng 252, khi lưu đăng ký mới:
   ```javascript
   const dangKy = new DangKyDeTai({ 
       DeTai: deTaiId, 
       Nhom: nhomId,
       TruongNhom: sinhVienId, // <-- LỖI: Lấy ID của người bấm nút gửi request đăng ký
       SinhVien: sinhVienId,   // <-- LỖI
       ...
   ```
2. Nếu một thành viên thường trong nhóm (như Phong Le) bấm nút "Đăng ký đề tài" ở giao diện, `sinhVienId` gửi lên sẽ là ID của Phong Le.
3. Khi đó, bản ghi `DangKyDeTai` được tạo ra có trường `TruongNhom` là ID của Phong Le thay vì Trưởng nhóm thực tế Trần Minh Anh.
4. Khi Trần Minh Anh đăng nhập để làm bài test, backend so sánh:
   ```javascript
   if (String(dangKy.TruongNhom) !== String(sinhVienId)) { ... }
   ```
   Do `dangKy.TruongNhom` là ID của Phong Le, còn `sinhVienId` của phiên đăng nhập hiện tại là Trần Minh Anh → So sánh thất bại, backend trả về lỗi từ chối quyền làm bài.

---

## 3. Khu Vực & File Liên Quan
- **Backend Controller**: [deTaiController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/deTaiController.js) (hàm `registerTopic`)
- **Backend Controller**: [baiTestController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/baiTestController.js) (hàm `startTest` kiểm tra trưởng nhóm làm bài)

---

## 4. Cách Xử Lý Đúng

### Bước 1: Sửa logic lưu trưởng nhóm trong controller đăng ký đề tài
Cập nhật [deTaiController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/deTaiController.js) tại hàm tạo `DangKyDeTai` để ưu tiên gán trưởng nhóm thực tế từ schema `Nhom`:
```diff
         const dangKy = new DangKyDeTai({ 
             DeTai: deTaiId, 
             Nhom: nhomId,
-            TruongNhom: sinhVienId,
-            SinhVien: sinhVienId,  // backward compat
+            TruongNhom: nhomId ? nhom.TruongNhom : sinhVienId,
+            SinhVien: nhomId ? nhom.TruongNhom : sinhVienId,  // backward compat
             ThanhVien: nhom.ThanhVien
```
*(Nếu là đăng ký theo nhóm, hệ thống sẽ gán `TruongNhom` và `SinhVien` (đại diện) bằng chính trưởng nhóm thực tế của nhóm `nhom.TruongNhom`, bất kể thành viên nào trong nhóm đứng ra click bấm nút đăng ký).*

### Bước 2: Dọn dẹp dữ liệu cũ bị lỗi
Tiến hành chạy lệnh reset database để làm sạch dữ liệu và đồng bộ hóa lại cấu trúc:
```bash
npm run reset:test
```

---

## 5. Kết Quả Sau Khi Khắc Phục
* Bất kỳ thành viên nào trong nhóm (Trần Minh Anh hoặc Phong Le) bấm nút Đăng ký đề tài cạnh tranh thì bản ghi đăng ký `DangKyDeTai.TruongNhom` đều được lưu chính xác là ID của Trưởng nhóm thực tế (**Trần Minh Anh**).
* Khi **Trần Minh Anh** đăng nhập và nhấn **"Bắt Đầu Làm Bài"**, hệ thống kiểm tra chính xác quyền trưởng nhóm, chuyển sang trạng thái đang làm bài (`DangLamTest`) và cho phép làm bài mượt mà 100%!

---

## 6. Bài Học Rút Ra
* Trong luồng làm việc nhóm (Group Competitions), không được tin cậy hoàn toàn `sinhVienId` lấy từ JWT payload để làm đại diện đại diện cho toàn nhóm đối với các thuộc tính sở hữu (Ownership). Luôn cần truy xuất và đối chiếu với dữ liệu gốc từ thực thể nhóm (`Nhom`).
* Mọi hành động đăng ký, nộp bài, hoặc gán điểm liên quan đến nhóm cần được lưu trữ đồng bộ dưới thông tin của Trưởng nhóm (`TruongNhom`) đại diện để các kiểm tra bảo mật ở backend được thông suốt.
