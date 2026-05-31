# Hướng dẫn Tích hợp AI và Cơ chế Hoạt động Web3 trong Hệ Thống

Dưới đây là tổng hợp giải thích chi tiết về các thắc mắc của bạn liên quan đến AI (SBERT, PhoBERT), quản lý đề tài bằng Database vs Smart Contract, và Hardhat.

---

## 1. Tích hợp AI SBERT và PhoBERT

### AI được tải về và sử dụng như thế nào?
- **Cách hoạt động:** Cả hai mô hình **SBERT** (`paraphrase-multilingual-MiniLM-L12-v2`) và **PhoBERT** (`vinai/phobert-base`) đều được tải về và chạy **Local Inference** thông qua thư viện `transformers` và `sentence_transformers` của Hugging Face bằng nền tảng Python. Chúng **không dùng API bên thứ 3** (như OpenAI hay Claude) giúp đảm bảo dữ liệu không bị lộ ra ngoài. 
- **Lệnh tải AI & Cài Đặt:** Bạn chỉ cần chạy lệnh `pip install -r requirements.txt` trong thư mục `ml-service` để Python cài các nền tảng trí tuệ nhân tạo (Torch, Transformers). Lần đầu tiên khi bạn chạy lệnh khởi động server API (`uvicorn app:app --host 0.0.0.0 --port 8001`), hệ thống sẽ **tự động ngầm tải** qua Internet 2 files weights (thuật toán) của SBERT và PhoBERT lưu vào thư mục đệm (cache) ổ cứng của máy. Những lần chạy sau AI sẽ khởi động dùng trực tiếp từ ổ cứng mà không cần tải thêm.
- **Tiến trình chạy để chấm điểm / gợi ý:** AI được đóng gói riêng biệt thành một service bằng framework **FastAPI** (nằm ở thư mục `ml-service`). Hệ thống chính (Node.js backend) sẽ gọi HTTP API nội bộ đến FastAPI (chạy cổng 8001) để lấy kết quả. 

### Mã nguồn xử lý nằm ở đâu?
- **SBERT (Sinh viên đăng ký đề tài theo năng lực):** Nằm tại file `ml-service/models/sbert_matcher.py`
- **PhoBERT (Chấm điểm báo cáo nội dung thực tế):** Nằm tại file `ml-service/models/phobert_analyzer.py`

---

## 2. Đầu vào - Đầu ra & Logic phân tích của các AI

Hai model AI trong hệ thống có vai trò tách biệt ở hai đầu của dự án, nhận Input và trả Output cụ thể như sau:

### 2.1 SBERT (Chấm điểm mức độ phù hợp - Gợi ý đề tài)
*Vai trò: Phân tích kỹ năng của sinh viên xem có phù hợp với những đề tài hiện tại không.*
- **Đầu vào (Nhận vô):**
  - Thông tin điểm học lực của sinh viên, ví dụ `GPA = 3.2` và điểm số các chuyên ngành `{"nlp": 8.0, "web3": 5.0}`.
  - Danh sách các đề tài hiện có, trên mỗi đề tài có chứa một mảng các Yêu Cầu Kỹ Năng (Requirements), ví dụ `["NLP", "Transformers"]`.
- **Logic xử lý:**
  - AI sẽ lọc ra các môn sinh viên học có điểm số **>= 7.0** và coi cụm từ đó là cốt lõi "Thế mạnh của sinh viên" (ví dụ: lấy chữ NLP).
  - Nó biến câu "Thế mạnh của sinh viên: NLP" và "Yêu cầu kỹ năng đối với đề tài: NLP, Transformers" thành Vector ẩn và so sánh chúng với nhau bằng đo lường khoảng cách Vector (Cosine Similarity).
  - Ra một điểm số Match Score gộp vào công thức: `60% là điểm tương đồng NLP` + `40% là tỷ trọng năng lực điểm thực tế GPA / 10 + 0.4`.
