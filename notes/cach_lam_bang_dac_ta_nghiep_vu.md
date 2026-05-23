# Cách làm bảng đặc tả nghiệp vụ

## 1. Bảng đặc tả nghiệp vụ là gì?

Bảng đặc tả nghiệp vụ là cách mô tả một quy trình nghiệp vụ thành dạng văn bản có cấu trúc. Bảng này thường được lập sau khi xác định Use Case nghiệp vụ và trước khi vẽ các sơ đồ như Activity Diagram, Sequence Diagram hoặc Collaboration Diagram.

Hiểu đơn giản, bảng đặc tả nghiệp vụ cho biết:

- Quy trình nghiệp vụ bắt đầu khi nào.
- Ai là tác nhân chính tham gia quy trình.
- Các bước xử lý chính diễn ra theo thứ tự nào.
- Có những tình huống thay thế hoặc ngoại lệ nào.
- Sau khi hoàn tất, quy trình tạo ra kết quả gì.

Ví dụ trong bài toán thư viện, Use Case "Mượn tài liệu" có thể được đặc tả bằng các bước như: độc giả yêu cầu mượn tài liệu, thủ thư kiểm tra thẻ, kiểm tra số lượng tài liệu đang mượn, lấy tài liệu, ghi nhận thông tin mượn và giao tài liệu cho độc giả.

## 2. Vì sao cần bảng đặc tả nghiệp vụ?

Bảng đặc tả nghiệp vụ giúp chuyển mô tả nghiệp vụ từ dạng văn xuôi sang dạng rõ ràng, có thứ tự và dễ kiểm tra. Nếu chỉ đọc đề bài hoặc mô tả dài, người phân tích dễ bỏ sót bước xử lý, nhầm tác nhân hoặc không nhận ra các tình huống rẽ nhánh.

Bảng đặc tả nghiệp vụ cần thiết vì:

- Làm rõ luồng nghiệp vụ chính trong trường hợp bình thường.
- Làm rõ các tình huống thay thế, ngoại lệ hoặc điều kiện đặc biệt.
- Làm cơ sở để vẽ Activity Diagram.
- Làm cơ sở để tiếp tục xây dựng Sequence Diagram, Collaboration Diagram và đặc tả chức năng hệ thống.
- Giúp nhóm thống nhất cách hiểu nghiệp vụ trước khi đi vào thiết kế phần mềm.

## 3. Thành phần của bảng đặc tả nghiệp vụ

Một bảng đặc tả nghiệp vụ có thể gồm các thành phần sau:

| Thành phần | Ý nghĩa |
|---|---|
| Tên Use Case | Tên quy trình hoặc chức năng nghiệp vụ cần đặc tả |
| Mô tả | Use Case bắt đầu khi nào, ai kích hoạt, dùng để mô tả việc gì |
| Mục tiêu | Kết quả nghiệp vụ cần đạt được sau khi quy trình hoàn tất |
| Tác nhân chính | Actor chính tham gia hoặc kích hoạt quy trình |
| Tác nhân liên quan | Các actor khác có tham gia, cung cấp dữ liệu hoặc nhận kết quả |
| Điều kiện trước | Điều kiện cần có trước khi quy trình bắt đầu |
| Dòng cơ bản | Các bước chính trong trường hợp bình thường |
| Dòng thay thế | Các tình huống rẽ nhánh, ngoại lệ hoặc điều kiện đặc biệt |
| Kết quả | Trạng thái hoặc dữ liệu được tạo ra sau khi quy trình hoàn tất |

Trong một số tài liệu, các mục bắt buộc thường là: Tên Use Case, Mô tả, Dòng cơ bản và Dòng thay thế. Các mục như Mục tiêu, Tác nhân, Điều kiện trước và Kết quả có thể bổ sung để bảng rõ ràng hơn.

## 4. Quy trình làm bảng đặc tả nghiệp vụ

### Bước 1. Chọn Use Case nghiệp vụ cần đặc tả

Trước tiên cần chọn một Use Case nghiệp vụ từ sơ đồ Use Case nghiệp vụ. Use Case được chọn nên là một quy trình có giá trị rõ ràng đối với tác nhân.

Ví dụ trong đề tài quản lý đề tài:

- Đăng ký đề tài.
- Duyệt đăng ký đề tài.
- Theo dõi tiến độ thực hiện.
- Nộp báo cáo.
- Chấm điểm đề tài.
- Ghi nhận dữ liệu lên blockchain.

### Bước 2. Viết phần mô tả và mục tiêu

Phần này trả lời các câu hỏi:

- Use Case bắt đầu khi nào?
- Ai là người kích hoạt quy trình?
- Quy trình dùng để xử lý việc gì?
- Kết quả cuối cùng cần đạt là gì?

Ví dụ:

