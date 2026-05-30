# Cập Nhật Tính Năng Nhập Điểm Kỹ Năng Cho Sinh Viên

Tính năng này cho phép sinh viên tự đánh giá và nhập điểm số thực tế cho từng kỹ năng của mình (thay vì hệ thống tự gán 8.0), giúp mô hình AI phân tích và đưa ra kết quả gợi ý đề tài chính xác hơn.

## User Review Required

> [!WARNING]  
> **Cấu trúc Dữ Liệu Thay Đổi:**
> Để tương thích ngược (không làm hỏng các dữ liệu cũ đang dùng mảng chuỗi `['React', 'NodeJS']`), mình sẽ thêm một cột mới vào Database là `BangDiemKyNang`. Cột `KyNang` cũ vẫn sẽ được hệ thống tự động sinh ra dựa vào tên kỹ năng để không làm lỗi các trang hiển thị. Bạn có đồng ý với phương án an toàn này không?

## Proposed Changes

---

### Database & Backend Models

#### [MODIFY] `backend/models/SinhVien.js`
- Thêm trường `BangDiemKyNang: [{ TenKyNang: String, Diem: Number }]` vào schema.

#### [MODIFY] `backend/controllers/sinhVienController.js`
- Cập nhật hàm `updateProfile` để nhận thêm `BangDiemKyNang` từ request.
- Tự động map `BangDiemKyNang` thành mảng chuỗi để lưu vào `KyNang` (duy trì tương thích ngược).

---

### Backend Services

#### [MODIFY] `backend/services/matchingService.js`
- Cập nhật luồng `matchStudentToTopics`:
  - Ưu tiên đọc điểm số từ `BangDiemKyNang`.
  - Nếu sinh viên chưa có `BangDiemKyNang` (dữ liệu cũ), mới dùng lại mảng `ky_nang` và gán mặc định 8.0.

---

### Frontend UI & Logic

#### [MODIFY] `frontend/src/components/student/StudentDashboard.js`
- Thay thế thẻ `<Select mode="tags">` ở mục Kỹ Năng bằng component `<Form.List>` của Ant Design.
- Giao diện mới sẽ cho phép sinh viên bấm "Thêm kỹ năng", sau đó chọn Tên kỹ năng (hoặc tự nhập) và nhập Điểm (GPA của kỹ năng đó).
- Logic `handleSaveProfile` sẽ map dữ liệu form thành mảng `BangDiemKyNang` để gửi xuống API.

#### [MODIFY] `frontend/src/components/student/TopicRegistration.js`
- Cập nhật payload `studentProfile` gửi sang AI, bao gồm thêm `BangDiemKyNang: svProfile.BangDiemKyNang || []`.

## Verification Plan

### Manual Verification
1. **Frontend:** Mở Popup "Chỉnh Sửa Hồ Sơ Cá Nhân", giao diện phải cho phép nhập Cặp [Tên Kỹ Năng - Điểm Số].
2. **Database:** Lưu hồ sơ thành công, kiểm tra MongoDB Compass xem document SinhVien đã có mảng `BangDiemKyNang` chứa object điểm chưa.
3. **AI Matching:** Vào mục "Đăng ký đề tài", mở Tab "Console (Network)" kiểm tra payload gửi đi `/ai/match-student` xem có truyền điểm thật xuống không, và điểm AI `match_score` trả về có bị thay đổi khi mình đổi điểm kỹ năng (từ 5.0 lên 10.0) không.
