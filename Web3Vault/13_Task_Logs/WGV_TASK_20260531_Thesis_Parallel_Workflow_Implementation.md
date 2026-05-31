# Tri Thức Phát Triển Luồng Nghiệp Vụ Khóa Luận Song Song Với Luồng Môn Học

## 1. Vấn Đề Ban Đầu & Yêu Cầu Nghiệp Vụ
Hệ thống ban đầu hoạt động theo mô hình **Lớp Học → Môn Học → Giảng Viên**. Đề tài bắt buộc thuộc về lớp cụ thể, và chỉ sinh viên thuộc lớp đó mới có thể xem và đăng ký. 

Để đáp ứng nhu cầu thực tế của quá trình giao đề tài tốt nghiệp, hệ thống cần bổ sung luồng **Khóa Luận** song song với đặc tính:
1. **Không thuộc môn hay lớp học**: Đề tài không bị ràng buộc bởi bất kỳ lớp học hay môn học nào.
2. **Hiển thị toàn cục**: Tất cả sinh viên (không phân biệt GPA/kỹ năng) đều có thể xem toàn bộ danh sách đề tài khóa luận của mọi giảng viên.
3. **Đăng ký nhiều, giữ 1**: Sinh viên có thể tạo nhiều nhóm khóa luận để đăng ký cạnh tranh ở nhiều đề tài khóa luận khác nhau cùng lúc. Tuy nhiên, họ chỉ giữ duy nhất khóa luận mà nhóm trưởng của họ hoàn thành bài test nhanh nhất và được phê duyệt (`DaDuyet`).
4. **Không làm ảnh hưởng đến luồng môn học cũ**.

---

## 2. Thiết Kế Giải Pháp & Thay Đổi Kiến Trúc

### A. Backend — Mở Rộng Schema & Logic Đăng Ký
* **Schema [DeTai.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/models/DeTai.js)**: Bổ sung trường `LoaiDeTai` (`type: String`, enum: `['MonHoc', 'KhoaLuan']`, default: `'MonHoc'`). Nhờ giá trị mặc định là `'MonHoc'` và sử dụng truy vấn `{ LoaiDeTai: { $ne: 'KhoaLuan' } }`, hệ thống đảm bảo tương thích ngược 100% với dữ liệu cũ.
* **Controller [deTaiController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/deTaiController.js)**:
  * `getAll`: Hỗ trợ tham số `loaiDeTai=KhoaLuan` để trả về tất cả đề tài khóa luận toàn cục, không lọc theo lớp.
  * `create`: Nếu là đề tài khóa luận, tự động gán `MonHoc = null` và `LopHoc = []`.
  * `getMyRegistration`: Ưu tiên trả về đăng ký đã được duyệt (`DaDuyet`) trong số các đăng ký khóa luận đang hoạt động của sinh viên.
  * `registerTopic`: Nếu là đề tài khóa luận, cho phép đăng ký nhiều đề tài khác nhau để cạnh tranh, và chỉ chặn nếu thành viên trong nhóm đã sở hữu một đề tài khóa luận `DaDuyet` khác.
  * `getRegistrationsByLecturer`: Cho phép lọc danh sách đăng ký đề tài của giảng viên theo context khóa luận hoặc môn học cụ thể.
* **Controller [nhomController.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/controllers/nhomController.js)**:
  * `createNhom`: Cho phép tạo nhóm không gắn lớp (`LopHoc = null`) cho khóa luận. Chặn tạo nhóm mới nếu sinh viên đã sở hữu đề tài khóa luận đã duyệt.
  * `getNhomBySinhVien`: Lấy nhóm khóa luận hoạt động (`LopHoc = null`).
  * `inviteMember`: Trong chế độ khóa luận, bỏ qua kiểm tra cùng lớp học, cho phép mời sinh viên bất kỳ, chỉ chặn nếu sinh viên được mời đã sở hữu một đề tài khóa luận khác.

