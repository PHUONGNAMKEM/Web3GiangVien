# CHƯƠNG 6: THỬ NGHIỆM VÀ TRIỂN KHAI

## 6.1. MỤC TIÊU THỬ NGHIỆM

Sau khi hoàn tất quá trình cài đặt và triển khai ở Chương 5, hệ thống cần được kiểm thử nhằm xác minh rằng các nghiệp vụ cốt lõi đã hoạt động đúng như thiết kế và đủ độ tin cậy để đưa vào sử dụng ở mức thử nghiệm. Mục tiêu của chương này là đánh giá hệ thống trên hai phương diện bổ trợ cho nhau: tính đúng đắn của các dịch vụ phía sau (backend API) và chất lượng kỹ thuật của giao diện người dùng phía trước (frontend).

Ở phương diện thứ nhất, nhóm sử dụng Postman để kiểm thử trực tiếp các API nghiệp vụ. Việc kiểm thử tập trung vào toàn bộ vòng đời của một đề tài khóa luận, bắt đầu từ khâu đăng nhập xác thực bằng ví MetaMask, quản lý hồ sơ sinh viên và giảng viên, công bố và đăng ký đề tài, lập nhóm, làm bài test cạnh tranh, nộp báo cáo lên IPFS, theo dõi tiến độ, phân tích bằng AI, chấm điểm và ghi nhận các mốc dữ liệu quan trọng lên blockchain. Mỗi trường hợp kiểm thử được mô tả rõ đầu vào, kết quả mong đợi và kết quả thực tế để đối chiếu.

Ở phương diện thứ hai, nhóm dùng công cụ Lighthouse của Google để đo lường chất lượng giao diện trên bốn tiêu chí: Hiệu năng (Performance), Khả năng truy cập (Accessibility), Tiêu chuẩn lập trình (Best Practices) và Tối ưu tìm kiếm (SEO). Kết quả Lighthouse giúp nhóm nhận diện các trang còn yếu về tốc độ tải để có hướng tối ưu, đồng thời khẳng định nền tảng kỹ thuật của giao diện đã đạt mức ổn định.

Thông qua việc kết hợp hai phương pháp kiểm thử nói trên, nhóm hướng đến việc chứng minh hệ thống vận hành đồng bộ giữa bốn thành phần Frontend (React), Backend (Node.js/Express), Smart Contract (Ethereum Sepolia) và ML Service (FastAPI), cùng với lớp lưu trữ phi tập trung IPFS (Pinata).

---

## 6.2. KIỂM THỬ VÀ TRIỂN KHAI

### 6.2.1. Kiểm thử API bằng Postman

Toàn bộ API của hệ thống được bảo vệ bằng cơ chế xác thực JWT kết hợp phân quyền theo vai trò. Vì mỗi endpoint chỉ chấp nhận token của đúng vai trò được cấp quyền, nhóm tổ chức việc kiểm thử thành hai đợt tương ứng với hai nhóm người dùng chính: đợt thứ nhất dùng token Giảng viên để kiểm thử các chức năng quản lý đề tài, rubrics, bài test, chấm điểm bằng AI và tra cứu blockchain; đợt thứ hai dùng token Sinh viên để kiểm thử các chức năng hồ sơ, nhóm, đăng ký, gợi ý đề tài và theo dõi kết quả.

Để bảo đảm kiểm thử phản ánh đúng luồng nghiệp vụ, các request trong mỗi đợt được sắp xếp theo đúng thứ tự thực hiện thực tế và liên kết dữ liệu với nhau: định danh (ID) sinh ra ở bước tạo dữ liệu được tự động lưu lại và sử dụng cho các bước sau, thay vì nhập tay rời rạc. Trước khi chạy, backend được khởi động tại cổng 5000 và kết nối đồng thời tới MongoDB Atlas, mạng Sepolia Testnet và ML Service tại cổng 8001; token xác thực được tạo thông qua quy trình ký số bằng ví (challenge–response).

#### a) Đợt 1 — API phía Giảng viên

Đợt này sử dụng token có vai trò Giảng viên (LECTURER_ROLE), kiểm thử lần lượt từ các thao tác đọc dữ liệu, tạo và cập nhật đề tài, quản lý rubrics, phân tích bằng AI, tổ chức bài test cho đến dọn dẹp dữ liệu kiểm thử.

**Bảng 6.1: Kết quả kiểm thử API phía Giảng viên**

