# Bộ Dữ Liệu Test SBERT (Ground Truth)

Dưới đây là bảng 20 mẫu dữ liệu (10 mẫu khớp, 10 mẫu lệch) được xây dựng dựa trên bảng điểm thực tế các môn học chuyên ngành CNTT của bạn và các kỹ năng IT phổ biến. 

Bạn có thể dùng bảng này để gửi request qua Postman, sau đó so sánh `match_score` của AI với `Nhãn Thực Tế` để tính ra 4 chỉ số: **TP, TN, FP, FN**.

## Bảng Dữ Liệu Test (20 ca kiểm thử)

| STT | Sinh Viên (Kỹ năng & Điểm môn học) | Đề Tài (Yêu cầu kỹ năng / Stack) | Nhãn Thực Tế | Giải thích (Dành cho Giảng viên) |
|:---:|---|---|:---:|---|
| **1** | GPA: 8.7<br>Kỹ năng: React, NodeJS, Lập trình Web (8.8), Hệ CSDL (10.0) | **Xây dựng hệ thống quản lý học tập trực tuyến**<br>Yêu cầu: React, NodeJS, Database | **1** | Khớp hoàn toàn (Web Development) |
| **2** | GPA: 8.6<br>Kỹ năng: Trí tuệ nhân tạo (9.2), Python, Deep learning (8.8) | **Nhận diện khuôn mặt sinh viên điểm danh**<br>Yêu cầu: AI, Python, Deep Learning | **1** | Khớp hoàn toàn (AI / Computer Vision) |
| **3** | GPA: 8.2<br>Kỹ năng: Lập trình di động (8.2), Java, Android, Firebase | **Ứng dụng di động quản lý chi tiêu cá nhân**<br>Yêu cầu: Android, Java, Mobile App | **1** | Khớp hoàn toàn (Mobile Development) |
| **4** | GPA: 8.9<br>Kỹ năng: Thiết kế web (9.5), Hệ cơ sở dữ liệu (10.0), PHP, MySQL | **Website bán linh kiện điện tử**<br>Yêu cầu: PHP, MySQL, Web | **1** | Khớp (Web thuần PHP/MySQL) |
| **5** | GPA: 8.6<br>Kỹ năng: Công nghệ .NET (8.1), C#, SQL Server, Phân tích thiết kế (10.0) | **Phần mềm quản lý nhân sự cho doanh nghiệp**<br>Yêu cầu: C#, .NET, SQL Server | **1** | Khớp (Enterprise Software .NET) |
| **6** | GPA: 9.0<br>Kỹ năng: Nhập môn Big Data (9.0), Khai phá dữ liệu (9.7), Python | **Phân tích dữ liệu và dự đoán xu hướng mạng xã hội**<br>Yêu cầu: Big Data, Data Mining, Python | **1** | Khớp (Data Science / Big Data) |
| **7** | GPA: 8.8<br>Kỹ năng: Bảo mật máy tính (9.5), An toàn mạng máy tính (8.0), Linux | **Giải pháp đánh giá và bảo mật an toàn thông tin**<br>Yêu cầu: Security, Network, Bảo mật | **1** | Khớp (Cyber Security) |
| **8** | GPA: 9.1<br>Kỹ năng: Internet of Things (9.5), C++, Arduino, Điện toán đám mây (10.0) | **Hệ thống giám sát nhà kính thông minh**<br>Yêu cầu: IoT, C++, Arduino | **1** | Khớp (Internet of Things) |
| **9** | GPA: 8.4<br>Kỹ năng: Lập trình mã nguồn mở (8.6), Linux, Docker, DevOps | **Triển khai hệ thống microservices tự động**<br>Yêu cầu: Linux, Docker, Open Source | **1** | Khớp (DevOps / System) |
| **10** | GPA: 8.7<br>Kỹ năng: Blockchain, Solidity, Web3, Phân tích thiết kế hệ thống (10.0) | **Ứng dụng dApp đấu giá tài sản phi tập trung**<br>Yêu cầu: Blockchain, Solidity, Web3 | **1** | Khớp (Blockchain / Web3) |
| **11** | GPA: 8.5<br>Kỹ năng: Thiết kế web (9.5), HTML, CSS, JavaScript | **Mô hình AI dự đoán giá cổ phiếu**<br>Yêu cầu: Python, Deep Learning, AI | **0** | Lệch hoàn toàn (Web Frontend vs AI) |
| **12** | GPA: 8.9<br>Kỹ năng: Trí tuệ nhân tạo (9.2), Deep learning (8.8), Python | **Ứng dụng di động đọc sách cho iOS**<br>Yêu cầu: Swift, iOS, Mobile | **0** | Lệch hoàn toàn (AI vs iOS Mobile) |
| **13** | GPA: 8.2<br>Kỹ năng: Công nghệ .NET (8.1), C#, Lập trình hướng đối tượng (9.5) | **Hệ thống phân tích hành vi khách hàng Big Data**<br>Yêu cầu: Hadoop, Spark, Big Data | **0** | Lệch hoàn toàn (.NET App vs Big Data) |
| **14** | GPA: 8.7<br>Kỹ năng: Lập trình di động (8.2), Flutter, Dart | **Viết Hợp đồng thông minh Ethereum cho sàn DEX**<br>Yêu cầu: Solidity, Web3, Smart Contract | **0** | Lệch hoàn toàn (Mobile vs Blockchain) |
| **15** | GPA: 9.0<br>Kỹ năng: Mạng máy tính (8.3), Quản trị hệ thống mạng (9.0), Cisco | **Website thương mại điện tử bán mỹ phẩm**<br>Yêu cầu: React, NodeJS, MongoDB | **0** | Lệch hoàn toàn (Network vs Web Fullstack) |
| **16** | GPA: 8.6<br>Kỹ năng: Internet of Things (9.5), Arduino, Mạch điện | **Phần mềm kế toán doanh nghiệp**<br>Yêu cầu: C#, SQL Server, WinForms | **0** | Lệch hoàn toàn (IoT Hardware vs Desktop App) |
| **17** | GPA: 8.4<br>Kỹ năng: Blockchain, Smart Contract, Ethereum | **Hệ thống nhận diện biển số xe tự động**<br>Yêu cầu: OpenCV, Python, Machine Learning | **0** | Lệch hoàn toàn (Blockchain vs Computer Vision) |
| **18** | GPA: 9.1<br>Kỹ năng: Nhập môn Big Data (9.0), Khai phá dữ liệu (9.7), R | **Game 2D nhập vai phiêu lưu**<br>Yêu cầu: Unity, C#, Game Design | **0** | Lệch hoàn toàn (Data Science vs Game Dev) |
| **19** | GPA: 8.8<br>Kỹ năng: Bảo mật máy tính (9.5), An toàn mạng máy tính (8.0), Penetration Testing | **Ứng dụng đặt đồ ăn giao tận nơi**<br>Yêu cầu: React Native, Firebase, Google Maps API | **0** | Lệch hoàn toàn (Security vs Mobile App) |
| **20** | GPA: 8.5<br>Kỹ năng: Lập trình mã nguồn mở (8.6), PHP, Laravel | **Hệ thống nhúng điều khiển robot công nghiệp**<br>Yêu cầu: C, Embedded Systems, IoT | **0** | Lệch hoàn toàn (Web Backend vs Embedded/IoT) |

---

## Hướng Dẫn Tính Toán Thực Tế

Sau khi gọi API `/match-student` cho 20 ca trên, bạn lập thêm 1 cột `Kết Quả AI`. 
- Đặt ngưỡng (Threshold): Ví dụ `match_score >= 6.5` là Phù hợp (`1`), nhỏ hơn là Không Phù Hợp (`0`).

Sau đó đếm:
- **TP (True Positive):** Cột Nhãn = 1, Kết quả AI = 1
- **TN (True Negative):** Cột Nhãn = 0, Kết quả AI = 0
- **FP (False Positive):** Cột Nhãn = 0, Kết quả AI = 1
- **FN (False Negative):** Cột Nhãn = 1, Kết quả AI = 0

**Công thức đưa vào báo cáo:**
- `Accuracy = (TP + TN) / 20`
- `Precision = TP / (TP + FP)`
- `Recall = TP / (TP + FN)`
- `F1-Score = 2 * (Precision * Recall) / (Precision + Recall)`
