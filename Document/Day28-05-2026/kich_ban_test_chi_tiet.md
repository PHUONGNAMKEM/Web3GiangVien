# 📋 KỊCH BẢN TEST END-TO-END CHI TIẾT

> Kịch bản dựa trên dữ liệu thực tế trong database hiện tại.
> Mục tiêu: Test toàn bộ luồng Competition từ tạo đề tài → cạnh tranh → báo cáo tuần → tổng kết blockchain.

---

## 🎭 PHÂN VAI & TÀI KHOẢN

| Vai trò | Tên | Mã | Wallet MetaMask | GPA |
|---|---|---|---|---|
| **Giảng viên** | PGS.TS Phong | GV003 | `0xf56ca4437a2c3ae3a594ff8a2dd9aed8ec3f1289` | — |
| **SV 1 (Trưởng nhóm 1)** | Phong Le | SVEDA301 | `0x0f662eca4aea682c8a94240f0c584656783853e6` | 8.2 |
| **SV 2 (Thành viên nhóm 1)** | Diễm My | SV4C2231 | `0xd26a77175271b968a036763aa4b151624bd62922` | 8.8 |
| **SV 3 (Trưởng nhóm 2)** | Trần Minh Anh | SV25ADD9 | `0x44c832ef5fa79abe4661b89328e7c623dfffdcf2` | 7.8 |
| **SV 4 (Thành viên nhóm 2)** | Nguyễn Thanh Tuấn | SV0A9E53 | `0x186cdad015aeb92001582d602a1936e01828627a` | 8.9 |

> [!IMPORTANT]
> **Yêu cầu trước khi bắt đầu:**
> - Backend đang chạy tại `http://localhost:5000`
> - Frontend đang chạy tại `http://localhost:3000`
> - ML Service đang chạy tại `http://localhost:8001`  
> - MetaMask đã cài trên trình duyệt, đã import 5 ví trên vào MetaMask
> - Database sạch (không có nhóm, đăng ký nào đang treo)

---

## 📌 GIAI ĐOẠN 1: GIẢNG VIÊN THIẾT LẬP COMPETITION

### Bước 1.1: Đăng nhập Giảng viên

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | Mở trình duyệt | Truy cập `http://localhost:3000` |
| 2 | Chuyển ví MetaMask | Chọn ví **PGS.TS Phong**: `0xf56ca4...` |
| 3 | Nhấn **"Kết nối MetaMask"** | Trang login hiển thị nút kết nối |
| 4 | Xác nhận ký (Sign) trên MetaMask | MetaMask popup → Nhấn **Sign** |
| ✅ | **Kết quả mong đợi** | Chuyển sang trang **Dashboard Giảng Viên**, hiển thị tên "PGS.TS Phong" |

---

### Bước 1.2: Tạo Rubrics Template

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | Menu trái → Nhấn **"Quản Lý Rubrics"** | Đường dẫn: `/lecturer/rubrics` |
| 2 | Nhấn nút **"Tạo Rubrics Mới"** | Form tạo rubrics xuất hiện |
| 3 | Nhập **Tên Rubrics** | VD: `Rubrics Đồ Án Tốt Nghiệp` |
| 4 | Thêm các tiêu chí đánh giá | Ví dụ: |
| | → Tiêu chí 1 | Tên: `Nội dung nghiên cứu` — Trọng số: `30%` — Mô tả: `Đánh giá chất lượng nội dung, phương pháp nghiên cứu` |
| | → Tiêu chí 2 | Tên: `Kỹ thuật & công nghệ` — Trọng số: `30%` — Mô tả: `Đánh giá chất lượng code, kiến trúc hệ thống` |
| | → Tiêu chí 3 | Tên: `Trình bày & báo cáo` — Trọng số: `20%` — Mô tả: `Bố cục, hình ảnh, chính tả, format` |
| | → Tiêu chí 4 | Tên: `Sáng tạo & đóng góp` — Trọng số: `20%` — Mô tả: `Tính mới, ứng dụng thực tiễn` |
| 5 | Kiểm tra **Tổng trọng số = 100%** | Hệ thống phải validate tổng = 100% |
| 6 | Nhấn **"Lưu Rubrics"** | |
| ✅ | **Kết quả mong đợi** | Rubrics mới xuất hiện trong danh sách, tổng trọng số = 100% |

