# Lập kế hoạch và phân công công việc

## 1. Mục đích lập kế hoạch

Việc lập kế hoạch và phân công công việc được thực hiện nhằm bảo đảm quá trình xây dựng hệ thống diễn ra có định hướng, có thứ tự ưu tiên và phù hợp với năng lực của từng thành viên trong nhóm. Đề tài có nhiều nhóm chức năng liên quan đến frontend, backend, cơ sở dữ liệu, AI, IPFS và blockchain, vì vậy nhóm cần chia công việc thành các giai đoạn rõ ràng để thuận tiện cho việc triển khai, kiểm thử và hoàn thiện báo cáo khóa luận.

Kế hoạch thực hiện được xây dựng theo hướng chia nhỏ nhiệm vụ theo từng mảng: khảo sát và phân tích nghiệp vụ, thiết kế dữ liệu, xây dựng backend, xây dựng frontend, tích hợp AI, tích hợp IPFS/blockchain, kiểm thử và viết tài liệu. Mỗi thành viên chịu trách nhiệm chính một số nhóm việc, đồng thời phối hợp với các thành viên còn lại ở các phần có liên quan.

## 2. Kế hoạch thực hiện tổng quát

| Giai đoạn | Nội dung thực hiện | Thời gian dự kiến | Kết quả cần đạt |
|---|---|---|---|
| Giai đoạn 1 | Khảo sát hiện trạng, xác định bài toán, phân tích quy trình giao đề tài, đăng ký, theo dõi tiến độ, nộp báo cáo và chấm điểm | Tuần 1 | Hoàn thành mô tả bài toán, phạm vi nghiên cứu và yêu cầu chức năng chính |
| Giai đoạn 2 | Thiết kế mô hình dữ liệu, xác định các thực thể chính như sinh viên, giảng viên, đề tài, đăng ký đề tài, báo cáo, tiến độ và điểm số | Tuần 2 | Hoàn thành thiết kế cơ sở dữ liệu và luồng xử lý nghiệp vụ |
| Giai đoạn 3 | Xây dựng backend, API xử lý nghiệp vụ, xác thực người dùng, quản lý đề tài, đăng ký đề tài, nhóm sinh viên, tiến độ và báo cáo | Tuần 3 - Tuần 4 | Backend hoạt động ổn định, có các API phục vụ frontend |
| Giai đoạn 4 | Xây dựng giao diện người dùng cho sinh viên và giảng viên; hoàn thiện các màn hình dashboard, đăng ký đề tài, nộp báo cáo, nhật ký tiến độ và chấm điểm | Tuần 4 - Tuần 5 | Frontend kết nối được với backend và đáp ứng các luồng nghiệp vụ chính |
| Giai đoạn 5 | Tích hợp AI hỗ trợ gợi ý đề tài và phân tích báo cáo; tích hợp IPFS để lưu file báo cáo và blockchain để ghi nhận các mốc dữ liệu quan trọng | Tuần 5 - Tuần 6 | Hệ thống có chức năng AI hỗ trợ đánh giá, lưu trữ báo cáo và ghi nhận kết quả |
| Giai đoạn 6 | Kiểm thử, sửa lỗi, hoàn thiện giao diện, chuẩn hóa dữ liệu mẫu và viết báo cáo khóa luận | Tuần 7 | Hoàn thiện sản phẩm demo, tài liệu mô tả và nội dung báo cáo |

## 3. Phân công công việc theo thành viên

