# Tri Thức Khắc Phục Lỗi "No Data" Bảng Đề Tài Khóa Luận Trên Màn Hình Giảng Viên

## 1. Vấn Đề Ban Đầu & Triệu Chứng
Khi giảng viên (ví dụ: `Giáo Sư Phong` hoặc `PGS.TS Phong`) đăng nhập, chọn chế độ **"KHÓA LUẬN TỐT NGHIỆP"** trên ClassSelector, bảng danh sách đề tài hướng dẫn (`/lecturer/topics`) trống rỗng và hiển thị **"No data"**, mặc dù cơ sở dữ liệu MongoDB đã được nạp thành công các đề tài khóa luận tương ứng của chính giảng viên đó.

---

## 2. Nguyên Nhân
Lỗi xảy ra do **bộ lọc dữ liệu lần hai (Double Filtering)** trước khi render vào bảng Antd Table trong component [TopicManagement.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/lecturer/TopicManagement.js):
1. Trong hàm `fetchData()`, hệ thống đã gọi API `/api/detai?loaiDeTai=KhoaLuan` và lọc chính xác các đề tài khóa luận thuộc giảng viên đang đăng nhập, lưu vào state `topics`.
2. Tuy nhiên, trước khi truyền dữ liệu vào prop `dataSource` của `<Table>`, code thực hiện thêm bộ lọc phụ `filteredTopics` (từ dòng 465):
   ```javascript
   const filteredTopics = topics.filter(topic => {
     if (!selectedClassId || selectedClassId === 'ALL') return true;
     return (topic.LopHoc || []).some(lh => (lh._id || lh).toString() === selectedClassId.toString());
   });
   ```
3. Khi ở chế độ Khóa Luận, `selectedClassId === 'KHOA_LUAN'`. 
4. Bộ lọc trên bắt buộc `topic.LopHoc` phải chứa chuỗi `'KHOA_LUAN'`. Nhưng đề tài Khóa Luận vốn không thuộc lớp học nào (`LopHoc = []` - mảng rỗng), dẫn đến bộ lọc trả về `false` cho tất cả các đề tài khóa luận, làm cho `filteredTopics` bị rỗng và bảng hiển thị "No data".

---

## 3. Cách Xử Lý (Frontend)
Cập nhật điều kiện lọc `filteredTopics` trong [TopicManagement.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/lecturer/TopicManagement.js). Nếu `selectedClassId === 'KHOA_LUAN'`, tự động trả về `true` để bỏ qua bộ lọc theo lớp học (vì dữ liệu đã được lọc tối ưu theo giảng viên trong hàm `fetchData` từ trước):

```javascript
// Trước
const filteredTopics = topics.filter(topic => {
  if (!selectedClassId || selectedClassId === 'ALL') return true;
  return (topic.LopHoc || []).some(lh => (lh._id || lh).toString() === selectedClassId.toString());
});

// Sau
const filteredTopics = topics.filter(topic => {
  if (!selectedClassId || selectedClassId === 'ALL' || selectedClassId === 'KHOA_LUAN') return true;
  return (topic.LopHoc || []).some(lh => (lh._id || lh).toString() === selectedClassId.toString());
});
```

---

## 4. Khu Vực & File Ảnh Hưởng
* **Frontend Component**: `frontend/src/components/lecturer/TopicManagement.js`

---

## 5. Bài Học Rút Ra
1. **Tránh Lọc Trùng Lặp Vô Nghĩa**: Khi dữ liệu đã được lọc chính xác từ tầng API hoặc trong hàm fetch state, việc lọc lại ở tầng render cần cực kỳ cẩn thận để tránh vô tình loại bỏ các kiểu thực thể đặc biệt (như đề tài Khóa Luận không thuộc lớp học nào).
2. **Kiểm Thử Với Nhiều Kịch Bản Context**: Các giá trị lọc động (như `'KHOA_LUAN'`) phải được kiểm tra qua tất cả các hàm `.filter()` hoặc `.map()` của giao diện để đảm bảo không bị xung đột logic với luồng môn học cũ.
