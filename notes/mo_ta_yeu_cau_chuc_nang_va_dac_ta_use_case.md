# Mô tả yêu cầu chức năng và đặc tả Use Case

---

## 1. Mục đích đặc tả

Phần này mô tả các yêu cầu chức năng và các Use Case chính của hệ thống hỗ trợ quản lý đề tài khóa luận. Nội dung được tổng hợp từ mã nguồn backend, giao diện frontend và các ghi chú phân tích trong project. Mục tiêu của phần đặc tả là làm rõ hệ thống cần phục vụ những nhóm người dùng nào, mỗi nhóm người dùng thực hiện các chức năng gì, dữ liệu được xử lý theo luồng nào và các tình huống ngoại lệ cần được kiểm soát ra sao.

Hệ thống được xây dựng xoay quanh quy trình quản lý đề tài từ lúc giảng viên công bố đề tài, sinh viên cập nhật hồ sơ và đăng ký, giảng viên duyệt đăng ký, sinh viên theo dõi tiến độ và nộp báo cáo, đến khi giảng viên chấm điểm có hỗ trợ AI và ghi nhận kết quả lên blockchain. Các Use Case dưới đây tập trung vào các chức năng đã được triển khai trong hệ thống, phù hợp để đưa vào phần đặc tả yêu cầu của khóa luận.

---

## 2. Actor của hệ thống

| Actor | Vai trò trong hệ thống |
|---|---|
| Sinh viên | Đăng nhập bằng ví, cập nhật hồ sơ, xem danh sách đề tài, nhận gợi ý phù hợp từ AI, đăng ký đề tài, mời thành viên nhóm, cập nhật tiến độ, nộp báo cáo và xem kết quả chấm điểm. |
| Giảng viên | Đăng nhập bằng ví, tạo và quản lý đề tài, xây dựng rubrics chấm điểm, duyệt hoặc từ chối đăng ký, theo dõi tiến độ, xem báo cáo, sử dụng AI để tham khảo đánh giá và chấm điểm chính thức. |
| Hệ thống AI | Hỗ trợ phân tích mức độ phù hợp giữa hồ sơ sinh viên và đề tài, phân tích báo cáo, đề xuất điểm hoặc nhận xét theo tiêu chí rubrics. Đây là actor phụ, được hệ thống gọi khi cần xử lý thông minh. |
| Dịch vụ IPFS | Lưu trữ file báo cáo sau khi sinh viên nộp. Hệ thống nhận lại mã CID để lưu vào cơ sở dữ liệu và phục vụ việc truy xuất báo cáo. |
| Blockchain/Smart Contract | Ghi nhận kết quả chấm điểm sau khi giảng viên xác nhận. Actor này đóng vai trò lưu vết giao dịch và tăng tính minh bạch của kết quả. |

---

## 3. Yêu cầu chức năng tổng quát

| Mã yêu cầu | Tên chức năng | Actor chính | Mô tả |
|---|---|---|---|
| FR-01 | Xác thực người dùng bằng ví | Sinh viên, Giảng viên | Người dùng đăng nhập thông qua ví MetaMask. Hệ thống tạo challenge, người dùng ký xác thực và hệ thống cấp phiên đăng nhập theo vai trò. |
| FR-02 | Cập nhật hồ sơ sinh viên | Sinh viên | Sinh viên cập nhật thông tin cá nhân, mã số sinh viên, email, GPA và kỹ năng để làm cơ sở đăng ký đề tài và gợi ý bằng AI. |
| FR-03 | Quản lý đề tài và rubrics | Giảng viên | Giảng viên tạo đề tài, mô tả yêu cầu, số lượng sinh viên, hạn đăng ký và có thể cấu hình rubrics chấm điểm hoặc chọn mẫu rubrics có sẵn. |
| FR-04 | Đăng ký đề tài và quản lý nhóm | Sinh viên, Giảng viên | Sinh viên đăng ký đề tài, mời thành viên nhóm nếu đề tài cho phép làm nhóm; giảng viên duyệt hoặc từ chối đăng ký. |
| FR-05 | Theo dõi tiến độ thực hiện | Sinh viên, Giảng viên | Sinh viên tạo nhật ký tiến độ theo đề tài đã được duyệt; giảng viên xem và nhận xét tiến độ. |
| FR-06 | Nộp và quản lý báo cáo | Sinh viên | Sinh viên hoặc trưởng nhóm nộp báo cáo dạng PDF. File được lưu trữ trên IPFS và CID được lưu vào hệ thống. |
| FR-07 | Hỗ trợ đánh giá bằng AI | Sinh viên, Giảng viên | AI hỗ trợ gợi ý đề tài phù hợp cho sinh viên, phân tích báo cáo và đề xuất điểm/nhận xét theo nội dung hoặc rubrics. |
| FR-08 | Chấm điểm và ghi nhận blockchain | Giảng viên | Giảng viên xem báo cáo, tham khảo kết quả AI, nhập điểm chính thức và ghi kết quả lên blockchain thông qua smart contract. |
| FR-09 | Tra cứu kết quả | Sinh viên | Sinh viên xem trạng thái đăng ký, trạng thái nộp báo cáo, điểm AI, điểm giảng viên và mã giao dịch blockchain nếu đã được chấm. |