---

### Bước 1.3: Tạo Đề Tài Mới (Có Bài Test Cạnh Tranh)

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | Menu trái → Nhấn **"Quản Lý Đề Tài"** | Đường dẫn: `/lecturer/topics` |
| 2 | Nhấn nút **"Tạo Đề Tài Mới"** | Form tạo đề tài xuất hiện |
| 3 | Nhập **Tên đề tài** | `Nghiên cứu ứng dụng Deep Learning trong phân tích tâm lý khách hàng` |
| 4 | Nhập **Mô tả** | `Xây dựng hệ thống phân tích sentiment từ review sản phẩm sử dụng mô hình BERT/GPT fine-tune. Yêu cầu: crawl dữ liệu, tiền xử lý, train model, đánh giá và triển khai demo.` |
| 5 | Chọn **Số lượng sinh viên tối đa** | **2** (để khớp với nhóm 2 người) |
| 6 | **BẬT** tùy chọn **"Có bài test cạnh tranh"** | `CoBaiTest = true` ← **QUAN TRỌNG** |
| 7 | Chọn **Rubrics** | Chọn Rubrics vừa tạo ở Bước 1.2 |
| 8 | Nhập thông tin khác (nếu có) | Chuyên ngành: `Công nghệ thông tin`, Deadline, v.v. |
| 9 | Nhấn **"Lưu Đề Tài"** | |
| ✅ | **Kết quả mong đợi** | Đề tài mới xuất hiện trong danh sách, trạng thái **"Mở Đăng Ký"**, có badge **"Có bài test"** |

---

### Bước 1.4: Tạo Bài Test Cho Đề Tài

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | Trong danh sách đề tài, tìm đề tài vừa tạo | Đề tài: `Nghiên cứu ứng dụng Deep Learning...` |
| 2 | Nhấn **icon "Tạo bài test"** (hoặc nút tương ứng) | Mở form tạo bài test |
| 3 | Nhập **Tên bài test** | VD: `Kiểm tra kiến thức Deep Learning cơ bản` |
| 4 | Nhập **Thời gian làm bài** | VD: `30 phút` |
| 5 | Thêm câu hỏi | Ví dụ 5 câu trắc nghiệm: |
| | → Câu 1 | `Activation function nào phổ biến nhất trong hidden layer của neural network?` → Đáp án: **ReLU** |
| | → Câu 2 | `BERT là viết tắt của?` → Đáp án: **Bidirectional Encoder Representations from Transformers** |
| | → Câu 3 | `Loss function nào thường dùng cho bài toán phân loại nhị phân?` → Đáp án: **Binary Cross-Entropy** |
| | → Câu 4 | `Kỹ thuật nào giúp tránh overfitting?` → Đáp án: **Dropout** |
| | → Câu 5 | `Gradient Descent là gì?` → Đáp án: **Thuật toán tối ưu để cập nhật trọng số** |
| 6 | Nhấn **"Lưu Bài Test"** | |
| ✅ | **Kết quả mong đợi** | Bài test được gắn với đề tài. Đề tài hiển thái có bài test sẵn sàng. |

---

## 📌 GIAI ĐOẠN 2: SINH VIÊN TẠO NHÓM

### Bước 2.1: Trưởng nhóm 1 (Phong Le) tạo nhóm

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | **Đăng xuất** tài khoản giảng viên | Nhấn avatar → "Đăng xuất" |
| 2 | Chuyển ví MetaMask | Chọn ví **Phong Le**: `0x0f662e...` |
| 3 | Nhấn **"Kết nối MetaMask"** → Ký (Sign) | |
| ✅ | **Kết quả** | Vào **Dashboard Sinh Viên** với tên "Phong Le" |
| 4 | Menu trái → Nhấn **"Nhóm"** | Đường dẫn: `/student/group` |
| 5 | Nhấn **"Tạo Nhóm Mới"** | Form tạo nhóm xuất hiện |
| 6 | Nhập **Tên nhóm** | VD: `Nhóm Alpha` |
| 7 | Nhấn **"Tạo"** | |
| ✅ | **Kết quả mong đợi** | Nhóm "Nhóm Alpha" được tạo, **Phong Le** là trưởng nhóm, trạng thái: **Chờ thành viên** |