| STT | API | Method | Mô tả | Kết quả mong đợi | Mã trả về | KQ |
|-----|-----|--------|-------|------------------|-----------|----|
| 1 | /api/giangvien | GET | Lấy danh sách giảng viên | Mảng giảng viên | 200 | Pass |
| 2 | /api/detai | GET | Lấy danh sách đề tài | Mảng đề tài | 200 | Pass |
| 3 | /api/detai/:id | GET | Xem chi tiết một đề tài | Thông tin đề tài | 200 | Pass |
| 4 | /api/giangvien/:id | GET | Xem hồ sơ giảng viên | Hồ sơ giảng viên | 200 | Pass |
| 5 | /api/monhoc/giangvien/:gvId | GET | Lấy môn học theo giảng viên | Mảng môn học | 200 | Pass |
| 6 | /api/lophoc/giangvien/:gvId | GET | Lấy lớp học theo giảng viên | Mảng lớp học | 200 | Pass |
| 7 | /api/blockchain/contracts | GET | Lấy thông tin hợp đồng đã triển khai | Địa chỉ + ABI | 200 | Pass |
| 8 | /api/blockchain/thesis/db-records | GET | Lấy bản ghi đồng bộ blockchain – DB | Mảng bản ghi | 200 | Pass |
| 9 | /api/dangky/giangvien/:gvId | GET | Danh sách nhóm đăng ký theo giảng viên | Mảng đăng ký | 200 | Pass |
| 10 | /api/baocao/giangvien/:gvId | GET | Danh sách báo cáo cần chấm | Mảng báo cáo | 200 | Pass |
| 11 | /api/baocao/detai/:deTaiId | GET | Lấy báo cáo theo đề tài | Mảng báo cáo | 200 | Pass |
| 12 | /api/diemso/comparison/:gvId | GET | Đối chiếu điểm AI và giảng viên | Bảng so sánh | 200 | Pass |
| 13 | /api/rubrics/giangvien/:gvId | GET | Danh sách mẫu rubrics | Mảng rubrics | 200 | Pass |
| 14 | /api/detai | POST | Tạo đề tài mới và ghi nhận lên blockchain | Đề tài mới + tx hash | 201 | Pass |
| 15 | /api/detai/:id | PUT | Cập nhật thông tin đề tài | Đề tài đã cập nhật | 200 | Pass |
| 16 | /api/rubrics | POST | Tạo mẫu rubrics (tổng trọng số = 100%) | Mẫu rubrics mới | 201 | Pass |
| 17 | /api/rubrics/:id | PUT | Cập nhật mẫu rubrics | Rubrics đã cập nhật | 200 | Pass |
| 18 | /api/ai/analyze-report | POST | Phân tích báo cáo bằng PhoBERT | Điểm + nhận xét | 200 | Pass |
| 19 | /api/ai/analyze-rubrics | POST | Chấm báo cáo theo bộ tiêu chí rubrics | Điểm theo từng tiêu chí | 200 | Pass |
| 20 | /api/baitest | POST | Tạo bài test cạnh tranh cho đề tài | Bài test mới | 201 | Pass |
| 21 | /api/baitest/detai/:deTaiId | GET | Lấy bài test theo đề tài | Thông tin bài test | 200 | Pass |
| 22 | /api/baitest/:id/results | GET | Xem kết quả các nhóm làm bài | Bảng xếp hạng | 200 | Pass |
| 23 | /api/baitest/:id | DELETE | Xóa bài test | Xóa thành công | 200 | Pass |
| 24 | /api/detai/:id | DELETE | Xóa đề tài (dọn dữ liệu kiểm thử) | Xóa thành công | 200 | Pass |

Kết quả đợt kiểm thử phía Giảng viên ghi nhận 24/24 trường hợp đạt Pass. Các thao tác đọc dữ liệu (STT 1–13) trả về đúng cấu trúc và phản hồi nhanh, cho thấy lớp truy vấn MongoDB và cơ chế cache hoạt động ổn định. Đáng chú ý, hai thao tác ghi quan trọng là tạo đề tài (STT 14) và tạo rubrics (STT 16) trả về mã 201 kèm dữ liệu mới: với đề tài, hệ thống đồng thời gọi smart contract để ghi nhận lên blockchain; với rubrics, hệ thống kiểm tra ràng buộc tổng trọng số các tiêu chí bằng 100% trước khi lưu. Hai thao tác phân tích bằng AI (STT 18–19) trả về điểm và nhận xét sau khi backend gọi thành công tới ML Service, xác nhận luồng tích hợp PhoBERT đã thông suốt. Các thao tác xóa ở cuối (STT 23–24) đóng vai trò dọn dẹp dữ liệu kiểm thử, giúp quá trình test có thể lặp lại nhiều lần mà không để lại rác trong cơ sở dữ liệu.

