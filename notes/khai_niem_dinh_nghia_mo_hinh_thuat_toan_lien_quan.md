# Khái niệm, định nghĩa, mô hình và thuật toán liên quan

## 1. Tổng quan

Trong đề tài xây dựng hệ thống hỗ trợ quản lý đề tài và đồ án, các công nghệ được sử dụng không chỉ phục vụ việc triển khai phần mềm mà còn có ý nghĩa về mặt học thuật. Hệ thống kết hợp nhiều nhóm kỹ thuật khác nhau, bao gồm trí tuệ nhân tạo trong xử lý ngôn ngữ tự nhiên, mô hình so khớp ngữ nghĩa, hệ thống lưu trữ phi tập trung, blockchain, smart contract và mô hình đánh giá theo rubrics. Việc trình bày rõ các khái niệm và mô hình liên quan giúp làm rõ cơ sở lý thuyết cho việc lựa chọn công nghệ, đồng thời giải thích vì sao từng thành phần phù hợp với bài toán quản lý đề tài, nộp báo cáo và chấm điểm.

Trong hệ thống, dữ liệu vận hành thường xuyên như hồ sơ sinh viên, đề tài, đăng ký, tiến độ và trạng thái xử lý được quản lý bằng cơ sở dữ liệu MongoDB. Các thành phần AI được triển khai dưới dạng dịch vụ riêng bằng FastAPI để thực hiện hai nhiệm vụ chính: gợi ý đề tài phù hợp với năng lực sinh viên và hỗ trợ phân tích nội dung báo cáo. File báo cáo được lưu trữ thông qua IPFS/Pinata để tạo mã định danh nội dung. Các mốc dữ liệu cần tính xác thực cao, đặc biệt là bài nộp cuối cùng và điểm số đã chốt, được ghi nhận bằng smart contract trên blockchain.

## 2. Trí tuệ nhân tạo và xử lý ngôn ngữ tự nhiên

Trí tuệ nhân tạo, hay AI, là lĩnh vực nghiên cứu và xây dựng các hệ thống có khả năng thực hiện những tác vụ thường cần đến trí tuệ con người như nhận diện, suy luận, dự đoán, phân loại và ra quyết định hỗ trợ. Trong phạm vi đề tài, AI không được sử dụng để thay thế hoàn toàn vai trò của giảng viên, mà đóng vai trò như một công cụ hỗ trợ. AI giúp hệ thống xử lý dữ liệu văn bản, so khớp hồ sơ sinh viên với yêu cầu đề tài, phân tích nội dung báo cáo và đưa ra điểm hoặc nhận xét gợi ý.

Xử lý ngôn ngữ tự nhiên, hay NLP, là nhánh của AI tập trung vào việc giúp máy tính hiểu, biểu diễn và xử lý ngôn ngữ con người. Các bài toán NLP thường gặp gồm phân loại văn bản, trích xuất thông tin, tìm kiếm ngữ nghĩa, tóm tắt văn bản, hỏi đáp và đánh giá mức độ tương đồng giữa các đoạn văn bản. Đối với đề tài này, NLP được sử dụng chủ yếu ở hai nhiệm vụ: so khớp ngữ nghĩa giữa năng lực sinh viên và yêu cầu đề tài, đồng thời đánh giá mức độ bám đề của nội dung báo cáo.

Điểm quan trọng của NLP hiện đại là văn bản không chỉ được xử lý như chuỗi ký tự hay tập từ khóa đơn giản, mà được biểu diễn dưới dạng vector số học. Các vector này thường được gọi là embedding. Embedding cho phép mô hình biểu diễn ý nghĩa của từ, câu hoặc đoạn văn trong một không gian nhiều chiều. Khi hai đoạn văn có ý nghĩa gần nhau, vector biểu diễn của chúng cũng có xu hướng gần nhau trong không gian vector. Đây là cơ sở để hệ thống sử dụng cosine similarity nhằm đo mức độ tương đồng ngữ nghĩa.

