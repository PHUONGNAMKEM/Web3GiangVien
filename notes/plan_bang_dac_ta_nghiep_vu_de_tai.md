# Plan vẽ đầy đủ bảng đặc tả nghiệp vụ cho đề tài

## 1. Đề tài áp dụng

Đề tài: Xây dựng hệ thống web quản lý đề tài giữa giảng viên và sinh viên có tích hợp AI, IPFS và blockchain.

Mục tiêu của plan này là xác định đầy đủ các bảng đặc tả nghiệp vụ cần viết trước khi vẽ Activity Diagram, Sequence Diagram hoặc các sơ đồ phân tích liên quan.

## 2. Nguyên tắc đặc tả nghiệp vụ

- Mỗi bảng đặc tả tương ứng với một Use Case nghiệp vụ chính.
- Mỗi Use Case phải tạo ra giá trị rõ ràng cho ít nhất một tác nhân.
- Tên Use Case dùng cụm động từ, ví dụ: Đăng ký đề tài, Duyệt đăng ký đề tài.
- Actor dùng danh từ, ví dụ: Sinh viên, Giảng viên, Quản trị viên.
- Dòng cơ bản mô tả luồng xử lý bình thường.
- Dòng thay thế mô tả điều kiện rẽ nhánh, lỗi hoặc ngoại lệ.
- Không mô tả quá sâu chi tiết kỹ thuật ở mức API hoặc database trong bảng đặc tả nghiệp vụ.
- Các thành phần AI, IPFS và blockchain chỉ đưa vào khi có vai trò nghiệp vụ cụ thể.

## 3. Danh sách tác nhân nghiệp vụ

### Sinh viên

Sinh viên là người sử dụng hệ thống để cập nhật hồ sơ, tra cứu đề tài, đăng ký đề tài, theo dõi tiến độ, nộp báo cáo và xem kết quả đánh giá.

### Giảng viên

Giảng viên là người tạo và công bố đề tài, xét duyệt đăng ký, theo dõi quá trình thực hiện, xem báo cáo, tham khảo kết quả phân tích AI và chấm điểm đề tài.

### Quản trị viên

Quản trị viên là người quản lý tài khoản, phân quyền, hỗ trợ vận hành hệ thống và theo dõi dữ liệu tổng quát.

### Dịch vụ AI

Dịch vụ AI là hệ thống hỗ trợ phân loại cấp bậc sinh viên, gợi ý đề tài phù hợp và phân tích nội dung báo cáo.

### Hệ thống IPFS/Blockchain

Hệ thống IPFS/Blockchain hỗ trợ lưu trữ hoặc định danh tài liệu báo cáo, ghi nhận mã hash, thời điểm nộp và kết quả điểm đã chốt để phục vụ truy vết và đối chiếu.

## 4. Danh sách bảng đặc tả nghiệp vụ cần thực hiện

### Bảng 1. Quản lý tài khoản và phân quyền

- Tác nhân chính: Quản trị viên.
- Tác nhân liên quan: Sinh viên, Giảng viên.
- Mục tiêu: Tạo và quản lý tài khoản người dùng, phân quyền đúng theo vai trò.
- Cần đặc tả:
  - Tạo tài khoản.
  - Cập nhật thông tin tài khoản.
  - Khóa hoặc mở khóa tài khoản.
  - Gán vai trò người dùng.
- Dòng thay thế cần xét:
  - Tài khoản đã tồn tại.
  - Thông tin bắt buộc chưa đầy đủ.
  - Vai trò không hợp lệ.

### Bảng 2. Cập nhật hồ sơ sinh viên

- Tác nhân chính: Sinh viên.
- Tác nhân liên quan: Quản trị viên, Dịch vụ AI.
- Mục tiêu: Ghi nhận hồ sơ, kỹ năng, năng lực và định hướng nghiên cứu của sinh viên.
- Cần đặc tả:
  - Sinh viên cập nhật thông tin cá nhân.
  - Sinh viên nhập kỹ năng, năng lực, lĩnh vực quan tâm.
  - Hệ thống lưu hồ sơ để phục vụ gợi ý đề tài.
- Dòng thay thế cần xét:
  - Hồ sơ thiếu thông tin bắt buộc.
  - Dữ liệu nhập không hợp lệ.
  - Sinh viên chưa đăng nhập.

### Bảng 3. Cập nhật hồ sơ giảng viên

- Tác nhân chính: Giảng viên.
- Tác nhân liên quan: Quản trị viên.
- Mục tiêu: Ghi nhận thông tin chuyên môn, lĩnh vực nghiên cứu và thông tin liên hệ của giảng viên.
- Cần đặc tả:
  - Giảng viên cập nhật thông tin cá nhân.
  - Giảng viên cập nhật chuyên môn và lĩnh vực nghiên cứu.
  - Hệ thống lưu hồ sơ để phục vụ công bố và quản lý đề tài.