- **Đầu ra (Trả về):** 
  - Một danh sách các Topic ID, kèm theo điểm số phù hợp đã tính từ công thức trên `match_score` (từ 0.0 đến 1.0) và được AI tự động xếp hạng từ hợp nhất xuống ít hợp nhất. Frontend nhận điểm này nhân hệ số 10 (ví dụ sinh viên đạt `8.5/10` điểm phù hợp).

### 2.2 PhoBERT (Chấm điểm bài làm - Đánh giá nội dung file PDF)
*Vai trò: Giảng viên nhấn nút gọi AI đi đọc text của File PDF sinh viên nộp lên để phân tích văn chương và hàm lượng học thuật.*
- **Đầu vào (Nhận vô):**
  - `text`: Là đoạn văn bản rất dài và thô đã được server trích xuất (convert từ PDF sang String) nội dung báo cáo thật của sinh viên nộp.
  - `topic_requirements`: Mảng các từ khoá cấu thành yêu cầu bắt buộc của đề tài này.
- **Logic xử lý:**
  - Tính toán số lượng các từ khoá và khái niệm sinh viên vô tình/cố ý đề cập vào file báo cáo.
  - Sau đó đo độ nhúng (Embeds) từng "chi tiết sinh viên viết" và "Đoạn mô tả yêu cầu đề tài", nếu nhận diện có **độ khớp ngưỡng (Threshold > 0.45)** thì AI đếm sinh viên được tăng thêm **+1 Điểm Ngữ Nghĩa (Sematic Hit)** - Tránh trường hợp sinh viên copy văn bản chống đối.
- **Đầu ra (Trả về):**
  - `score`: Điểm số học thuật do PhoBERT chạy thuật gán trên thang 10 (VD: 8.5).
  - `feedback`: Lời bình luận có ý nghĩa, ví dụ "Nội dung đạt yêu cầu" hay "Cần cải thiện: Nội dung báo cáo quá ngắn".

## 3. Chi tiết các Ràng buộc, Điều kiện và Công thức AI

Dưới đây là tổng hợp chi tiết toàn bộ các ngưỡng, điều kiện, công thức toán học mà 2 mô hình AI đang sử dụng để chấm điểm và đánh giá, cùng với **lý do thiết lập (hợp lý hóa cơ sở lý thuyết)** đối với từng hằng số ràng buộc.

### 3.1 Ràng buộc và Công thức của AI PhoBERT (Chấm Báo Cáo)

**A. Điều kiện về Điểm Cơ Sở (Base Score)**
- **Công thức:** `Base Score = Min(8.0, 4.0 + (Chiều_dài_văn_bản_ký_tự / 800.0))`
- **Giải thích:** Học sinh nộp bài vào sẽ có điểm mặc định tối thiểu là 4.0 (cho công sức nộp bài). Nếu bài viết dài, điểm cơ sở sẽ tự tăng tịnh tiến theo tỷ lệ `chiều dài / 800`, nhưng bị chặn trần tối đa ở mức `8.0`.
- **Lý do (Rationale):** Khuyến khích sinh viên viết tài liệu đầy đủ, có đầu tư về mặt nội dung thay vì nộp giấy trắng hoặc vài dòng chữ chống đối. Giới hạn `8.0` trần nhằm đảm bảo điểm xuất sắc (8.0 -> 10.0) bắt buộc phải dựa vào chất lượng học thuật (độ khớp yêu cầu chuyên môn) chứ không chỉ dựa vào mánh khoé "viết càng dài điểm càng cao".