---

## 4. Danh sách Use Case chính

| Mã Use Case | Tên Use Case | Actor chính | Tiền điều kiện | Kết quả đầu ra |
|---|---|---|---|---|
| UC-01 | Đăng nhập bằng MetaMask | Sinh viên, Giảng viên | Người dùng có ví và truy cập hệ thống | Người dùng được xác thực và nhận phiên đăng nhập hợp lệ |
| UC-02 | Cập nhật hồ sơ sinh viên | Sinh viên | Sinh viên đã đăng nhập | Hồ sơ sinh viên đầy đủ, có thể dùng cho đăng ký và AI matching |
| UC-03 | Tạo và quản lý đề tài/rubrics | Giảng viên | Giảng viên đã đăng nhập | Đề tài được công bố, có thể kèm rubrics chấm điểm |
| UC-04 | Đăng ký đề tài và quản lý nhóm | Sinh viên | Sinh viên đã cập nhật hồ sơ | Đăng ký được tạo, chờ giảng viên duyệt hoặc đã được duyệt/từ chối |
| UC-05 | Theo dõi tiến độ | Sinh viên, Giảng viên | Đăng ký đề tài đã được duyệt | Nhật ký tiến độ được lưu, giảng viên có thể nhận xét |
| UC-06 | Nộp báo cáo | Sinh viên | Đăng ký đã được duyệt, có file báo cáo hợp lệ | Báo cáo được lưu trên IPFS và gắn với đề tài/sinh viên |
| UC-07 | Chấm điểm báo cáo | Giảng viên | Sinh viên đã nộp báo cáo | Điểm được lưu, có thể kèm nhận xét AI và TxHash blockchain |
| UC-08 | Tra cứu kết quả | Sinh viên | Sinh viên đã đăng nhập | Sinh viên xem được trạng thái, điểm và thông tin giao dịch nếu có |

---

## 5. Đặc tả Use Case chi tiết

---

### UC-01. Đăng nhập bằng MetaMask

**Actor chính:** Sinh viên, Giảng viên.

**Mục tiêu:** Xác thực danh tính người dùng thông qua địa chỉ ví và chữ ký số, sau đó cấp phiên đăng nhập phù hợp với vai trò trong hệ thống.

**Luồng chính:**

1. Người dùng mở hệ thống và chọn đăng nhập bằng MetaMask.
2. Frontend gửi địa chỉ ví của người dùng đến backend để yêu cầu challenge.
3. Backend sinh challenge tương ứng với địa chỉ ví.
4. Người dùng ký challenge bằng ví MetaMask.
5. Frontend gửi chữ ký và địa chỉ ví về backend để xác minh.
6. Backend kiểm tra chữ ký, xác định người dùng là sinh viên hoặc giảng viên.
7. Backend cấp token phiên đăng nhập và trả về thông tin người dùng.
8. Frontend điều hướng người dùng đến màn hình phù hợp với vai trò.

**Luồng phụ/ngoại lệ:**

