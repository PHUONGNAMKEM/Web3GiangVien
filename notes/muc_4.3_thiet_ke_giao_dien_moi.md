# 4.3. THIẾT KẾ GIAO DIỆN HỆ THỐNG

Hệ thống được xây dựng theo mô hình ứng dụng web một trang (SPA) bằng React, phục
vụ hai nhóm người dùng chính là **Giảng viên** và **Sinh viên**. Sau khi đăng nhập,
mỗi vai trò được điều hướng vào không gian làm việc riêng với thanh điều hướng
(sidebar) và các nhóm chức năng được phân quyền tương ứng. Phần này trình bày các
màn hình giao diện chính của hệ thống quản lý đề tài giữa giảng viên và sinh viên có
tích hợp AI và blockchain.

## 4.3.1. Chức năng đăng nhập

Hệ thống áp dụng cơ chế đăng nhập phi tập trung bằng ví điện tử Web3 (MetaMask)
thay cho hình thức tài khoản – mật khẩu truyền thống. Quy trình xác thực dựa trên
mô hình "thử thách – phản hồi" (challenge–response): người dùng kết nối ví, hệ thống
backend sinh ra một chuỗi ngẫu nhiên (Nonce), người dùng dùng khóa riêng (Private
Key) trong ví MetaMask để ký lên chuỗi này, sau đó backend giải mã chữ ký để xác
minh đúng chủ sở hữu ví và cấp JWT Token cho phiên làm việc. Dựa trên vai trò gắn
với địa chỉ ví, hệ thống tự động điều hướng người dùng vào trang dành cho Giảng viên
hoặc Sinh viên. Ngoài ra, màn hình đăng nhập còn hỗ trợ phương thức quét mã QR để
đăng nhập nhanh.

Mỗi loại tài khoản có quyền hạn và nhóm chức năng cụ thể như sau:

**Tài khoản Giảng viên:**

- Quản lý đề tài hướng dẫn
  + Tạo mới, cập nhật, công bố và đóng đề tài kèm yêu cầu kỹ năng, số lượng sinh
    viên, thời hạn đăng ký và thời hạn nộp báo cáo.
  + Khai báo từ khóa kỹ năng/công nghệ làm cơ sở cho AI (SBERT) gợi ý đề tài cho
    sinh viên.
  + Duyệt hoặc từ chối các nhóm sinh viên đăng ký đề tài.
- Quản lý tiêu chí chấm điểm (Rubrics)
  + Tạo và tái sử dụng các mẫu Rubrics gồm nhiều tiêu chí, trọng số và gợi ý từ
    khóa cho AI.
- Tổ chức bài test đầu vào (cạnh tranh đề tài) gồm câu hỏi trắc nghiệm và câu hỏi lập
  trình.
- Chấm điểm và duyệt báo cáo
  + Xem báo cáo sinh viên nộp trên IPFS, tham khảo điểm phân tích của AI
    (PhoBERT), nhập điểm chính thức và ký số bằng MetaMask để ghi nhận lên
    blockchain.
  + Theo dõi và đánh giá nhật ký tiến độ theo tuần của sinh viên.
- Giám sát và đối chiếu: so sánh điểm AI gợi ý với điểm giảng viên chấm thực tế.

**Tài khoản Sinh viên:**

- Quản lý hồ sơ năng lực: cập nhật họ tên, mã số sinh viên, email, GPA, chuyên ngành
  và kỹ năng (phục vụ AI gợi ý đề tài).
- Quản lý nhóm: tạo nhóm, mời thành viên, chốt nhóm trước khi đăng ký đề tài.
- Đăng ký đề tài: xem danh sách đề tài kèm độ tương thích do AI (SBERT) gợi ý và gửi
  yêu cầu đăng ký.
- Làm bài test đầu vào (đối với đề tài có cạnh tranh).
- Cập nhật nhật ký tiến độ theo tuần và nộp báo cáo cuối cùng dưới dạng PDF lên IPFS.
- Theo dõi kết quả: xem tiến trình xét duyệt, điểm AI gợi ý, điểm giảng viên và mã
  giao dịch xác thực trên blockchain.

**Hình 4.1: Giao diện đăng nhập bằng ví MetaMask và ký xác thực**

Khi truy cập hệ thống, người dùng nhấn nút "Kết Nối Ví MetaMask"; ví MetaMask hiện
cửa sổ yêu cầu cấp quyền và yêu cầu ký thông điệp xác thực. Sau khi người dùng xác
nhận ký, hệ thống xác minh chữ ký và chuyển hướng vào không gian làm việc tương
ứng với vai trò.

## 4.3.2. Trang chủ (Dashboard)

