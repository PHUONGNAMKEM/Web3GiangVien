# Nhiệm vụ: Tái Cấu Trúc Hệ Thống Thành Competition Platform Theo Lớp Học & Dọn Dẹp Mã Nguồn HR Cũ
**Ngày thực hiện:** 2026-05-30
**Trạng thái:** Hoàn thành

---

## 1. Bối Cảnh & Vấn Đề Ban Đầu
Hệ thống chuyển đổi từ quản lý đề tài đơn lẻ truyền thống sang mô hình **Web3 + AI Competition Platform** hỗ trợ giảng dạy (tham chiếu luồng nghiệp vụ của Kaggle):
- Đề tài đóng vai trò là các challenge/competition.
- Giảng viên tạo challenge gắn với một Lớp học (`LopHoc`).
- Sinh viên tham gia theo nhóm (`Nhom`) và nộp bài (`BaoCao` / submission).
- Cần cơ chế chấm điểm nhóm nhưng cho phép giảng viên điều chỉnh điểm riêng cho từng thành viên (khi có sự chênh lệch đóng góp) và lưu vết on-chain.
- Đồng thời dọn dẹp triệt để khoảng hơn 500 dòng code HR cũ (attendance, payroll, kpi, department) trong file `apiService.js` để tránh sai lệch domain.

---

## 2. Các File & Khu Vực Liên Quan

### Backend Models & Schemas
- `backend/models/DeTai.js` (Thêm trường `LopHoc`)
- `backend/models/Nhom.js` (Thêm trường `LopHoc`)
- `backend/models/BaoCao.js` (Thêm trường `Nhom`)
- `backend/models/TienDo.js` (Thêm trường `Nhom` và sparse index)
- `backend/models/DiemSo.js` (Thêm các trường `Nhom`, `DiemGoc`, `LaDieuChinh`)

### Backend Controllers & Routes
- `backend/controllers/deTaiController.js` (Logic ràng buộc đăng ký đề tài theo lớp học)
- `backend/controllers/diemSoController.js` (Thêm API `adjustGrade` cho phép điều chỉnh điểm từng sinh viên và ký blockchain)
- `backend/controllers/lopHocController.js` (Bổ sung batch import sinh viên bằng `MaSV`)
- `backend/server.js` (Tích hợp route `/api/diemso/:id/adjust` và các API import)

### Frontend Components & Services
- `frontend/src/services/apiService.js` (Xóa bỏ các API HR thừa, giữ lại HTTP client, socket và QR login)
- `frontend/src/services/aiService.js` & `managementService.js` (Bổ sung các API call tương ứng)
- `frontend/src/components/lecturer/SubmissionReview.js` (Tích hợp giao diện hiển thị thành viên nhóm và Modal điều chỉnh điểm)
- `frontend/src/components/lecturer/ClassManagement.js` (Bổ sung CSV import sinh viên)
- `frontend/src/components/student/TopicRegistration.js` & `GroupManagement.js` (Ràng buộc nhóm và đăng ký đề tài theo lớp học)

---

## 3. Giải Pháp & Chi Tiết Triển Khai

### 3.1 Ràng buộc Lớp Học khi Đăng ký Đề tài
- Khi sinh viên đăng ký đề tài qua API `registerTopic`, hệ thống sẽ kiểm tra xem đề tài có thuộc về Lớp học mà sinh viên đang học hay không.
- Ràng buộc: Mỗi sinh viên chỉ được đăng ký tối đa 1 đề tài trong cùng một lớp học để đảm bảo tính công bằng (Kaggle-style).

### 3.2 Điều chỉnh Điểm Cá nhân
- Khi giảng viên chấm điểm cho nhóm, điểm gốc được ghi nhận cho tất cả thành viên trong nhóm với `LaDieuChinh = false` và `DiemGoc` lưu giá trị ban đầu.
- Giảng viên có thể điều chỉnh điểm riêng cho một sinh viên bất kỳ qua API `adjustGrade`. Hệ thống sẽ:
  1. Tạo/cập nhật bản ghi điểm mới của sinh viên đó.
  2. Đặt `LaDieuChinh = true` và lưu điểm mới.
  3. Ký giao dịch on-chain thông qua Smart Contract (`finalizeGradeOnChain`) với điểm số mới được ghi đè, đảm bảo tính bất biến của kết quả cuối cùng.

### 3.3 Loại bỏ Legacy HR Code
- File `apiService.js` đã được tinh chỉnh để loại bỏ hoàn toàn các hàm HR như `getEmployeeProfile`, `getAttendanceByEmployee`, `payAttendanceRecord`, `calculateDailyKpi`, `getMultiDayTasks`, v.v.
- Việc dọn dẹp này giúp tối ưu hóa dung lượng build và tránh sự nhầm lẫn giữa domain quản lý nhân sự cũ và domain giảng dạy / thi đấu học thuật mới.

---

## 4. Lưu Ý Để Tránh Lặp Lỗi
- **MetaMask Wallet Address**: Luôn phải được normalize về dạng chữ thường (lowercase) ở cả backend và frontend trước khi lưu trữ hoặc so sánh để tránh lệch session.
- **Backend Role Check**: Không tin tưởng role gửi lên từ request body của frontend. Luôn lấy thông tin người dùng hiện tại và role (`LECTURER_ROLE` / `STUDENT_ROLE`) trực tiếp từ JWT token đã được verify qua middleware.
- **Migration Data**: Đối với các đề tài cũ chưa có `LopHoc`, hệ thống đã chạy migration script tự động ánh xạ thông qua lớp cha `MonHoc` hoặc gán giá trị mặc định của lớp học hiện hữu để tránh crash.