1. Nếu chữ ký không hợp lệ, hệ thống từ chối đăng nhập.
2. Nếu challenge hết hạn hoặc không khớp, người dùng cần yêu cầu challenge mới.
3. Nếu địa chỉ ví chưa tồn tại trong dữ liệu sinh viên, hệ thống có thể tự tạo bản ghi sinh viên ban đầu để người dùng tiếp tục cập nhật hồ sơ.
4. Nếu người dùng từ chối ký trên MetaMask, quá trình đăng nhập bị hủy.

---

### UC-02. Cập nhật hồ sơ sinh viên

**Actor chính:** Sinh viên.

**Mục tiêu:** Cho phép sinh viên hoàn thiện thông tin cá nhân và năng lực để phục vụ đăng ký đề tài, lập nhóm và gợi ý đề tài bằng AI.

**Luồng chính:**

1. Sinh viên đăng nhập vào hệ thống.
2. Hệ thống kiểm tra trạng thái hồ sơ của sinh viên.
3. Nếu hồ sơ chưa đầy đủ, giao diện hiển thị form cập nhật thông tin.
4. Sinh viên nhập họ tên, mã số sinh viên, email, GPA và danh sách kỹ năng.
5. Sinh viên gửi thông tin cập nhật.
6. Backend kiểm tra dữ liệu bắt buộc và tính duy nhất của mã số sinh viên/email.
7. Nếu hợp lệ, hệ thống lưu hồ sơ và đánh dấu sinh viên đã cập nhật hồ sơ.
8. Sinh viên có thể tiếp tục xem đề tài, nhận gợi ý AI hoặc đăng ký đề tài.

**Luồng phụ/ngoại lệ:**

1. Nếu thiếu họ tên, mã số sinh viên, email, GPA hoặc kỹ năng, hệ thống yêu cầu bổ sung.
2. Nếu mã số sinh viên hoặc email đã tồn tại ở tài khoản khác, hệ thống từ chối cập nhật.
3. Nếu danh sách kỹ năng rỗng, hồ sơ chưa đủ điều kiện phục vụ AI matching.
4. Nếu lỗi lưu dữ liệu xảy ra, hệ thống thông báo để sinh viên thực hiện lại.

---

### UC-03. Tạo và quản lý đề tài/rubrics

**Actor chính:** Giảng viên.

**Mục tiêu:** Cho phép giảng viên công bố đề tài hướng dẫn, mô tả yêu cầu, quy định số lượng sinh viên và thiết lập tiêu chí chấm điểm.

**Luồng chính:**

1. Giảng viên đăng nhập và mở màn hình quản lý đề tài.
2. Giảng viên chọn tạo đề tài mới.
3. Giảng viên nhập tên đề tài, mô tả ngắn, mô tả chi tiết, yêu cầu kỹ năng, số lượng sinh viên và hạn đăng ký.
4. Nếu cần chấm theo rubrics, giảng viên bật tùy chọn rubrics.
5. Giảng viên tạo các tiêu chí chấm điểm hoặc chọn từ mẫu rubrics có sẵn.
6. Hệ thống kiểm tra tổng trọng số rubrics phải bằng 100%.
7. Giảng viên lưu đề tài.
8. Hệ thống tạo đề tài ở trạng thái mở đăng ký để sinh viên có thể xem và đăng ký.

**Luồng phụ/ngoại lệ:**

1. Nếu thiếu tên đề tài hoặc dữ liệu quan trọng, hệ thống yêu cầu nhập bổ sung.
2. Nếu bật rubrics nhưng chưa có tiêu chí, hệ thống không cho lưu.
3. Nếu tổng trọng số rubrics khác 100%, hệ thống từ chối lưu đề tài.
4. Nếu một tiêu chí thiếu tên hoặc trọng số nhỏ hơn hoặc bằng 0, hệ thống yêu cầu sửa.
5. Nếu mẫu rubrics đã được áp dụng vào đề tài, hệ thống khóa mẫu gốc để tránh sửa hoặc xóa làm ảnh hưởng dữ liệu đã sử dụng.
6. Giảng viên có thể xóa đề tài, nhưng thao tác này ảnh hưởng đến các đăng ký liên quan nên cần xác nhận trước khi thực hiện.

---