Trang chủ là màn hình đầu tiên sau khi đăng nhập, hiển thị tổng quan thông tin và các
chỉ số quan trọng theo từng vai trò.

**Hình 4.2: Giao diện trang chủ tài khoản Sinh viên**

Khi người dùng đăng nhập bằng tài khoản sinh viên, màn hình hiển thị Dashboard Sinh
viên. Giao diện gồm ba thẻ thông tin chính: thẻ Hồ sơ cá nhân (họ tên, mã sinh viên,
email, chuyên ngành, GPA và các kỹ năng), thẻ Trạng thái đồ án (đề tài hiện tại và
trạng thái đăng ký), và thẻ Tiến độ & Điểm (điểm giảng viên, điểm AI gợi ý, điểm quá
trình trung bình và liên kết xác thực trên Etherscan). Trong trường hợp sinh viên chưa
hoàn tất hồ sơ, hệ thống bắt buộc cập nhật thông tin cá nhân và kỹ năng trước khi sử
dụng các chức năng khác; đồng thời hiển thị các lời mời tham gia nhóm (nếu có).

**Hình 4.3: Giao diện trang chủ tài khoản Giảng viên**

Khi người dùng đăng nhập bằng tài khoản giảng viên, màn hình hiển thị Dashboard
Giảng viên. Giao diện hiển thị các thẻ thống kê thời gian thực như Tổng đề tài đang
quản lý và Số sinh viên đã hướng dẫn. Thanh sidebar bên trái chứa toàn bộ các nhóm
chức năng dành cho giảng viên gồm: Quản lý Đề tài, Quản lý Rubrics, Chấm điểm (AI)
và So sánh AI vs Giảng viên.

## 4.3.3. Trang quản lý nhóm (Sinh viên)

**Hình 4.4: Giao diện quản lý nhóm sinh viên**

Khi người dùng đăng nhập bằng tài khoản sinh viên và chọn chức năng Nhóm, màn hình
hiển thị trang Quản lý nhóm. Tại đây, sinh viên có thể tạo nhóm mới (đặt tên nhóm và
số lượng thành viên tối đa), mời thành viên thông qua mã số sinh viên, theo dõi danh
sách thành viên kèm trạng thái (đã tham gia / chờ xác nhận / từ chối). Trưởng nhóm có
thêm quyền xóa thành viên, chuyển quyền trưởng nhóm, xóa nhóm và đặc biệt là "chốt
nhóm" khi đã đủ thành viên. Việc chốt nhóm là điều kiện bắt buộc trước khi nhóm được
phép đăng ký đề tài. Giao diện cũng hiển thị các lời mời gia nhập nhóm đang chờ để
sinh viên chấp nhận hoặc từ chối.

## 4.3.4. Trang đăng ký đề tài và gợi ý bằng AI (Sinh viên)

**Hình 4.5: Giao diện đăng ký đề tài với gợi ý AI (SBERT)**

Khi người dùng đăng nhập bằng tài khoản sinh viên và chọn chức năng Đăng Ký Đề Tài,
màn hình hiển thị danh sách các đề tài dưới dạng thẻ (card). Mỗi thẻ trình bày tên đề
tài, giảng viên hướng dẫn, số lượng sinh viên tối đa, mô tả, yêu cầu công nghệ và đặc
biệt là chỉ số "Độ Tương Thích (AI SBERT Match)". Hệ thống AI sử dụng mô hình
SBERT để so khớp hồ sơ năng lực, kỹ năng của sinh viên với yêu cầu kỹ thuật của từng
đề tài, từ đó tính điểm tương thích và xếp hạng các đề tài phù hợp nhất lên đầu. Những
đề tài có độ tương thích cao được gắn nhãn "AI Khuyên Chọn". Sinh viên (sau khi nhóm
đã được chốt) có thể gửi yêu cầu đăng ký; nếu đề tài có cạnh tranh, hệ thống sẽ điều
hướng trưởng nhóm sang làm bài test đầu vào. Giao diện cũng hiển thị trạng thái đăng
ký hiện tại của nhóm và cho phép hủy đăng ký khi còn ở trạng thái chờ duyệt.

## 4.3.5. Trang bài test đầu vào (cạnh tranh đề tài)

Đối với những đề tài được nhiều nhóm cùng quan tâm, giảng viên có thể thiết lập một
bài test đầu vào để chọn ra nhóm phù hợp nhất. Bài test gồm câu hỏi trắc nghiệm và
câu hỏi lập trình (sử dụng trình soạn thảo mã Monaco Editor), kết quả cạnh tranh được
cập nhật theo thời gian thực bằng công nghệ Socket.IO.

**Hình 4.6: Giao diện làm bài test đầu vào của Sinh viên**

