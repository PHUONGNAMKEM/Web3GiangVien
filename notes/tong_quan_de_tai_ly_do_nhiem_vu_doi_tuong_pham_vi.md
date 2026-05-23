# Tổng quan đề tài: lý do chọn đề tài, nhiệm vụ, đối tượng và phạm vi nghiên cứu

## 1. Tổng quan đề tài

Trong bối cảnh chuyển đổi số trong giáo dục đại học ngày càng được chú trọng, việc quản lý quá trình thực hiện khóa luận, đồ án tốt nghiệp và các đề tài nghiên cứu của sinh viên không còn chỉ dừng lại ở việc lưu trữ danh sách đề tài hay điểm số cuối kỳ. Trên thực tế, quy trình này bao gồm nhiều hoạt động liên tục như giảng viên công bố đề tài, sinh viên lựa chọn và đăng ký, giảng viên xét duyệt, sinh viên cập nhật tiến độ, nộp báo cáo, giảng viên đánh giá kết quả và lưu trữ minh chứng phục vụ kiểm tra sau này. Nếu các bước này được xử lý rời rạc bằng bảng tính, biểu mẫu thủ công hoặc các kênh trao đổi không tập trung, hệ thống dễ phát sinh các vấn đề như trùng lặp dữ liệu, khó theo dõi trạng thái, thiếu minh bạch trong quá trình nộp bài và khó xác thực kết quả sau khi đã công bố.

Từ nhu cầu đó, đề tài được lựa chọn nhằm xây dựng một hệ thống hỗ trợ quản lý đề tài và quá trình thực hiện đồ án theo hướng kết hợp giữa ứng dụng web, trí tuệ nhân tạo và công nghệ blockchain. Hệ thống hướng đến việc tạo ra một môi trường làm việc thống nhất cho sinh viên và giảng viên: sinh viên có thể cập nhật hồ sơ năng lực, đăng ký đề tài, tham gia nhóm, theo dõi tiến độ và nộp báo cáo; giảng viên có thể tạo đề tài, thiết lập yêu cầu, duyệt đăng ký, theo dõi bài nộp và chấm điểm. Bên cạnh đó, việc tích hợp AI giúp hệ thống có khả năng hỗ trợ gợi ý đề tài theo năng lực sinh viên và hỗ trợ phân tích nội dung báo cáo. Công nghệ blockchain được sử dụng cho những mốc dữ liệu cần tính xác thực cao như ghi nhận bài nộp cuối cùng, mã lưu trữ IPFS và kết quả điểm đã chốt.

## 2. Lý do chọn đề tài

Lý do chọn đề tài xuất phát từ tính thực tiễn của bài toán quản lý khóa luận trong môi trường đào tạo. Quá trình thực hiện đề tài thường kéo dài, có nhiều bên tham gia và phát sinh nhiều trạng thái cần kiểm soát. Sinh viên cần một công cụ giúp nắm rõ đề tài phù hợp, trạng thái đăng ký, tiến độ thực hiện và kết quả đánh giá. Giảng viên cần một hệ thống giúp quản lý danh sách đề tài, kiểm soát số lượng sinh viên, nhận báo cáo, tham khảo gợi ý đánh giá và lưu lại kết quả một cách rõ ràng. Nhà trường hoặc bộ môn cũng cần dữ liệu có cấu trúc để phục vụ thống kê, kiểm tra và đối chiếu. Do đó, việc nghiên cứu và xây dựng một hệ thống quản lý đề tài có hỗ trợ AI và blockchain là phù hợp với xu hướng ứng dụng công nghệ mới trong quản trị đào tạo, đồng thời có ý nghĩa thực tiễn đối với quy trình quản lý đồ án.

## 3. Nhiệm vụ của đề tài

Nhiệm vụ chính của đề tài là khảo sát và xây dựng một hệ thống web phục vụ quản lý đề tài giữa giảng viên và sinh viên. Các nhiệm vụ cụ thể bao gồm:

- Phân tích nghiệp vụ quản lý đề tài: Khảo sát các nghiệp vụ cơ bản như quản lý hồ sơ sinh viên, quản lý thông tin giảng viên, tạo và công bố đề tài, đăng ký đề tài, duyệt hoặc từ chối đăng ký, tổ chức nhóm sinh viên, cập nhật tiến độ và nộp báo cáo.

- Thiết kế cơ sở dữ liệu: Xây dựng mô hình dữ liệu phù hợp để lưu trữ các thực thể chính như sinh viên, giảng viên, đề tài, đăng ký đề tài, báo cáo, tiến độ và điểm số.

- Triển khai hệ thống web: Xây dựng backend cung cấp API xử lý nghiệp vụ và frontend cung cấp giao diện sử dụng cho từng vai trò trong hệ thống.

