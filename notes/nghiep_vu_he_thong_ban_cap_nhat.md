# I. Nghiệp vụ Hệ thống (Bản cập nhật)

## 1. Giai đoạn Quản lý Nhóm (Cố định nhân sự)

### Thời gian lập nhóm
Hệ thống quy định một deadline riêng biệt cho việc tạo nhóm. Sau thời điểm này, người dùng không thể tiếp tục tạo mới nhóm.

### Khóa cứng (Locked-in)
Khi thời hạn lập nhóm kết thúc, danh sách thành viên và Nhóm trưởng của mỗi nhóm sẽ được cố định. Mọi thay đổi sau mốc này đều không được chấp nhận.

### Ràng buộc Nhóm trưởng
Trong suốt quá trình "đấu" đề tài, Nhóm trưởng không được phép rời nhóm hoặc chuyển giao quyền hạn. Quy định này nhằm đảm bảo tính chịu trách nhiệm xuyên suốt cho nhóm.

## 2. Giai đoạn Thực thi (Quy tắc đấu 1-1)

### Độc quyền phiên làm việc
Mỗi nhóm chỉ được phép mở 01 tab duy nhất cho 01 đề tài duy nhất. Nếu hệ thống phát hiện đăng nhập từ thiết bị khác hoặc tab khác của cùng một nhóm, phiên cũ sẽ bị vô hiệu hóa (`Invalidated`).

### Cơ chế thử lại (Unlimited Retries)
Trong khung giờ đấu, nhóm có quyền làm bài lại không giới hạn số lần cho đến khi đạt ngưỡng $S \ge S_{min}$. Tuy nhiên, nhóm chỉ được phép nộp bài 1 lần duy nhất; kết quả nộp đó là kết quả chính thức của nhóm.

## 3. Giải quyết tranh chấp (Race Condition Logic)

Khi có sự chồng chéo về thời gian nộp bài giữa các nhóm, hệ thống áp dụng bộ lọc ưu tiên theo thứ tự sau:

### Thời gian ($T$)
Ưu tiên nhóm có dấu thời gian nộp bài (`Timestamp`) sớm nhất, tính đến đơn vị nhỏ nhất là miliseconds hoặc microseconds.

### Điểm số ($S$)
Nếu $T_A = T_B$ (trường hợp cực kỳ hiếm nhưng vẫn có thể xảy ra ở mức cơ sở dữ liệu), hệ thống sẽ chọn nhóm có điểm số $S$ cao hơn.

### Trạng thái
Nhóm thắng cuộc sẽ được "chốt" đề tài. Các nhóm còn lại đang đấu đề tài đó sẽ nhận thông báo thất bại ngay lập tức.

## 4. Mục đích nghiệp vụ

Khối nghiệp vụ này nhằm:

- Cố định trách nhiệm của nhóm sau khi đã chốt nhân sự.
- Ngăn chặn việc thay đổi thành viên hoặc quyền điều hành trong giai đoạn cạnh tranh.
- Đảm bảo công bằng khi nhiều nhóm cùng nộp bài trong thời gian rất sát nhau.
- Ưu tiên nhóm có phản hồi nhanh và điểm số tốt hơn khi xảy ra tranh chấp thời gian nộp.