### UC-04. Đăng ký đề tài và quản lý nhóm

**Actor chính:** Sinh viên, Giảng viên.

**Mục tiêu:** Cho phép sinh viên đăng ký đề tài cá nhân hoặc theo nhóm; giảng viên duyệt hoặc từ chối đăng ký để chốt đề tài.

**Luồng chính:**

1. Sinh viên mở danh sách đề tài đang mở đăng ký.
2. Hệ thống hiển thị thông tin đề tài, yêu cầu kỹ năng, số lượng sinh viên và trạng thái.
3. Sinh viên có thể dùng chức năng AI matching để xem mức độ phù hợp giữa hồ sơ của mình và các đề tài.
4. Sinh viên chọn một đề tài và gửi yêu cầu đăng ký.
5. Backend kiểm tra sinh viên chưa có đăng ký đang hoạt động và chưa thuộc nhóm đề tài khác.
6. Hệ thống tạo bản ghi đăng ký ở trạng thái chờ duyệt; sinh viên đăng ký đầu tiên được xác định là trưởng nhóm.
7. Nếu đề tài cho phép làm nhóm, trưởng nhóm nhập mã số sinh viên để gửi lời mời thành viên.
8. Thành viên nhận lời mời và chọn chấp nhận hoặc từ chối.
9. Giảng viên mở danh sách đăng ký của đề tài và chọn duyệt hoặc từ chối.
10. Nếu giảng viên duyệt, đăng ký chuyển sang trạng thái đã duyệt và đề tài được chốt; các đăng ký chờ duyệt khác của đề tài bị từ chối.

**Luồng phụ/ngoại lệ:**

1. Nếu sinh viên đã có đăng ký đang chờ duyệt hoặc đã duyệt, hệ thống không cho đăng ký thêm đề tài khác.
2. Nếu sinh viên đã là thành viên của một nhóm đề tài khác, hệ thống từ chối đăng ký hoặc lời mời.
3. Nếu mã số sinh viên được mời không tồn tại, hệ thống thông báo lỗi.
4. Nếu nhóm đã đủ số lượng thành viên tối đa, hệ thống không cho mời thêm.
5. Nếu người gửi lời mời không phải trưởng nhóm, hệ thống từ chối thao tác.
6. Nếu thành viên từ chối lời mời, trạng thái thành viên được cập nhật là từ chối và không tham gia nhóm.
7. Sinh viên chỉ có thể hủy đăng ký khi đăng ký còn ở trạng thái chờ duyệt.

---

### UC-05. Theo dõi tiến độ thực hiện

**Actor chính:** Sinh viên, Giảng viên.

**Mục tiêu:** Ghi nhận quá trình thực hiện đề tài và tạo kênh phản hồi giữa sinh viên với giảng viên trong quá trình làm khóa luận.

**Luồng chính:**

1. Sinh viên đã được duyệt đề tài mở màn hình tiến độ.
2. Sinh viên tạo một bản ghi tiến độ mới.
3. Sinh viên chọn loại cập nhật, nhập phần trăm hoàn thành, nội dung thực hiện và có thể thêm đường dẫn file đính kèm.
4. Hệ thống lưu nhật ký tiến độ gắn với sinh viên và đề tài.
5. Giảng viên mở màn hình xem tiến độ của sinh viên.
6. Giảng viên đọc nội dung cập nhật và nhập nhận xét nếu cần.
7. Hệ thống lưu nhận xét của giảng viên vào bản ghi tiến độ tương ứng.

**Luồng phụ/ngoại lệ:**

1. Nếu sinh viên chưa có đăng ký được duyệt, hệ thống không cho tạo tiến độ.
2. Nếu nội dung tiến độ không hợp lệ hoặc thiếu dữ liệu bắt buộc, hệ thống yêu cầu nhập lại.
3. Nếu sinh viên chưa tạo nhật ký nào, màn hình giảng viên hiển thị trạng thái chưa có tiến độ.
4. Nếu có lỗi khi lưu nhận xét, hệ thống giữ nguyên dữ liệu cũ và thông báo cho giảng viên.

---

### UC-06. Nộp báo cáo

**Actor chính:** Sinh viên.