### B. Frontend — Context & Giao Diện Hướng Đối Tượng
* **Class Selector & Context ([ClassSelector.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/common/ClassSelector.js))**:
  * Tích hợp thêm tùy chọn **"Khóa luận tốt nghiệp"** (giá trị `'KHOA_LUAN'`) được ghim cố định ở vị trí gần trên cùng trong dropdown (dưới "Tất cả các lớp" nếu là giảng viên) để phân cách rõ ràng.
  * **Chữ thường tiêu chuẩn (Sentence Case)**: Sử dụng nhãn hiển thị `"Khóa luận tốt nghiệp"` viết thường trang nhã thay vì in hoa toàn bộ, mang lại giao diện tinh tế, thân thiện.
  * **Giữ nguyên giao diện Header đồng bộ**: Khi đã chọn, Select box ở header hiển thị hoàn toàn đồng bộ với các lớp học khác: có icon cuốn sách xanh dương (`BookOpen`) đi kèm, viền nét liền mặc định của Antd và **hoàn toàn KHÔNG hiển thị viền nét đứt ở trên và dưới**.
  * **Phân cách trực quan trong Dropdown**: Chỉ khi bấm sổ danh sách dropdown xuống, tùy chọn "Khóa luận tốt nghiệp" mới có hai đường nét đứt đối xứng trên và dưới (`border-top` & `border-bottom: 1.5px dashed #d9d9d9`) để phân tách rõ ràng, sang trọng với các lớp học thông thường khác.
  * `ClassContext.js` và `LecturerClassContext.js` được nâng cấp để nhận diện `'KHOA_LUAN'`, tự động gán `selectedClass` thành `null` (để tránh lọc lớp) và xuất ra thuộc tính logic `isKhoaLuanMode = true`.
* **Màn Hình Đăng Ký Đề Tài ([TopicRegistration.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/student/TopicRegistration.js))**:
  * Khi chọn chế độ Khóa Luận, hệ thống gọi API `getMyRegistrations` để lấy toàn bộ danh sách đăng ký khóa luận đang cạnh tranh.
  * Hiển thị một **Bảng danh sách đề tài đang cạnh tranh** vô cùng trực quan và cao cấp, hiển thị rõ trạng thái của từng đề tài và cung cấp các nút trực tiếp như "Làm bài test" hoặc "Hủy đăng ký" cho từng đề tài cụ thể.
  * Ẩn các cột thông tin Lớp/Môn học của đề tài và thay thế bằng tag **"📝 Khóa Luận"** vàng lấp lánh cực kỳ cao cấp.
* **Màn Hình Quản Lý Đề Tài Của Giảng Viên ([TopicManagement.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/lecturer/TopicManagement.js))**:
  * Khi giảng viên chuyển sang context Khóa Luận, danh sách chỉ hiển thị các đề tài khóa luận do chính giảng viên đó hướng dẫn.
  * Trong bảng hiển thị đề tài, cột **Lớp** đối với đề tài Khóa Luận sẽ được để trống dưới dạng dấu gạch ngang `—` (tương tự cột Môn học) giúp bảng hiển thị gọn gàng, trang nhã và đồng bộ.
  * Khi tạo đề tài mới, hệ thống tự động ẩn trường "Lớp học áp dụng" và lưu trữ đề tài dưới dạng `LoaiDeTai: 'KhoaLuan'`.
* **Giao Diện Phê Duyệt ([SubmissionReview.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/frontend/src/components/lecturer/SubmissionReview.js))**:
  * Tự động lọc và hiển thị danh sách nộp bài / chấm điểm của sinh viên khớp với context Khóa Luận đã chọn.

---

## 3. Khu Vực & File Ảnh Hưởng
1. **Schema**: `backend/models/DeTai.js`
2. **Backend Controllers**: `backend/controllers/deTaiController.js`, `backend/controllers/nhomController.js`
3. **Frontend Contexts**: `frontend/src/contexts/ClassContext.js`, `frontend/src/contexts/LecturerClassContext.js`
4. **Frontend Services**: `frontend/src/services/aiService.js`, `frontend/src/services/nhomService.js`
5. **Frontend Common**: `frontend/src/components/common/ClassSelector.js`
6. **Frontend Pages**: 
   * `frontend/src/components/student/TopicRegistration.js`
   * `frontend/src/components/lecturer/TopicManagement.js`
   * `frontend/src/components/lecturer/SubmissionReview.js`

---

## 4. Bài Học Rút Ra & Lưu Ý Vận Hành
1. **Khử Trùng Lặp Tri Thức & Tương Thích Ngược**: Việc sử dụng `{ LoaiDeTai: { $ne: 'KhoaLuan' } }` thay vì gán cứng `{ LoaiDeTai: 'MonHoc' }` là kỹ thuật thiết yếu giúp các bản ghi đề tài cũ trong database không bị ẩn đi sau khi mở rộng schema.
2. **Tối Ưu Trải Nghiệm Người Dùng (UX)**: Đối với luồng phức tạp như cạnh tranh nhiều đề tài cùng lúc, việc gom nhóm danh sách đăng ký và hiển thị một widget theo dõi tập trung giúp sinh viên không bị bối rối và làm chủ hoàn toàn tiến trình học tập của mình.
3. **Độc Lập Nghiệp Vụ**: Việc tái sử dụng schema `DangKyDeTai` và `Nhom` mà không sửa đổi cấu trúc dữ liệu, chỉ thay đổi luồng xử lý ở Controller và Filter giúp giảm thiểu rủi ro phát sinh lỗi liên đới đến các mô-đun chấm điểm, tiến độ hay tương tác Blockchain đã hoạt động ổn định.