Khi nhóm đăng ký một đề tài có bài test, trưởng nhóm sẽ vào màn hình làm bài. Giao
diện hiển thị thời gian đếm ngược, danh sách câu hỏi trắc nghiệm và khung soạn thảo
mã cho câu hỏi lập trình. Khi có một nhóm hoàn thành trước và đạt ngưỡng điểm yêu
cầu, hệ thống lập tức thông báo cho các nhóm còn lại và kết thúc cuộc thi.

**Hình 4.7: Giao diện quản lý bài test đầu vào của Giảng viên**

Khi giảng viên chọn chức năng tạo bài test cho một đề tài, màn hình cho phép cấu hình
tiêu đề, thời gian làm bài, ngưỡng điểm đạt và thêm các câu hỏi (trắc nghiệm hoặc lập
trình). Giảng viên cũng có thể xem bảng kết quả làm bài của các nhóm tham gia.

## 4.3.6. Trang nhật ký tiến độ (Sinh viên)

**Hình 4.8: Giao diện nhật ký tiến độ theo tuần của Sinh viên**

Khi người dùng đăng nhập bằng tài khoản sinh viên và chọn chức năng Nhật Ký Tiến
Độ, màn hình hiển thị nhật ký tiến độ được tổ chức theo tuần. Sinh viên cập nhật từng
tuần với các thông tin: tuần số, khoảng thời gian, mục tiêu tuần, nội dung đã làm, khó
khăn, kế hoạch tuần sau, phần trăm hoàn thành và các minh chứng (đường dẫn tài liệu,
hình ảnh). Mỗi mục nhật ký hiển thị trạng thái đánh giá của giảng viên (Đạt / Cần bổ
sung / Không đạt), điểm tuần, nhận xét của giảng viên và các cảnh báo tiến độ tự động
do hệ thống phát hiện (ví dụ: tiến độ giảm so với tuần trước, không có minh chứng
nhưng tiến độ cao). Với các tuần "Cần bổ sung" hoặc "Không đạt", sinh viên có thể sửa
và nộp lại.

## 4.3.7. Trang nộp báo cáo (Sinh viên)

**Hình 4.9: Giao diện nộp báo cáo PDF lên IPFS**

Khi người dùng đăng nhập bằng tài khoản sinh viên và chọn chức năng Nộp Báo Cáo,
màn hình hiển thị trang nộp báo cáo cuối cùng. Sau khi đề tài đã được giảng viên duyệt,
sinh viên (hoặc trưởng nhóm đối với đề tài nhóm) có thể kéo – thả hoặc chọn file báo
cáo định dạng PDF để tải lên. Hệ thống tự động lưu trữ tệp lên mạng phi tập trung IPFS
và trả về mã định danh nội dung (IPFS CID); mã hash của báo cáo đồng thời được ghi
nhận lên blockchain để bảo đảm tính toàn vẹn và xác thực. Giao diện hiển thị tiến trình
mã hóa và tải lên, thông tin báo cáo đã nộp (tiêu đề, IPFS CID, thời gian nộp) cùng liên
kết xem file gốc trên IPFS. Sinh viên có thể hủy nộp để nộp lại file mới khi bài chưa
được chấm điểm.

## 4.3.8. Trang kết quả và điểm (Sinh viên)

**Hình 4.10: Giao diện theo dõi tiến độ xét duyệt và kết quả điểm**

Khi người dùng đăng nhập bằng tài khoản sinh viên và chọn chức năng Kết Quả & Điểm,
màn hình hiển thị toàn bộ tiến trình thực hiện đồ án dưới dạng các bước (Steps): Đăng
ký đề tài → Nộp báo cáo → AI phân tích → Giảng viên đánh giá → Ghi nhận
Blockchain. Giao diện trình bày điểm AI do PhoBERT gợi ý kèm phản hồi nội dung,
điểm chính thức của giảng viên dưới dạng biểu đồ vòng, nhận xét của giảng viên và
trạng thái xác thực trên blockchain. Sinh viên có thể đối chiếu giữa điểm AI tham khảo
và điểm giảng viên quyết định cuối cùng.

## 4.3.9. Trang quản lý đề tài (Giảng viên)

**Hình 4.11: Giao diện danh sách quản lý đề tài**

Khi người dùng đăng nhập bằng tài khoản giảng viên và chọn chức năng Quản Lý Đề Tài,
màn hình hiển thị bảng danh sách các đề tài do giảng viên phụ trách, kèm số lượng sinh
viên, yêu cầu kỹ năng, số nhóm đăng ký và trạng thái đề tài. Giảng viên có thể thực hiện
các thao tác tạo mới, chỉnh sửa, xóa, duyệt đăng ký và tạo bài test cho từng đề tài.

**Hình 4.12: Giao diện tạo và cập nhật đề tài**

