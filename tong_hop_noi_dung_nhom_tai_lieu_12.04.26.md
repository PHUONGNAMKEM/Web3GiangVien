# Tổng hợp nội dung nhóm tài liệu của project 12.04.26

Tài liệu này tổng hợp nội dung chuẩn của các file thuộc nhóm tài liệu trong bản 12.04.26, dựa trên nội dung thực tế của từng file.

## Danh sách file

- `analysis_report_advance.md`
- `implementation_planFix.md`
- `web3_ai_system_explanation.md`

## 1. analysis_report_advance.md

### Chủ đề chính

File này là bản phân tích toàn diện các vấn đề của hệ thống Web3 đồ án, dựa trên hiện trạng codebase.

### Nội dung chính

- Phân tích kiến trúc tổng quan của hệ thống gồm Frontend React + Ant Design, Backend Node.js + MongoDB, ML Service FastAPI và Blockchain Solidity trên Sepolia.
- Chỉ ra vấn đề sinh viên chưa có giao diện nhập hoặc cập nhật năng lực cá nhân như GPA, chuyên ngành và kỹ năng.
- Đề xuất thêm form chỉnh sửa hồ sơ cá nhân hoặc tab hồ sơ riêng để SBERT gợi ý đề tài chính xác hơn.
- Phân tích luồng tiến độ làm bài hiện tại và đề xuất bổ sung tab Nhật ký tiến độ để sinh viên cập nhật trạng thái công việc.
- Đề xuất model TienDo để lưu nội dung tiến độ, phần trăm hoàn thành, loại cập nhật, file đính kèm và nhận xét giảng viên.
- Đánh giá vai trò của AI trong chấm điểm cuối cùng, khuyến nghị giữ AI ở vai trò gợi ý và giảng viên là người quyết định điểm cuối.
- Nêu lỗi logic ở chức năng hủy nộp sau khi bài đã được chấm điểm, và đề xuất khóa thao tác hủy nộp khi đã có điểm.
- Phân tích vấn đề quản lý tài khoản MetaMask, đề xuất cách liên kết ví với tài khoản sinh viên đã tạo sẵn thay vì auto-register hoàn toàn.
- Đề xuất mở rộng model đề tài để lưu mô tả chi tiết, mục tiêu, yêu cầu nội dung, yêu cầu khác, bộ môn, định hướng và nhiều giảng viên hướng dẫn.
- Đề xuất cải thiện quản lý file nộp bài trên Pinata bằng nút tải xuống trực tiếp cho giảng viên và quy ước đặt tên file.

### Giá trị sử dụng

- Dùng làm tài liệu phân tích hiện trạng và định hướng cải tiến hệ thống.
- Phù hợp để tham chiếu khi mô tả các vấn đề còn thiếu của hệ thống trong báo cáo đồ án.

## 2. implementation_planFix.md

### Chủ đề chính

File này là kế hoạch triển khai cuối cùng, tổng hợp các quyết định đã chốt và danh sách các thay đổi cần làm cho hệ thống.

### Nội dung chính

- Chốt các quyết định quan trọng: AI chỉ gợi ý điểm, không tạo log giao dịch, không cần admin, giữ auto-register tài khoản sinh viên, thêm nhật ký tiến độ, mở rộng chi tiết đề tài, hỗ trợ nhóm sinh viên và nộp chung chấm riêng.
- Thiết kế cơ chế nhóm sinh viên theo hướng trưởng nhóm mời thành viên bằng mã sinh viên.
- Mô tả cách hình thành và duyệt nhóm: SV A đăng ký đề tài, thêm SV B và SV C vào nhóm, các thành viên chấp nhận hoặc từ chối lời mời, giảng viên xem và duyệt nhóm hoàn chỉnh.
- Mở rộng model DangKyDeTai bằng mảng ThanhVien để lưu vai trò, trạng thái lời mời và ngày tham gia.
- Mở rộng model DeTai bằng các field như MoTaChiTiet, ChiTietBoSung, SoLuongSinhVien, trong đó số lượng sinh viên không bị giới hạn cứng trong code.
- Mô tả luồng nộp bài nhóm theo kiểu nộp chung một file PDF nhưng tạo record BaoCao riêng cho từng thành viên với cùng IPFS CID.
- Mô tả luồng chấm điểm riêng từng sinh viên trong nhóm, trong đó mỗi sinh viên có điểm riêng và ký MetaMask riêng trên blockchain.
- Đề xuất UI cho sinh viên, giảng viên và màn hình chấm điểm nhóm, gồm quản lý thành viên, lời mời, duyệt nhóm và chấm riêng từng người.
- Liệt kê thay đổi cụ thể theo từng nhóm file: models, controllers, routes, UI.
- Tóm tắt thứ tự ưu tiên triển khai, trong đó khóa hủy nộp sau chấm điểm và nút tải xuống cho giảng viên là các hạng mục ưu tiên cao.

### Giá trị sử dụng

- Dùng như bản thiết kế triển khai chính thức cho giai đoạn tiếp theo.
- Phù hợp để làm căn cứ phân chia việc thực hiện theo file và theo module.

## 3. web3_ai_system_explanation.md

### Chủ đề chính

File này giải thích cơ chế hoạt động của hệ thống AI và Web3 trong toàn bộ dự án.

### Nội dung chính

- Giải thích cách hai mô hình AI SBERT và PhoBERT được tải về và chạy local inference bằng Python, không dùng API bên thứ ba.
- Mô tả vị trí mã nguồn AI trong ml-service, gồm sbert_matcher.py và phobert_analyzer.py.
- Trình bày vai trò và đầu vào đầu ra của SBERT trong bài toán gợi ý đề tài theo năng lực sinh viên.
- Trình bày vai trò và đầu vào đầu ra của PhoBERT trong bài toán chấm điểm báo cáo PDF.
- Giải thích các công thức và ngưỡng hoạt động của AI, gồm base score, cosine similarity threshold, final score, semantic hit, và các quy tắc phạt khi bài quá ngắn hoặc lạc đề.
- Phân tích cách MongoDB lưu thông tin đăng ký đề tài, cách dùng reference và populate để truy vấn sinh viên và đề tài.
- Làm rõ lý do tách đăng ký đề tài khỏi blockchain để sinh viên còn có thể thay đổi trong giai đoạn chờ duyệt.
- Mô tả logic của smart contract ThesisManagement.sol với ba chức năng chính: registerTopic, submitReport và finalizeGrade.
- Khẳng định dự án sử dụng Hardhat để biên dịch và triển khai smart contract lên Sepolia.

### Giá trị sử dụng

- Dùng để giải thích kiến trúc AI, database và blockchain cho người đọc hoặc giảng viên.
- Phù hợp khi cần mô tả lý do thiết kế hệ thống theo hướng kết hợp AI với Web3.

## Kết luận

Ba file tài liệu này tạo thành một cụm nội dung khá đầy đủ cho bản 12.04.26:

- `analysis_report_advance.md` tập trung vào phân tích vấn đề và đề xuất cải tiến.
- `implementation_planFix.md` tập trung vào kế hoạch triển khai chi tiết và các quyết định đã chốt.
- `web3_ai_system_explanation.md` tập trung vào giải thích cơ chế vận hành AI và Web3.

Nếu cần dùng cho báo cáo, có thể xem đây là bộ tài liệu nền để mô tả hiện trạng, hướng xử lý và kiến trúc của hệ thống.