---

### Bước 2.2: Trưởng nhóm 1 mời Diễm My vào nhóm

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | Trong trang Nhóm, nhấn **"Mời thành viên"** hoặc **"Thêm thành viên"** | |
| 2 | Tìm kiếm sinh viên | Nhập tên **"Diễm My"** hoặc mã SV **"SV4C2231"** |
| 3 | Nhấn **"Mời"** hoặc **"Thêm"** | |
| ✅ | **Kết quả mong đợi** | Diễm My xuất hiện trong danh sách thành viên nhóm (trạng thái: chờ xác nhận hoặc đã thêm) |

---

### Bước 2.3: Diễm My xác nhận vào nhóm (nếu hệ thống yêu cầu)

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | **Đăng xuất** Phong Le | |
| 2 | Chuyển ví MetaMask → **Diễm My**: `0xd26a77...` | |
| 3 | Đăng nhập MetaMask | |
| 4 | Menu trái → **"Nhóm"** | Kiểm tra xem có lời mời nhóm không |
| 5 | Nhấn **"Chấp nhận"** (nếu có) | |
| ✅ | **Kết quả mong đợi** | Diễm My thuộc nhóm "Nhóm Alpha", nhóm có 2/2 thành viên |

---

### Bước 2.4: Trưởng nhóm 1 chốt nhóm

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | **Đăng xuất** Diễm My → **Đăng nhập** lại **Phong Le** | |
| 2 | Menu trái → **"Nhóm"** | |
| 3 | Nhấn **"Chốt Nhóm"** | Chỉ trưởng nhóm mới có quyền này |
| ✅ | **Kết quả mong đợi** | Nhóm "Nhóm Alpha" trạng thái chuyển thành **"Đã Chốt"**, không thể thêm/xóa thành viên nữa |

---

### Bước 2.5: Trưởng nhóm 2 (Trần Minh Anh) tạo nhóm + mời thành viên

> Lặp lại các bước 2.1 → 2.4 cho **Nhóm 2**:

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | **Đăng xuất** → Chuyển ví **Trần Minh Anh**: `0x44c832...` → Đăng nhập | |
| 2 | Tạo nhóm mới | Tên: `Nhóm Beta` |
| 3 | Mời **Nguyễn Thanh Tuấn** (`SV0A9E53`) | |
| 4 | Đăng xuất → Đăng nhập **Nguyễn Thanh Tuấn** (`0x186cda...`) → Xác nhận vào nhóm | |
| 5 | Đăng xuất → Đăng nhập lại **Trần Minh Anh** → **Chốt nhóm** | |
| ✅ | **Kết quả mong đợi** | Nhóm "Nhóm Beta" đã chốt, 2/2 thành viên: Trần Minh Anh (trưởng nhóm) + Nguyễn Thanh Tuấn |

---

## 📌 GIAI ĐOẠN 3: ĐĂNG KÝ ĐỀ TÀI CẠNH TRANH

### Bước 3.1: Nhóm 1 (Phong Le) đăng ký đề tài

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | Đăng nhập **Phong Le** (nếu chưa) | |
| 2 | Menu trái → Nhấn **"Đăng Ký Đề Tài"** | Đường dẫn: `/student/register` |
| 3 | Tìm đề tài | `Nghiên cứu ứng dụng Deep Learning trong phân tích tâm lý khách hàng` |
| 4 | Nhấn **"Đăng Ký"** | |
| ✅ | **Kết quả mong đợi** | Vì đề tài có `CoBaiTest = true` → Trạng thái đăng ký chuyển thành **"Chờ Test"** (ChoTest). Chưa được chính thức gán đề tài. |

---