**Actor phụ:** IPFS.

**Mục tiêu:** Cho phép sinh viên nộp báo cáo khóa luận lên hệ thống, lưu trữ file trên IPFS và lưu mã CID để phục vụ chấm điểm.

**Luồng chính:**

1. Sinh viên đã được duyệt đề tài mở màn hình nộp báo cáo.
2. Hệ thống kiểm tra đăng ký của sinh viên và quyền nộp báo cáo.
3. Nếu là đề tài nhóm, hệ thống chỉ cho trưởng nhóm nộp báo cáo đại diện.
4. Sinh viên chọn file báo cáo định dạng PDF.
5. Frontend gửi file lên backend.
6. Backend kiểm tra điều kiện nộp, sau đó upload file lên IPFS.
7. IPFS trả về CID của file đã lưu.
8. Backend tạo bản ghi báo cáo với CID, ngày nộp và thông tin đề tài.
9. Nếu là đề tài nhóm, hệ thống tạo bản ghi báo cáo cho các thành viên đã chấp nhận tham gia nhóm.
10. Frontend hiển thị trạng thái đã nộp và đường dẫn truy cập báo cáo qua IPFS gateway.

**Luồng phụ/ngoại lệ:**

1. Nếu đăng ký chưa được duyệt, hệ thống không cho nộp báo cáo.
2. Nếu sinh viên không thuộc đề tài hoặc không phải trưởng nhóm của đề tài nhóm, hệ thống từ chối thao tác.
3. Nếu không có file hoặc file không phải PDF, hệ thống yêu cầu chọn lại file hợp lệ.
4. Nếu đề tài đã có báo cáo trước đó, hệ thống ngăn nộp trùng.
5. Nếu upload IPFS thất bại, báo cáo chưa được ghi nhận và người dùng cần thử lại.
6. Nếu báo cáo đã được chấm điểm, sinh viên không được hủy hoặc xóa báo cáo.

---

### UC-07. Chấm điểm báo cáo

**Actor chính:** Giảng viên.

**Actor phụ:** Hệ thống AI, Blockchain/Smart Contract.

**Mục tiêu:** Hỗ trợ giảng viên xem báo cáo, tham khảo phân tích AI, nhập điểm chính thức và ghi nhận kết quả chấm điểm lên blockchain.

**Luồng chính:**

1. Giảng viên mở màn hình duyệt báo cáo và chấm điểm.
2. Hệ thống hiển thị danh sách sinh viên đã được duyệt đề tài, trạng thái nộp báo cáo và trạng thái chấm điểm.
3. Giảng viên chọn một báo cáo đã nộp.
4. Hệ thống hiển thị thông tin sinh viên, đề tài, thời gian nộp và CID IPFS.
5. Nếu báo cáo có thể phân tích, hệ thống gọi AI để đề xuất điểm và nhận xét.
6. Nếu đề tài có rubrics, AI phân tích theo từng tiêu chí và đề xuất điểm tiêu chí.
7. Giảng viên xem kết quả AI, điều chỉnh điểm nếu cần và nhập điểm chính thức.
8. Giảng viên xác nhận ghi điểm.
9. Backend gọi smart contract để ghi nhận kết quả chấm điểm.
10. Hệ thống lưu điểm, nhận xét, điểm AI, kết quả rubrics và TxHash vào cơ sở dữ liệu.
11. Trạng thái báo cáo chuyển sang đã chấm điểm.

**Luồng phụ/ngoại lệ:**

1. Nếu sinh viên chưa nộp báo cáo, giảng viên chỉ xem được trạng thái chờ nộp và không thể chấm điểm.
2. Nếu AI không phản hồi, giảng viên vẫn có thể chấm điểm thủ công; hệ thống có thể hiển thị thông báo lỗi hoặc điểm gợi ý mặc định.
3. Nếu điểm đã tồn tại cho cùng báo cáo và sinh viên, hệ thống ngăn chấm trùng.
4. Nếu giao dịch blockchain thất bại, điểm chưa được ghi nhận hoàn chỉnh và hệ thống thông báo lỗi để giảng viên xử lý lại.
5. Nếu giảng viên thay đổi điểm so với điểm AI, hệ thống vẫn lưu điểm chính thức do giảng viên xác nhận.

