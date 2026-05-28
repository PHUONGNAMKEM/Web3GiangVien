# Task Log: Thêm Quản lý Môn học, Lớp học, Sinh viên cho Giảng viên

- **Ngày thực hiện**: 2026-05-20
- **Role**: DEV (đã được xác nhận APPLY)
- **Trạng thái**: ✅ Hoàn thành code — Chờ người dùng xác nhận chạy được

---

## Chapter 1 Vấn đề ban đầu

Hệ thống thiếu các tính năng quản lý cốt lõi cho Giảng viên:

- Không có tab quản lý **Môn học** (một GV có thể dạy nhiều môn).
- Không có tab quản lý **Lớp học** (một môn có thể có nhiều lớp, mỗi lớp chứa danh sách sinh viên).
- Không có tab quản lý **Sinh viên** (xem tổng hợp SV toàn hệ thống).
- Không có cách xem nhóm sinh viên và đề tài đã đăng ký theo từng lớp.

---

## Chapter 2 Giải pháp đã triển khai

### 2.1 Backend — Models mới

| File | Mô tả |
|------|-------|
| `backend/models/MonHoc.js` | Schema Môn học: MaMonHoc (unique), TenMonHoc, MoTa, GiangVien (ref) |
| `backend/models/LopHoc.js` | Schema Lớp học: MaLopHoc (unique), TenLopHoc, MonHoc (ref), GiangVien (ref), SinhVien[] (ref array) |

### 2.2 Backend — Cập nhật model DeTai

- File: `backend/models/DeTai.js`
- Thêm trường: `MonHoc: { type: ObjectId, ref: 'MonHoc' }` (optional, backward compatible)
- Mục đích: Liên kết đề tài với môn học để lọc theo lớp/môn

### 2.3 Backend — Controllers mới

| File | Chức năng |
|------|-----------|
| `backend/controllers/monHocController.js` | CRUD Môn học. Chặn xóa nếu còn đề tài hoặc lớp ràng buộc. Đếm số đề tài + lớp cho mỗi môn. |
| `backend/controllers/lopHocController.js` | CRUD Lớp học. Chi tiết lớp gồm: danh sách SV, đăng ký đề tài, nhóm. Thêm/xóa SV khỏi lớp. |

### 2.4 Backend — Routes mới (server.js)

```
// 13. Quản Lý Môn Học
GET    /api/monhoc/giangvien/:gvId
POST   /api/monhoc
PUT    /api/monhoc/:id
DELETE /api/monhoc/:id

// 14. Quản Lý Lớp Học
GET    /api/lophoc/giangvien/:gvId
GET    /api/lophoc/:id/detail
POST   /api/lophoc
PUT    /api/lophoc/:id
POST   /api/lophoc/:id/sinhvien
DELETE /api/lophoc/:id/sinhvien/:svId
DELETE /api/lophoc/:id
```

### 2.5 Frontend — Service mới

- File: `frontend/src/services/managementService.js`
- Sử dụng `apiService` (axios client đã có auth interceptor) để gọi các API MonHoc, LopHoc, SinhVien

| File | Chức năng |
|------|-----------|
| `frontend/src/components/lecturer/CourseManagement.js` | Bảng danh sách môn học + modal thêm/sửa. Hiển thị số đề tài, số lớp học mỗi môn. |
| `frontend/src/components/lecturer/ClassManagement.js` | Bảng danh sách lớp học + chi tiết 3 tab: Sinh viên (thêm/xóa), Nhóm & Đề tài, Đề tài môn. AutoComplete tìm SV. |
| `frontend/src/components/lecturer/StudentManagement.js` | Bảng toàn bộ SV hệ thống với tìm kiếm, sắp xếp, GPA color-coded, ví MetaMask. |

### 2.6 Frontend — Routing & Menu

- File `frontend/src/App.js`: Thêm 3 routes `/lecturer/courses`, `/lecturer/classes`, `/lecturer/students`
- File `frontend/src/components/layout/MainLayout.js`: Thêm 3 menu items với icon (BookOpen, School, Users) vào sidebar Giảng viên

---

## Chapter 3 Quan hệ dữ liệu

```
GiangVien
  └── MonHoc (1:N) ── GiangVien sở hữu nhiều môn
        └── LopHoc (1:N) ── Mỗi môn có nhiều lớp
              └── SinhVien[] ── Mỗi lớp chứa danh sách SV
        └── DeTai (1:N) ── Mỗi môn có nhiều đề tài (qua field MonHoc mới)
```

---

## Chapter 4 Lưu ý kỹ thuật

- Trường `MonHoc` trong `DeTai` là **optional** (không bắt buộc) để không phá vỡ đề tài cũ đã tồn tại.
- API `/api/lophoc/:id/detail` trả về cả thông tin SV, nhóm đăng ký và đề tài thuộc môn — chỉ lọc những đăng ký liên quan đến SV trong lớp.
- Controller `monHocController.delete` chặn xóa nếu còn đề tài hoặc lớp học ràng buộc (bảo vệ dữ liệu).
- Frontend sử dụng Ant Design (Table, Modal, Form, Tabs, AutoComplete) giống style các trang hiện có.

---

## Chapter 5 Files đã tạo/sửa

### 5.1 Tạo mới (7 files)

1. `backend/models/MonHoc.js`
2. `backend/models/LopHoc.js`
3. `backend/controllers/monHocController.js`
4. `backend/controllers/lopHocController.js`
5. `frontend/src/services/managementService.js`
6. `frontend/src/components/lecturer/CourseManagement.js`
7. `frontend/src/components/lecturer/ClassManagement.js`
8. `frontend/src/components/lecturer/StudentManagement.js`

### 5.2 Chỉnh sửa (3 files)

1. `backend/models/DeTai.js` — Thêm field `MonHoc`
2. `backend/server.js` — Thêm import controllers + 12 routes (Section 13, 14)
3. `frontend/src/App.js` — Thêm 3 imports + 3 routes
4. `frontend/src/components/layout/MainLayout.js` — Thêm 3 icon imports + 3 menu items