### Bước 3.2: Nhóm 2 (Trần Minh Anh) đăng ký cùng đề tài

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | **Đăng xuất** Phong Le | |
| 2 | Chuyển ví → **Trần Minh Anh** (`0x44c832...`) → Đăng nhập | |
| 3 | Menu trái → **"Đăng Ký Đề Tài"** | |
| 4 | Tìm cùng đề tài Deep Learning → Nhấn **"Đăng Ký"** | |
| ✅ | **Kết quả mong đợi** | Nhóm 2 cũng ở trạng thái **"Chờ Test"**. Cả 2 nhóm đều đăng ký cùng 1 đề tài → Cạnh tranh! |

---

## 📌 GIAI ĐOẠN 4: LÀM BÀI TEST CẠNH TRANH

> [!IMPORTANT]
> **Mục tiêu**: 2 nhóm cùng làm bài test. Nhóm nào **điểm cao hơn** sẽ được gán đề tài. Nhóm thua sẽ phải đăng ký đề tài khác.

### Bước 4.1: Nhóm 1 (Phong Le) làm bài test

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | Đăng nhập **Phong Le** | |
| 2 | Menu trái → **"Đăng Ký Đề Tài"** | |
| 3 | Tìm đề tài đã đăng ký → Nhấn **"Làm Bài Test"** | Nút này chỉ xuất hiện khi trạng thái = "Chờ Test" |
| 4 | Giao diện bài test hiển thị | Countdown timer bắt đầu (30 phút) |
| 5 | Trả lời 5 câu hỏi | **Cố ý trả lời ĐÚNG HẾT 5/5 câu** (để nhóm này thắng) |
| 6 | Nhấn **"Nộp Bài"** | |
| ✅ | **Kết quả mong đợi** | Hiển thị kết quả: **5/5 điểm (100%)**. Trạng thái đăng ký vẫn đang chờ (chưa có kết quả cuối vì nhóm kia chưa test). |

---

### Bước 4.2: Nhóm 2 (Trần Minh Anh) làm bài test

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | **Đăng xuất** Phong Le | |
| 2 | Đăng nhập **Trần Minh Anh** (`0x44c832...`) | |
| 3 | Menu trái → **"Đăng Ký Đề Tài"** → Nhấn **"Làm Bài Test"** | |
| 4 | Trả lời 5 câu hỏi | **Cố ý trả lời SAI 2 câu** → được **3/5 điểm (60%)** |
| 5 | Nhấn **"Nộp Bài"** | |
| ✅ | **Kết quả mong đợi** | Hiển thị kết quả: **3/5 điểm (60%)** |

---

### Bước 4.3: Kiểm tra kết quả cạnh tranh

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | Sau khi cả 2 nhóm đã nộp bài | Hệ thống tự so sánh điểm |
| ✅ | **Kết quả mong đợi cho Nhóm 1 (Phong Le)** | Trạng thái đăng ký → **"Đã Duyệt"** (DaDuyet). Đề tài được gán cho Nhóm Alpha. |
| ✅ | **Kết quả mong đợi cho Nhóm 2 (Trần Minh Anh)** | Trạng thái đăng ký → **"Bị Từ Chối"** hoặc **"Thua Cạnh Tranh"**. Hiển thị thông báo rõ ràng. |

> [!NOTE]
> **Kiểm tra thêm**: 
> - Đăng nhập lại **Trần Minh Anh** → Kiểm tra xem đề tài đã bị mất khỏi danh sách đăng ký chưa
> - Nhóm Beta có thể đăng ký đề tài khác không?

---

## 📌 GIAI ĐOẠN 5: NỘP BÁO CÁO TUẦN & CHẤM TIẾN ĐỘ

> Từ giai đoạn này, chỉ **Nhóm 1 (Phong Le + Diễm My)** thực hiện vì đã thắng cạnh tranh.

