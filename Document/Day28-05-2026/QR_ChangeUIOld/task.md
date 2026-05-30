# Nhiệm vụ: Triển khai Đăng nhập QR MetaMask (Phương án 2) & Sửa giao diện Đăng nhập

- [x] 1. Cập nhật Backend: Thêm endpoint tạo session QR và verify chữ ký từ điện thoại
    - [x] 1.1 Thêm map lưu trữ session QR và các hàm xử lý trong `backend/controllers/authController.js`
    - [x] 1.2 Thêm socket handler để đồng bộ trạng thái đăng nhập thời gian thực
    - [x] 1.3 Khai báo các endpoint trong `backend/server.js`
- [x] 2. Cập nhật Frontend: Viết trang đăng nhập cho di động và cấu hình Route
    - [x] 2.1 Tạo component `MobileLogin.js` trong `frontend/src/components/MobileLogin.js`
    - [x] 2.2 Đăng ký route cho `MobileLogin` trong `frontend/src/App.js`
- [x] 3. Cập nhật Giao diện Đăng nhập chính (LoginPage.js)
    - [x] 3.1 Tích hợp thư viện `qrcode` để tạo mã QR chứa link đăng nhập di động
    - [x] 3.2 Lắng nghe sự kiện socket đăng nhập thành công để tự động chuyển hướng
    - [x] 3.3 Loại bỏ tất cả label/thuật ngữ cũ của hệ thống nhân sự, thay bằng Giảng viên/Sinh viên
- [ ] 4. Kiểm thử và hoàn thiện
    - [ ] 4.1 Khởi động và kiểm tra chức năng
    - [ ] 4.2 Cập nhật tài liệu Web3Vault ghi nhận kết quả
