# Báo Cáo Đồ Án

## Xây dựng hệ thống chấm điểm và theo dõi tiến độ đồ án bằng AI

**Sinh viên thực hiện:** Vũ Anh Tuấn  
**Mã sinh viên:** 2001227412  
**Giảng viên hướng dẫn:** PGS.TS Admin Hệ Thống 2  
**Công nghệ sử dụng:** React, Node.js, Express, MongoDB, Python, FastAPI, NLP, SBERT, Blockchain, MetaMask

---

## 1. Tóm tắt đề tài

Đề tài tập trung xây dựng một hệ thống hỗ trợ quản lý, theo dõi tiến độ và chấm điểm đồ án sinh viên bằng cách kết hợp ứng dụng web, trí tuệ nhân tạo và blockchain. Hệ thống cho phép sinh viên đăng ký đề tài, cập nhật tiến độ theo từng tuần, nộp báo cáo cuối kỳ và nhận đánh giá từ giảng viên. Bên cạnh đó, hệ thống sử dụng mô hình xử lý ngôn ngữ tự nhiên để phân tích nội dung báo cáo, gợi ý điểm số và hỗ trợ giảng viên trong quá trình nhận xét.

Điểm nổi bật của hệ thống là việc tích hợp AI để phân tích mức độ phù hợp của nội dung báo cáo, theo dõi tiến độ học tập và phát hiện các dấu hiệu bất thường như thiếu minh chứng, nội dung báo cáo quá ngắn hoặc tiến độ giảm so với tuần trước. Sau khi giảng viên chốt điểm, thông tin điểm có thể được ghi nhận lên blockchain thông qua MetaMask nhằm tăng tính minh bạch và khả năng kiểm chứng.

---

## 2. Lý do chọn đề tài

Trong quá trình thực hiện đồ án, việc theo dõi tiến độ thường phụ thuộc nhiều vào trao đổi thủ công giữa sinh viên và giảng viên. Điều này có thể dẫn đến tình trạng thiếu minh chứng, khó kiểm tra lịch sử cập nhật và khó đánh giá mức độ hoàn thành theo từng giai đoạn. Ngoài ra, công tác chấm điểm báo cáo cuối kỳ cũng cần nhiều thời gian, đặc biệt khi giảng viên phải đọc nhiều báo cáo với nội dung dài.

Vì vậy, đề tài được chọn nhằm giải quyết các vấn đề trên bằng cách xây dựng một hệ thống quản lý tập trung. Hệ thống không thay thế vai trò của giảng viên, mà đóng vai trò hỗ trợ bằng dữ liệu, cảnh báo và gợi ý đánh giá. AI được sử dụng để tăng tốc quá trình phân tích, còn blockchain được sử dụng để lưu lại kết quả quan trọng sau khi giảng viên xác nhận.

---

## 3. Mục tiêu của hệ thống

Hệ thống được xây dựng với các mục tiêu chính sau:

1. Cho phép sinh viên đăng ký đề tài và theo dõi trạng thái duyệt đề tài.
2. Cho phép sinh viên cập nhật tiến độ đồ án theo từng tuần.
3. Hỗ trợ giảng viên xem, nhận xét và đánh giá tiến độ theo rubrics.
4. Phát hiện một số bất thường trong quá trình cập nhật tiến độ.
5. Cho phép sinh viên nộp báo cáo cuối kỳ dưới dạng file PDF.
6. Sử dụng AI để phân tích nội dung báo cáo và đưa ra gợi ý điểm số.
7. Cho phép giảng viên chốt điểm cuối kỳ và ghi nhận kết quả lên blockchain.
8. Tạo lịch sử minh bạch cho quá trình học tập, đánh giá và xác thực điểm số.

---

## 4. Phạm vi thực hiện

Phạm vi của đồ án bao gồm ba nhóm chức năng chính: chức năng dành cho sinh viên, chức năng dành cho giảng viên và chức năng hỗ trợ AI/blockchain.

Đối với sinh viên, hệ thống hỗ trợ đăng nhập, đăng ký đề tài, cập nhật nhật ký tiến độ, đính kèm minh chứng, nộp báo cáo và xem kết quả đánh giá. Đối với giảng viên, hệ thống hỗ trợ duyệt đề tài, xem danh sách sinh viên, đánh giá tiến độ tuần, chấm điểm cuối kỳ và xem thông tin phân tích từ AI.

