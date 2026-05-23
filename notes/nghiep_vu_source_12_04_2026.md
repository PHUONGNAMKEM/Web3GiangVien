# [[Nghiệp vụ Web3 Giảng Viên]]

## Định nghĩa
- Phiên bản source ngày 12.04 được tái thiết kế từ nền tảng [[quản lý nhân sự]] sang miền nghiệp vụ đào tạo và hướng dẫn đồ án.
- Hệ thống kết hợp [[React]], [[Node.js]], [[MongoDB]], [[Hardhat]] và [[Ethers.js]] để xử lý luồng nghiệp vụ học thuật.

## Bản chất
- Trục nghiệp vụ chính là [[quản lý đề tài]], [[nộp báo cáo]], [[theo dõi tiến độ]] và [[chấm điểm]].
- [[MongoDB]] xử lý dữ liệu thay đổi thường xuyên như hồ sơ, đăng ký và trạng thái duyệt.
- [[Blockchain]] và [[Smart contract]] xử lý các mốc cần tính xác thực cao như khóa đề tài, ghi nhận bài nộp cuối và chốt điểm.
- [[SBERT]] và [[PhoBERT]] đóng vai trò [[AI hỗ trợ đánh giá]] và [[AI hỗ trợ gợi ý]].

## Khi nào dùng
- Khi giảng viên cần tạo, cập nhật hoặc chốt danh sách đề tài.
- Khi sinh viên cần đăng ký đề tài, nộp báo cáo và theo dõi trạng thái xử lý.
- Khi hệ thống cần so khớp năng lực sinh viên với yêu cầu đề tài bằng [[SBERT]].
- Khi hệ thống cần phân tích nội dung báo cáo và hỗ trợ chấm điểm bằng [[PhoBERT]].
- Khi cần tách rõ dữ liệu vận hành hằng ngày với dữ liệu phải lưu dấu cuối cùng trên [[blockchain]].

## Ví dụ
- Giảng viên tạo một [[đề tài]] với mô tả, yêu cầu chuyên môn và hạn chót, sau đó sinh viên đăng ký và chờ duyệt trong [[MongoDB]].
- Sinh viên nộp file báo cáo, hệ thống trích xuất nội dung để lưu lịch sử nộp và phục vụ phân tích.
- [[SBERT]] lấy [[GPA]] và độ tương đồng ngữ nghĩa để xếp hạng độ phù hợp giữa sinh viên và đề tài.
- [[PhoBERT]] đọc nội dung báo cáo, đo mức độ bám đề và sinh ra phản hồi chấm điểm theo thang 10.
- Khi giảng viên chốt kết quả, [[ThesisManagement]] ghi nhận điểm chính thức lên [[blockchain]] để tránh sửa đè.

## Liên kết liên quan
- [[Web3 Giảng Viên]]
- [[quản lý đề tài]]
- [[nộp báo cáo]]
- [[chấm điểm]]
- [[SBERT]]
- [[PhoBERT]]
- [[MongoDB]]
- [[Blockchain]]
- [[Smart contract]]
- [[ThesisManagement]]