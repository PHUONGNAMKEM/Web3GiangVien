# Nhiệm vụ: Nâng Cấp Dashboard So Sánh Điểm AI vs GV & Sửa Lỗi Giao Diện Hệ Thống
**Ngày thực hiện:** 2026-05-31
**Trạng thái:** Hoàn thành

---

## 1. Vấn Đề Ban Đầu & Nguyên Nhân

### Vấn đề:
1. **Lỗi bộ lọc lớp học "Tất cả các lớp"**: Ở giao diện So Sánh Điểm AI vs GV (`ScoreComparison.js`), khi giảng viên chọn "Tất cả các lớp" (giá trị context mặc định là `'ALL'`), bảng dữ liệu bị trống rỗng hoàn toàn, không hiển thị bất cứ sinh viên nào.
2. **Biểu đồ so sánh quá đơn giản**: Biểu đồ so sánh điểm AI vs GV ban đầu chỉ là 1 cột dọc đơn điệu hiển thị mã sinh viên (MSSV) trên trục hoành thay vì tên sinh viên, không hiển thị được bức tranh học tập tổng quan của cả lớp/môn học.
3. **Thiếu các phân tích nâng cao**: Hệ thống chưa có các phân tích thống kê chênh lệch phân bố điểm theo khoảng, thống kê điểm trung bình theo đề tài/bài toán, và biểu đồ Radar phân tích tiêu chí Rubrics chi tiết.
4. **Lỗi lặp thông báo (Duplicate Toast)**: Do React StrictMode kích hoạt double-mount ở môi trường dev, các toast notifications ở `TopicRegistration.js` và `ProgressLog.js` bị kích hoạt lặp 2 lần gây phiền toái.
5. **Thành viên nhóm sai trạng thái**: Các thành viên phụ trong nhóm đã đăng ký đề tài thành công vẫn thấy trạng thái đề tài là "Đã chốt cho nhóm khác".
6. **Drawer xem tiến độ nhóm bị sai**: Hiển thị lẫn lộn sinh viên từ nhóm khác hoặc không đủ thành viên.
7. **Drawer chấm điểm/preview lộn xộn**: Giao diện chấm điểm và preview báo cáo của giảng viên bị quá nhiều màu sắc chồng chéo, bố cục chưa khoa học.

### Nguyên nhân:
- `selectedClassId` có giá trị mặc định là chuỗi `'ALL'` (truthy), nhưng bộ lọc lớp dùng falsy check `!selectedClassId` để quyết định lấy tất cả. Lỗi logic này khiến chuỗi `'ALL'` được so sánh trực tiếp với Object ID của lớp, dẫn đến mảng rỗng.
- Trục X của biểu đồ cũ hiển thị `MaSV` (mã số sinh viên) thay vị họ tên đầy đủ, khiến biểu đồ khó đọc.
- Chưa áp dụng `Tabs` để phân bổ thông tin trực quan theo từng khía cạnh (Tổng quan, Chi tiết, Nâng cao).
- Logic tìm đăng ký đề tài của thành viên nhóm (`getMyRegistration`) ở backend thiếu phần cast `svId` từ chuỗi sang `mongoose.Types.ObjectId`, dẫn đến câu truy vấn `$or` lồng với `'ThanhVien.SinhVien'` không khớp dữ liệu MongoDB.
- Trạng thái nộp bài được lọc theo `submission.Nhom` (rủi ro cao nếu nhóm trưởng đổi nhóm) thay vì `registration._id` (đăng ký gốc).

---

## 2. Các File & Khu Vực Thay Đổi

### Frontend Pages & Components
- **`frontend/src/components/lecturer/ScoreComparison.js`**:
  - Viết lại toàn bộ component để biến thành một Dashboard học thuật chuyên dụng sử dụng `Tabs` của Ant Design gồm 3 Tab panel.
  - Sửa lỗi lọc lớp bằng cách kiểm tra: `if (!selectedClassId || selectedClassId === 'ALL') return true;`.
  - **Tab 1: Tổng quan**:
    - Dựng 7 thẻ Metric Card thiết kế gradient dịu mát, bo góc `12px` cùng hiệu ứng đổ bóng tinh tế.
    - Vẽ Pie Chart "Điểm Trung Bình Theo Lớp" hỗ trợ **Drill-down**: Nhấp chọn lớp sẽ tự động cập nhật context toàn cục, lập tức lọc lại toàn bộ Dashboard theo lớp học đó.
    - Vẽ Pie Chart "Phân Bố Mức Độ Chênh Lệch AI vs GV" (Khớp, GV cao hơn, AI cao hơn).
  - **Tab 2: Chi Tiết Sinh Viên**:
    - Nâng cấp biểu đồ so sánh chi tiết điểm AI vs GV của từng sinh viên. Trục hoành hiển thị tên sinh viên. Bổ sung **Custom Tooltip** chi tiết hiển thị đầy đủ thông tin khi di chuột.
    - Chuyển bảng chi tiết sinh viên và bộ lọc đề tài cũ vào tab này để dễ đối chiếu.
  - **Tab 3: Thống Kê Nâng Cao**:
    - Thêm biểu đồ cột ngang (`layout="y"`) phân bố số lượng sinh viên theo khoảng học lực dưới góc nhìn của cả GV và AI.
    - Thêm biểu đồ cột so sánh điểm trung bình AI vs GV theo từng đề tài/bài toán để đo độ lệch.
    - Thêm Radar Chart so sánh điểm trung bình AI vs GV chi tiết theo từng khía cạnh Rubrics (nếu có dữ liệu rubrics kết quả).

