# Vai trò và công việc của các file mới trong project 12.04.26

Tài liệu này liệt kê các file có trong bản 12.04.26 nhưng không có ở bản 01.04.26, đồng thời mô tả vai trò và công việc chính của từng file.

## 1. analysis_report_advance.md

- Vai trò: Tài liệu phân tích nâng cao cho bản project mới.
- Công việc chính: Tổng hợp các thay đổi về kiến trúc, chức năng và hướng phát triển của hệ thống.
- Giá trị sử dụng: Dùng làm tài liệu tham chiếu khi cần mô tả bản mở rộng của hệ thống trong báo cáo hoặc khi bàn giao.

## 2. implementation_planFix.md

- Vai trò: Kế hoạch triển khai hoặc kế hoạch chỉnh sửa nâng cấp của project.
- Công việc chính: Ghi lại các bước cần thực hiện, các phần cần hoàn thiện và hướng xử lý cho các hạng mục còn thiếu.
- Giá trị sử dụng: Hỗ trợ theo dõi tiến độ phát triển và đối chiếu các đầu việc đã hoàn thành.

## 3. web3_ai_system_explanation.md

- Vai trò: Tài liệu giải thích cơ chế hoạt động của hệ thống AI và Web3.
- Công việc chính: Mô tả cách hệ thống tích hợp AI, cách dữ liệu được xử lý và cách phần Web3 tham gia vào luồng nghiệp vụ.
- Giá trị sử dụng: Dùng để giải thích cho người đọc hiểu logic vận hành của hệ thống ở mức tổng quan và mức triển khai.

## 4. backend/controllers/tienDoController.js

- Vai trò: Bộ điều khiển xử lý nghiệp vụ nhật ký tiến độ.
- Công việc chính:
  - Tạo mới bản ghi tiến độ của sinh viên.
  - Lấy danh sách tiến độ theo sinh viên.
  - Lấy danh sách tiến độ theo đề tài.
  - Cho giảng viên thêm nhận xét vào tiến độ.
- Giá trị sử dụng: Là file trung tâm của luồng cập nhật tiến độ trong backend.

## 5. backend/models/TienDo.js

- Vai trò: Định nghĩa cấu trúc dữ liệu tiến độ trong MongoDB.
- Công việc chính: Khai báo các trường như đề tài, sinh viên, nội dung, phần trăm hoàn thành, loại cập nhật, file đính kèm và nhận xét của giảng viên.
- Giá trị sử dụng: Là mô hình dữ liệu nền để lưu và truy vấn nhật ký tiến độ.

## 6. frontend/src/components/student/ProgressLog.js

- Vai trò: Giao diện hiển thị và cập nhật nhật ký tiến độ cho sinh viên.
- Công việc chính:
  - Tải dữ liệu đăng ký đề tài và danh sách tiến độ.
  - Hiển thị các mốc tiến độ đã tạo.
  - Cho phép sinh viên thêm báo cáo tiến độ mới.
  - Hiển thị nhận xét của giảng viên nếu có.
- Giá trị sử dụng: Là thành phần giao diện trực tiếp phục vụ luồng theo dõi tiến độ của sinh viên.

## 7. Kết luận

Các file mới của bản 12.04.26 tập trung vào hai nhóm chính:

- Nhóm tài liệu: phân tích, kế hoạch và giải thích hệ thống.
- Nhóm chức năng: luồng nhật ký tiến độ ở cả backend và frontend.

Điều này cho thấy bản 12.04.26 không chỉ bổ sung tài liệu mà còn mở rộng thực tế chức năng của hệ thống.