---

## 5. Dữ Liệu Kiểm Thử (Seeding Lớp 13DHTH04)
Để phục vụ quá trình kiểm thử các tính năng phân quyền, lọc lớp và cạnh tranh đề tài môn học song song với luồng khóa luận, hệ thống đã được nạp dữ liệu mẫu cho lớp **13DHTH04** qua script [seed_topic_13dhth04.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/scripts/seed_topic_13dhth04.js):
* **Đề tài 1 (`DT_13DHTH04_01`)**: Xây dựng dApp bỏ phiếu phi tập trung cho Hội đồng sinh viên (yêu cầu Solidity, Cryptography, React). Có kích hoạt bài test đầu vào.
* **Đề tài 2 (`DT_13DHTH04_02`)**: Hệ thống cấp NFT chứng chỉ số tự động hóa bằng AI (yêu cầu React, FastAPI, Hardhat). Có kích hoạt bài test đầu vào.
* **Mối liên kết**: Cả hai đề tài đều thuộc về lớp `13DHTH04`, kế thừa giảng viên và môn học tương ứng từ cấu trúc lớp học trong database.

---

## 6. Dữ Liệu Kiểm Thử Khóa Luận (Giảng Viên Phong)
Để phục vụ quá trình kiểm thử các tính năng của luồng Khóa Luận như hiển thị toàn cục, cạnh tranh đề tài khóa luận và ghim chọn ClassSelector, hệ thống đã được nạp đề tài khóa luận mẫu cho cả hai giảng viên có tên "Phong" qua script [seed_khoaluan_phong.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/scripts/seed_khoaluan_phong.js) và [seed_khoaluan_wallet.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/scripts/seed_khoaluan_wallet.js):
* **Đề tài khóa luận 1 (Giáo Sư Phong - `DT_KL_GSPHONG_01`)**: *Nghiên cứu kiến trúc Blockchain Sharding và tối ưu TPS trong thanh toán Web3 toàn cầu* (yêu cầu Solidity, Go, Blockchain architecture, Performance testing).
* **Đề tài khóa luận 2 (PGS.TS Phong - `DT_KL_PGSPHONG_01`)**: *Ứng dụng AI và Smart Contract trong tự động hóa cấp NFT chứng nhận nghiên cứu khoa học* (yêu cầu React, FastAPI, Solidity, Web3.js).
* **Đề tài khóa luận 3 (PGS.TS Phong qua ví MetaMask - `DT_KL_WALLET_01`)**: *Nghiên cứu giải pháp an toàn bảo mật và quản lý định danh số trên nền tảng Blockchain & AI* (yêu cầu Solidity, React, FastAPI, Cryptography, DID Architecture). Được gán tự động thông qua địa chỉ ví `0xf56ca4437a2c3ae3a594ff8a2dd9aed8ec3f1289` của giảng viên.
* **Bài Test Tuyển Chọn & Rubrics Chấm Điểm**: Đã cấu trúc và nạp tự động thông qua tập lệnh [seed_khoaluan_tests_rubrics.js](file:///d:/HocTap/KLKS_Web3/Web3GiangVien/backend/scripts/seed_khoaluan_tests_rubrics.js):
  * **Rubrics (100% Trọng số)**: Mỗi đề tài được cấu hình hệ thống tiêu chí chấm điểm chuyên biệt (ví dụ: mô hình AI, Smart Contract, hiệu năng TPS, định danh DID) phục vụ trực tiếp cho chấm điểm đa thành phần và AI matching.
  * **Bài Test Tuyển Chọn (BaiTest)**: Mỗi đề tài có 3 câu hỏi trắc nghiệm chuyên sâu (thời gian làm 15 phút, ngưỡng đạt 70%) nhằm đánh giá năng lực của nhóm sinh viên đăng ký cạnh tranh.
* **Đặc tính**: Cả ba đề tài đều có `LoaiDeTai = 'KhoaLuan'`, `MonHoc = null`, `LopHoc = []`. Có kích hoạt bài test đầu vào (`CoBaiTest = true`) và Rubrics chấm điểm (`SuDungRubrics = true`) giúp dễ dàng kiểm thử toàn bộ luồng đăng ký cạnh tranh, thi cử và chấm điểm của Khóa Luận.




