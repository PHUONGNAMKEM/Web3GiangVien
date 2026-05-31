# Tri Thức Khắc Phục Lỗi "Bài Test Đã Đóng" Khi Đăng Ký Đề Tài Cạnh Tranh

## 1. Vấn Đề Ban Đầu
Khi sinh viên đăng ký đề tài có bài test cạnh tranh (`CoBaiTest: true`), hệ thống tự động chuyển hướng sinh viên sang trang làm bài test đầu vào `/student/entrance-test/:deTaiId` (đúng nghiệp vụ Happy Path) nhưng giao diện lập tức:
- Hiển thị Alert đỏ chính giữa màn hình với thông báo `"Không tìm thấy bài test cho đề tài này"`.
- Hiển thị duplicated (nhân đôi) 2 thông báo toast màu đỏ góc trên bên phải với nội dung `"Bài test đã đóng."`.

---

## 2. Nguyên Nhân
1. **Lỗi Trạng Thái Bài Test trong DB (Database State)**: 
   Khi một nhóm sinh viên trước đó đã nộp bài test cạnh tranh và giành chiến thắng, hệ thống tự động cập nhật trạng thái bài test của đề tài đó thành `'DaDong'` (Đã đóng) để chặn các nhóm khác tiếp tục làm bài.
   Tuy nhiên, khi chạy script dọn dẹp dữ liệu kiểm thử `npm run reset:test` (gọi file `backend/scripts/reset_test_data.js`), script này chỉ reset trạng thái Đề tài về `MoDangKy` mà bỏ quên việc cập nhật trạng thái Bài test tương ứng (`BaiTest.TrangThai`) trở lại `'MoNop'` (Mở nộp).
   Do đó, đề tài tuy mở đăng ký nhưng bài test đi kèm vẫn bị đóng, khiến API `/api/baitest/detai/:deTaiId/student` chặn quyền truy cập và trả về lỗi `400 Bad Request` kèm thông báo `"Bài test đã đóng."`.
2. **Lỗi Nhân Đôi Toast (Duplicate Toast)**:
   Do cơ chế **React StrictMode** kích hoạt component mount 2 lần đồng thời trên môi trường development, dẫn đến hàm tự động gọi tải thông tin `fetchTest` chạy song song 2 lần và hiển thị 2 thông báo toast lỗi cùng lúc.

---

## 3. Khu Vực & File Liên Quan
- **Backend Reset Script**: [reset_test_data.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/scripts/reset_test_data.js)
- **Backend Controller**: [baiTestController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/baiTestController.js)
- **Frontend Component**: [EntranceTest.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/student/EntranceTest.js)

---

## 4. Cách Xử Lý Đúng

### Bước 1: Cập nhật script reset dữ liệu
Cập nhật [reset_test_data.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/scripts/reset_test_data.js) bổ sung thao tác tự động khôi phục toàn bộ trạng thái bài test `BaiTest` hiện có trong database về `'MoNop'`:
```javascript
console.log('\n--- 7.1. Resetting existing competitive test statuses to "MoNop" ---');
const resetTestsResult = await BaiTest.updateMany(
  {},
  { $set: { TrangThai: 'MoNop' } }
);
console.log(`Reset status for ${resetTestsResult.modifiedCount} existing BaiTest records.`);
```

### Bước 2: Thực thi dọn dẹp dữ liệu sạch
Chạy lệnh dọn dẹp cơ sở dữ liệu trên Terminal để cập nhật trạng thái mới nhất:
```bash
npm run reset:test
```

### Bước 3: Tối ưu hóa frontend
Thay đổi việc bắt lỗi tải thông tin bài test tại `useEffect` tự động mount trong [EntranceTest.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/student/EntranceTest.js#L108-L112) bằng `console.error` thay vì bắn toast `message.error` gây nhiễu và lặp thông báo khi chuyển trang.

---

## 5. Kết Quả Sau Khi Fix
* Khi chạy `npm run reset:test`, database thông báo cập nhật thành công:
  `Reset status for 3 existing BaiTest records.`
* Sinh viên thuộc các lớp `13DHTH03` hoặc `13DHTH02` khi đăng ký đề tài cạnh tranh đầu vào sẽ được chuyển hướng mượt mà sang trang làm bài test.
* Giao diện bài test tải đầy đủ tiêu đề, mô tả, số câu hỏi, thời gian làm bài, cấu hình ngưỡng đạt và nút **"Bắt Đầu Làm Bài"** hiển thị chính xác mà không gặp bất kỳ thông báo lỗi nào.

---

## 6. Lưu Ý Để Tránh Lặp Lỗi
* Khi thiết kế hoặc mở rộng các script dọn dẹp dữ liệu (`seeder`, `reset`), nếu thay đổi trạng thái của Đề tài (`DeTai`), luôn cần rà soát và cập nhật đồng bộ các trạng thái liên đới của Bài Test (`BaiTest`) và Đăng ký đề tài (`DangKyDeTai`).
* Tránh sử dụng toast thông báo thô bạo (`message.error`, `notification.error`) trong các hook `useEffect` chạy tự động khi mount trang mà không có cơ chế debounce hoặc kiểm soát cờ (flag), đặc biệt là các API lấy thông tin hiển thị giao diện để tránh lỗi duplicated toast do React StrictMode.