**B. Ngưỡng khớp ngữ nghĩa chuyên môn (Semantic Matching Threshold)**
- **Điều kiện:** `Cosine_Similarity(Đoạn_văn_báo_cáo, Yêu_cầu_đề_tài) > 0.45`
- **Giải thích:** AI PhoBERT tính toán khoảng cách vector (Cosine Similarity) giữa bài làm của sinh viên và từng yêu cầu/kỹ năng của đề tài. Nếu độ lớn lớn hơn `0.45`, AI ghi nhận đây là `1 Semantic Hit` (Đạt một yêu cầu chuyên môn trúng đích).
- **Lý do (Rationale):** Ngưỡng `0.45` là mức tiêu chuẩn thực nghiệm của các mô hình ngôn ngữ (như PhoBERT) để xác nhận 2 văn bản "có nhắc đến cùng một khái niệm cốt lõi, dù diễn đạt khác nhau". Tránh trường hợp hệ thống AI cứng nhắc chấm rớt sinh viên chỉ vì dùng các từ đồng nghĩa, hoặc diễn giải thuật ngữ theo cách của sinh viên.

**C. Công thức tính Điểm Tổng Phân Tích (Final Score)**
- **Công thức Điểm thưởng (Bonus):** `Bonus = 2.0 * Min(1.0, (Số_yêu_cầu_đạt_ngưỡng / Tổng_yêu_cầu_đề_ra))`
- **Công thức Điểm Tổng:** `Final Score = Round(Min(10.0, Base_Score + Bonus), 2)`
- **Giải thích:** Điểm thưởng tối đa là +2.0 (Để cộng với hệ số 8.0 base thành điểm tuyệt đối 10). Điểm thưởng này tỷ lệ thuận với số lượng kỹ năng mà sinh viên đã chứng minh được trong báo cáo so với tổng số kỹ năng Giảng viên yêu cầu lúc ra đề.
- **Lý do (Rationale):** Tạo ra thang điểm minh bạch có cơ sở. Sinh viên càng đáp ứng đủ các gạch đầu dòng kỹ năng giảng viên đề ra thì càng được điểm tuyệt đối. Thiết kế này giúp đánh giá đúng trọng tâm của đề cương đồ án.

**D. Ràng buộc các Lỗi (Issues) & Feedback Phạt**
- **Điều kiện 1 (Quá ngắn):** Nếu `Chiều_dài_văn_bản < 300` -> AI tự động sinh Issue: *"Nội dung báo cáo quá ngắn, cần bổ sung thêm chi tiết kỹ thuật."*
  - *Lý do:* Một báo cáo đồ án bậc Đại học không thể trình bày dưới 300 ký tự. Ngưỡng cứng này giúp loại bỏ ngay các document rác, tài liệu nộp cho có.
- **Điều kiện 2 (Quá lạc đề):** Nếu `Total Hits == 0` (tức là không khớp bất kỳ một yêu cầu nào của giảng viên) -> AI tự động sinh Issue: *"Báo cáo thiếu các kiến thức chuyên môn cốt lõi của đề tài."*
  - *Lý do:* Phát hiện sinh viên có thể đã làm sai đề tài, copy bài cũ nộp lại, hoặc tài liệu báo cáo lạc đề hoàn toàn không ăn nhập gì với kỹ năng mà giảng viên thiết lập ban đầu.

---

### 3.2 Ràng buộc và Công thức của AI SBERT (Gợi Ý Đề Tài)

**A. Điều kiện lọc Thế Mạnh Năng Lực (Skill Extraction)**
- **Điều kiện:** Xếp hạng môn học có điểm thực tế `GPA_môn_học >= 7.0`
- **Giải thích:** Từ bảng điểm của sinh viên cung cấp (ví dụ Web3: 8.0, Toán: 5.0), AI SBERT chỉ bóc tách các môn có điểm trên 7.0 để xem đó là chuyên môn, ráp thành chuỗi "Thế mạnh của sinh viên: ...".
- **Lý do (Rationale):** Loại bỏ nhiễu dữ liệu. Điểm dưới 7.0 chứng tỏ sinh viên yếu kỹ năng đó, nếu AI mang cả những môn học điểm kém đi nhúng không gian tìm đề tài thì sẽ gợi ý rủi ro sai chuyên môn, khiến sinh viên hoang mang rồi rớt đồ án.