## 3. BERT, PhoBERT và SBERT

BERT là mô hình ngôn ngữ dựa trên kiến trúc Transformer, được huấn luyện để học biểu diễn ngữ cảnh của từ trong câu. Khác với các cách biểu diễn từ truyền thống, BERT có khả năng hiểu nghĩa của một từ dựa trên ngữ cảnh xung quanh. Ví dụ, cùng một từ có thể mang sắc thái khác nhau trong các câu khác nhau, và BERT có khả năng tạo ra biểu diễn phù hợp với từng ngữ cảnh. Điều này giúp BERT trở thành nền tảng quan trọng cho nhiều bài toán xử lý ngôn ngữ tự nhiên.

PhoBERT là một biến thể của BERT được huấn luyện cho tiếng Việt. Vì tiếng Việt có đặc trưng riêng về từ ghép, dấu thanh, cấu trúc câu và cách biểu đạt, việc sử dụng mô hình được huấn luyện trên dữ liệu tiếng Việt giúp cải thiện khả năng hiểu ngữ nghĩa so với các mô hình chỉ tối ưu cho tiếng Anh. Trong hệ thống, PhoBERT được dùng cho nhiệm vụ phân tích báo cáo tiếng Việt, trích xuất embedding của nội dung báo cáo và so sánh với các yêu cầu hoặc tiêu chí đánh giá.

SBERT, hay Sentence-BERT, là hướng mở rộng của BERT nhằm tạo embedding hiệu quả cho câu hoặc đoạn văn. Trong khi BERT gốc mạnh ở việc hiểu ngữ cảnh, SBERT phù hợp hơn cho các bài toán đo tương đồng giữa hai câu, tìm kiếm ngữ nghĩa và xếp hạng văn bản. Trong hệ thống, SBERT được dùng để tạo vector biểu diễn hồ sơ năng lực sinh viên và vector biểu diễn yêu cầu của đề tài, từ đó tính điểm phù hợp giữa sinh viên và đề tài.

Trong mã nguồn, mô hình SBERT được triển khai tại `ml-service/models/sbert_matcher.py` với model `paraphrase-multilingual-MiniLM-L12-v2`. Mô hình PhoBERT được triển khai tại `ml-service/models/phobert_analyzer.py` với model `vinai/phobert-base`. Cả hai được đóng gói trong dịch vụ FastAPI, giúp backend Node.js có thể gọi qua HTTP API nội bộ thay vì xử lý trực tiếp trong cùng tiến trình.

## 4. Embedding và độ tương đồng cosine

Embedding là phương pháp biểu diễn dữ liệu dạng văn bản thành vector số. Mỗi vector chứa thông tin về ý nghĩa, ngữ cảnh và đặc trưng ngôn ngữ của văn bản. Khi đã có embedding, hệ thống có thể thực hiện các phép toán so sánh giữa các văn bản. Đây là cách tiếp cận phù hợp hơn so với so khớp từ khóa đơn thuần, vì hai đoạn văn có thể dùng từ khác nhau nhưng vẫn diễn đạt cùng một ý.

Cosine similarity là thước đo được dùng để xác định mức độ tương đồng giữa hai vector. Giá trị cosine similarity càng cao thì hai vector càng cùng hướng, tức hai văn bản càng có khả năng gần nhau về mặt ngữ nghĩa. Trong bài toán của hệ thống, cosine similarity được sử dụng ở cả hai nhánh: nhánh SBERT để so khớp năng lực sinh viên với yêu cầu đề tài, và nhánh PhoBERT để so sánh nội dung báo cáo với yêu cầu hoặc tiêu chí rubrics.

Công thức tổng quát của cosine similarity có dạng:

```text
cosine_similarity(A, B) = (A . B) / (||A|| * ||B||)
```