#### b) Đợt 2 — API phía Sinh viên

Đợt này sử dụng token có vai trò Sinh viên (STUDENT_ROLE), kiểm thử các chức năng gắn với một sinh viên cụ thể như xem hồ sơ, quản lý nhóm, theo dõi đăng ký, gợi ý đề tài bằng AI và cập nhật năng lực. Định danh sinh viên được lấy tự động từ phản hồi của thao tác tạo nhóm, bảo đảm các bước sau truy vấn đúng dữ liệu của chính tài khoản đang đăng nhập.

**Bảng 6.2: Kết quả kiểm thử API phía Sinh viên**

| STT | API | Method | Mô tả | Kết quả mong đợi | Mã trả về | KQ |
|-----|-----|--------|-------|------------------|-----------|----|
| 25 | /api/detai | GET | Xem danh sách đề tài đang mở | Mảng đề tài | 200 | Pass |
| 26 | /api/nhom | POST | Tạo nhóm sinh viên | Nhóm mới | 201 | Pass |
| 27 | /api/sinhvien/:id | GET | Xem hồ sơ cá nhân | Hồ sơ sinh viên | 200 | Pass |
| 28 | /api/nhom/sinhvien/:svId | GET | Lấy nhóm của sinh viên | Thông tin nhóm | 200 | Pass |
| 29 | /api/nhom/invites/:svId | GET | Danh sách lời mời tham gia nhóm | Mảng lời mời | 200 | Pass |
| 30 | /api/dangky/sinhvien/:svId | GET | Trạng thái đăng ký đề tài | Thông tin đăng ký | 200 | Pass |
| 31 | /api/baocao/sinhvien/:svId | GET | Danh sách báo cáo đã nộp | Mảng báo cáo | 200 | Pass |
| 32 | /api/diemso/sinhvien/:svId | GET | Xem điểm và nhận xét | Điểm + nhận xét | 200 | Pass |
| 33 | /api/tiendo/sinhvien/:svId | GET | Lấy nhật ký tiến độ | Mảng tiến độ | 200 | Pass |
| 34 | /api/ai/match-student | POST | SBERT gợi ý đề tài theo năng lực | Đề tài + điểm phù hợp | 200 | Pass |
| 35 | /api/sinhvien/:id/profile | PUT | Cập nhật hồ sơ năng lực (GPA, kỹ năng) | Hồ sơ đã cập nhật | 200 | Pass |
| 36 | /api/nhom/:id/chot | POST | Chốt nhóm trước khi đăng ký đề tài | Nhóm đã chốt | 200 | Pass |
| 37 | /api/nhom/:id | DELETE | Xóa nhóm (khi chưa đăng ký đề tài) | Xóa thành công | 200 | Pass |

Kết quả đợt kiểm thử phía Sinh viên ghi nhận 13/13 trường hợp đạt Pass. Thao tác tạo nhóm (STT 26) trả về mã 201 và đặt sinh viên khởi tạo làm trưởng nhóm; nhờ đó hệ thống xác định được định danh sinh viên để phục vụ các truy vấn cá nhân ở các bước tiếp theo (STT 27–33). Thao tác gợi ý đề tài bằng AI (STT 34) trả về danh sách đề tài kèm điểm phù hợp do mô hình SBERT tính toán dựa trên độ tương đồng ngữ nghĩa giữa năng lực sinh viên và yêu cầu đề tài. Thao tác cập nhật hồ sơ (STT 35) kiểm tra đầy đủ các ràng buộc bắt buộc như GPA và bảng điểm kỹ năng — vốn là dữ liệu đầu vào cho AI. Cuối cùng, chuỗi chốt nhóm và xóa nhóm (STT 36–37) xác nhận các ràng buộc nghiệp vụ về vòng đời nhóm được thực thi đúng, đồng thời dọn dẹp dữ liệu sau kiểm thử.

#### c) Tổng hợp và nhận xét

Tổng hợp hai đợt, 37 trường hợp kiểm thử (24 phía Giảng viên và 13 phía Sinh viên) đều đạt kết quả Pass, bao phủ các nghiệp vụ đại diện cho toàn bộ quy trình quản lý đề tài: xác thực phi tập trung, quản lý hồ sơ và dữ liệu gốc, tạo và đăng ký đề tài, tổ chức nhóm và bài test, phân tích – gợi ý bằng AI, chấm điểm và ghi nhận dữ liệu lên blockchain. Kết quả khẳng định backend đã hiện thực hóa đúng và đầy đủ các luồng nghiệp vụ chính.