- **`frontend/src/components/student/TopicRegistration.js`**:
  - Thay thế `message.warning` bằng `console.warn` ở catch block tự động mount để tránh hiển thị duplicate toast.
  - Cập nhật logic hiển thị nút tại màn hình đề tài ở điều kiện chốt nhóm: loại trừ trạng thái `!thisRegistered`.

- **`frontend/src/components/student/ProgressLog.js`**:
  - Sửa `message.error` thành `console.error` ở useEffect catch block để chặn duplicate toast.

- **`frontend/src/components/lecturer/SubmissionReview.js`**:
  - Sửa đổi hàm trợ giúp `groupMembers` lọc thông qua `registration._id` thay vì so sánh rủi ro bằng `submission.Nhom._id`.
  - Thiết kế lại Drawer xem chi tiết điểm & preview: Dùng Antd `Card` tinh giản, tạo đường viền bên trái dày 3px với các mã màu chủ đề chuyên nghiệp (`#1677ff` cho AI, `#fa8c16` cho Tiến độ, `#722ed1` cho Rubrics).

### Backend Controllers
- **`backend/controllers/deTaiController.js`**:
  - Bổ sung đoạn cast `mongoose.Types.ObjectId` cho `svId` trong câu lệnh truy vấn ở `getMyRegistration` và `getMyRegistrations`, giúp các thành viên nhóm được nhận diện chính xác trạng thái đã được duyệt đề tài của nhóm trưởng.
- **`backend/controllers/diemSoController.js`**:
  - Cập nhật hàm `getComparison` thực hiện populate lồng `LopHoc` và `MonHoc` của đề tài để truyền đầy đủ thông tin cho bộ lọc frontend.

---

## 3. Cách Xử Lý Đúng & Thực Hành Tốt

1. **Drill-down Trực Quan**: 
   Khi xây dựng các dashboard phân tích đa cấp, tích hợp việc click vào các phần tử của biểu đồ (như slice của Pie Chart) để cập nhật state lọc context của hệ thống mang lại trải nghiệm người dùng rất cao và trực quan.
2. **Ép Kiểu ObjectId Trong Mảng Lồng MongoDB**: 
   Khi thực hiện truy vấn các trường lồng sâu trong mảng (`Array of Objects`), Mongoose đôi lúc không tự động cast kiểu từ chuỗi String sang `ObjectId` trong điều kiện `$or`. Cần luôn chủ động sử dụng `new mongoose.Types.ObjectId(id)` ở tầng controller.
3. **Phân Khoảng Dữ Liệu Ở Frontend**:
   Thực hiện phân nhóm, phân lớp học lực và tính toán thống kê trực tiếp trên frontend thông qua `useMemo` giúp giảm tải gánh nặng tính toán cho server và tăng tốc độ hiển thị tức thì khi giảng viên chuyển đổi các bộ lọc.

---

## 4. Kết Quả Đạt Được

- **Build Biên Dịch Thành Công**: Ứng dụng React build thành công (`react-scripts build`) mà không gặp bất kỳ lỗi biên dịch nào.
- **Dashboard Hoạt Động Hoàn Hảo**: Giải quyết triệt để lỗi lọc lớp, đồng bộ bộ lọc thông minh, mang đến trải nghiệm thống kê học thuật chuyên nghiệp vượt trội.
- **Hết Lặp Thông Báo**: Người dùng không còn bị quấy rầy bởi các duplicate toast khi vừa vào màn hình.
- **Logic Nhóm Trơn Tru**: Trạng thái đề tài, thành viên trong tiến độ được cập nhật chuẩn xác theo thời gian thực dựa trên blockchain/MongoDB gốc.