Trong đó, `A` và `B` là hai vector embedding, `A . B` là tích vô hướng giữa hai vector, còn `||A||` và `||B||` là độ dài của từng vector. Kết quả thường nằm trong khoảng từ `-1` đến `1`, nhưng trong các bài toán so khớp ngữ nghĩa thực tế, hệ thống thường lấy các giá trị dương làm mức độ tương đồng có ích. Trong mã nguồn, kết quả cosine được chuẩn hóa bằng cách lấy `max(0.0, cosine_score)` để tránh điểm âm ảnh hưởng đến kết quả gợi ý.

## 5. Mô hình gợi ý đề tài bằng SBERT

Mô hình gợi ý đề tài trong hệ thống được xây dựng theo hướng so khớp giữa hồ sơ năng lực sinh viên và yêu cầu chuyên môn của đề tài. Đầu vào của mô hình gồm thông tin sinh viên và danh sách đề tài. Thông tin sinh viên được biểu diễn thông qua GPA, chuyên ngành và danh sách kỹ năng. Thông tin đề tài được biểu diễn thông qua danh sách yêu cầu kỹ thuật hoặc yêu cầu chuyên môn.

Quy trình xử lý gồm các bước chính:

1. Trích xuất kỹ năng mạnh của sinh viên từ hồ sơ.
2. Tạo chuỗi mô tả năng lực sinh viên, ví dụ: `Thế mạnh của sinh viên: React, NodeJS, Machine Learning`.
3. Tạo chuỗi mô tả yêu cầu đề tài, ví dụ: `Đề tài yêu cầu kỹ năng kỹ thuật: NLP, Blockchain`.
4. Dùng SBERT để mã hóa hai chuỗi thành vector embedding.
5. Tính cosine similarity giữa vector sinh viên và vector đề tài.
6. Kết hợp điểm tương đồng ngữ nghĩa với điểm nền học lực để tạo điểm phù hợp cuối cùng.
7. Sắp xếp danh sách đề tài theo điểm phù hợp giảm dần.

Trong mã nguồn, kỹ năng được xem là nổi bật nếu điểm hoặc mức độ biểu diễn kỹ năng đạt từ `7.0` trở lên. Công thức tính điểm phù hợp tổng thể được xây dựng như sau:

```text
Semantic_Score = max(0.0, Cosine_Similarity(Student_Vector, Topic_Vector))
Base_GPA_Score = min(1.0, 0.4 + GPA / 10.0)
Match_Score = Semantic_Score * 0.6 + Base_GPA_Score * 0.4
```

Trong đó, `Semantic_Score` phản ánh mức độ khớp chuyên môn giữa sinh viên và đề tài, còn `Base_GPA_Score` phản ánh nền tảng học lực chung của sinh viên. Trọng số `0.6` cho thành phần ngữ nghĩa thể hiện rằng mức độ phù hợp chuyên môn là yếu tố quan trọng hơn. Trọng số `0.4` cho GPA giúp hệ thống vẫn xét đến năng lực học tập tổng quát. Kết quả cuối cùng được giới hạn trong khoảng từ `0.0` đến `1.0`, sau đó frontend có thể quy đổi sang thang điểm 10 để hiển thị.

Mô hình này không nhằm quyết định thay sinh viên hoặc giảng viên, mà chỉ đóng vai trò gợi ý. Sinh viên vẫn có quyền xem thông tin đề tài và tự quyết định đăng ký. Giảng viên vẫn là người xét duyệt cuối cùng. Cách tiếp cận này giúp tăng tính định hướng khi chọn đề tài nhưng không làm mất vai trò chuyên môn của người hướng dẫn.

## 6. Mô hình phân tích báo cáo bằng PhoBERT

Mô hình phân tích báo cáo bằng PhoBERT được dùng để đánh giá sơ bộ mức độ bám đề của nội dung báo cáo so với yêu cầu đề tài. Đầu vào gồm văn bản báo cáo đã được trích xuất và danh sách yêu cầu chuyên môn của đề tài. Đầu ra gồm điểm gợi ý, phản hồi và danh sách vấn đề cần cải thiện nếu có.

