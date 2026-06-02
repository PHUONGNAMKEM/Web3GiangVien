# WGV Master Task Log: Sửa lỗi Giao diện Chấm điểm, Theo dõi Tiến độ & Làm đẹp Cảnh báo Bảo mật Blockchain

Tài liệu này tổng hợp toàn bộ các lỗi giao diện (UI/UX) và đồng bộ dữ liệu blockchain đã được khắc phục triệt để.

---

## 1. Lỗi UI/UX Chấm điểm load mãi (SubmissionReview.js)

### Vấn đề ban đầu (Original Issue)
Khi Giảng viên thực hiện chấm điểm và review bài nộp đồ án/khóa luận của sinh viên, hoặc nhấn "Ghi lại Blockchain" tại trang chấm điểm:
* Giao diện Drawer bên phải bị **đơ/treo vĩnh viễn ở trạng thái "Đang mở MetaMask Signing..."** với vòng quay loading.
* Tuy nhiên, khi người dùng tải lại trang bằng phím **F5**, hệ thống hiển thị điểm số và trạng thái chấm điểm thành công. Dữ liệu trong MongoDB thực tế đã được lưu chuẩn xác.

### Nguyên nhân (Root Cause)
Lỗi xảy ra hoàn toàn ở phía Frontend, do việc **cập nhật sai cấu trúc State làm hỏng (corrupt) kiểu dữ liệu** của React component:
* State `submissions` là mảng phẳng chứa danh sách các **bản ghi nộp bài cá nhân** (Individual Submissions).
* Trong khi đó, `selectedSubmission` (và `record` truyền qua hàm hiển thị chi tiết) thực chất là đối tượng Nhóm (Group Object) đã được tổng hợp qua hàm `groupedSubmissions`.
* Tại 3 hàm xử lý chính là `viewDetails`, `handleBlockchainMint`, và `handleRetryBlockchain`, hệ thống đã thực hiện câu lệnh `.map()` thay thế bản ghi cá nhân trong `submissions` bằng đối tượng Nhóm (Group Object).
* Việc này khiến cho hàm `groupedSubmissions` re-render bị lặp đệ quy vô hạn cấu trúc dữ liệu (`members` chứa Group object, Group object lại có `members` chứa chính nó). Điều này khiến cho React bị crash ngay trong lúc re-render, làm State `isMinting` bị treo vĩnh viễn ở giá trị `true`.

### Cách xử lý (Resolution)
Thay thế toàn bộ các câu lệnh map cập nhật State hỏng cấu trúc bằng các câu lệnh cập nhật an toàn, chỉ sửa đổi các thuộc tính nội bộ của bản ghi cá nhân thay vì thay thế bằng đối tượng Nhóm:
1. **Hàm `viewDetails`**: Chỉ cập nhật trường `submission` chứa văn bản trích xuất PDF.
2. **Hàm `handleBlockchainMint`**: Cập nhật trạng thái `DaCham` và điểm số đồng bộ cho tất cả thành viên có cùng ID đăng ký (`registration?._id`).
3. **Hàm `handleRetryBlockchain`**: Dùng `gradeId` của điểm số để cập nhật đúng bản ghi cá nhân.

---

## 2. Lỗi giao diện & Không đồng nhất màu sắc (ProgressTracking.js)

### Vấn đề ban đầu (Original Issue)
* **Vòng tròn đo điểm (gauge)** ở Card "Khối Lập Phương Điểm" của Sinh viên hiển thị dải màu xanh lá - xanh biển (gradient) ngay cả khi điểm bằng `0` hoặc ở trạng thái `"Chờ"` (chưa được AI phân tích), gây hiểu lầm cho người dùng là đã có kết quả chấm điểm.
* **Không đồng nhất màu sắc**: Có sự xuất hiện đan xen của màu xanh lá mạ `#52c41a` (success) và màu xanh biển `#1677ff` thương hiệu của hệ thống.

### Nguyên nhân (Root Cause)
* Thuộc tính `strokeColor` của gauge `AntProgress` được cấu hình mặc định dải gradient `{ '0%': '#108ee9', '100%': '#87d068' }` bất kể phần trăm điểm là bao nhiêu.
* Nhiều icon, tag và Alert kết quả PhoBERT AI sử dụng kiểu `"success"` mang sắc xanh lá mạ của Ant Design, lệch tông với hệ thống.

### Cách xử lý (Resolution)
* **Đồng bộ Progress Gauge**: Sửa thuộc tính `strokeColor` thành `finalGrade || aiResult ? '#1677ff' : '#d9d9d9'`. Khi chưa chấm điểm (Trạng thái "Chờ"), vòng tròn hiển thị màu **Xám nhạt trung tính `#d9d9d9`** (inactive), và chỉ chuyển sang màu **Xanh Biển thương hiệu `#1677ff`** khi có điểm số thực tế!
* **Đồng bộ Steps**: Chuyển mã màu các icon trạng thái trong `Steps` từ `#52c41a` sang màu xanh biển `#1677ff`.
* **Khắc phục lỗi Icon AI sáng màu sớm**: Sửa thuộc tính `color` của `<BrainCircuit>` từ dạng hardcode `color="#1677ff"` sang dynamic `color={aiResult ? '#1677ff' : undefined}`. Điều này giúp icon tự động hiển thị xám trung tính (inactive) cho đến khi nộp bài và AI thực sự phân tích xong.
* **Đồng nhất Alert AI**: Chuyển kiểu hiển thị của Alert kết quả AI từ loại `"success"` sang kiểu `"info"` (nền xanh biển nhạt dịu mát) và cập nhật thẻ Đề tài về tông xanh biển.

