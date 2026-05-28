# Nhật ký Nhiệm vụ: Thiết kế Giao diện Responsive / Mobile-friendly (Phase 4)

- **ID Nhiệm vụ**: WGV_TASK_20260528_Phase4_Mobile_Responsive
- **Ngày thực hiện**: 28-05-2026
- **Trạng thái**: Hoàn thành (Đã triển khai và đồng bộ)

## 1. Vấn đề ban đầu
Giao diện hệ thống trước đây chưa hỗ trợ tốt các màn hình di động (360px–414px) và tablet (768px–1024px):
- Các bảng dữ liệu (Table) có nhiều cột bị tràn ra khỏi khung thẻ chứa hoặc bị bóp nghẹt chữ.
- Các Drawer chi tiết (như đánh giá báo cáo, xem tiến độ) và Modal biểu mẫu (tạo đề tài, cập nhật tiến độ, sửa hồ sơ) có kích thước cố định dạng pixel (`width={650}`, `width={800}`) gây tràn màn hình di động, người dùng không thể thao tác đầy đủ.
- Monaco Code Editor trong EntranceTest bị tràn ngang, không hiển thị đầy đủ code và chiều cao quá lớn chiếm hết màn hình thiết bị.
- Các biểu đồ thống kê điểm số Recharts có kích thước cố định không tự động thu nhỏ lại làm vỡ giao diện.
- Layout chính (MainLayout), ReportUpload, ProgressTracking có padding/margin quá rộng và Steps hiển thị ngang bị méo chữ khi xem dọc.

## 2. Nguyên nhân
Do giao diện trước đó được phát triển tập trung vào phiên bản desktop, sử dụng các kích thước tĩnh cố định và chưa khai thác triệt để các breakpoint linh hoạt của Ant Design & Material-UI.

## 3. Các file và khu vực liên quan
- **Cơ sở hạ tầng & Theme**:
  - `frontend/src/hooks/useResponsive.js` [Mới]
  - `frontend/src/index.js` (MuiCssBaseline styleOverrides)
- **Giảng viên (Lecturer)**:
  - `frontend/src/components/lecturer/SubmissionReview.js`
  - `frontend/src/components/lecturer/TopicManagement.js`
  - `frontend/src/components/lecturer/RubricsManagement.js`
  - `frontend/src/components/lecturer/ScoreComparison.js`
  - `frontend/src/components/lecturer/LecturerDashboard.js`
- **Sinh viên (Student)**:
  - `frontend/src/components/student/ProgressLog.js`
  - `frontend/src/components/student/EntranceTest.js`
  - `frontend/src/components/student/StudentDashboard.js`
  - `frontend/src/components/student/ReportUpload.js`
  - `frontend/src/components/student/ProgressTracking.js`
- **Layout**:
  - `frontend/src/components/layout/MainLayout.js`

## 4. Giải pháp triển khai đúng
Tôi đã tái thiết kế và củng cố responsive toàn diện theo các bước:

1. **Cơ sở hạ tầng Responsive**:
   - Tạo hook `useResponsive.js` định nghĩa breakpoint `useIsMobile()` (<= 768px), `useIsTablet()` (<= 1024px) và hàm tự động tính chiều rộng modal.
   - Thêm style responsive tiện ích toàn cục trong `index.js` bằng cách nhúng các class `.hide-on-mobile` (`display: none !important`) và `.ant-table-wrapper` (`overflow-x: auto !important`) vào override CSS baseline.

2. **Tối ưu hóa Bảng và Modal/Drawer (Phase 4.1)**:
   - Thay đổi các thuộc tính scroll cứng của Table sang `scroll={{ x: 'max-content' }}` để tự tạo thanh cuộn ngang độc lập.
   - Sử dụng thuộc tính `responsive: ['md']` hoặc `responsive: ['sm']` của Ant Design để tự động ẩn các cột phụ ít quan trọng trên mobile.
   - Ép lại chiều rộng các Drawer thành `width={isMobile ? '100vw' : 650}` (chiếm trọn màn hình dọc) và Modal thành `width={isMobile ? '95vw' : 800}`.
   - Bọc nested table của Rubrics trong thẻ div có style `overflowX: 'auto'` và thu gọn các tag gợi ý AI dài bằng `<Tooltip>`.

3. **Tối ưu hóa Monaco Editor & Grid Layout (Phase 4.2 - 4.4)**:
   - Sửa cấu hình Monaco Editor: Bật `automaticLayout: true` (tự co giãn theo thẻ chứa), bật `wordWrap: 'on'` (chống tràn code ngang), giảm font-size xuống 12 và ẩn minimap trên di động.
   - Grid layout Dashboard chuyển đổi từ `span={8}` sang `<Col xs={24} sm={12} lg={8}>` để tự stack đứng khi màn hình hẹp, và sử dụng responsive gutter `[{ xs: 8, sm: 16 }, { xs: 8, sm: 16 }]`.
   - MainLayout tự động collapse sidebar sider (`collapsed = true`) khi phát hiện truy cập trên di động thông qua hook `useIsMobile`. Thu nhỏ padding Header và margin/padding Content area.
   - ProgressTracking đổi direction của `Steps` thành `direction={isMobile ? 'vertical' : 'horizontal'}`.

4. **Co giãn biểu đồ Recharts (Phase 4.5)**:
   - Loại bỏ chiều rộng fixed cứng của Recharts BarChart, bọc trong `<ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>`.

## 5. Kết quả đạt được
Ứng dụng frontend React biên dịch thành công 100%. Giao diện hiển thị trơn tru, gọn gàng và dễ thao tác trên mọi màn hình giả lập từ 360px đến desktop:
- Bảng biểu không bị vỡ chữ, có thanh cuộn ngang độc lập trong Card.
- Modal/Drawer mở rộng chiếm trọn/gần trọn màn hình giúp thao tác nhập liệu thoải mái.
- Sidebar không che khuất nội dung, Steps tự đổi hướng dọc dễ đọc.
- Monaco Editor co giãn mượt mà khi xoay ngang/dọc thiết bị.

## 6. Lưu ý để tránh lặp lỗi
- Khi tạo bất kỳ Modal hoặc Drawer mới nào, **luôn luôn** kiểm tra kích thước màn hình bằng `useIsMobile` hook để scale chiều rộng tương ứng.
- Tuyệt đối không hardcode chiều rộng pixel cho thẻ cha chứa Monaco Editor hoặc Recharts, luôn dùng tỷ lệ phần trăm (như `width="100%"`) kết hợp với `automaticLayout: true` hoặc `<ResponsiveContainer>`.
- Các bảng dữ liệu nhiều cột bắt buộc phải có thuộc tính `scroll={{ x: 'max-content' }}` để tránh bị bóp méo cột.