Quy trình xử lý cơ bản gồm các bước:

1. Chuẩn hóa văn bản đầu vào.
2. Kiểm tra nội dung rỗng hoặc quá ngắn.
3. Tạo embedding cho nội dung báo cáo bằng PhoBERT.
4. Tạo embedding cho từng yêu cầu đề tài.
5. Tính cosine similarity giữa báo cáo và từng yêu cầu.
6. Ghi nhận số yêu cầu đạt ngưỡng tương đồng.
7. Tính điểm gợi ý và phản hồi.

Trong mã nguồn, hệ thống dùng điểm nền dựa trên độ dài văn bản:

```text
Base_Score = min(8.0, 4.0 + len(clean_text) / 800.0)
```

Công thức này bảo đảm bài có nội dung sẽ có một điểm cơ sở nhất định, nhưng điểm nền bị giới hạn tối đa ở `8.0`. Điều này giúp tránh việc bài viết dài nhưng không bám yêu cầu vẫn được điểm quá cao. Phần điểm còn lại được cộng dựa trên số yêu cầu chuyên môn mà báo cáo đạt được về mặt ngữ nghĩa.

Ngưỡng tương đồng được sử dụng trong mã nguồn là:

```text
Cosine_Similarity(Report_Embedding, Requirement_Embedding) > 0.45
```

Nếu độ tương đồng vượt ngưỡng `0.45`, hệ thống ghi nhận báo cáo có đề cập hoặc đáp ứng một yêu cầu chuyên môn. Điểm thưởng được tính theo công thức:

```text
Bonus = 2.0 * min(1.0, Total_Hits / Number_Of_Requirements)
Final_Score = round(min(10.0, Base_Score + Bonus), 2)
```

Trong đó, `Total_Hits` là số yêu cầu được ghi nhận thông qua từ khóa hoặc tương đồng ngữ nghĩa. Nếu báo cáo không đạt yêu cầu nào, hệ thống sinh cảnh báo rằng nội dung thiếu các kiến thức chuyên môn cốt lõi của đề tài. Nếu văn bản quá ngắn, hệ thống sinh cảnh báo yêu cầu bổ sung chi tiết kỹ thuật. Đây là mô hình đánh giá dạng hỗ trợ, không phải mô hình chấm điểm tự động tuyệt đối.

## 7. Mô hình đánh giá theo rubrics

Rubrics là mô hình đánh giá dựa trên bộ tiêu chí cụ thể. Mỗi tiêu chí có tên, mô tả, trọng số, điểm tối đa và có thể có các gợi ý từ khóa cho AI. Trong giáo dục, rubrics giúp việc chấm điểm minh bạch hơn vì giảng viên và sinh viên đều có thể biết bài làm được đánh giá dựa trên những tiêu chí nào. Đối với đề tài này, rubrics được áp dụng để hỗ trợ chấm báo cáo đồ án theo từng tiêu chí thay vì chỉ dựa trên một điểm tổng.

Trong hệ thống, mỗi đề tài có thể bật chế độ sử dụng rubrics thông qua trường `SuDungRubrics`. Danh sách tiêu chí được lưu trong model `DeTai` với các trường như `TenTieuChi`, `MoTa`, `TrongSo`, `DiemToiDa` và `GoiYChoAI`. Ngoài ra, hệ thống còn có model `RubricsTemplate` để giảng viên tạo mẫu rubrics dùng lại cho nhiều đề tài. Khi template đã được áp dụng, hệ thống có cơ chế hạn chế sửa/xóa trực tiếp nhằm tránh ảnh hưởng đến các đề tài đã dùng mẫu đó.

Mô hình đánh giá rubrics bằng AI trong `phobert_analyzer.py` có các bước:

1. Chia nội dung báo cáo thành các đoạn nhỏ bằng kỹ thuật chunking.
2. Tạo embedding cho từng chunk nội dung.
3. Tạo embedding cho từng tiêu chí rubrics bằng cách kết hợp tên tiêu chí, mô tả và gợi ý cho AI.
4. Tính cosine similarity giữa từng chunk và từng tiêu chí.
5. Với mỗi tiêu chí, chọn chunk có độ tương đồng cao nhất.
6. Quy đổi độ tương đồng thành điểm AI gợi ý cho tiêu chí.
7. Tính tổng điểm theo trọng số.

Công thức quy đổi điểm tiêu chí trong mã nguồn có dạng:

```text
Raw_Score = max(0, min(DiemToiDa, Best_Similarity * DiemToiDa * 1.3))
```

Điểm tổng theo rubrics được tính dựa trên trọng số:

```text
Total_Weighted_Score += (Criteria_Score / DiemToiDa) * TrongSo
Final_Score = round(Total_Weighted_Score / 10, 2)
```

Vì tổng trọng số rubrics được yêu cầu bằng `100%`, việc chia cho `10` giúp quy đổi kết quả về thang điểm 10. Mô hình này cho phép AI chỉ ra tiêu chí nào được đáp ứng tốt, tiêu chí nào còn yếu, và đoạn nội dung nào trong báo cáo được xem là khớp nhất với tiêu chí. Tuy nhiên, điểm cuối cùng vẫn do giảng viên nhập hoặc điều chỉnh, còn AI chỉ đóng vai trò gợi ý.

## 8. Chunking trong phân tích báo cáo

Chunking là kỹ thuật chia văn bản dài thành các đoạn nhỏ hơn để mô hình xử lý hiệu quả hơn. Các mô hình như PhoBERT thường có giới hạn độ dài token đầu vào, do đó không thể đưa toàn bộ một báo cáo dài vào mô hình trong một lần xử lý. Nếu không chia nhỏ, nội dung có thể bị cắt mất, dẫn đến mất thông tin quan trọng.

Trong hệ thống, file `ml-service/utils/pdf_chunker.py` thực hiện việc chia văn bản theo heading học thuật tiếng Việt. Bộ tách đoạn nhận diện các mẫu tiêu đề như `Chương`, `PHẦN`, `1.1`, `1.1.1`, hoặc các dạng section khác. Nếu văn bản không có heading rõ ràng, hệ thống fallback sang cách chia theo đoạn văn, giới hạn số lượng từ trong mỗi chunk.

Kỹ thuật chunking giúp mô hình rubrics hoạt động hợp lý hơn. Thay vì so sánh toàn bộ báo cáo với một tiêu chí, hệ thống tìm đoạn có độ liên quan cao nhất với từng tiêu chí. Điều này phù hợp với cấu trúc báo cáo khóa luận, vì mỗi tiêu chí có thể được thể hiện ở một chương hoặc một mục khác nhau, chẳng hạn phần thiết kế hệ thống, phần triển khai, phần kiểm thử hoặc phần đánh giá kết quả.

## 9. Phân loại và mô hình đánh giá trong hệ thống

Trong phạm vi đề tài, phân loại không được triển khai như một bài toán classification thuần túy với nhãn cố định, mà xuất hiện dưới dạng phân nhóm trạng thái và phân loại mức đánh giá. Hệ thống sử dụng nhiều trạng thái nghiệp vụ để phân loại tiến trình thực hiện đề tài, ví dụ `ChoDuyet`, `DaDuyet`, `TuChoi`, `MoDangKy`, `DaChot`, `HoanThanh`, `DaNop`, `ChuaNop`, `DaCham`. Các trạng thái này giúp hệ thống và người dùng biết một đối tượng đang nằm ở bước nào trong quy trình.

Ở phần AI, kết quả đánh giá cũng có thể được hiểu như một dạng phân loại mềm. Ví dụ, trong phân tích rubrics, hệ thống sinh nhận xét theo các mức như tốt, khá hoặc yếu dựa trên ngưỡng similarity. Nếu `best_sim` lớn hơn `0.6`, tiêu chí được nhận xét là thể hiện rõ; nếu lớn hơn `0.4`, nội dung được xem là có đề cập nhưng chưa sâu; nếu thấp hơn, hệ thống xem là thiếu nội dung liên quan. Đây là cách phân loại dựa trên ngưỡng, phục vụ mục đích phản hồi học thuật.