---

### UC-08. Tra cứu kết quả

**Actor chính:** Sinh viên.

**Mục tiêu:** Cho phép sinh viên theo dõi trạng thái khóa luận của mình từ đăng ký đề tài đến nộp báo cáo và nhận kết quả chấm điểm.

**Luồng chính:**

1. Sinh viên đăng nhập vào dashboard.
2. Hệ thống tải thông tin hồ sơ, đăng ký đề tài, báo cáo và điểm số nếu có.
3. Sinh viên xem trạng thái đăng ký: chờ duyệt, đã duyệt hoặc bị từ chối.
4. Nếu đã nộp báo cáo, sinh viên xem thông tin CID và trạng thái báo cáo.
5. Nếu đã chấm điểm, sinh viên xem điểm giảng viên, điểm AI, nhận xét và TxHash blockchain.
6. Sinh viên có thể sử dụng TxHash để đối chiếu giao dịch trên blockchain explorer nếu giao dịch hợp lệ.

**Luồng phụ/ngoại lệ:**

1. Nếu sinh viên chưa cập nhật hồ sơ, hệ thống yêu cầu hoàn thiện hồ sơ trước khi sử dụng các chức năng chính.
2. Nếu sinh viên chưa đăng ký đề tài, dashboard hiển thị trạng thái chưa có đề tài.
3. Nếu sinh viên đã nộp báo cáo nhưng chưa được chấm, hệ thống hiển thị trạng thái chờ chấm.
4. Nếu chưa có TxHash, hệ thống chỉ hiển thị điểm và nhận xét đã lưu trong cơ sở dữ liệu.

---

## 6. Ràng buộc nghiệp vụ chính

1. Một sinh viên tại một thời điểm chỉ được có một đăng ký đề tài đang hoạt động hoặc tham gia một nhóm đề tài đang hoạt động.
2. Với đề tài nhóm, sinh viên đăng ký đầu tiên là trưởng nhóm và chỉ trưởng nhóm được mời thành viên hoặc nộp báo cáo đại diện.
3. Đăng ký chỉ có thể hủy khi còn ở trạng thái chờ duyệt.
4. Đề tài sử dụng rubrics phải có tổng trọng số tiêu chí bằng 100%.
5. Báo cáo chỉ được nộp sau khi đăng ký đề tài đã được giảng viên duyệt.
6. Báo cáo đã có điểm không được xóa để đảm bảo tính toàn vẹn của dữ liệu đánh giá.
7. Điểm chính thức là điểm do giảng viên xác nhận; điểm AI chỉ đóng vai trò hỗ trợ tham khảo.
8. Kết quả chấm điểm cần lưu lại TxHash khi giao dịch blockchain thành công để phục vụ truy vết.

---

## 7. Nguồn tổng hợp trong project

Nội dung trên được tổng hợp từ các nhóm file chính sau:

| Nhóm nguồn | File/Thư mục tham khảo |
|---|---|
| Route backend | `backend/server.js` |
| Controller nghiệp vụ | `backend/controllers/authController.js`, `sinhVienController.js`, `deTaiController.js`, `tienDoController.js`, `baoCaoController.js`, `diemSoController.js`, `aiController.js`, `rubricsController.js` |
| Giao diện sinh viên | `frontend/src/components/student/StudentDashboard.js`, `TopicRegistration.js`, `ProgressLog.js`, `ReportUpload.js` |
| Giao diện giảng viên | `frontend/src/components/lecturer/TopicManagement.js`, `SubmissionReview.js`, `RubricsManagement.js` |
| Note đã có | `notes/phan_tich_danh_gia_hien_trang_quy_trinh_giao_de_tai_du_lieu_tien_do_bao_cao.md`, `notes/lap_ke_hoach_va_phan_cong_cong_viec.md` |

Không tìm thấy file convention hoặc structure map như `convention/QUY_UOC_DAT_TEN_VA_RULE.md` hoặc `structure/module_map.json` trong project tại thời điểm tổng hợp. Vì vậy, phần đặc tả được xác nhận trực tiếp từ mã nguồn hiện có.
