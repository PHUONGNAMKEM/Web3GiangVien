# Nhiệm vụ: Tái Cấu Trúc Hệ Thống Hỗ Trợ Đa Lớp Học (Multi-Class Context) Cho Sinh Viên Và Giảng Viên
**Ngày thực hiện:** 2026-05-30
**Trạng thái:** Hoàn thành

---

## 1. Vấn Đề Ban Đầu & Nguyên Nhân

### Vấn đề:
Hệ thống ban đầu giả định mỗi sinh viên chỉ tham gia **1 lớp học**, sở hữu **1 nhóm** và **1 đăng ký đề tài** duy nhất toàn cục. Khi sinh viên đăng ký đề tài trong lớp A, họ bị khóa toàn bộ tính năng ở các môn/lớp khác. Đồng thời, toàn bộ giao diện dashboard, tiến độ, nộp báo cáo và chấm điểm chỉ hiển thị duy nhất thông tin của 1 lớp đầu tiên tìm thấy trong cơ sở dữ liệu.

### Nguyên nhân:
1. API `getMyRegistration` (backend) sử dụng `findOne()` mà không có bất kỳ bộ lọc lớp học nào, dẫn đến chỉ trả về 1 đăng ký ngẫu nhiên/cũ nhất.
2. API `getNhomBySinhVien` (backend) tuy đã có hỗ trợ query `?lopHocId` nhưng phía frontend hoàn toàn không truyền tham số này.
3. Các component frontend (`StudentDashboard`, `GroupManagement`, `TopicRegistration`, `ProgressLog`, `ReportUpload`, `ProgressTracking`) tự quản lý state và gọi API không có tham số lớp học hoạt động.
4. Giảng viên không có bộ lọc để phân chia danh sách đề tài và bài nộp theo từng lớp riêng biệt.

---

## 2. Các File & Khu Vực Thay Đổi

### Backend
- `backend/controllers/deTaiController.js`:
  - Sửa `getMyRegistration` hỗ trợ tham số query `lopHocId`.
  - Thêm `getMyRegistrations` để trả về toàn bộ danh sách đăng ký của sinh viên.
  - Enforce ràng buộc 1 đăng ký đề tài duy nhất trên mỗi lớp học tại `registerTopic`.
- `backend/controllers/nhomController.js`:
  - Thêm `getAllNhomBySinhVien` để lấy tất cả nhóm của sinh viên.
- `backend/controllers/baoCaoController.js`:
  - Sửa `getMyBaoCao` hỗ trợ tham số query `deTaiId`.
- `backend/server.js`:
  - Đăng ký các endpoint mới: `/api/dangky/sinhvien/:svId/all` và `/api/nhom/sinhvien/:svId/all`.

### Frontend Context & Commons
- `frontend/src/contexts/ClassContext.js`: React Context cho sinh viên, quản lý danh sách lớp, lớp học đang chọn (`selectedClassId`), và đồng bộ hóa với `localStorage` theo từng `user.id`.
- `frontend/src/contexts/LecturerClassContext.js`: React Context cho giảng viên, quản lý danh sách lớp học giảng dạy và hỗ trợ lựa chọn `'ALL'` (tất cả các lớp).
- `frontend/src/components/common/ClassSelector.js`: Dropdown chọn lớp học hiển thị ở header, tự động sử dụng đúng context dựa trên role (`role_id`) của người dùng.
- `frontend/src/components/layout/MainLayout.js`: Tích hợp `ClassSelector` vào header và điều chỉnh CSS flexbox.
- `frontend/src/App.js`: Bao bọc các route group của giảng viên và sinh viên bằng các Provider tương ứng.

### Frontend Services
- `frontend/src/services/aiService.js`: Sửa `getMyRegistration` và `getMyBaoCao` truyền `lopHocId`/`deTaiId`, thêm `getMyRegistrations`.
- `frontend/src/services/nhomService.js`: Sửa `getNhomBySinhVien` truyền `lopHocId`, thêm `getAllNhomBySinhVien`.

### Frontend Pages & Components
- `StudentDashboard.js`: Đọc active `selectedClassId` từ context, tự động tải dữ liệu đồ án, điểm, tiến độ của lớp đang chọn.
- `GroupManagement.js`: Lọc nhóm đang xem theo active class. Bỏ chọn lớp học trong modal tạo nhóm, tự động gắn nhóm mới vào lớp học đang chọn.
- `TopicRegistration.js`: Lọc danh sách đề tài và kiểm tra trạng thái đăng ký theo active class. Hủy bỏ dropdown lọc lớp cục bộ để dùng header selector.
- `ProgressLog.js`: Tải và tạo nhật ký tiến độ của đề tài thuộc lớp học đang chọn.
- `ReportUpload.js`: Quản lý nộp bài/hủy bài riêng biệt cho đề tài thuộc lớp học đang chọn.
- `ProgressTracking.js`: Hiển thị sơ đồ các bước và đánh giá điểm của lớp đang chọn.
- `TopicManagement.js` & `SubmissionReview.js` (Giảng viên): Tải danh sách đề tài/bài nộp và lọc theo lớp học đang chọn trên context giảng viên.

---

## 3. Cách Xử Lý Đúng & Thực Hành Tốt

1. **Truy vấn Mongoose qua collection liên kết**: Đối với các tài liệu tham chiếu (ví dụ: lọc `DangKyDeTai` theo trường `LopHoc` nằm trong model `DeTai`), ta thực hiện truy vấn 2 bước (lấy ID đề tài của lớp học đó trước) để đảm bảo hiệu năng và tính đơn giản thay vì sử dụng aggregate phức tạp.
2. **Keyed LocalStorage**: Khi ghi nhớ lựa chọn lớp học của người dùng, sử dụng key dạng `selectedClassId_${user.id}` để tránh xung đột dữ liệu khi có nhiều tài khoản (giảng viên, sinh viên khác nhau) đăng nhập trên cùng một trình duyệt.
3. **Tránh Vi Phạm Hook Rules**: Tránh gọi các context hook có điều kiện. Tạo ra các sub-selector (`StudentClassSelector`, `LecturerClassSelector`) riêng biệt và kết xuất chúng có điều kiện ở component cha `ClassSelector`.
4. **Xử lý dữ liệu trả về**: Chú ý cấu trúc dữ liệu của API trả về (ví dụ: các API lớp học trả về cấu trúc bọc dạng `{ success: true, data: result }`). Phải truy cập đúng `.data` để tránh lỗi kiểu dữ liệu.

---

## 4. Kết Quả Đạt Được

- Dự án biên dịch thành công (`Compiled successfully`) không có bất kỳ lỗi cú pháp hay import nào.
- Luồng nghiệp vụ hoạt động chuẩn xác:
  - Sinh viên tham gia nhiều lớp học sẽ chuyển đổi giữa các lớp mượt mà ở header.
  - Các dữ liệu nhóm, đề tài, nộp bài, điểm số được cô lập hoàn hảo giữa các lớp học khác nhau.
  - Giảng viên lọc đề tài và bài nộp theo lớp một cách nhanh chóng hoặc lựa chọn xem tất cả.