Mô hình đánh giá trong hệ thống có ba lớp:

1. Đánh giá gợi ý bằng AI: dùng SBERT/PhoBERT để tính điểm tương đồng hoặc điểm nội dung.
2. Đánh giá theo rubrics: chia điểm theo tiêu chí và trọng số.
3. Đánh giá chính thức của giảng viên: giảng viên xem kết quả AI, điều chỉnh nếu cần và chốt điểm cuối cùng.

Cách thiết kế này bảo đảm AI chỉ là lớp hỗ trợ ra quyết định. Điểm chính thức vẫn là kết quả chuyên môn của giảng viên, được lưu trong model `DiemSo` và có thể ghi nhận mã giao dịch blockchain thông qua trường `TxHash`.

## 10. IPFS và CID

IPFS, viết tắt của InterPlanetary File System, là mô hình lưu trữ và phân phối dữ liệu theo hướng phi tập trung. Khác với cách truy cập file truyền thống dựa vào vị trí máy chủ, IPFS định danh file dựa trên nội dung. Khi một file được đưa lên IPFS, hệ thống tạo ra một mã định danh nội dung gọi là CID. Nếu nội dung file thay đổi, CID cũng thay đổi. Vì vậy, CID có thể được dùng như dấu vết để kiểm tra tính toàn vẹn của file.

Trong hệ thống, sinh viên nộp báo cáo dưới dạng PDF. Backend nhận file tạm thông qua cơ chế upload, sau đó gọi `ipfsService.js` để tải file lên Pinata. Pinata đóng vai trò dịch vụ hỗ trợ lưu trữ và pin dữ liệu trên IPFS. Sau khi upload thành công, hệ thống nhận `IpfsHash`, tức CID của file, và lưu vào trường `IPFS_CID` của model `BaoCao`.

Quy trình này có ý nghĩa quan trọng đối với bài toán quản lý báo cáo. Thay vì chỉ lưu file trong thư mục máy chủ hoặc gửi qua email, hệ thống lưu mã CID gắn với báo cáo. Giảng viên có thể dùng CID để truy xuất file qua IPFS gateway. Khi kết hợp CID với smart contract hoặc bản ghi điểm, hệ thống có khả năng xác định chính xác file nào đã được dùng làm căn cứ chấm điểm.

## 11. Blockchain

Blockchain là một cấu trúc dữ liệu phân tán, trong đó các giao dịch được ghi thành các khối và liên kết với nhau bằng cơ chế mã hóa. Một khi dữ liệu đã được xác nhận và ghi vào blockchain, việc sửa đổi dữ liệu trở nên rất khó khăn vì cần thay đổi đồng thời nhiều khối và đạt sự đồng thuận của mạng. Đặc điểm này giúp blockchain phù hợp với các bài toán cần tính minh bạch, truy vết và chống sửa đổi.

Trong đề tài này, blockchain không được dùng để lưu toàn bộ dữ liệu hệ thống. Đây là lựa chọn hợp lý vì các dữ liệu vận hành như hồ sơ sinh viên, trạng thái đăng ký, lời mời nhóm hoặc nhật ký tiến độ cần thay đổi thường xuyên. Nếu đưa toàn bộ những thao tác này lên blockchain, hệ thống sẽ tốn chi phí giao dịch, chậm hơn và kém linh hoạt. Thay vào đó, hệ thống chỉ sử dụng blockchain cho các mốc dữ liệu có tính quyết định, chẳng hạn ghi nhận đề tài, bài nộp và điểm đã chốt.

