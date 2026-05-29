# Kế hoạch triển khai: Thêm Role Admin & Trang Quản Trị

## Bối cảnh và Phân tích
Bạn hoàn toàn đúng! Mình vừa kiểm tra lại dự án cũ (`QLNS-main-OLD`). Trong dự án cũ, hệ thống có bảng `RolesPermissions.js` với 3 vai trò rõ ràng: **"Super Admin"**, **"Manager"**, và **"Employee"**.
- Super Admin có quyền `manage_roles: true`, cho phép họ tạo tài khoản và gán quyền cho người khác.
- Trong khi đó, dự án Web3-GiangVien hiện tại chỉ có 2 role cứng là `LECTURER_ROLE` và `STUDENT_ROLE`, dẫn đến việc không ai có quyền tạo Giảng viên mới qua giao diện.

**Quyết định:** Việc thêm `ADMIN_ROLE` là cực kỳ hợp lý và đúng chuẩn hệ thống thực tế. Admin sẽ là người thêm Giảng viên vào hệ thống, sau đó Giảng viên mới có thể đăng nhập.

## Đề xuất Thay đổi

### 1. Phía Backend (Node.js)
- **Tạo Model Admin:** Tạo file `models/Admin.js` lưu trữ thông tin Quản trị viên (Họ tên, WalletAddress).
- **Cập nhật Auth Controller (`authController.js`):** 
  - Khi xác thực chữ ký (verify), hệ thống sẽ tìm trong bảng `Admin` trước. Nếu có, cấp token với `role_id = 'ADMIN_ROLE'`.
  - Nếu không, tìm trong `GiangVien`.
  - Cuối cùng mới tự động tạo `SinhVien`.
- **Tạo API Quản lý Giảng viên:** Cung cấp các endpoint cho Admin (`GET`, `POST`, `PUT`, `DELETE` tại `/api/admin/giangvien`) để thêm, sửa, xóa Giảng viên.

### 2. Phía Frontend (React)
- **Cập nhật Router (`App.js`):** Thêm route `/admin/*` và bảo vệ nó bằng `ProtectedRoute allowedRoles={['ADMIN_ROLE']}`.
- **Tạo Admin Dashboard (`src/components/admin/AdminDashboard.js`):** Giao diện tổng quan cho Quản trị viên.
- **Tạo Component Quản lý Giảng Viên (`src/components/admin/LecturerManagement.js`):**
  - Hiển thị danh sách Giảng viên.
  - Form **Thêm Giảng Viên Mới**: Cho phép Admin nhập Họ tên, Mã GV, Email, và **Địa chỉ ví MetaMask**.
- **Cập nhật Layout (`MainLayout.js`):** Thêm menu riêng cho Admin.

## Open Questions

> [!IMPORTANT]
> **Khởi tạo Admin đầu tiên như thế nào?**
> Vì Admin là người tạo ra Giảng viên, vậy ai tạo ra Admin đầu tiên? 
> **Đề xuất của mình:** Chúng ta sẽ hardcode (gắn cứng) địa chỉ ví MetaMask của bạn vào Database làm **Super Admin** duy nhất thông qua một đoạn script chạy một lần. Từ đó trở đi, bạn dùng ví đó đăng nhập vào trang Admin và cấp quyền cho bất kỳ ai bạn muốn.
> 
> Bạn có đồng ý với phương án này không? Nếu đồng ý, vui lòng cung cấp địa chỉ ví MetaMask bạn muốn dùng làm Admin.
