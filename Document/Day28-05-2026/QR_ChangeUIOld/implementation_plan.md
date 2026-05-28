# Kế Hoạch Triển Khai Chức Năng Đăng Nhập QR và Chuẩn Hóa Giao Diện Đăng Nhập

Kế hoạch này nhằm thực hiện 2 yêu cầu của người dùng:
1. Thêm chức năng đăng nhập ví MetaMask bằng mã QR.
2. Chuẩn hóa giao diện đăng nhập: loại bỏ hoàn toàn các từ khóa cũ của hệ thống nhân sự ("Nhân viên", "Phòng ban", "Chức vụ", "HR") và thay thế bằng các thuật ngữ thuộc domain Quản lý đào tạo/Khóa luận ("Sinh viên", "Giảng viên", "Chuyên ngành", "Mã SV", "Mã GV", "Lớp học").

## User Review Required

> [!IMPORTANT]
> - Chức năng đăng nhập QR sẽ sử dụng camera của thiết bị để quét mã QR địa chỉ ví MetaMask (hoặc chuỗi định dạng `ethereum:0x...`). Backend sẽ kiểm tra xem địa chỉ ví này đã được đăng ký dưới vai trò Giảng viên hay Sinh viên để tạo JWT session và đăng nhập trực tiếp. Điều này giúp tối ưu hóa luồng trải nghiệm demo khi không có ví MetaMask cài sẵn trên trình duyệt di động hoặc khi cần đăng nhập nhanh.

## Proposed Changes

---

### Backend (Bộ phận xác thực)

#### [MODIFY] [authController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/controllers/authController.js)
- Thêm API `qrLogin` để xử lý đăng nhập trực tiếp qua địa chỉ ví nhận được từ QR Code.
- API này kiểm tra địa chỉ ví hợp lệ, tra cứu trong DB xem ví thuộc `GiangVien` hay `SinhVien` (nếu chưa có sinh viên thì tự động tạo tài khoản Sinh viên mới như luồng đăng nhập thường).
- Tạo JWT token và trả về session tương ứng.

#### [MODIFY] [server.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/server.js)
- Đăng ký route: `app.post('/api/auth/qr-login', loginLimiter, authController.qrLogin);`

---

### Frontend (Giao diện người dùng)

#### [MODIFY] [apiService.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/services/apiService.js)
- Cập nhật hàm `validateQrForLogin(qrData)` để gửi request đến endpoint `/api/auth/qr-login` thay vì endpoint QR nhân sự cũ.

#### [MODIFY] [QrScanner.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/QrScanner.js)
- Viết lại component sử dụng thư viện `jsqr` đã cài đặt sẵn trong `package.json`.
- Sử dụng thẻ `<video>` và `<canvas>` để quét QR trực tiếp từ Webcam/Camera điện thoại của người dùng, tự động phân giải mã QR và kích hoạt callback `onScan`.

#### [MODIFY] [LoginPage.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/LoginPage.js)
- Thay đổi cấu trúc parsing dữ liệu QR: hỗ trợ tự động nhận dạng chuỗi JSON ví Web3, định dạng ví tiêu chuẩn `ethereum:0x...`, hoặc text ví thuần `0x...` để trích xuất địa chỉ ví MetaMask.
- Sửa đổi toàn bộ giao diện:
  - Tiêu đề cổng thông tin: "Web3 & AI Competition Platform"
  - Phụ đề: "Hệ thống quản lý khóa luận, chấm điểm tiến độ bằng AI & xác thực blockchain"
  - Đổi các nhãn thông tin người dùng sau khi đăng nhập thành công:
    - Loại bỏ nhãn "Nhân viên", "Phòng ban", "Chức vụ".
    - Thay thế bằng "Mã số", "Vai trò" (Giảng viên / Sinh viên), "Chuyên ngành", "Điểm số GPA" (đối với sinh viên).
- Cập nhật các thông báo lỗi: loại bỏ các tham chiếu tới nhân sự, hướng dẫn liên hệ Ban quản lý khoa luận hoặc Giảng viên nếu ví chưa được đăng ký.

---

## Verification Plan

### Automated/Manual Verification
1. **Kiểm tra Giao diện Đăng nhập:**
   - Truy cập trang đăng nhập, xác nhận không còn các từ khóa "Nhân viên", "Quản lý", "HR" hay "Phòng ban".
   - Kiểm tra hai tab: "MetaMask" (Đăng nhập ví trực tiếp) và "QR Code" (Đăng nhập bằng QR).
2. **Kiểm tra đăng nhập bằng MetaMask:**
   - Kết nối ví MetaMask bình thường, kiểm tra thông tin hiển thị của Giảng viên/Sinh viên sau khi đăng nhập.
3. **Kiểm tra đăng nhập bằng mã QR:**
   - Chuẩn bị một mã QR chứa địa chỉ ví (ví dụ: quét mã QR ví từ app MetaMask trên điện thoại hoặc tạo mã QR chứa chuỗi ví `0x...`).
   - Nhấp vào "Quét Mã QR", cấp quyền camera, đưa mã QR ví vào camera.
   - Xác nhận hệ thống quét thành công, gọi API `/api/auth/qr-login`, nhận dạng đúng giảng viên/sinh viên và đăng nhập thành công vào Dashboard.
