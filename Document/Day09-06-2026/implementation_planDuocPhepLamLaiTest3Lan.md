# Triển khai Cơ chế Làm Lại Bài Test theo mô hình Kaggle (Multiple Submissions)

Cập nhật hệ thống bài Test Cạnh Tranh (Entrance Test) để hoạt động giống cơ chế của các cuộc thi Kaggle. Mục tiêu là cho phép sinh viên nộp bài nhiều lần để cải thiện điểm số mà không bị khóa (đánh rớt) ngay sau lần nộp đầu tiên, và giảng viên không cần phải phê duyệt thủ công.

## User Review Required

> [!WARNING]
> Cơ chế này sẽ cho phép sinh viên làm lại bài test nhiều lần. Nếu đề thi không thay đổi, sinh viên có thể mò mẫm đáp án bằng cách nộp thử nhiều lần.
> Bạn có muốn giới hạn số lần nộp bài không (ví dụ: tối đa 3 lần) hay cho phép nộp thoải mái (không giới hạn) miễn là chưa có nhóm khác thắng?

## Proposed Changes

### Backend (`baiTestController.js`)
- [MODIFY] Thay đổi logic trong `submitTest`:
  - **Bỏ chặn nộp lại:** Bỏ đoạn code kiểm tra `existingResult` trả về lỗi HTTP 400.
  - **Xóa kết quả cũ (hoặc ghi đè):** Trước khi tạo `KetQuaTest` mới, xóa bản ghi `KetQuaTest` cũ của sinh viên đó để bảng xếp hạng chỉ lấy kết quả mới nhất.
  - **Không đánh rớt hoàn toàn:** Nếu điểm sinh viên `< NguongDat`, hệ thống sẽ ghi nhận điểm, nhưng **không chuyển `DangKyDeTai.TrangThai` thành `TuChoi`**. Thay vào đó, trả về trạng thái `ChoTest` để sinh viên có thể tiếp tục làm lại.
  - **Thêm Cờ hiệu (Flag):** Trả về `canRetake: true` trong API response nếu sinh viên rớt, báo hiệu cho UI biết sinh viên được phép thử lại.

### Frontend (`EntranceTest.js`)
- [MODIFY] Cập nhật giao diện khi xem kết quả test:
  - Nếu kết quả trả về `rejected` (Chưa đạt), hiển thị thêm nút **"Làm lại bài test"** thay vì chỉ có nút "Quay lại đăng ký".
  - Khi nhấn "Làm lại bài test", reset state `submitted`, `started`, `answers` để hiển thị lại giao diện bài làm.
  - Các trạng thái khác (`winner`, `lost`, `waiting`) vẫn giữ nguyên thông báo và khóa nút làm lại vì cuộc đua đã kết thúc hoặc đang chờ phản hồi.

## Verification Plan

### Automated Tests
- N/A

### Manual Verification
1. Dùng tài khoản Giảng viên tạo một bài Test cho đề tài.
2. Đăng nhập bằng tài khoản Sinh viên 1, đăng ký đề tài và làm bài test.
3. Nộp sai đáp án -> Điểm số thấp hơn ngưỡng đạt -> Hệ thống báo Chưa đạt và hiển thị nút "Làm lại bài test".
4. Nhấn "Làm lại", chọn lại đáp án đúng -> Nộp bài -> Vượt ngưỡng -> Hệ thống báo Thắng cuộc.
5. Kiểm tra bảng xếp hạng bên phía Giảng viên, xác nhận chỉ hiện thị điểm số mới nhất của sinh viên đó.