Quá trình kiểm thử cũng cho thấy giá trị thực tiễn khi giúp phát hiện và khắc phục một lỗi tích hợp: ở lần chạy đầu, endpoint gợi ý đề tài (/api/ai/match-student) trả về lỗi do dịch vụ backend gọi sang ML Service mà thiếu mã xác thực nội bộ (X-Internal-Token), khiến ML Service từ chối yêu cầu. Sau khi bổ sung mã xác thực này cho đúng với các lời gọi AI khác, endpoint đã hoạt động bình thường. Đây là minh chứng cho thấy việc kiểm thử API không chỉ xác nhận chức năng đúng mà còn giúp lộ ra các sai sót tiềm ẩn trong tích hợp giữa các thành phần.

Bên cạnh các trường hợp thành công, nhóm cũng kiểm chứng cơ chế phân quyền theo vai trò (RBAC): khi cố tình truy cập một endpoint bằng token sai vai trò (ví dụ dùng token Giảng viên gọi chức năng quản trị, hoặc dùng token này gọi chức năng dành riêng cho Sinh viên), hệ thống trả về mã 403 (Forbidden). Đây là hành vi đúng theo thiết kế, cho thấy lớp kiểm soát truy cập hoạt động chính xác và bảo đảm mỗi vai trò chỉ thao tác được trên phạm vi chức năng được cấp phép.

---

### 6.2.2. Kiểm thử giao diện bằng Lighthouse

Bên cạnh kiểm thử chức năng, nhóm sử dụng công cụ Lighthouse tích hợp trong trình duyệt Chrome để đánh giá chất lượng kỹ thuật của giao diện trên bốn tiêu chí: Hiệu năng (Performance), Khả năng truy cập (Accessibility), Tiêu chuẩn lập trình (Best Practices) và Tối ưu tìm kiếm (SEO). Việc đo lường được thực hiện trên hai không gian làm việc tương ứng với hai vai trò chính của hệ thống là Sinh viên và Giảng viên.

#### a) Nhóm trang Sinh viên

**Bảng 6.3: Kết quả Lighthouse cho các trang Sinh viên**

| STT | Tên trang | Performance | Accessibility | Best Practices | SEO | Ghi chú ngắn |
|-----|-----------|-------------|---------------|----------------|-----|--------------|
| 1 | Đăng nhập (MetaMask) | 71 | 96 | 96 | 100 | Hiệu năng khá; các tiêu chí còn lại tốt |
| 2 | Trang chủ Sinh viên | 64 | 90 | 96 | 100 | Hiệu năng trung bình; tổng thể ổn |
| 3 | Quản lý nhóm | 62 | 88 | 96 | 100 | Hiệu năng trung bình |
| 4 | Đăng ký đề tài (gợi ý AI) | 58 | 86 | 96 | 100 | Hiệu năng thấp do tải nhiều thẻ đề tài |
| 5 | Bài test đầu vào | 60 | 84 | 92 | 100 | Hiệu năng trung bình; có Monaco Editor |
| 6 | Nhật ký tiến độ | 63 | 87 | 96 | 100 | Hiệu năng trung bình |
| 7 | Nộp báo cáo (IPFS) | 59 | 85 | 96 | 100 | Hiệu năng trung bình; xử lý upload |
| 8 | Kết quả & Điểm | 61 | 86 | 96 | 100 | Hiệu năng trung bình; có biểu đồ |

Kết quả Lighthouse cho nhóm trang Sinh viên cho thấy điểm SEO đạt tuyệt đối 100 và Best Practices ổn định ở mức 92–96 trên toàn bộ các trang, phản ánh nền tảng kỹ thuật và cấu trúc HTML của giao diện được xây dựng tốt. Điểm Accessibility dao động trong khoảng 84–96, ở mức khá đến tốt, trong đó trang Đăng nhập đạt cao nhất nhờ bố cục đơn giản. Điểm Performance nằm trong khoảng trung bình (58–71), với trang Đăng ký đề tài có điểm thấp nhất do phải tải và hiển thị đồng thời nhiều thẻ đề tài kèm chỉ số gợi ý AI. Đây là điểm cần ưu tiên tối ưu trong các phiên bản tiếp theo, chẳng hạn bằng cách phân trang hoặc tải dữ liệu theo lô.

#### b) Nhóm trang Giảng viên

**Bảng 6.4: Kết quả Lighthouse cho các trang Giảng viên**

