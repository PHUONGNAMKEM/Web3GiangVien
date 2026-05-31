# Tri Thức Khắc Phục Lỗi CastError Khi Chọn Tùy Chọn "Tất Cả Các Lớp" (ALL)

## 1. Vấn Đề Ban Đầu & Triệu Chứng
Khi giảng viên truy cập trang **Quản Lý Đề Tài Hướng Dẫn** (`/lecturer/topics`) và chọn tùy chọn **"Tất cả các lớp"** (`selectedClassId === 'ALL'`) ở ClassSelector trên Header, hệ thống bắn lỗi màu đỏ:
`Không thể tải danh sách đề tài` và danh sách đề tài hiển thị trống rỗng (No data).

---

## 2. Nguyên Nhân
1. **Frontend**: Khi chọn "Tất cả các lớp", state `selectedClassId` nhận giá trị chuỗi là `'ALL'`. Frontend gọi API `aiApiService.getTopics('ALL')` dẫn đến request API gửi lên backend kèm query: `/api/detai?lopHocId=ALL`.
2. **Backend**: Trong `deTaiController.getAll`, tham số `lopHocId` được lấy từ query và gán trực tiếp làm bộ lọc MongoDB:
   ```javascript
   if (lopHocId) {
       filter.LopHoc = lopHocId; // filter.LopHoc = 'ALL'
   }
   ```
3. **Mongoose CastError**: Vì trường `LopHoc` trong schema `DeTai` là một mảng `ObjectId` (`[{ type: mongoose.Schema.Types.ObjectId, ref: 'LopHoc' }]`), Mongoose cố gắng cast chuỗi `'ALL'` thành một `ObjectId` hợp lệ và thất bại, ném ra lỗi:
   `Cast to ObjectId failed for value "ALL" (type string) at path "LopHoc"`
4. Lỗi này làm backend phản hồi mã lỗi `500` khiến frontend không nhận được dữ liệu và báo lỗi đỏ.

---

## 3. Cách Xử Lý (Giao Kết Cả Frontend & Backend)

### A. Backend — Cập Nhật [deTaiController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/deTaiController.js)
Điều chỉnh logic gán filter trong hàm `getAll`. Khi `lopHocId` có giá trị là `'ALL'`, bộ lọc sẽ bỏ qua việc lọc theo lớp để trả về tất cả đề tài môn học của mọi lớp học, tránh lỗi CastError:
```javascript
// Trước
if (lopHocId) {
    filter.LopHoc = lopHocId;
}

// Sau
if (lopHocId && lopHocId !== 'ALL') {
    filter.LopHoc = lopHocId;
}
```

### B. Frontend — Cập Nhật [aiService.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/services/aiService.js)
Tương tự, ở phương thức `getTopics` tại frontend, nếu `lopHocId` là `'ALL'`, hệ thống sẽ không truyền tham số query `lopHocId` lên API để bảo vệ cấu trúc URL:
```javascript
// Trước
} else if (lopHocId) {
    query = `?lopHocId=${lopHocId}`;
}

// Sau
} else if (lopHocId && lopHocId !== 'ALL') {
    query = `?lopHocId=${lopHocId}`;
}
```

---

## 4. Khu Vực & File Ảnh Hưởng
1. **Backend Controller**: `backend/controllers/deTaiController.js`
2. **Frontend Service**: `frontend/src/services/aiService.js`

---

## 5. Bài Học Rút Ra
1. **Rà Soát Dữ Liệu Đầu Vào**: Mọi tham số lấy từ `req.query` hoặc `req.body` dùng để truy vấn MongoDB với kiểu dữ liệu `ObjectId` bắt buộc phải được validate kỹ càng, hoặc có cơ chế loại trừ các từ khóa logic đặc biệt như `'ALL'`, `'ANY'`, `'NONE'` trước khi đưa vào hàm query của Mongoose.
2. **Đồng Bộ Hóa Frontend-Backend**: Khi bổ sung các giá trị đặc thù cho giao diện (như `'ALL'` hay `'KHOA_LUAN'`), cần kiểm tra toàn bộ luồng dữ liệu xem giá trị này có vô tình bị gửi lên các API nghiệp vụ cốt lõi hay không để tránh các lỗi CastError ngầm.