Đối với phần AI, hệ thống sử dụng dịch vụ Python FastAPI để xử lý nội dung văn bản, phân tích độ phù hợp và gợi ý điểm số. Đối với phần blockchain, hệ thống tích hợp MetaMask để ký giao dịch và ghi nhận điểm số lên mạng blockchain thử nghiệm.

---

## 5. Công nghệ sử dụng

### 5.1. Frontend

Frontend được xây dựng bằng React. Giao diện tập trung vào các màn hình chính như đăng ký đề tài, nhật ký tiến độ, nộp báo cáo, duyệt báo cáo và chấm điểm. React giúp chia giao diện thành các component độc lập, dễ bảo trì và dễ mở rộng.

Các thư viện giao diện như Ant Design và các icon hỗ trợ được sử dụng để xây dựng bảng dữ liệu, form nhập liệu, modal, drawer, tag trạng thái và thông báo. Điều này giúp hệ thống có giao diện rõ ràng, dễ thao tác và phù hợp với quy trình quản lý đồ án.

### 5.2. Backend

Backend được xây dựng bằng Node.js và Express. Backend chịu trách nhiệm cung cấp API cho frontend, xử lý nghiệp vụ, kiểm tra quyền truy cập, quản lý dữ liệu người dùng, đề tài, báo cáo, tiến độ và điểm số.

Express được sử dụng để tổ chức route, controller và middleware xác thực. Các API quan trọng bao gồm API đăng ký đề tài, API cập nhật tiến độ, API đánh giá tiến độ, API nộp báo cáo và API chấm điểm.

### 5.3. Cơ sở dữ liệu

MongoDB được sử dụng làm cơ sở dữ liệu chính. Dữ liệu được tổ chức thành các collection như người dùng, đề tài, đăng ký đề tài, tiến độ, báo cáo và điểm số.

MongoDB phù hợp với hệ thống vì dữ liệu có nhiều cấu trúc linh hoạt, ví dụ minh chứng tiến độ, rubrics tuần, kết quả phân tích AI và thông tin giao dịch blockchain. Mongoose được sử dụng để định nghĩa schema và hỗ trợ thao tác dữ liệu.

### 5.4. AI và xử lý ngôn ngữ tự nhiên

Phần AI được xây dựng bằng Python và FastAPI. Dịch vụ AI tiếp nhận nội dung báo cáo hoặc thông tin đề tài, sau đó thực hiện phân tích bằng các kỹ thuật NLP. SBERT được sử dụng để biểu diễn câu và đoạn văn thành vector ngữ nghĩa, giúp so sánh mức độ tương đồng giữa nội dung báo cáo và yêu cầu đề tài.

AI có thể hỗ trợ các tác vụ như gợi ý đề tài phù hợp, phân tích báo cáo, phát hiện nội dung chưa đầy đủ và đưa ra điểm gợi ý ban đầu. Kết quả AI chỉ mang tính hỗ trợ, quyết định cuối cùng vẫn thuộc về giảng viên.

### 5.5. Blockchain và MetaMask

Blockchain được sử dụng để ghi nhận kết quả điểm sau khi giảng viên xác nhận. MetaMask đóng vai trò ví ký giao dịch, giúp xác thực thao tác của giảng viên trước khi ghi điểm.

Việc lưu thông tin điểm lên blockchain giúp tăng tính minh bạch, hạn chế chỉnh sửa sau khi đã chốt và tạo bằng chứng xác thực cho kết quả đánh giá. Trong phạm vi đồ án, hệ thống có thể sử dụng mạng thử nghiệm để phục vụ mục đích kiểm thử và trình diễn.

---

## 6. Phân tích yêu cầu chức năng

### 6.1. Đăng ký và duyệt đề tài

Sinh viên có thể xem danh sách đề tài được giảng viên tạo và đăng ký đề tài phù hợp. Sau khi đăng ký, trạng thái đề tài là chờ duyệt. Giảng viên có thể duyệt hoặc từ chối đăng ký. Khi đề tài được duyệt, sinh viên mới có thể cập nhật tiến độ và nộp báo cáo.