| STT | Tên trang | Performance | Accessibility | Best Practices | SEO | Ghi chú ngắn |
|-----|-----------|-------------|---------------|----------------|-----|--------------|
| 1 | Trang chủ Giảng viên | 60 | 86 | 96 | 100 | Hiệu năng trung bình; nhiều thẻ thống kê |
| 2 | Quản lý đề tài | 59 | 84 | 96 | 100 | Hiệu năng trung bình; bảng dữ liệu lớn |
| 3 | Duyệt nhóm đăng ký | 62 | 88 | 96 | 100 | Hiệu năng trung bình |
| 4 | Quản lý Rubrics | 63 | 87 | 96 | 100 | Hiệu năng trung bình |
| 5 | Chấm điểm (AI PhoBERT) | 56 | 84 | 92 | 100 | Hiệu năng thấp; chờ phân tích AI |
| 6 | So sánh AI vs Giảng viên | 58 | 85 | 96 | 100 | Hiệu năng trung bình; có biểu đồ cột |

Tương tự nhóm trang Sinh viên, các trang dành cho Giảng viên duy trì điểm SEO tuyệt đối 100 và Best Practices ổn định 92–96, cho thấy chất lượng kỹ thuật đồng đều trên toàn hệ thống. Điểm Accessibility đạt 84–88, ở mức khá. Về Performance, các trang nằm trong khoảng 56–63, trong đó trang Chấm điểm bằng AI có điểm thấp nhất do phải chờ kết quả phân tích từ ML Service và hiển thị đồng thời nhiều khối thông tin (báo cáo từ IPFS, kết quả PhoBERT, bảng rubrics, tóm tắt tiến độ). Trang So sánh AI vs Giảng viên cũng chịu ảnh hưởng nhẹ về hiệu năng do dựng biểu đồ trực quan. Nhìn chung, giao diện Giảng viên đáp ứng tốt nhu cầu sử dụng, song phần hiệu năng vẫn còn dư địa tối ưu, đặc biệt ở các trang có thao tác gọi AI hoặc kết xuất biểu đồ.

#### Đánh giá chung kết quả Lighthouse

Kết quả kiểm thử Lighthouse trên cả hai nhóm trang cho thấy hệ thống có nền tảng kỹ thuật vững với điểm SEO và Best Practices cao, đồng thời khả năng truy cập ở mức khá trở lên. Điểm hạn chế chung là hiệu năng tải trang mới chỉ ở mức trung bình, tập trung ở các trang có khối lượng dữ liệu lớn hoặc phải chờ kết quả từ dịch vụ AI và blockchain — vốn là đặc thù của một ứng dụng tích hợp nhiều thành phần. Đây là cơ sở để nhóm đề xuất các hướng tối ưu trong tương lai như chia nhỏ gói tài nguyên (code splitting), tải dữ liệu theo lô và hiển thị trạng thái xử lý bất đồng bộ rõ ràng hơn.

---

## 6.3. KẾT CHƯƠNG

Chương 6 đã trình bày quá trình thử nghiệm hệ thống quản lý đề tài giữa giảng viên và sinh viên trên hai phương diện bổ trợ. Về kiểm thử chức năng, 37 trường hợp kiểm thử API bằng Postman được chia thành hai đợt theo vai trò người dùng — 24 endpoint phía Giảng viên và 13 endpoint phía Sinh viên — đều đạt kết quả Pass, khẳng định backend đã hiện thực hóa chính xác các nghiệp vụ cốt lõi từ xác thực Web3, quản lý dữ liệu, tạo và đăng ký đề tài, tổ chức nhóm và bài test, phân tích bằng AI cho đến ghi nhận dữ liệu quan trọng lên blockchain. Quá trình kiểm thử còn giúp phát hiện và khắc phục một lỗi tích hợp giữa backend và ML Service, đồng thời kiểm chứng cơ chế phân quyền theo vai trò hoạt động đúng thông qua các phản hồi 403 khi truy cập sai quyền. Về kiểm thử giao diện, kết quả Lighthouse cho thấy hệ thống đạt chất lượng kỹ thuật tốt ở các tiêu chí SEO, Best Practices và Accessibility, trong khi hiệu năng tải trang còn ở mức trung bình và là hướng cần tiếp tục tối ưu.

Nhìn chung, các kết quả thử nghiệm đã chứng minh hệ thống vận hành đồng bộ, ổn định và đúng thiết kế giữa bốn thành phần Frontend, Backend, Smart Contract và ML Service cùng lớp lưu trữ IPFS, đáp ứng được mục tiêu xây dựng một hệ thống thử nghiệm (Proof of Concept) cho bài toán quản lý đề tài có tích hợp AI và blockchain.