### Bước 5.1: Sinh viên nộp báo cáo Tuần 1

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | Đăng nhập **Phong Le** (`0x0f662e...`) | |
| 2 | Menu trái → Nhấn **"Nhật Ký Tiến Độ"** | Đường dẫn: `/student/progress-log` |
| 3 | Chọn đề tài đã được gán | `Nghiên cứu ứng dụng Deep Learning...` |
| 4 | Nhấn **"Tạo báo cáo tuần mới"** hoặc **"Thêm tiến độ"** | |
| 5 | Nhập nội dung báo cáo Tuần 1 | |
| | → **Công việc đã làm** | `Nghiên cứu tổng quan về Sentiment Analysis, thu thập 10,000 reviews từ Shopee. Cài đặt môi trường Python + PyTorch.` |
| | → **Mục tiêu tuần sau** | `Tiền xử lý dữ liệu, tokenize, chia train/test. Bắt đầu fine-tune BERT base.` |
| | → **Phần trăm hoàn thành** | `15%` |
| | → **Ghi chú / Khó khăn** | `Dữ liệu tiếng Việt cần xử lý dấu và viết tắt.` |
| 6 | Nhấn **"Nộp tiến độ"** | |
| ✅ | **Kết quả mong đợi** | Tiến độ Tuần 1 được ghi nhận, hiển thị trong danh sách tiến độ. Trạng thái: **"Chờ đánh giá"**. |

---

### Bước 5.2: Giảng viên chấm tiến độ Tuần 1

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | **Đăng xuất** Phong Le | |
| 2 | Chuyển ví MetaMask → **PGS.TS Phong** (`0xf56ca4...`) → Đăng nhập | |
| 3 | Menu trái → Nhấn **"Quản Lý Lớp Học"** | Đường dẫn: `/lecturer/classes` |
| 4 | Tìm đến phần **Tiến độ** hoặc **Báo cáo tuần** | Xem danh sách tiến độ mới nộp |
| 5 | Tìm báo cáo Tuần 1 của **Nhóm Alpha (Phong Le)** | |
| 6 | Đọc nội dung báo cáo tuần | Kiểm tra công việc đã làm, mục tiêu, phần trăm |
| 7 | Nhập **Nhận xét** | VD: `Tiến độ tốt, cần bám sát mục tiêu hơn. Chú ý chuẩn hóa dữ liệu trước khi train.` |
| 8 | Cho **Điểm tiến độ** | VD: `8/10` |
| 9 | Nhấn **"Đánh Giá"** / **"Chấm Điểm"** | |
| ✅ | **Kết quả mong đợi** | Điểm tiến độ Tuần 1 = 8/10 được lưu. Trạng thái chuyển thành **"Đã đánh giá"**. |

---

### Bước 5.3: Sinh viên xem nhận xét Tuần 1

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | **Đăng xuất** Giảng viên → **Đăng nhập** lại **Phong Le** | |
| 2 | Menu trái → **"Nhật Ký Tiến Độ"** | |
| 3 | Xem Tuần 1 | |
| ✅ | **Kết quả mong đợi** | Hiển thị nhận xét của giảng viên + Điểm tiến độ **8/10** |

---

### Bước 5.4: Nộp báo cáo Tuần 2 (Lặp lại)

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | Vẫn đăng nhập **Phong Le** | |
| 2 | Menu trái → **"Nhật Ký Tiến Độ"** → **"Tạo báo cáo tuần mới"** | |
| 3 | Nhập nội dung Tuần 2 | |
| | → **Công việc đã làm** | `Hoàn thành tiền xử lý 10,000 reviews. Tokenize bằng PhoBERT tokenizer. Chia dữ liệu 80/20. Fine-tune PhoBERT đạt accuracy 78% trên test set.` |
| | → **Mục tiêu tuần sau** | `Tối ưu hyperparameters, thử thêm augmentation data. Target accuracy > 85%.` |
| | → **Phần trăm hoàn thành** | `40%` |
| 4 | Nhấn **"Nộp tiến độ"** | |
| ✅ | **Kết quả mong đợi** | Tuần 2 ghi nhận thành công |

---

### Bước 5.5: Giảng viên chấm tiến độ Tuần 2

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | **Đăng xuất** → **Đăng nhập** GV **PGS.TS Phong** | |
| 2 | Vào phần tiến độ → Tìm báo cáo Tuần 2 Nhóm Alpha | |
| 3 | Nhận xét | `Tiến độ rất tốt. Kết quả 78% accuracy khá khả quan. Nên thử kỹ thuật ensemble.` |
| 4 | Điểm | `9/10` |
| 5 | Nhấn **"Đánh Giá"** | |
| ✅ | **Kết quả mong đợi** | Điểm Tuần 2 = 9/10 lưu thành công |