### 6.2. Theo dõi tiến độ tuần

Sinh viên cập nhật tiến độ theo từng tuần với các thông tin như số tuần, thời gian tuần, mục tiêu tuần, nội dung đã làm, khó khăn, kế hoạch tuần sau, phần trăm hoàn thành và minh chứng. Hệ thống lưu lại từng bản ghi tiến độ để giảng viên có thể xem lại quá trình thực hiện đồ án.

Hệ thống cũng có thể phát hiện một số trường hợp bất thường, ví dụ phần trăm hoàn thành giảm so với tuần trước, nội dung đã làm quá ngắn, thiếu kế hoạch tuần sau hoặc phần trăm hoàn thành cao nhưng không có minh chứng.

### 6.3. Đánh giá tiến độ

Giảng viên có thể mở danh sách tiến độ của từng sinh viên để xem chi tiết từng tuần. Với mỗi tuần, giảng viên có thể đánh giá theo trạng thái như chờ đánh giá, đạt, cần bổ sung hoặc không đạt. Ngoài ra, giảng viên có thể nhập nhận xét và chấm điểm theo rubrics tuần.

Điểm tiến độ tuần giúp giảng viên có thêm dữ liệu tham khảo khi đánh giá quá trình làm việc của sinh viên. Tuy nhiên, điểm này không tự động thay thế điểm cuối kỳ.

### 6.4. Nộp báo cáo cuối kỳ

Sinh viên nộp báo cáo cuối kỳ dưới dạng file PDF. File báo cáo được lưu và có thể được đưa lên IPFS để tạo đường dẫn lưu trữ. Sau khi nộp báo cáo, giảng viên có thể mở màn hình chấm điểm để xem báo cáo, kết quả phân tích AI và tiến độ thực hiện.

### 6.5. Chấm điểm cuối kỳ

Giảng viên xem thông tin sinh viên, đề tài, báo cáo đã nộp, tóm tắt tiến độ tuần và kết quả AI gợi ý. Sau đó, giảng viên nhập điểm chính thức và nhận xét. Khi bấm ký số bằng MetaMask, hệ thống gửi giao dịch ghi nhận điểm lên blockchain và lưu kết quả vào cơ sở dữ liệu.

---

## 7. Quy trình hoạt động của hệ thống

Quy trình tổng quát của hệ thống gồm các bước sau:

1. Giảng viên tạo đề tài và yêu cầu công nghệ.
2. Sinh viên đăng ký đề tài phù hợp.
3. Giảng viên duyệt đăng ký của sinh viên.
4. Sinh viên cập nhật tiến độ theo từng tuần.
5. Hệ thống kiểm tra bất thường và hiển thị cảnh báo nếu có.
6. Giảng viên xem tiến độ, nhận xét và đánh giá từng tuần.
7. Sinh viên nộp báo cáo cuối kỳ dưới dạng PDF.
8. AI phân tích nội dung báo cáo và đưa ra gợi ý.
9. Giảng viên xem kết quả AI, nhập điểm chính thức và ký MetaMask.
10. Hệ thống lưu điểm vào cơ sở dữ liệu và ghi nhận lên blockchain.

---

## 8. Thiết kế kiến trúc

Hệ thống được thiết kế theo mô hình nhiều tầng. Tầng giao diện React trao đổi với backend Express thông qua REST API. Backend Express xử lý nghiệp vụ chính và lưu dữ liệu vào MongoDB. Dịch vụ AI FastAPI hoạt động như một service độc lập, nhận dữ liệu từ backend hoặc frontend để phân tích văn bản.

Khi cần ghi điểm lên blockchain, frontend tương tác với MetaMask để lấy chữ ký giao dịch. Backend lưu lại thông tin điểm, mã giao dịch và trạng thái blockchain để phục vụ tra cứu sau này.

Kiến trúc này giúp hệ thống dễ mở rộng. Phần AI có thể nâng cấp mô hình mà không ảnh hưởng nhiều đến backend. Phần blockchain cũng có thể thay đổi mạng triển khai hoặc smart contract khi cần.

---

## 9. Kết quả đạt được

Sau quá trình xây dựng, hệ thống đã đạt được các kết quả chính:

1. Xây dựng được giao diện sinh viên để đăng ký đề tài, cập nhật tiến độ và nộp báo cáo.
2. Xây dựng được giao diện giảng viên để quản lý đề tài, duyệt báo cáo và chấm điểm.
3. Lưu trữ được dữ liệu tiến độ theo từng tuần trong MongoDB.
4. Hiển thị được các cảnh báo tiến độ như thiếu minh chứng, thiếu kế hoạch hoặc nội dung ngắn.
5. Hỗ trợ giảng viên đánh giá tiến độ tuần bằng nhận xét và rubrics.
6. Tích hợp được dịch vụ AI phân tích nội dung báo cáo.
7. Hỗ trợ chấm điểm cuối kỳ và lưu thông tin giao dịch blockchain.
8. Tạo được quy trình quản lý đồ án rõ ràng, có lịch sử và có thể kiểm chứng.

---

## 10. Đánh giá hệ thống

Hệ thống giúp quá trình quản lý đồ án trở nên có cấu trúc hơn. Sinh viên có trách nhiệm cập nhật tiến độ định kỳ, giảng viên dễ theo dõi quá trình làm việc và có thêm dữ liệu để đánh giá. Các cảnh báo tiến độ giúp phát hiện sớm những trường hợp có nguy cơ thiếu minh chứng hoặc cập nhật không đầy đủ.

AI giúp giảm tải bước đọc và phân tích báo cáo ban đầu, nhưng không thay thế hoàn toàn giảng viên. Điểm AI chỉ là gợi ý, còn điểm chính thức vẫn do giảng viên quyết định. Việc tích hợp blockchain tạo thêm tính minh bạch cho kết quả sau khi chốt điểm.

---

## 11. Hạn chế

Hệ thống vẫn còn một số hạn chế. Mô hình AI phụ thuộc vào chất lượng dữ liệu đầu vào và chưa thể đánh giá chính xác toàn bộ chất lượng học thuật của báo cáo. Việc phân tích file PDF trong thực tế có thể cần thêm bước trích xuất văn bản tốt hơn. Ngoài ra, blockchain có thể phát sinh độ trễ giao dịch hoặc chi phí gas nếu triển khai trên mạng thật.

Một hạn chế khác là dữ liệu minh chứng hiện chủ yếu dựa vào đường dẫn do sinh viên cung cấp. Trong tương lai, hệ thống nên hỗ trợ upload minh chứng trực tiếp và kiểm tra tính hợp lệ của file.

---

## 12. Hướng phát triển

Trong tương lai, hệ thống có thể được mở rộng theo các hướng sau:

1. Cải thiện mô hình AI để phân tích sâu hơn về nội dung, cấu trúc và mức độ hoàn thiện của báo cáo.
2. Tự động trích xuất nội dung từ file PDF để đưa vào pipeline phân tích.
3. Bổ sung dashboard thống kê tiến độ cho giảng viên và quản trị viên.
4. Hỗ trợ upload minh chứng trực tiếp lên IPFS.
5. Tối ưu smart contract để giảm chi phí ghi nhận điểm.
6. Bổ sung cơ chế phản hồi giữa sinh viên và giảng viên sau mỗi tuần.
7. Cho phép xuất báo cáo tổng hợp tiến độ và điểm số theo từng lớp hoặc từng học kỳ.

---

## 13. Kết luận

Đề tài “Xây dựng hệ thống chấm điểm và theo dõi tiến độ đồ án bằng AI” đã giải quyết được nhu cầu quản lý tiến độ và chấm điểm đồ án theo hướng minh bạch, có dữ liệu và có hỗ trợ thông minh. Việc kết hợp React, Node.js, Express, MongoDB, Python FastAPI, NLP, SBERT, Blockchain và MetaMask tạo nên một hệ thống tương đối đầy đủ từ giao diện người dùng, xử lý nghiệp vụ, phân tích AI cho đến xác thực kết quả.

Hệ thống không chỉ hỗ trợ sinh viên trong việc quản lý quá trình thực hiện đồ án, mà còn giúp giảng viên có thêm công cụ đánh giá khách quan và thuận tiện hơn. Đây là nền tảng có thể tiếp tục phát triển thành một hệ thống quản lý đồ án hoàn chỉnh cho môi trường đại học.