Hệ thống sử dụng mạng Ethereum Sepolia ở môi trường thử nghiệm và tương tác thông qua thư viện `ethers.js`. Smart contract được viết bằng Solidity, biên dịch và triển khai bằng Hardhat. Backend đọc ABI của contract từ thư mục artifacts để gọi các hàm trên contract.

## 12. Smart contract

Smart contract là chương trình chạy trên blockchain. Khi được triển khai, smart contract hoạt động theo logic đã được lập trình sẵn và có thể được gọi thông qua các giao dịch. Ưu điểm của smart contract là tính minh bạch và khó sửa đổi sau khi triển khai. Trong hệ thống, smart contract đóng vai trò ghi nhận các mốc dữ liệu cuối cùng của quy trình làm đồ án.

File `backend/contracts/ThesisManagement.sol` định nghĩa contract `ThesisManagement` với hai cấu trúc dữ liệu chính:

- `Topic`: lưu thông tin đề tài gồm tên đề tài, mã giảng viên hướng dẫn, deadline, danh sách yêu cầu và trạng thái tồn tại.
- `Submission`: lưu thông tin bài nộp gồm mã sinh viên, mã đề tài, CID trên IPFS, thời điểm nộp, điểm, phản hồi và trạng thái đã chấm hay chưa.

Contract có ba nhóm hàm quan trọng:

1. `registerTopic`: ghi nhận đề tài lên blockchain.
2. `submitReport`: ghi nhận bài nộp của sinh viên với mã IPFS CID.
3. `finalizeGrade`: chốt điểm và phản hồi cho một bài nộp.

Hàm `finalizeGrade` có ràng buộc không cho chấm lại một submission đã được chấm thông qua trường `graded`. Đây là cơ chế bảo đảm điểm đã chốt không bị ghi đè nhiều lần. Trong backend, service `thesisContractService.js` gọi hàm này và lưu `TxHash` vào model `DiemSo`, giúp hệ thống có thể truy vết giao dịch.

## 13. Mô hình kết hợp MongoDB, IPFS và blockchain

Một điểm quan trọng của đề tài là không xem blockchain là nơi thay thế hoàn toàn cơ sở dữ liệu. Hệ thống phân chia vai trò của từng thành phần như sau:

- MongoDB lưu dữ liệu vận hành thường xuyên: sinh viên, giảng viên, đề tài, đăng ký, nhóm, tiến độ, báo cáo và điểm số.
- IPFS lưu file báo cáo theo cơ chế định danh nội dung bằng CID.
- Blockchain ghi nhận các mốc dữ liệu cần tính xác thực: đề tài, bài nộp, CID và điểm đã chốt.

Cách kết hợp này giúp cân bằng giữa tính linh hoạt và tính minh bạch. MongoDB giúp truy vấn nhanh, cập nhật thuận tiện và phù hợp với giao diện người dùng. IPFS giúp file báo cáo có mã định danh nội dung. Blockchain giúp lưu dấu các mốc cuối cùng để hạn chế chỉnh sửa hoặc phủ nhận kết quả.

Đối với quy trình nộp bài nhóm, hệ thống có thể cho phép trưởng nhóm nộp một file chung lên IPFS nhưng tạo bản ghi báo cáo riêng cho từng thành viên với cùng một CID. Khi chấm điểm, giảng viên vẫn có thể chấm riêng từng sinh viên. Mô hình smart contract hiện tại hỗ trợ cách này vì submission được tổ chức theo cặp `topicId` và `studentDID`.

## 14. Mô hình chấm điểm và vai trò của giảng viên

Trong hệ thống, điểm cuối cùng không do AI tự quyết định. AI chỉ tạo điểm gợi ý và phản hồi tham khảo. Giảng viên xem kết quả AI, xem nội dung báo cáo, cân nhắc mức độ đóng góp và nhập điểm chính thức. Điểm chính thức được lưu ở trường `Diem`, trong khi điểm AI được lưu ở trường `AI_Score`. Nếu đề tài sử dụng rubrics, kết quả từng tiêu chí được lưu trong `RubricsResult`, bao gồm điểm AI, điểm giảng viên, nhận xét AI và chunk nội dung liên quan.