---

## 📌 GIAI ĐOẠN 6: TỔNG KẾT & CHỐT ĐIỂM CUỐI CÙNG (BLOCKCHAIN)

### Bước 6.1: Sinh viên nộp báo cáo tổng kết

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | **Đăng xuất** GV → **Đăng nhập** **Phong Le** | |
| 2 | Menu trái → Nhấn **"Nộp Báo Cáo"** | Đường dẫn: `/student/upload` |
| 3 | Chọn đề tài | `Nghiên cứu ứng dụng Deep Learning...` |
| 4 | Tải lên file báo cáo | Chọn file **PDF** (báo cáo tổng kết đồ án) |
| 5 | Nhấn **"Nộp Báo Cáo"** | |
| 6 | **MetaMask popup xuất hiện** | Xác nhận giao dịch để lưu hash file lên Blockchain |
| 7 | Nhấn **"Confirm"** trên MetaMask | Chờ transaction được xác nhận |
| ✅ | **Kết quả mong đợi** | Báo cáo được upload thành công. File hash (IPFS/SHA256) + timestamp được ghi lên Blockchain Sepolia. Transaction hash hiển thị trên giao diện. |

> [!WARNING]
> **Đảm bảo MetaMask đang kết nối đúng mạng Sepolia Testnet** và ví có đủ ETH test để trả gas fee.

---

### Bước 6.2: Giảng viên yêu cầu AI chấm điểm

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | **Đăng xuất** SV → **Đăng nhập** GV **PGS.TS Phong** | |
| 2 | Menu trái → Nhấn **"Chấm Điểm (AI)"** | Đường dẫn: `/lecturer/review` |
| 3 | Tìm báo cáo của **Nhóm Alpha (Phong Le)** | |
| 4 | Nhấn **"Gợi ý điểm bằng AI"** | |
| 5 | Chờ AI phân tích | ML Service (port 8001) xử lý báo cáo PDF |
| ✅ | **Kết quả mong đợi** | AI trả về: |
| | → Điểm từng tiêu chí Rubrics | VD: Nội dung: 8.5, Kỹ thuật: 7.5, Trình bày: 8.0, Sáng tạo: 7.0 |
| | → Điểm tổng gợi ý | VD: 7.8/10 |
| | → Feedback chi tiết | VD: `Phương pháp nghiên cứu tốt, cần bổ sung thêm so sánh với baseline...` |

> [!NOTE]
> AI score là **điểm gợi ý** (component score), KHÔNG phải điểm cuối cùng. Giảng viên sẽ quyết định điểm thực.

---

### Bước 6.3: Giảng viên chấm điểm thực tế

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | Trên cùng trang **Chấm Điểm (AI)** | |
| 2 | Xem điểm AI gợi ý → So sánh với đánh giá cá nhân | |
| 3 | Nhập **Điểm giảng viên** cho từng tiêu chí | |
| | → Nội dung nghiên cứu | `8.0` |
| | → Kỹ thuật & công nghệ | `7.5` |
| | → Trình bày & báo cáo | `8.5` |
| | → Sáng tạo & đóng góp | `7.0` |
| 4 | Nhập **Nhận xét cuối cùng** | VD: `Đồ án có chất lượng tốt, phương pháp đúng hướng. Cần cải thiện phần đánh giá so sánh với các phương pháp khác.` |
| 5 | Xem **Điểm tổng kết** được tính tự động | Dựa trên trọng số Rubrics: `(8.0×30% + 7.5×30% + 8.5×20% + 7.0×20%) = 7.75` |

---