- Dòng thay thế cần xét:
  - Thông tin chuyên môn chưa đầy đủ.
  - Dữ liệu nhập không hợp lệ.

### Bảng 4. Tạo và công bố đề tài

- Tác nhân chính: Giảng viên.
- Tác nhân liên quan: Sinh viên, Quản trị viên.
- Mục tiêu: Giảng viên tạo đề tài và công bố để sinh viên tra cứu, đăng ký.
- Cần đặc tả:
  - Giảng viên nhập tên đề tài, mô tả, yêu cầu, số lượng sinh viên, kỹ năng cần có và thời hạn đăng ký.
  - Hệ thống kiểm tra dữ liệu đề tài.
  - Hệ thống lưu đề tài.
  - Giảng viên công bố đề tài.
- Dòng thay thế cần xét:
  - Thiếu thông tin bắt buộc.
  - Số lượng sinh viên không hợp lệ.
  - Thời hạn đăng ký không hợp lệ.
  - Giảng viên lưu nháp nhưng chưa công bố.

### Bảng 5. Tra cứu và xem chi tiết đề tài

- Tác nhân chính: Sinh viên.
- Tác nhân liên quan: Giảng viên.
- Mục tiêu: Sinh viên tìm kiếm và xem thông tin chi tiết của đề tài phù hợp.
- Cần đặc tả:
  - Sinh viên mở danh sách đề tài.
  - Sinh viên tìm kiếm hoặc lọc đề tài.
  - Sinh viên xem chi tiết đề tài.
  - Hệ thống hiển thị yêu cầu, mô tả, giảng viên hướng dẫn và trạng thái đăng ký.
- Dòng thay thế cần xét:
  - Không tìm thấy đề tài phù hợp.
  - Đề tài đã đóng đăng ký.
  - Đề tài đã đủ số lượng sinh viên.

### Bảng 6. Phân loại cấp bậc sinh viên và gợi ý đề tài

- Tác nhân chính: Sinh viên.
- Tác nhân liên quan: Dịch vụ AI, Giảng viên.
- Mục tiêu: Tự động lọc và hiển thị danh sách đề tài phù hợp với cấp bậc, kỹ năng và hồ sơ của sinh viên.
- Cần đặc tả:
  - Sinh viên yêu cầu gợi ý đề tài.
  - Hệ thống lấy hồ sơ và kỹ năng của sinh viên.
  - Dịch vụ AI phân loại cấp bậc hoặc mức độ phù hợp.
  - Hệ thống hiển thị danh sách đề tài đề xuất.
- Dòng thay thế cần xét:
  - Hồ sơ sinh viên chưa đầy đủ.
  - Không có đề tài phù hợp.
  - Dịch vụ AI không phản hồi.
  - Kết quả AI chỉ được dùng để tham khảo.

### Bảng 7. Đăng ký đề tài

- Tác nhân chính: Sinh viên.
- Tác nhân liên quan: Giảng viên.
- Mục tiêu: Ghi nhận yêu cầu đăng ký đề tài của sinh viên hoặc nhóm sinh viên.
- Cần đặc tả:
  - Sinh viên chọn đề tài.
  - Sinh viên gửi yêu cầu đăng ký.
  - Hệ thống kiểm tra điều kiện đăng ký.
  - Hệ thống lưu yêu cầu ở trạng thái chờ duyệt.
  - Hệ thống thông báo kết quả gửi yêu cầu.
- Dòng thay thế cần xét:
  - Sinh viên đã có đề tài được duyệt.
  - Đề tài đã đủ số lượng sinh viên.
  - Đề tài đã hết hạn đăng ký.
  - Hồ sơ sinh viên chưa đầy đủ.

### Bảng 8. Duyệt đăng ký đề tài

- Tác nhân chính: Giảng viên.
- Tác nhân liên quan: Sinh viên.
- Mục tiêu: Giảng viên xét duyệt hoặc từ chối yêu cầu đăng ký đề tài.
- Cần đặc tả:
  - Giảng viên xem danh sách đăng ký.
  - Giảng viên xem hồ sơ sinh viên hoặc nhóm sinh viên.
  - Giảng viên duyệt hoặc từ chối đăng ký.
  - Hệ thống cập nhật trạng thái đăng ký.
  - Hệ thống thông báo kết quả cho sinh viên.
- Dòng thay thế cần xét:
  - Đề tài đã đủ số lượng sinh viên.
  - Yêu cầu đăng ký đã bị hủy.
  - Sinh viên không đáp ứng yêu cầu đề tài.

### Bảng 9. Theo dõi và cập nhật tiến độ thực hiện đề tài