- Tích hợp AI hỗ trợ quản lý học thuật: Nghiên cứu cách kết hợp AI vào quy trình quản lý mà không thay thế hoàn toàn vai trò chuyên môn của giảng viên. Mô hình SBERT được dùng để so khớp năng lực, kỹ năng và hồ sơ sinh viên với yêu cầu của đề tài; mô hình PhoBERT hoặc logic phân tích tiếng Việt được dùng để hỗ trợ đánh giá mức độ phù hợp của nội dung báo cáo.

- Tích hợp blockchain: Xây dựng smart contract phục vụ việc ghi nhận các dữ liệu quan trọng lên blockchain, giúp tăng tính minh bạch và khả năng xác thực đối với các mốc dữ liệu cần kiểm chứng.

- Định hướng vai trò của AI: Kết quả AI không đóng vai trò quyết định cuối cùng mà là nguồn tham khảo để giảng viên xem xét, điều chỉnh và đưa ra điểm chính thức.


## 4. Đối tượng nghiên cứu

Đối tượng nghiên cứu của đề tài bao gồm:

- Quy trình quản lý đề tài, đăng ký đề tài, theo dõi tiến độ, nộp báo cáo và chấm điểm trong môi trường đào tạo đại học.

- Mô hình hệ thống web phục vụ giảng viên và sinh viên, gồm frontend React, backend Node.js/Express, cơ sở dữ liệu MongoDB và dịch vụ AI bằng FastAPI.

- Cơ chế ứng dụng AI trong gợi ý đề tài, so khớp năng lực sinh viên và hỗ trợ phân tích nội dung báo cáo.

- Cơ chế ứng dụng blockchain và smart contract trong việc ghi nhận các dữ liệu quan trọng như bài nộp cuối cùng, mã lưu trữ IPFS và kết quả điểm đã chốt.

- Nhóm người dùng chính của hệ thống, gồm sinh viên và giảng viên tham gia vào quá trình đăng ký, thực hiện, theo dõi, đánh giá và quản lý đề tài.


## 5. Phạm vi nghiên cứu

Phạm vi nghiên cứu của đề tài được giới hạn trong phạm vi xây dựng hệ thống quản lý đề tài và đồ án ở mức ứng dụng thử nghiệm, cụ thể:

- **Phạm vi nghiệp vụ:** Hệ thống tập trung vào các quy trình cốt lõi gồm xác thực người dùng, quản lý hồ sơ sinh viên, quản lý thông tin giảng viên, quản lý đề tài, đăng ký đề tài cá nhân hoặc theo nhóm, duyệt đăng ký, theo dõi tiến độ, nộp báo cáo, phân tích báo cáo bằng AI, chấm điểm và lưu mã giao dịch blockchain.

- **Phạm vi kỹ thuật:**
  + Nền tảng phát triển: Frontend React, backend Node.js/Express, cơ sở dữ liệu MongoDB, dịch vụ AI bằng FastAPI và smart contract Solidity triển khai trên môi trường blockchain thử nghiệm.
  + Dữ liệu báo cáo có thể được lưu trữ trên IPFS, trong khi blockchain được dùng để ghi nhận các mốc dữ liệu quan trọng như bài nộp cuối cùng, mã lưu trữ IPFS và điểm đã chốt.

- **Mức độ triển khai:** Hệ thống được xây dựng ở mức ứng dụng thử nghiệm/Proof of Concept, nhằm chứng minh tính khả thi về nghiệp vụ và kỹ thuật, chưa hướng tới triển khai chính thức ở quy mô toàn trường.


## 6. Kết luận tổng quan

Nhìn chung, đề tài có mục tiêu xây dựng một hệ thống hỗ trợ quản lý khóa luận theo hướng hiện đại, trong đó dữ liệu vận hành thường xuyên được xử lý linh hoạt bằng cơ sở dữ liệu truyền thống, AI đóng vai trò hỗ trợ gợi ý và đánh giá, còn blockchain được sử dụng để tăng tính minh bạch cho các mốc dữ liệu cuối cùng. Cách kết hợp này giúp hệ thống vừa đáp ứng được yêu cầu thực tiễn của quy trình quản lý đề tài, vừa thể hiện khả năng ứng dụng các công nghệ mới vào một bài toán cụ thể trong lĩnh vực giáo dục.

## Tài liệu và mã nguồn đã tham chiếu

- `notes/nghiep_vu_source_12_04_2026.md`
- `tong_hop_noi_dung_nhom_tai_lieu_12.04.26.md`
- `web3_ai_system_explanation.md`
- `ml-service/README.md`
- `backend/models/DeTai.js`
- `backend/models/DangKyDeTai.js`
- `backend/models/BaoCao.js`
- `backend/models/SinhVien.js`
- `backend/models/TienDo.js`
- `backend/models/DiemSo.js`
- `backend/controllers/deTaiController.js`
- `backend/controllers/baoCaoController.js`
- `backend/controllers/aiController.js`
- `backend/services/aiService.js`
- `backend/services/thesisContractService.js`
- `backend/contracts/ThesisManagement.sol`
- `frontend/src/components/student/StudentDashboard.js`