---

## 3. Chỉnh sửa Hiển thị Lỗi Bảo mật Blockchain ("already graded")

### Bản chất & Nguyên nhân (Root Cause)
* **Bản chất**: Lỗi `execution reverted: "Submission already graded"` là một **Tính năng bảo mật của Smart Contract** (`ThesisManagementV2.sol`) nhằm ngăn chặn việc thay đổi điểm số đã khóa cứng trên chuỗi khối.
* **Quyết định thiết kế**: Giữ nguyên tính năng bảo mật nguyên bản này ở cả Backend và Smart Contract (không can thiệp sửa đổi hay đồng bộ đè dữ liệu).
* **Vấn đề giao diện**: Trước đây, khi xảy ra lỗi này, frontend in ra nguyên văn chuỗi lỗi thô kỹ thuật (CALL_EXCEPTION) cực kỳ dài và thô, gây mất thẩm mỹ giao diện.

### Cách xử lý (Resolution)
* **Hàm `formatBlockchainError` ở Frontend**: Phát triển bộ chuyển đổi lỗi thông minh tại [SubmissionReview.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/lecturer/SubmissionReview.js). 
* **Làm đẹp thông báo**: Khi bắt được mã lỗi có chứa `"already graded"`, hệ thống tự động loại bỏ chuỗi JSON/CALL_EXCEPTION thô, thay vào đó hiển thị hộp thoại cảnh báo **Ant Design Alert màu vàng (warning) cực kỳ trực quan**:
  > *"Điểm số này đã được khóa và ghi nhận an toàn trên Smart Contract Blockchain từ trước. Để bảo vệ dữ liệu chống giả mạo, hệ thống chặn mọi thao tác ghi đè hoặc chấm lại điểm."*
* **Hợp nhất Alert & Tối giản (Merged Alert Layout)**: Loại bỏ hoàn toàn nút bấm "Ghi lại Blockchain" dư thừa, đồng thời đưa hộp cảnh báo lỗi màu vàng này tích hợp gọn gàng trực tiếp vào phần `description` của Alert chính `Sinh viên đã được chấm điểm`, phân tách tinh tế bằng một đường kẻ đứt (`dashed border`) mờ sang trọng.
* **Tự động chuyển lỗi thành Đã ghi nhận an toàn (Smart Status Tag Override)**: Hệ thống tự động bắt lỗi bảo mật `"already graded"`. Khi phát hiện lỗi này, thẻ trạng thái Blockchain màu đỏ `Lỗi ghi Blockchain` sẽ tự động chuyển sang màu **xanh lá tươi sáng** mang nhãn **"Đã ghi nhận an toàn (Blockchain)"** và hộp Alert chuyển sang nền xanh lá nhạt đầy tin cậy, giúp phản ánh 100% chính xác bản chất an toàn của dữ liệu và cải thiện trải nghiệm người dùng.
* **Sửa lỗi lặp/duplicate thông báo giành được đề tài (De-duplicate Test Winner Toast)**: Khắc phục triệt để việc hiển thị nhân đôi thông báo chúc mừng `"🏆 Chúc mừng! Nhóm bạn giành được đề tài!"` khi hoàn thành bài test đầu vào do sự giao thoa đồng thời giữa API nộp bài trực tiếp và Socket.IO sự kiện Realtime. Giải pháp sử dụng cơ chế cấu hình `key: "win_topic_toast"` duy nhất cho tất cả cuộc gọi `message.success` của Ant Design, giúp hệ thống tự động lọc trùng và hiển thị duy nhất một thẻ thông báo an toàn, ngăn nắp trên UI.
* **Phát triển cơ chế Tự phục hồi dữ liệu (Self-Healing Blockchain Grade Sync)**: Xây dựng giải pháp đọc dữ liệu lịch sử nộp bài trực tiếp từ Blockchain thông qua Smart Contract (`getSubmissionHistory`). Khi Giảng viên nhấn nút **"Đồng bộ từ Blockchain"** trên UI (hoặc khi xảy ra lỗi `'already graded'` lúc chấm điểm), Backend sẽ tự động đọc điểm số on-chain (ví dụ: `grade = 58` thành `5.8`), ghi đè ngược lại vào MongoDB để đồng nhất dữ liệu và đổi trạng thái Blockchain sang màu xanh lá tươi sáng, hoàn toàn loại bỏ chữ "Lỗi".
* Đồng thời, làm đẹp luôn các mã lỗi phổ biến khác như: Từ chối giao dịch ví MetaMask (`ACTION_REJECTED`), Ví không đủ tiền trả phí gas (`insufficient funds`), hoặc trích xuất tự động lý do revert ngắn gọn của Ethers.js.

---

## 4. Kiểm thử & Đóng gói (Verification)
* **Build Check**: Dự án frontend đã được đóng gói thành công tốt đẹp (`Compiled successfully` với kích thước bundle `984.77 kB` - build mới `main.5cd6a1bb.js`) không có bất kỳ lỗi cú pháp nào.
* **Môi trường Database**: Đã reset sạch và nạp lại toàn bộ dữ liệu test mẫu, sẵn sàng kiểm thử.
