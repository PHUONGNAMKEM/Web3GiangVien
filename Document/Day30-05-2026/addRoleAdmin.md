# Kế hoạch triển khai: Bổ sung Role Admin & Luồng Chọn Vai Trò Khi Đăng Nhập

## Tổng quan

Hệ thống sẽ thay đổi cách xử lý ví mới kết nối lần đầu. Cụ thể:
1. Không tự động tạo SinhVien nữa.
2. Hiển thị **màn hình chọn vai trò** (Sinh viên / Giảng viên) ngay tại trang đăng nhập.
3. Người dùng chọn **Sinh viên** → Tạo tài khoản SV ngay lập tức và vào Dashboard SV.
4. Người dùng chọn **Giảng viên** → Điền thông tin → Tạo yêu cầu chờ duyệt → Chuyển đến màn hình "Đang chờ Admin duyệt".
5. **Admin** (đã được cấu hình cứng địa chỉ ví từ trước) duyệt yêu cầu real-time qua WebSocket.
6. Nếu được duyệt → GV được tự động đăng nhập và vào Dashboard GV.
7. Nếu bị từ chối → GV nhận được lý do từ chối. Tại đây, họ có thể chọn **Thử lại (tối đa 3 lần/ngày)** hoặc **Vào với tư cách Sinh viên**.

---

## Chi tiết Triển khai - Backend

### 1. Database Schema Mới
- **`Admin.js`**: Lưu thông tin Admin.
  - `WalletAddress` (String, unique, lowercase).
  - `HoTen` (String).
- **`RoleRequest.js`**: Lưu các yêu cầu xin cấp quyền Giảng viên.
  - `walletAddress` (String, lowercase).
  - `hoTen`, `email`, `chuyenNganh` (String).
  - `status` (Enum: `['pending', 'approved', 'rejected']`, mặc định `pending`).
  - `rejectReason` (String, lý do bị từ chối).
  - Khóa tạo theo ngày để dễ query đếm số lượng request.

### 2. Xử lý Logic Đăng nhập (`authController.js`)
- **`verifySignature` & `verifyQrSignature`**:
  - Dò ví tuần tự qua các bảng: `Admin` → `GiangVien` → `SinhVien`.
  - Nếu tìm thấy: Trả JWT token bình thường.
  - Nếu **không tìm thấy**: Trả payload đặc biệt `{ success: true, needsRoleSelection: true, walletAddress }`. Tuyệt đối không auto-create tài khoản lúc này.
- **Thêm API `POST /api/auth/register-role`**:
  - Input: `{ walletAddress, role, hoTen, email, chuyenNganh }`.
  - Nếu role `STUDENT_ROLE`: Tạo `SinhVien`, trả token, xong.
  - Nếu role `LECTURER_ROLE`:
    - **Kiểm tra giới hạn 3 lần/ngày**: Đếm số lượng record `RoleRequest` của `walletAddress` này có `status='rejected'` và được tạo trong vòng 24h qua.
    - Nếu >= 3: Trả lỗi 429 (Too Many Requests) - "Bạn đã bị từ chối 3 lần hôm nay. Vui lòng thử lại vào ngày mai hoặc tham gia với tư cách Sinh viên."
    - Nếu < 3: Tạo `RoleRequest` (status: `pending`). Emit WebSocket event `admin:newRequest` cho Admin. Trả kết quả thành công báo đang chờ duyệt.

### 3. API Dành riêng cho Admin (`adminController.js`)
- `GET /api/admin/requests`: Lấy danh sách yêu cầu đang `pending` (được bảo vệ bởi `requireAdmin`).
- `POST /api/admin/approve/:id`: 
  - Đổi status request thành `approved`.
  - Tạo record `GiangVien` mới.
  - Emit WebSocket event: `request:approved:{walletAddress}` gửi token mới.
- `POST /api/admin/reject/:id`: 
  - Nhận `reason` từ body.
  - Đổi status request thành `rejected` kèm lý do.
  - Emit WebSocket event: `request:rejected:{walletAddress}` kèm lý do.

### 4. Admin Seed Script (`scripts/seedAdmin.js`)
Tạo script khởi tạo Admin đầu tiên với địa chỉ ví được chỉ định:
- WalletAddress: `0x3081F8965F007A78C1502b51DAC0bD54E6f6dBBF` (sẽ được normalize thành lowercase khi lưu DB).
- Script này chỉ chạy bằng lệnh `node scripts/seedAdmin.js`.

---

## Chi tiết Triển khai - Frontend

### 1. Trang Đăng nhập (`LoginPage.js`)
- Nhận diện flag `needsRoleSelection` sau khi người dùng ký ví (hoặc quét QR).
- Hiển thị UI chọn Role:
  - **Khối Sinh Viên**: Nêu bật chức năng (Đăng ký đề tài, nộp báo cáo...). Nút "Tham gia với tư cách Sinh Viên".
  - **Khối Giảng Viên**: Nêu bật chức năng (Quản lý đề tài, duyệt sinh viên...). Nút "Yêu cầu cấp quyền Giảng Viên".
- Nhấn chọn Sinh Viên: Gọi API tạo SV, nhận token, redirect về Dashboard.
- Nhấn chọn Giảng Viên: Mở modal điền Tên, Email, Chuyên Ngành. Submit → Gọi API tạo Request → Redirect sang `/pending-approval`.

### 2. Trang Chờ Duyệt (`PendingApproval.js`)
- Trang chặn người dùng cho đến khi có kết quả.
- Khởi tạo kết nối WebSocket lắng nghe các kênh:
  - `request:approved:{myWalletAddress}`: Nếu nhận được, lưu token đi kèm và tự động redirect thẳng vào Dashboard Giảng Viên.
  - `request:rejected:{myWalletAddress}`: Nếu nhận được, dừng loading, chuyển UI sang màu đỏ (báo lỗi).
- **Khi bị từ chối**:
  - Hiện lý do từ chối (Admin nhập).
  - Hiện nút **[Thử lại yêu cầu]** (Sẽ call API kiểm tra xem còn lượt không, nếu hết 3 lượt thì block luôn nút này).
  - Hiện nút **[Vào với tư cách Sinh viên]** (Gọi thẳng API đăng ký Sinh viên và vào luôn).

### 3. Trang Admin (`AdminDashboard.js`)
- Được đưa vào `App.js` dưới route `/admin`, chỉ cho phép `ADMIN_ROLE` vào.
- Tích hợp `MainLayout` với menu riêng cho Admin.
- Dashboard sẽ hiển thị:
  - **Bảng Yêu cầu duyệt**: Cập nhật real-time khi có yêu cầu mới (nhờ socket lắng nghe `admin:newRequest`).
  - Các thao tác: Bấm **Duyệt** (xác nhận) hoặc **Từ chối** (hiện popup bắt buộc nhập lý do).
- Hiển thị danh sách các Giảng viên đang có trong hệ thống.

---

## Các thành phần WebSocket cần thêm vào `server.js`
- Tạo room `admin:room` cho các admin login.
- Admin connect socket sẽ tự động join room này.
- User ở trang pending sẽ join room `pending:{walletAddress}`.
- Khi có request mới: `io.to('admin:room').emit('new_role_request', data)`.
- Khi xử lý xong: `io.to('pending:' + walletAddress).emit('request_result', data)`.