Cách tổ chức này phù hợp với nguyên tắc đánh giá học thuật. AI có thể hỗ trợ xử lý nhanh dữ liệu văn bản và phát hiện mức độ liên quan, nhưng không thể thay thế hoàn toàn nhận định chuyên môn của giảng viên. Đặc biệt trong đồ án, giảng viên còn phải xem xét quá trình làm việc, mức độ đóng góp, chất lượng trình bày, khả năng bảo vệ và nhiều yếu tố ngữ cảnh khác.

Mô hình chấm điểm của hệ thống có thể tóm tắt như sau:

```text
Báo cáo sinh viên
→ Trích xuất/nhập nội dung văn bản
→ AI phân tích bằng PhoBERT hoặc rubrics
→ Sinh điểm gợi ý và phản hồi
→ Giảng viên xem xét và nhập điểm chính thức
→ Backend lưu điểm vào MongoDB
→ Smart contract ghi nhận điểm và TxHash
```

## 15. Ý nghĩa học thuật của các công nghệ được sử dụng

Việc sử dụng AI/BERT trong đề tài thể hiện hướng tiếp cận xử lý dữ liệu học thuật dựa trên ngữ nghĩa thay vì chỉ dựa trên từ khóa. Mô hình embedding và cosine similarity cho phép hệ thống đo mức độ liên quan giữa các văn bản khác cách diễn đạt. Điều này phù hợp với môi trường giáo dục, nơi sinh viên có thể trình bày cùng một nội dung bằng nhiều cách khác nhau.

Việc sử dụng rubrics giúp quá trình đánh giá có cấu trúc hơn. Thay vì chỉ đưa ra một điểm tổng, rubrics phân tách đánh giá thành nhiều tiêu chí với trọng số cụ thể. Khi kết hợp với AI, hệ thống có thể chỉ ra tiêu chí nào được thể hiện tốt, tiêu chí nào còn thiếu và phần nội dung nào liên quan đến từng tiêu chí. Đây là cơ sở để tăng tính minh bạch trong phản hồi học thuật.

Việc sử dụng IPFS và blockchain thể hiện hướng tiếp cận bảo đảm tính toàn vẹn và khả năng truy vết dữ liệu. IPFS giúp định danh file báo cáo theo nội dung, còn blockchain giúp ghi nhận các mốc quan trọng một cách khó sửa đổi. Khi kết hợp với cơ sở dữ liệu truyền thống, hệ thống vừa giữ được tính linh hoạt trong vận hành, vừa có khả năng xác thực ở các bước cuối cùng.

Tổng thể, các khái niệm và mô hình trên tạo thành nền tảng lý thuyết cho hệ thống: AI hỗ trợ xử lý và đánh giá ngữ nghĩa, rubrics chuẩn hóa tiêu chí chấm điểm, IPFS bảo đảm định danh nội dung file, blockchain và smart contract bảo đảm tính minh bạch cho các mốc quan trọng, còn MongoDB và ứng dụng web đảm nhiệm phần vận hành nghiệp vụ hằng ngày.

## Tài liệu và mã nguồn đã tham chiếu

- `web3_ai_system_explanation.md`
- `ml-service/README.md`
- `notes/nghiep_vu_source_12_04_2026.md`
- `Document/Day16-04-2025/taskRubrics.md`
- `ml-service/models/sbert_matcher.py`
- `ml-service/models/phobert_analyzer.py`
- `ml-service/utils/pdf_chunker.py`
- `ml-service/routes/analyze.py`
- `backend/services/ipfsService.js`
- `backend/contracts/ThesisManagement.sol`
- `backend/services/thesisContractService.js`
- `backend/models/DeTai.js`
- `backend/models/DiemSo.js`
- `backend/models/RubricsTemplate.js`
- `backend/controllers/diemSoController.js`
- `backend/controllers/rubricsController.js`
