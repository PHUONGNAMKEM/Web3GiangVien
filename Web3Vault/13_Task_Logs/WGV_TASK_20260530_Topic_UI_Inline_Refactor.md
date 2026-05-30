# Nhiệm vụ: Tinh Giản Giao Diện Đề Tài & Phê Duyệt Đăng Ký Inline
**Ngày thực hiện:** 2026-05-30
**Trạng thái:** Hoàn thành

---

## 1. Vấn Đề Ban Đầu & Nguyên Nhân

### Vấn đề:
1. Giao diện Quản lý đề tài của Giảng viên có nút icon con mắt (`Eye`) trong cột thao tác để mở Drawer xem chi tiết đăng ký, nhưng bảng chính cũng đã có nút cộng (`+`) mở rộng dòng. Việc này tạo ra sự trùng lặp tính năng và khiến giao diện bị vỡ trên các màn hình trung bình hoặc nhỏ.
2. Để xem nhóm nào đã giành được (được duyệt) đề tài và danh sách các đăng ký chờ duyệt, giảng viên bắt buộc phải mở Drawer bên phải. Trải nghiệm nghiệp vụ không được liền mạch.
3. Khi giảng viên nhấp vào tên đề tài từ bảng môn học ở giao diện Quản lý môn học (`CourseManagement.js`), hệ thống chuyển hướng sang Quản lý đề tài nhưng mở Drawer thay vì bung rộng dòng đề tài trực tiếp trên bảng.

### Nguyên nhân:
- Frontend ban đầu sử dụng component `<Drawer>` độc lập để hiển thị chi tiết đề tài và danh sách đăng ký.
- Việc đồng bộ hóa trạng thái mở rộng dòng (`expandedRowKeys`) chưa được cấu hình cho bảng đề tài trong `TopicManagement.js`.
- Logic chuyển hướng deep link từ `CourseManagement.js` vẫn gọi hàm hiển thị Drawer (`showRegistrationDrawer`) thay vì điều khiển state mở rộng hàng.

---

## 2. Các File & Khu Vực Thay Đổi

### Frontend Pages & Components
- `frontend/src/components/lecturer/TopicManagement.js`:
  - **Import**: Thêm `Row` và `Col` từ thư viện `antd`.
  - **Quản lý State**:
    - Khai báo state `expandedRowKeys` và hàm `setExpandedRowKeys` để điều khiển trạng thái mở rộng các hàng trong bảng.
    - Xóa bỏ các state thừa: `drawerVisible`, `selectedTopic`.
  - **Deep-linking**:
    - Cấu hình lại `useEffect` lắng nghe `location.state?.highlightTopicId`.
    - Khi nhận được `highlightTopicId`, hệ thống tự động kiểm tra xem đề tài có bị ẩn bởi bộ lọc lớp hiện tại không. Nếu có, reset bộ lọc lớp học về `'ALL'` (`setSelectedClassId('ALL')`).
    - Gán `expandedRowKeys` thành `[targetTopic._id]` để tự động bung rộng dòng chứa đề tài được chỉ định.
  - **Cấu hình Cột**:
    - Xóa bỏ hoàn toàn nút icon con mắt (`Eye`) trong cột **Thao Tác** của `columns`.
  - **expandedRowRender**:
    - Refactor lại hàm kết xuất mở rộng dòng thành giao diện 2 cột (`Row` / `Col` của Antd):
      - **Cột Trái (Chi tiết đề tài)**: Hiển thị các thông tin chi tiết (Mã đề tài, GV hướng dẫn, mô tả cốt lõi, mô tả chi tiết, yêu cầu, môn học & lớp học, hạn chót, giới hạn sinh viên và Rubrics chấm điểm).
      - **Cột Phải (Duyệt đăng ký & Banner trạng thái)**:
        - Hiển thị Alert Success màu xanh lá nếu đề tài đã có nhóm giành được (`DaDuyet`): *"Đề tài đã có chủ! Đã phê duyệt chính thức cho nhóm [Tên nhóm]"*.
        - Hiển thị Alert Info màu xanh dương nếu chưa giao cho nhóm nào: *"Đề tài này hiện chưa được giao cho nhóm nào chính thức (đang chờ duyệt)"*.
        - Hiển thị danh sách nhóm đăng ký dạng `<List>` gồm trưởng nhóm, các thành viên với role tag.
        - Cung cấp nút **Duyệt** (màu xanh lá) và **Từ Chối** (màu đỏ) trực tiếp trong hàng mở rộng đối với các nhóm có trạng thái `ChoDuyet`. Các nút này bị disabled đối với giảng viên không phải là người hướng dẫn trực tiếp đề tài.
  - **JSX Layout**:
    - Loại bỏ hoàn toàn component `<Drawer>` và các logic liên quan ở cuối file.

---

## 3. Cách Xử Lý Đúng & Thực Hành Tốt

1. **Đồng bộ hóa State mở rộng hàng trong Ant Design Table**: 
   Sử dụng cả `expandedRowKeys` và `onExpandedRowsChange` để đảm bảo khi người dùng tự tay bấm đóng/mở hàng, state React luôn được đồng bộ chính xác.
2. **Quản lý bộ lọc khi chuyển hướng liên kết**: 
   Trước khi tự động mở rộng hàng theo tham số deep link (`highlightTopicId`), phải kiểm tra xem hàng đó có hiển thị dưới bộ lọc hiện tại hay không. Nếu không, bắt buộc phải reset bộ lọc về giá trị mặc định (`'ALL'`) trước khi mở rộng.
3. **Responsive Grid trong phần mở rộng**:
   Sử dụng `<Row gutter={[24, 24]}>` kèm `<Col xs={24} lg={12}>` để giao diện tự động xếp chồng trên thiết bị di động nhưng hiển thị song song tuyệt đẹp trên màn hình máy tính lớn.

---

## 4. Kết Quả Đạt Được

- Giao diện được tinh giản, gọn gàng và chuyên nghiệp hơn nhờ loại bỏ Drawer và nút con mắt trùng lặp.
- Các thao tác xem chi tiết đề tài, xem nhóm đăng ký và duyệt sinh viên được thực hiện đồng bộ, tức thì ngay tại bảng quản lý.
- Luồng liên kết từ Quản lý môn học sang Quản lý đề tài chạy mượt mà, định vị chính xác đề tài và mở rộng thông tin trực tiếp trên bảng.
- Build frontend thành công và không xảy ra lỗi compile.