| Thành phần | Nội dung |
|---|---|
| Tên Use Case | Đăng ký đề tài |
| Mô tả | Use Case bắt đầu khi sinh viên chọn một đề tài và gửi yêu cầu đăng ký |
| Mục tiêu | Ghi nhận yêu cầu đăng ký đề tài của sinh viên để giảng viên xét duyệt |

### Bước 3. Viết dòng cơ bản

Dòng cơ bản là luồng chính của quy trình, tức là trường hợp mọi việc diễn ra bình thường.

Khi viết dòng cơ bản cần chú ý:

- Viết theo đúng thứ tự thời gian.
- Mỗi bước nên có dạng "Ai làm gì với đối tượng nào".
- Không đưa tình huống lỗi hoặc ngoại lệ vào dòng cơ bản.
- Mỗi bước nên đủ rõ để có thể chuyển thành một activity trong Activity Diagram.

Ví dụ dòng cơ bản của Use Case "Đăng ký đề tài":

1. Sinh viên đăng nhập vào hệ thống.
2. Sinh viên tra cứu danh sách đề tài đang mở đăng ký.
3. Sinh viên xem chi tiết đề tài phù hợp.
4. Sinh viên gửi yêu cầu đăng ký đề tài.
5. Hệ thống kiểm tra điều kiện đăng ký.
6. Hệ thống lưu yêu cầu đăng ký ở trạng thái chờ duyệt.
7. Hệ thống thông báo kết quả gửi yêu cầu cho sinh viên.

### Bước 4. Viết dòng thay thế

Dòng thay thế mô tả các trường hợp rẽ nhánh, lỗi hoặc điều kiện đặc biệt. Cách viết thường dùng là:

```text
Tại bước X, nếu ... thì ...
```

Ví dụ:

- Tại bước 5, nếu sinh viên đã có đề tài được duyệt thì hệ thống từ chối yêu cầu đăng ký mới.
- Tại bước 5, nếu đề tài đã đủ số lượng sinh viên thì hệ thống thông báo đề tài không còn chỗ đăng ký.
- Tại bước 5, nếu hồ sơ sinh viên chưa đầy đủ thì hệ thống yêu cầu sinh viên cập nhật hồ sơ trước khi đăng ký.

### Bước 5. Xác định kết quả sau quy trình

Kết quả cho biết trạng thái hoặc dữ liệu sau khi Use Case hoàn tất.

Ví dụ với Use Case "Đăng ký đề tài":

- Yêu cầu đăng ký được lưu vào hệ thống.
- Trạng thái đăng ký là chờ duyệt.
- Giảng viên có thể xem yêu cầu đăng ký để xét duyệt.
- Sinh viên có thể theo dõi trạng thái đăng ký.

## 5. Cách chuyển bảng đặc tả sang Activity Diagram

Sau khi có bảng đặc tả, có thể chuyển sang Activity Diagram như sau:

| Từ bảng đặc tả | Sang Activity Diagram |
|---|---|
| Mỗi bước trong dòng cơ bản | Một activity |
| Thứ tự các bước | Luồng chuyển tiếp |
| Câu "nếu ... thì ..." | Decision node |
| Kết quả của điều kiện | Guard condition |
| Kết thúc quy trình | End node |

Ví dụ:

- "Sinh viên gửi yêu cầu đăng ký đề tài" trở thành một activity.
- "Hệ thống kiểm tra điều kiện đăng ký" trở thành một activity hoặc decision.
- "Nếu đề tài đã đủ số lượng sinh viên" trở thành một nhánh điều kiện.

## 6. Mẫu bảng đặc tả nghiệp vụ

| Thành phần | Nội dung |
|---|---|
| Tên Use Case |  |
| Mô tả |  |
| Mục tiêu |  |
| Tác nhân chính |  |
| Tác nhân liên quan |  |
| Điều kiện trước |  |
| Dòng cơ bản | 1.  2.  3.  |
| Dòng thay thế | Tại bước X, nếu ... thì ... |
| Kết quả |  |

## 7. Lưu ý khi viết bảng đặc tả nghiệp vụ

- Tên Use Case nên là động từ hoặc cụm động từ, ví dụ: Đăng ký đề tài, Duyệt đăng ký, Nộp báo cáo.
- Actor nên là danh từ, ví dụ: Sinh viên, Giảng viên, Quản trị viên.
- Dòng cơ bản chỉ mô tả luồng bình thường.
- Dòng thay thế dùng để mô tả ngoại lệ hoặc điều kiện đặc biệt.
- Không đưa chi tiết kỹ thuật như tên API, tên collection MongoDB hoặc tên component React vào bảng đặc tả nghiệp vụ.
- Chỉ đưa công nghệ như AI, IPFS, blockchain khi chúng tạo ra giá trị nghiệp vụ rõ ràng, ví dụ: phân tích báo cáo, lưu trữ minh chứng, ghi nhận mã hash.