- Tác nhân chính: Sinh viên.
- Tác nhân liên quan: Giảng viên.
- Mục tiêu: Ghi nhận quá trình thực hiện đề tài và hỗ trợ giảng viên theo dõi tiến độ.
- Cần đặc tả:
  - Sinh viên cập nhật nội dung tiến độ.
  - Sinh viên nhập phần trăm hoàn thành hoặc trạng thái công việc.
  - Hệ thống lưu tiến độ.
  - Giảng viên xem tiến độ và phản hồi.
- Dòng thay thế cần xét:
  - Sinh viên chưa có đề tài được duyệt.
  - Nội dung tiến độ không hợp lệ.
  - Giảng viên yêu cầu chỉnh sửa hoặc bổ sung.

### Bảng 10. Nộp báo cáo

- Tác nhân chính: Sinh viên.
- Tác nhân liên quan: Giảng viên, Hệ thống IPFS/Blockchain.
- Mục tiêu: Sinh viên nộp báo cáo hoặc tài liệu liên quan đến đề tài.
- Cần đặc tả:
  - Sinh viên chọn đề tài đang thực hiện.
  - Sinh viên tải lên báo cáo.
  - Hệ thống kiểm tra định dạng và dung lượng tệp.
  - Hệ thống lưu thông tin báo cáo.
  - Nếu là báo cáo cuối cùng, hệ thống tạo mã IPFS/hash để phục vụ xác thực.
- Dòng thay thế cần xét:
  - Tệp sai định dạng.
  - Tệp vượt quá dung lượng cho phép.
  - Sinh viên nộp quá hạn.
  - Quá trình lưu IPFS thất bại.

### Bảng 11. Lưu trữ báo cáo bằng IPFS

- Tác nhân chính: Hệ thống IPFS.
- Tác nhân liên quan: Sinh viên, Backend.
- Mục tiêu: Lưu trữ hoặc định danh tài liệu báo cáo bằng mã IPFS/hash.
- Cần đặc tả:
  - Backend gửi tệp hoặc dữ liệu báo cáo đến IPFS.
  - IPFS trả về mã định danh nội dung.
  - Backend lưu mã IPFS vào MongoDB.
  - Mã IPFS được dùng cho bước ghi nhận blockchain.
- Dòng thay thế cần xét:
  - IPFS không phản hồi.
  - Tệp không thể tải lên.
  - Mã IPFS không được tạo.

### Bảng 12. Ghi nhận dữ liệu lên blockchain

- Tác nhân chính: Backend, Smart Contract.
- Tác nhân liên quan: Sinh viên, Giảng viên, Hệ thống IPFS/Blockchain.
- Mục tiêu: Ghi nhận các mốc dữ liệu quan trọng để tăng tính minh bạch và khả năng truy vết.
- Cần đặc tả:
  - Backend chuẩn bị dữ liệu cần ghi nhận.
  - Backend gọi hàm Smart Contract.
  - Blockchain xác thực giao dịch.
  - Smart Contract ghi nhận mã IPFS/hash, thời điểm nộp hoặc điểm đã chốt.
  - Backend lưu transaction hash vào MongoDB.
- Dòng thay thế cần xét:
  - Dữ liệu đầu vào không hợp lệ.
  - Giao dịch blockchain thất bại.
  - Smart Contract từ chối do không đủ quyền hoặc ghi trùng.
  - Mạng blockchain phản hồi chậm.

### Bảng 13. Phân tích báo cáo bằng AI

- Tác nhân chính: Giảng viên.
- Tác nhân liên quan: Sinh viên, Dịch vụ AI.
- Mục tiêu: AI hỗ trợ phân tích nội dung báo cáo và trả về nhận xét, điểm tham khảo.
- Cần đặc tả:
  - Giảng viên chọn báo cáo cần phân tích.
  - Hệ thống gửi nội dung báo cáo đến dịch vụ AI.
  - AI phân tích nội dung bài làm cuối cùng.
  - AI trả về nhận xét đánh giá và điểm tham khảo.
  - Giảng viên xem kết quả AI để hỗ trợ chấm điểm.
- Dòng thay thế cần xét:
  - Báo cáo chưa có nội dung hợp lệ.
  - Dịch vụ AI xử lý thất bại.
  - Kết quả AI không đủ độ tin cậy.
  - Giảng viên bỏ qua kết quả AI và tự đánh giá.

### Bảng 14. Chấm điểm và chốt kết quả

