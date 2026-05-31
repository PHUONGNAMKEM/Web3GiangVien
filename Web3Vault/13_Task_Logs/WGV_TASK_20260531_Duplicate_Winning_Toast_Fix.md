# Tri Thức Khắc Phục Lỗi Duplicate Toast Thông Báo Khi Hoàn Thành Bài Test

## 1. Vấn Đề Ban Đầu
Khi sinh viên (trưởng nhóm) hoàn thành làm bài test cạnh tranh đầu vào và đạt điểm tuyệt đối để giành đề tài (Winner), hệ thống hiển thị cùng lúc **2 thông báo toast thành công giống hệt nhau** ở góc trên màn hình:
`"🏆 Chúc mừng! Nhóm bạn giành được đề tài!"`

---

## 2. Nguyên Nhân
Lỗi xảy ra do cơ chế truyền thông hai luồng đồng thời (HTTP Response và Socket.IO Broadcast):
1. **Luồng 1 (HTTP Response)**: Khi sinh viên click "Nộp Bài Test", frontend gửi yêu cầu HTTP POST `/submit` đến backend. Backend xử lý kết quả, xác định nhóm này thắng và trả về kết quả `{ competitionResult: 'winner' }`.
   Tại hàm `handleSubmit` trong [EntranceTest.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/student/EntranceTest.js#L167), hệ thống nhận kết quả trực tiếp này và hiển thị toast thông báo:
   `message.success('🏆 Chúc mừng! Nhóm bạn giành được đề tài!');`
2. **Luồng 2 (Socket.IO Broadcast)**: Khi backend xử lý thắng cuộc, nó đồng thời gửi một sự kiện Socket.IO broadcast `competition:winner` đến toàn bộ các client đang ở trong phòng thi đấu.
   Tại component [EntranceTest.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/student/EntranceTest.js#L53), listener socket nhận được broadcast này, kiểm tra thấy nhóm mình thắng cuộc và cũng hiển thị toast thông báo:
   `message.success({ content: '🏆 Chúc mừng! Nhóm bạn giành được đề tài!', duration: 10 });`

Do trưởng nhóm vừa là người trực tiếp gửi yêu cầu submit, vừa là người nhận broadcast từ socket, cả 2 luồng cùng chạy khiến 2 thông báo toast bị kích hoạt đồng thời.

---

## 3. Khu Vực & File Liên Quan
- **Frontend Component**: [EntranceTest.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/student/EntranceTest.js)

---

## 4. Cách Xử Lý Đúng
Sử dụng một cơ chế cờ hiệu (Ref flag) để kiểm soát việc đã nộp bài hay chưa:

1. Khai báo một `useRef` lưu giữ trạng thái nộp bài mới nhất:
   ```javascript
   const submittedRef = useRef(false);

   useEffect(() => {
     submittedRef.current = submitted;
   }, [submitted]);
   ```
2. Tại listener của Socket.IO event `competition:winner`, chỉ hiển thị thông báo toast nếu trạng thái `submittedRef.current` đang là `false` (tức là nhận thông báo từ đồng đội hoặc broadcast trễ, không phải do chính client hiện tại vừa submit trực tiếp):
   ```javascript
   socket.on('competition:winner', ({ winnerNhomId, winnerName }) => {
     if (myNhom && winnerNhomId === myNhom._id) {
       setCompetitionResult('winner');
       if (!submittedRef.current) {
         message.success({ content: '🏆 Chúc mừng! Nhóm bạn giành được đề tài!', duration: 10 });
       }
     } else { ... }
   ```

---

## 5. Kết Quả Sau Khi Khắc Phục
* Khi Trưởng nhóm nộp bài thành công và giành chiến thắng, hệ thống chỉ hiển thị duy nhất **1 thông báo toast** từ luồng phản hồi trực tiếp HTTP, tránh hoàn toàn lỗi duplicate toast.
* Các thành viên khác trong nhóm (hoặc các nhóm đối thủ) vẫn nhận đầy đủ thông báo realtime qua Socket.IO mà không bị ảnh hưởng.
* Ứng dụng biên dịch thành công 100% không phát sinh lỗi.

---

## 6. Bài Học Rút Ra
* Đối với các ứng dụng Web kết hợp Hybrid (HTTP REST API + Realtime WebSockets), luôn cần có cơ chế **khử trùng lặp (deduplication)** đối với các thông báo trạng thái có thể được kích hoạt bởi cả 2 luồng.
* Sử dụng `useRef` là phương pháp tối ưu để lưu giữ trạng thái thay đổi liên tục mà không bị dính lỗi stale closure trong các sự kiện lắng nghe Socket.IO được tạo một lần ở `useEffect` mount.