**B. Giai đoạn tính Điểm Cơ Sở Học Lực (Base GPA Score)**
- **Công thức:** `Base_GPA_Score = Min(1.0, 0.4 + (Tổng_điểm_GPA_hiện_tại / 10.0))`
- **Lý do (Rationale):** Đặc thù sinh viên có nền tảng học lực Cố Vấn (GPA cao) luôn có khả năng học hỏi đáp ứng đề tài khó nhỉnh hơn, do đó biến số toán học này tạo ra một "bias" (độ lệch châm chước) nhỏ giúp các bạn điểm cao nhận được Match Score tốt hơn một chút để kích thích đăng ký dù bộ kỹ năng chuyên môn tương đồng với các sinh viên khác.

**C. Công thức Độ Phù Hợp Tổng Thể (Final Match Score)**
- **Thành phần:** `Semantic_Score = Max(0.0, Cosine_Similarity(Vector_Thế_mạnh_SV, Vector_Yêu_cầu_đề_tài))`
- **Công thức:** `Match_Score = (Semantic_Score * 0.6) + (Base_GPA_Score * 0.4)`
- **Giải thích:** Tổng điểm phù hợp (100% hoặc 1.0) được quyết định bởi 60% năng lực độ khớp chuyên môn thực tế và 40% là học lực nền tảng tổng quan. (Có threshold ở frontend là `> 0.3` mới hiển thị tag Gợi Ý).
- **Lý do (Rationale):** Đem lại sự cân bằng giữa "Độ phù hợp chuyên môn" và "Năng lực học tập tiềm năng". Giữ trọng số lớn 60% cho SBERT (ngữ nghĩa NLP) để đảm bảo yếu tố Đề Tài khớp đúng chuyên ngành là ưu tiên tối cao số 1, còn 40% GPA đóng vai trò lực đẩy phụ trợ năng lực. Sự phân tách này là bắt buộc để tránh tình trạng sinh viên Giỏi (GPA 9.0) nhưng học sai trái ngành 100% lại vô lý được AI xếp hạng phù hợp cao hơn một bạn sinh viên (Khá GPA 7.5) nhưng đúng tệp chuyên ngành hẹp.

---

## 4. Quản lý Tracking trên MongoDB (Bảng DangKyDeTai)

### Làm sao tra cứu Sinh viên đăng ký Đề tài nào trong Database?
Khi xem qua công cụ quản lý **MongoDB Compass** (Như trong hình chụp thư mục `web3-giangvien` collection `dangkydetais`), bạn sẽ thấy kiến trúc Map nối thông tin được tổ chức minh bạch:

- Mỗi Object trong Collection đại diện cho **1 vé sinh viên đang đăng ký Đề tài**.
- Field `SinhVien`: Ở dạng tham chiếu ObjectId lưu chuỗi ID đại diện tài khoản học sinh (ví dụ `'69caa8b3a41aaa8486500789'`).
- Field `DeTai`: Cùng lúc chèn reference ObjectId mã của bảng các Đề Tài nội dung quy chuẩn (`'69cb5c216667583412c63e30'`).
- Field `TrangThai`: Theo dõi trạng thái duyêt. Chữ **`"DaDuyet"`** (Màu xanh) có nghĩa là giảng viên đã nhìn và ấn duyệt trong trang Quản Lý, nếu là `"ChoDuyet"` thì đang hiển thị chờ duyệt bên UI.
  
Nhờ cơ chế móc nối Reference 2 đầu này, từ Back-end API Nodejs chỉ cần gọi hàm `populate('SinhVien').populate('DeTai')` để có thể "kéo" râu lấy hết chữ (Tên sinh viên đó, tên Đề tài, Điểm GPA..) ráp lại gửi lên Frontend giao diện!.

---

## 5. Thêm Xoá Sửa Đề Tài Đăng Ký (Database vs. Web3)

