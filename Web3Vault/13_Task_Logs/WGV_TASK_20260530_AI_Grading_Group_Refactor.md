# Task Log: AI Grading Group Refactor

## 1. Vấn đề ban đầu (Problem)
Trang **Chấm điểm (AI)** (`SubmissionReview.js`) hiển thị danh sách các bài làm nộp rời rạc theo từng sinh viên. Điều này làm cho giao diện bị lặp lại nhiều dòng cho các thành viên của cùng một nhóm (Ví dụ: nhóm "Cá mập" có 2 thành viên thì hiển thị 2 dòng hoàn toàn giống nhau về đề tài và điểm số). Đồng thời, giao diện thiếu thông tin lớp học, môn học, và giảng viên hướng dẫn của đề tài, khiến người dùng khó có cái nhìn tổng quan.

## 2. Nguyên nhân (Root Cause)
- Backend API `getBaoCaoByLecturer` trả về danh sách phẳng (flat list) các sinh viên được chấp nhận của các đề tài do giảng viên hướng dẫn. Mỗi sinh viên được ánh xạ trực tiếp thành một dòng dữ liệu.
- Mặc dù đề tài nhóm áp dụng cùng một bài nộp và cùng điểm số cơ bản cho cả nhóm, giao diện frontend chưa thực hiện gộp nhóm và chưa hỗ trợ hiển thị phân cấp (hierarchical) để phân tách giữa thông tin nhóm chung và điểm điều chỉnh riêng của từng thành viên.
- API backend chưa populate đầy đủ thông tin giảng viên, môn học và lớp học của đề tài.

## 3. Khu vực liên quan (Files Involved)
- **Backend API**: `backend/controllers/baoCaoController.js` (Hàm `getBaoCaoByLecturer`)
- **Frontend Component**: `frontend/src/components/lecturer/SubmissionReview.js`

## 4. Giải pháp & Cách xử lý đúng (Solution)
- **Backend**: Cập nhật query `.populate` để lấy thông tin Giảng viên hướng dẫn, Môn học, và danh sách Lớp học của đề tài, đồng thời populate thông tin nhóm (`Nhom` của `DangKyDeTai`).
- **Frontend Grouping**: Sử dụng `useMemo` để gộp danh sách phẳng theo `registration._id` (mã đăng ký đề tài/nhóm).
- **Frontend UI Table**:
  - Cập nhật các cột hiển thị: Nhóm / Sinh viên (phân biệt biểu tượng nhóm 👥 và cá nhân 👤), Thông tin ngữ cảnh (Lớp, Môn, Giảng viên hướng dẫn), Đề tài, Trạng thái nộp, Thời gian nộp, Điểm số, Thao tác.
  - Sử dụng Ant Design Table `expandable` để render sub-table danh sách thành viên nhóm khi nhấn vào dấu `+`.
  - Hiển thị điểm số riêng của từng thành viên và nút "Điều chỉnh điểm" riêng biệt cho từng người tại bảng con.
- **Tiến độ Drawer**:
  - Bổ sung Select Dropdown chọn sinh viên trong Drawer tiến độ. Khi chọn sinh viên khác nhau, tiến độ tương ứng sẽ được gọi API và tải động.
- **Đồng bộ hóa**:
  - Gọi `fetchData()` ngay sau khi chấm điểm thành công để đồng bộ điểm số của tất cả thành viên từ database lên UI.

## 5. Kết quả (Results)
- Bảng chính hiển thị gọn gàng theo từng nhóm/cá nhân, không còn bị trùng lặp dòng.
- Hiển thị đầy đủ thông tin Lớp học, Môn học, và Giảng viên hướng dẫn rõ ràng.
- Chức năng mở rộng hiển thị đúng danh sách thành viên và cho phép giảng viên điều chỉnh điểm cá nhân trực tiếp và trơn tru.
- Drawer tiến độ chuyển đổi linh hoạt giữa các thành viên trong nhóm.
- **Tinh giản giao diện**: Loại bỏ các icon không cần thiết khỏi tiêu đề các trang Quản lý Môn học (`BookOpen`), Quản lý Lớp học (`School`), Quản lý Sinh viên (`Users`), và loại bỏ icon nhóm (`👥`) trong cột "Nhóm / Sinh viên" của bảng Chấm Điểm (AI) để giữ giao diện tối giản và sạch đẹp theo ý kiến người dùng.

## 6. Lưu ý tránh lặp lỗi (Lessons Learned)
- Khi thiết kế tính năng cho đồ án nhóm (Web3 Competition Platform), luôn cân nhắc gộp nhóm từ tầng biểu diễn dữ liệu ở frontend hoặc backend để tránh giao diện bị trùng lặp.
- Mongoose populate đa cấp cần viết đúng cấu trúc `populate: [...]` lồng nhau.
- Hạn chế sử dụng quá nhiều icon trang trí sát tiêu đề chính nếu không mang lại giá trị định hướng nghiệp vụ thực sự cho người dùng.