| Thành viên | Nhiệm vụ chính | Thời gian thực hiện | Kết quả phụ trách |
|---|---|---|---|
| Thành viên 1 | Phân tích nghiệp vụ, thiết kế cơ sở dữ liệu, xây dựng backend quản lý sinh viên, giảng viên, đề tài, đăng ký đề tài và nhóm sinh viên | Tuần 1 - Tuần 4 | Tài liệu phân tích nghiệp vụ, mô hình dữ liệu, API backend cho các chức năng quản lý và đăng ký đề tài |
| Thành viên 2 | Xây dựng giao diện frontend cho sinh viên và giảng viên, gồm dashboard, đăng ký đề tài, quản lý nhóm, nộp báo cáo, nhật ký tiến độ và màn hình chấm điểm | Tuần 3 - Tuần 6 | Giao diện người dùng hoàn chỉnh, kết nối API, hiển thị đúng trạng thái nghiệp vụ |
| Thành viên 3 | Tích hợp AI, IPFS và blockchain; xây dựng luồng phân tích báo cáo, gợi ý đề tài, lưu file báo cáo, ghi nhận điểm và hỗ trợ kiểm thử hệ thống | Tuần 4 - Tuần 7 | Dịch vụ AI, tích hợp lưu trữ báo cáo, xử lý giao dịch blockchain và hỗ trợ kiểm thử cuối |

## 4. Phân công chi tiết theo nhóm chức năng

| Nhóm chức năng | Người phụ trách chính | Người phối hợp | Kết quả mong đợi |
|---|---|---|---|
| Khảo sát và phân tích yêu cầu | Thành viên 1 | Thành viên 2, Thành viên 3 | Xác định đúng bài toán, phạm vi, chức năng và luồng nghiệp vụ |
| Thiết kế cơ sở dữ liệu | Thành viên 1 | Thành viên 3 | Hoàn thiện các model dữ liệu chính và quan hệ giữa các thực thể |
| Backend nghiệp vụ | Thành viên 1 | Thành viên 2 | API quản lý đề tài, đăng ký, nhóm, tiến độ, báo cáo và điểm số |
| Frontend sinh viên | Thành viên 2 | Thành viên 1 | Giao diện cập nhật hồ sơ, đăng ký đề tài, nhận lời mời nhóm, nộp báo cáo và xem tiến độ |
| Frontend giảng viên | Thành viên 2 | Thành viên 1, Thành viên 3 | Giao diện tạo đề tài, duyệt đăng ký, xem tiến độ, tải báo cáo và chấm điểm |
| AI hỗ trợ gợi ý và đánh giá | Thành viên 3 | Thành viên 1 | Dịch vụ phân tích hồ sơ sinh viên, gợi ý đề tài và phân tích nội dung báo cáo |
| IPFS và blockchain | Thành viên 3 | Thành viên 1 | Lưu file báo cáo bằng IPFS, ghi nhận kết quả hoặc mã giao dịch trên blockchain |
| Kiểm thử và hoàn thiện báo cáo | Thành viên 1, Thành viên 2, Thành viên 3 | Cả nhóm | Kiểm thử luồng chính, sửa lỗi, chuẩn bị demo và hoàn thiện nội dung khóa luận |

## 5. Kết quả dự kiến sau khi hoàn thành

Sau khi hoàn thành kế hoạch, nhóm dự kiến xây dựng được hệ thống quản lý đề tài và đồ án với các chức năng chính: sinh viên cập nhật hồ sơ, xem và đăng ký đề tài, tham gia nhóm, cập nhật tiến độ và nộp báo cáo; giảng viên tạo đề tài, duyệt đăng ký, theo dõi tiến độ, xem báo cáo và chấm điểm. Hệ thống đồng thời có khả năng hỗ trợ gợi ý đề tài và phân tích báo cáo bằng AI, lưu trữ file báo cáo trên IPFS và ghi nhận các mốc dữ liệu quan trọng bằng blockchain.

Việc phân công theo từng nhóm chức năng giúp các thành viên có trách nhiệm rõ ràng, tránh chồng chéo công việc và dễ theo dõi tiến độ thực hiện. Trong quá trình triển khai, các thành viên vẫn phối hợp kiểm tra chéo để bảo đảm các phần backend, frontend, AI và blockchain hoạt động thống nhất trong cùng một hệ thống.

## Tài liệu và mã nguồn đã tham chiếu

- `implementation_planFix.md`
- `implementation_plan.md`
- `TODO.md`
- `Document/Day16-04-2025/taskRubrics.md`
- `analysis_report_advance.md`
- `notes/phan_tich_danh_gia_hien_trang_quy_trinh_giao_de_tai_du_lieu_tien_do_bao_cao.md`