### Bước 6.4: Chốt điểm & Lưu Blockchain

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | Nhấn **"Chốt Điểm & Lưu Blockchain"** | |
| 2 | **MetaMask popup xuất hiện** | Xác nhận giao dịch ghi điểm lên Blockchain |
| 3 | Nhấn **"Confirm"** trên MetaMask | Chờ transaction confirm (khoảng 15-30 giây trên Sepolia) |
| ✅ | **Kết quả mong đợi** | |
| | → Điểm cuối cùng được lưu vào DB | DiemSo record tạo thành công |
| | → Transaction hash hiển thị | VD: `0xabc123...` (link tới Sepolia Etherscan) |
| | → Điểm **không thể sửa** sau khi đã ghi blockchain | Đảm bảo tính bất biến |

---

### Bước 6.5: Xem kết quả tổng hợp

#### Từ phía Giảng viên:

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | Menu trái → **"So Sánh AI vs GV"** | Đường dẫn: `/lecturer/comparison` |
| ✅ | **Kết quả mong đợi** | Biểu đồ so sánh điểm AI vs Điểm GV cho Nhóm Alpha. Hiển thị TxHash blockchain. |

#### Từ phía Sinh viên:

| # | Hành động | Chi tiết |
|---|---|---|
| 1 | **Đăng xuất** GV → **Đăng nhập** **Phong Le** | |
| 2 | Menu trái → **"Kết Quả & Điểm"** | Đường dẫn: `/student/progress` |
| ✅ | **Kết quả mong đợi** | Hiển thị: Điểm cuối cùng, Feedback AI + GV, điểm tiến độ từng tuần, TxHash blockchain chứng minh điểm đã bảo vệ. |

---

## ✅ CHECKLIST TỔNG KẾT

| Giai đoạn | Checklist | Trạng thái |
|---|---|---|
| **GĐ 1** | GV đăng nhập thành công | ⬜ |
| **GĐ 1** | Rubrics tạo thành công (tổng 100%) | ⬜ |
| **GĐ 1** | Đề tài mới tạo với `CoBaiTest = true` | ⬜ |
| **GĐ 1** | Bài test 5 câu được gắn vào đề tài | ⬜ |
| **GĐ 2** | Nhóm Alpha tạo + chốt (Phong Le + Diễm My) | ⬜ |
| **GĐ 2** | Nhóm Beta tạo + chốt (Trần Minh Anh + Nguyễn Thanh Tuấn) | ⬜ |
| **GĐ 3** | Cả 2 nhóm đăng ký cùng 1 đề tài → trạng thái "Chờ Test" | ⬜ |
| **GĐ 4** | Nhóm 1 làm bài test → 5/5 (100%) | ⬜ |
| **GĐ 4** | Nhóm 2 làm bài test → 3/5 (60%) | ⬜ |
| **GĐ 4** | Nhóm 1 thắng → "Đã Duyệt", Nhóm 2 thua → "Bị Từ Chối" | ⬜ |
| **GĐ 5** | SV nộp tiến độ Tuần 1 thành công | ⬜ |
| **GĐ 5** | GV chấm tiến độ Tuần 1 = 8/10 | ⬜ |
| **GĐ 5** | SV xem được nhận xét + điểm Tuần 1 | ⬜ |
| **GĐ 5** | SV nộp tiến độ Tuần 2 thành công | ⬜ |
| **GĐ 5** | GV chấm tiến độ Tuần 2 = 9/10 | ⬜ |
| **GĐ 6** | SV nộp báo cáo PDF + lưu hash lên Blockchain | ⬜ |
| **GĐ 6** | AI chấm điểm gợi ý theo Rubrics | ⬜ |
| **GĐ 6** | GV chấm điểm thực tế theo Rubrics | ⬜ |
| **GĐ 6** | Chốt điểm + ghi Blockchain → TxHash hiển thị | ⬜ |
| **GĐ 6** | So sánh AI vs GV hiển thị đúng | ⬜ |
| **GĐ 6** | SV xem kết quả + TxHash trên trang Kết Quả & Điểm | ⬜ |

---

> [!TIP]
> **Mẹo test nhanh:** Bạn có thể mở 2 trình duyệt khác nhau (VD: Chrome + Edge) để đăng nhập 2 tài khoản cùng lúc, tránh phải đăng xuất/đăng nhập liên tục.