### Sinh viên đăng nhập bằng ví Web3 vào DB có thể thêm, xoá, sửa đăng ký được không?
**Trạng thái đăng ký Đề tài ban đầu này chỉ áp dụng DB ngoài (MongoDB), KHÔNG LƯU NGAY trên Web3 qua ví để đảm bảo Sinh viên được phép linh hoạt Thêm, Xoá, Sửa lúc 'Chờ Duyệt'.**

- **Lý do hệ thống thiết kế tách bạch:** Việc một sinh viên đăng ký, suy nghĩ lại, rồi huỷ đăng ký đổi qua một môn học khác diễn ra cực kỳ thường xuyên lúc đăng ký tín chỉ đồ án. Nếu lưu những hành động đổi ý liên tục này trên mạng Blockchain (Smart Contract) sẽ cực kỳ tốn chi phí giao dịch (phí Gas Ethereum), kể cả ở mạng ảo Testnet cũng sẽ có độ delay dài.
- **Hoạt động thực tế trong Backend:**
  - Nhập qua ví -> Khi sinh viên nhấn **"Đăng ký đề tài"**, Node.js tạo record vào bảng `dangkydetais` với trạng thái **'ChoDuyet'**.
  - Sinh viên hoàn toàn có quyền nhấn nút **Huỷ đăng ký** (lúc đó backend `DELETE` xóa chính Record ObjectId đăng ký đó khỏi DB luôn). Tối đa code Nodejs ràng buộc 1 sinh viên chỉ được tạo 1 Record đăng ký môn ở 1 thời điểm.
  - Web3 chỉ can thiệp và yêu cầu ký ví **CHÍNH THỨC ở Bước Cuối** khi sinh viên nộp File Báo Cáo lên (mã IPFS) và Giảng viên Chốt Điểm Kì Tích. File report, Điểm nhận từ AI / Giảng viên lúc đó mới được xem là giá trị quyết định nên khóa cứng lưu vĩnh viễn trên Blockchain.

---

## 6. Logic của Smart Contract (`ThesisManagement.sol`)

File thông minh phục vụ **bước chốt dữ liệu cuối cùng** không thể giả mạo. File nằm ở `backend/contracts/ThesisManagement.sol`:
1. **`registerTopic` (Giảng viên khoá chốt Đề Tài lêm Blockchain):** Lưu cứng trên On-chain ID Giảng viên cấp, tựa đề, hạn chót tránh đổi ý.
2. **`submitReport` (Sinh Viên Nộp Bài Ký Ví):** Tải file PDF của bài làm cuối kì sang mạng phân tán phi tập trung **IPFS (Pinata)** nhận mã băm **CID** và đính kèm vào Smart Contract của Ethereum. Mã CID bảo vệ tuyệt đối bản gốc bài làm, giảng viên hay sinh viên cũng không thể thay phiên bản sửa lổi chính tả lên mạng nữa!.
3. **`finalizeGrade` (Chốt Bảng Điểm Ký Ví):** Giảng viên tham khảo điểm từ AI PhoBERT, sau đó ký ví Metamask nhập điểm cuối vào tham số grade của hàm. Khóa `graded = true` sẽ đóng vĩnh viễn không cập nhật đè điểm số được. Bảng điểm tồn tại mãi!

---

## 7. Dự án đã dùng Hardhat chưa?

**Có, dự án đã triển khai khởi chạy bằng Hardhat hoàn toàn!**
Dự án được cấu hình bằng Hardhat tại thư mục `backend/` liên kết xuống mạng Testnet **Ethereum Sepolia**.
- Ở file `backend/package.json`, cài sẵn gói thư viện `"hardhat"` thuộc nhánh Development phụ trợ.
- Chạy thông qua các dòng lệnh npm:
  - `npx hardhat compile`: Biên dịch mã văn bản `.sol` thành file kỹ thuật thao tác ABI JSON `backend/artifacts/contracts/ThesisManagement.sol/ThesisManagement.json`.
  - `npx hardhat run scripts/deploy-thesis.js --network sepolia`: Build & Publish Smart contract lên testnet mạng Sepolia thật sự.
