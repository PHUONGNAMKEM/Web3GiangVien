# Tri Thức Khắc Phục Lỗi Hiển Thị "Không Đạt" Mặc Dù Đã Duyệt Đề Tài Thành Công

## 1. Vấn Đề Ban Đầu
Khi sinh viên (hoặc trưởng nhóm) đã hoàn thành bài test cạnh tranh xuất sắc và được phê duyệt đề tài thành công (giao diện hiển thị trạng thái chính: *"Đạt! 100% - Đề tài đã được duyệt"*), nhưng ở phần **"Kết quả cạnh tranh"** trong bảng chi tiết bên dưới vẫn bị hiển thị thẻ Tag màu đỏ:
`"❌ Không đạt"`

---

## 2. Nguyên Nhân
Lỗi phát sinh hoàn toàn từ logic ánh xạ dữ liệu (Data Mapping) ở frontend do thiếu thông tin từ API backend:
1. Khi sinh viên tải lại trang làm bài test cho đề tài đã hoàn thành, component `EntranceTest` thực hiện gọi API:
   `GET /api/baitest/check/:deTaiId/:sinhVienId` (gọi hàm `checkSubmitted` ở backend).
2. API này trả về thực thể `KetQuaTest` chứa điểm số chi tiết từng câu hỏi. Tuy nhiên, trong schema của `KetQuaTest` **không lưu trữ** trường `competitionResult` (kết quả cạnh tranh), mà trường này chỉ được sinh ra tạm thời lúc chấm điểm hoặc được lưu vĩnh viễn ở trạng thái đăng ký đề tài `DangKyDeTai.TrangThai` (với các giá trị như `DaDuyet`, `ChoDoi`, `Thua`, `TuChoi`).
3. Khi nhận dữ liệu, frontend cố gắng đọc trường `result.competitionResult`. Do trường này mang giá trị `undefined`, câu lệnh điều kiện ở frontend:
   ```javascript
   const cr = competitionResult || result.competitionResult;
   ```
   Sẽ bị rỗng, dẫn đến thẻ Tag kết quả mặc định nhảy vào nhánh cuối cùng (fallback) hiển thị màu đỏ `"❌ Không đạt"`.

---

## 3. Khu Vực & File Liên Quan
- **Backend Controller**: [baiTestController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/baiTestController.js) (hàm `checkSubmitted`)
- **Frontend Component**: [EntranceTest.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/student/EntranceTest.js) (logic giải mã hiển thị kết quả)

---

## 4. Cách Xử Lý Đúng
Thay vì sửa ở frontend, chúng ta bổ sung ánh xạ thông minh tại backend API `checkSubmitted` để đảm bảo **tương thích ngược hoàn hảo** và sửa triệt để cho mọi trường hợp:

1. Bổ sung `.populate('DangKyDeTai')` khi truy vấn thực thể `KetQuaTest` trong hàm `checkSubmitted`:
   ```javascript
   const result = await KetQuaTest.findOne({ BaiTest: baiTest._id, SinhVien: sinhVienId })
       .populate('DangKyDeTai');
   ```
2. Thực hiện dịch ngược động trạng thái đăng ký đề tài (`DangKyDeTai.TrangThai`) sang `competitionResult` tương ứng để trả về cho frontend:
   ```javascript
   let competitionResult = undefined;
   if (result && result.DangKyDeTai) {
       const status = result.DangKyDeTai.TrangThai;
       if (status === 'DaDuyet') competitionResult = 'winner';
       else if (status === 'ChoDoi') competitionResult = 'waiting';
       else if (status === 'Thua') competitionResult = 'lost';
       else if (status === 'TuChoi') competitionResult = 'rejected';
   }
   ```
3. Đóng gói và trả về trong phản hồi API dưới dạng thuộc tính mở rộng của `result`:
   ```javascript
   res.json({
       hasTest: true,
       submitted: !!result,
       result: result ? {
           ...result.toObject(),
           competitionResult: competitionResult
       } : null,
       testId: baiTest._id
   });
   ```

---

## 5. Kết Quả Sau Khi Khắc Phục
* Khi tải lại trang bài test đã nộp thành công, phần chi tiết kết quả cạnh tranh hiển thị chính xác thẻ Tag màu vàng gold **`🏆 Thắng`** thay thế hoàn toàn cho thẻ Tag màu đỏ lỗi trước đó.
* Các nhóm ở trạng thái chờ duyệt hoặc bị từ chối cũng sẽ nhận được thẻ Tag chính xác tương ứng (`⏳ Đang chờ`, `😞 Thua`, `❌ Không đạt`).
* Không cần thay đổi mã nguồn ở frontend, đảm bảo hệ thống chạy mượt mà và an toàn.

---

## 6. Bài Học Rút Ra
* Khi thiết kế các API truy vấn lịch sử hoặc trạng thái (`check`, `status`, `history`), luôn cần kiểm tra xem thực thể lưu trữ trực tiếp (như `KetQuaTest`) có liên kết hoặc phụ thuộc vào thực thể nghiệp vụ (như `DangKyDeTai`) hay không. Nếu có, cần `populate` để lấy thông tin trạng thái mới nhất từ cơ sở dữ liệu gốc.
* Đọc và map thuộc tính tại backend (Data Translation) trước khi gửi về frontend là một giải pháp rất tốt giúp giữ cho frontend gọn gàng, giảm thiểu rủi ro phải cập nhật giao diện ở nhiều nơi.