- Tác nhân chính: Giảng viên.
- Tác nhân liên quan: Sinh viên, Dịch vụ AI, Hệ thống IPFS/Blockchain.
- Mục tiêu: Giảng viên đánh giá kết quả thực hiện đề tài và chốt điểm chính thức.
- Cần đặc tả:
  - Giảng viên xem báo cáo cuối cùng.
  - Giảng viên xem tiến độ thực hiện.
  - Giảng viên xem kết quả phân tích AI nếu có.
  - Giảng viên nhập nhận xét và điểm.
  - Hệ thống lưu điểm vào MongoDB.
  - Hệ thống ghi nhận điểm đã chốt lên blockchain nếu cần.
- Dòng thay thế cần xét:
  - Báo cáo chưa được nộp.
  - Điểm nhập không hợp lệ.
  - Giảng viên chưa muốn chốt điểm.
  - Ghi nhận blockchain thất bại.

### Bảng 15. Tra cứu kết quả và minh chứng

- Tác nhân chính: Sinh viên.
- Tác nhân liên quan: Giảng viên, Quản trị viên, Hệ thống IPFS/Blockchain.
- Mục tiêu: Cho phép người dùng tra cứu kết quả đánh giá và các minh chứng liên quan.
- Cần đặc tả:
  - Sinh viên xem điểm và nhận xét.
  - Hệ thống hiển thị mã IPFS/hash hoặc transaction hash nếu có.
  - Người dùng có quyền tra cứu thông tin minh chứng.
  - Hệ thống đối chiếu dữ liệu trong MongoDB với dữ liệu blockchain khi cần.
- Dòng thay thế cần xét:
  - Điểm chưa được công bố.
  - Không có transaction hash.
  - Dữ liệu blockchain chưa được xác nhận.

### Bảng 16. Quản lý thống kê quá trình thực hiện đề tài

- Tác nhân chính: Giảng viên, Quản trị viên.
- Tác nhân liên quan: Sinh viên.
- Mục tiêu: Theo dõi, tổng hợp và thống kê quá trình thực hiện đề tài.
- Cần đặc tả:
  - Giảng viên hoặc quản trị viên xem thống kê đề tài.
  - Hệ thống tổng hợp số lượng đề tài, số lượng đăng ký, trạng thái tiến độ, báo cáo đã nộp và kết quả đánh giá.
  - Người dùng lọc thống kê theo giảng viên, sinh viên, trạng thái hoặc thời gian.
- Dòng thay thế cần xét:
  - Không có dữ liệu thống kê.
  - Người dùng không đủ quyền xem thống kê.
  - Dữ liệu thống kê chưa được cập nhật.

## 5. Thứ tự ưu tiên khi viết bảng đặc tả

### Nhóm bắt buộc cho luồng nghiệp vụ cốt lõi

1. Quản lý tài khoản và phân quyền.
2. Cập nhật hồ sơ sinh viên.
3. Tạo và công bố đề tài.
4. Tra cứu và xem chi tiết đề tài.
5. Đăng ký đề tài.
6. Duyệt đăng ký đề tài.
7. Theo dõi và cập nhật tiến độ.
8. Nộp báo cáo.
9. Chấm điểm và chốt kết quả.

### Nhóm thể hiện điểm riêng của đề tài

1. Phân loại cấp bậc sinh viên và gợi ý đề tài.
2. Phân tích báo cáo bằng AI.
3. Lưu trữ báo cáo bằng IPFS.
4. Ghi nhận dữ liệu lên blockchain.
5. Tra cứu kết quả và minh chứng.

### Nhóm bổ sung cho báo cáo và đánh giá

1. Quản lý thống kê quá trình thực hiện đề tài.
2. Cập nhật hồ sơ giảng viên.
3. Nhật ký thao tác và truy vết hệ thống nếu cần.

## 6. Checklist hoàn thành mỗi bảng đặc tả

- Có tên Use Case rõ ràng.
- Có mô tả thời điểm bắt đầu Use Case.
- Có mục tiêu nghiệp vụ.
- Có tác nhân chính và tác nhân liên quan.
- Có điều kiện trước nếu cần.
- Có dòng cơ bản viết theo thứ tự thời gian.
- Có dòng thay thế cho các trường hợp lỗi hoặc rẽ nhánh.
- Có kết quả sau khi hoàn tất.
- Có thể chuyển trực tiếp sang Activity Diagram.

## 7. Gợi ý số lượng bảng nên đưa vào báo cáo

Nếu báo cáo cần đầy đủ, nên trình bày khoảng 10 đến 16 bảng đặc tả nghiệp vụ.

Nếu cần rút gọn, nên ưu tiên 8 bảng sau:

1. Tạo và công bố đề tài.
2. Phân loại cấp bậc sinh viên và gợi ý đề tài.
3. Đăng ký đề tài.
4. Duyệt đăng ký đề tài.
5. Theo dõi và cập nhật tiến độ.
6. Nộp báo cáo.
7. Phân tích báo cáo bằng AI.
8. Ghi nhận dữ liệu lên blockchain.