Khi giảng viên chọn "Tạo Đề Tài Mới", hệ thống mở biểu mẫu cho phép nhập tên đề tài,
mô tả cốt lõi (dùng cho AI SBERT matching), mô tả chi tiết, yêu cầu kỹ năng/công nghệ,
số lượng sinh viên, deadline, hạn đăng ký, hạn nộp báo cáo, các thông tin bổ sung và bộ
tiêu chí Rubrics chấm điểm (tùy chọn). Trong đó, từ khóa yêu cầu kỹ năng chính là dữ
liệu đầu vào để AI gợi ý đề tài phù hợp cho sinh viên.

**Hình 4.13: Giao diện duyệt nhóm đăng ký đề tài**

Khi giảng viên chọn duyệt một đề tài có nhóm đăng ký, hệ thống mở bảng (drawer) danh
sách các nhóm đã đăng ký kèm thông tin thành viên và trạng thái. Giảng viên có thể
duyệt hoặc từ chối từng nhóm; với đề tài có bài test, hệ thống tự động xác định nhóm
thắng cuộc dựa trên kết quả cạnh tranh.

## 4.3.10. Trang quản lý Rubrics (Giảng viên)

**Hình 4.14: Giao diện quản lý mẫu Rubrics chấm điểm**

Khi người dùng đăng nhập bằng tài khoản giảng viên và chọn chức năng Quản Lý Rubrics,
màn hình hiển thị danh sách các mẫu tiêu chí chấm điểm (Rubrics Template) có thể tái sử
dụng cho nhiều đề tài. Mỗi mẫu gồm nhiều tiêu chí với tên, mô tả, trọng số (tổng các
trọng số phải bằng 100%), điểm tối đa và gợi ý từ khóa cho AI. Giảng viên có thể tạo
mới, chỉnh sửa, đặt mẫu mặc định; những mẫu đã được áp dụng vào đề tài sẽ bị khóa để
bảo đảm tính nhất quán khi chấm điểm.

## 4.3.11. Trang chấm điểm và duyệt báo cáo (Giảng viên)

**Hình 4.15: Giao diện danh sách báo cáo cần chấm**

Khi người dùng đăng nhập bằng tài khoản giảng viên và chọn chức năng Chấm Điểm (AI),
màn hình hiển thị bảng các sinh viên/nhóm đã được duyệt đề tài kèm trạng thái nộp bài,
thời gian nộp và điểm số (nếu đã chấm). Giảng viên có thể xem nhật ký tiến độ hoặc mở
chức năng chấm điểm chi tiết cho từng bài nộp.

**Hình 4.16: Giao diện chấm điểm với phân tích AI PhoBERT và ghi blockchain**

Khi giảng viên chọn chấm điểm một báo cáo, hệ thống mở bảng chi tiết gồm: liên kết tải
báo cáo từ IPFS, kết quả phân tích của AI PhoBERT (điểm gợi ý và phản hồi nội dung),
bảng chấm điểm theo Rubrics (nếu đề tài có thiết lập), tóm tắt tiến độ tuần và ô nhập
điểm chính thức. Giảng viên có thể giữ nguyên hoặc điều chỉnh điểm AI gợi ý, sau đó
nhấn "Ký Số MetaMask & Ghi Blockchain" để xác thực danh tính và ghi nhận điểm lên
mạng Ethereum (Sepolia). Sau khi ghi thành công, hệ thống lưu mã giao dịch
(Transaction Hash) và hiển thị liên kết tra cứu trên Etherscan; điểm số đã chốt trở nên
bất biến và không thể chỉnh sửa.

## 4.3.12. Trang so sánh điểm AI và Giảng viên

**Hình 4.17: Giao diện so sánh điểm AI (PhoBERT) và điểm Giảng viên**

Khi người dùng đăng nhập bằng tài khoản giảng viên và chọn chức năng So Sánh AI vs
Giảng viên, màn hình hiển thị bảng tổng hợp đối chiếu giữa điểm AI gợi ý và điểm giảng
viên chấm thực tế cho toàn bộ sinh viên đã được chấm điểm. Giao diện gồm các thẻ
thống kê (số sinh viên đã chấm, điểm trung bình AI, điểm trung bình giảng viên, mức
chênh lệch trung bình, số trường hợp khớp), biểu đồ cột so sánh trực quan và bảng dữ
liệu chi tiết kèm bộ lọc theo đề tài. Chức năng này giúp giảng viên đánh giá độ tin cậy
của AI và bảo đảm tính minh bạch, khách quan trong quá trình chấm điểm.

## 4.4. KẾT CHƯƠNG

(giữ nguyên hoặc cập nhật phần kết chương theo nội dung dự án hiện tại)
