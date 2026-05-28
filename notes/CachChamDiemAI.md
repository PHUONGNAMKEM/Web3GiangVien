Hiện tại hệ thống có **3 cơ chế “AI chấm/gợi ý điểm” khác nhau**, không phải một công thức duy nhất.

**1. AI gợi ý điểm báo cáo/submission bằng PhoBERT**
Luồng chính nằm ở [phobert_analyzer.py](</mnt/d/Khóa Luận Kỹ Sư/Team_12.04.26/12.04.26/Web3GiangVien/ml-service/models/phobert_analyzer.py:44>) và được backend gọi qua [aiService.js](</mnt/d/Khóa Luận Kỹ Sư/Team_12.04.26/12.04.26/Web3GiangVien/backend/services/aiService.js:9>).

Cách tính dễ hiểu:

- AI nhận `text` báo cáo và `topic_requirements`.
- Text được chuẩn hóa: tách từ tiếng Việt bằng `underthesea`, chuyển lowercase, gom khoảng trắng.
- AI dùng model `vinai/phobert-base` để biến nội dung và từng yêu cầu đề tài thành vector ngữ nghĩa.
- Với mỗi yêu cầu, AI tính cosine similarity giữa báo cáo và yêu cầu.
- Nếu similarity > `0.45`, coi như báo cáo có liên quan đến yêu cầu đó.
- Đồng thời hệ thống cũng kiểm tra keyword match trực tiếp.
- Lấy số yêu cầu được “hit” tốt nhất giữa keyword và semantic.

Công thức điểm legacy hiện tại:

```text
base_score = 5.0 + keyword_density_score - repetition_penalty
semantic_bonus = tối đa 2.0
score = clamp(base_score + semantic_bonus, 0, 10)
```

Trong đó:

- `keyword_density_score = tỷ lệ yêu cầu được đáp ứng * 1.5`
- `semantic_bonus = tối đa 2 điểm nếu nội dung khớp nhiều yêu cầu`
- `repetition_penalty = tỷ lệ câu lặp * 3.0`, tối đa trừ khoảng 3 điểm
- Nếu nội dung dưới 300 ký tự thì AI thêm cảnh báo “báo cáo quá ngắn”, nhưng không trực tiếp trừ thêm điểm ngoài công thức trên.

Ví dụ dễ hiểu: nếu đề tài có 4 yêu cầu, báo cáo khớp 2 yêu cầu thì AI cộng một phần điểm theo tỷ lệ 2/4. Nếu nội dung bị lặp nhiều, bị trừ điểm. Điểm cuối bị giới hạn trong thang 0 đến 10.

**Lưu ý quan trọng:** ở màn hình giảng viên hiện tại, khi mở submission, frontend đang gửi cho AI chuỗi được ghép từ `TenDeTai`, `MoTa`, `YeuCau`, chứ chưa thấy đọc trực tiếp nội dung file báo cáo đã upload trong đoạn mình kiểm tra tại [SubmissionReview.js](</mnt/d/Khóa Luận Kỹ Sư/Team_12.04.26/12.04.26/Web3GiangVien/frontend/src/components/lecturer/SubmissionReview.js:187>). Nghĩa là điểm AI báo cáo có thể đang phản ánh metadata đề tài nhiều hơn là nội dung bài nộp thực tế, nếu chưa có luồng extract file ở nơi khác.

### Thực trạng đã xác nhận: AI chưa đọc nội dung file báo cáo upload

Sau khi kiểm tra lại source hiện tại, AI chấm báo cáo/submission **chưa đọc trực tiếp nội dung file PDF đã upload**. Khi giảng viên mở màn hình review submission, frontend tạo `textForAI` từ metadata đề tài gồm `TenDeTai`, `MoTa`, `YeuCau`, sau đó gửi text này sang `/api/ai/analyze-report` hoặc `/api/ai/analyze-rubrics`.

File báo cáo thật của sinh viên hiện được upload lên IPFS/Pinata và lưu lại dưới dạng `IPFS_CID` trong model `BaoCao`. Backend chưa có bước tải file từ IPFS, parse PDF, trích xuất text, lưu `ExtractedText`, hoặc truyền nội dung file thật sang ML service. Vì vậy điểm AI hiện tại phản ánh mức độ khớp giữa metadata đề tài với yêu cầu/rubrics, **chưa phải đánh giá đầy đủ nội dung bài nộp thực tế**.

Nguồn xác nhận:

- `frontend/src/components/lecturer/SubmissionReview.js`: tạo `textForAI` từ `TenDeTai`, `MoTa`, `YeuCau`.
- `backend/models/BaoCao.js`: chỉ lưu `IPFS_CID`, chưa có trường nội dung trích xuất.
- `backend/controllers/baoCaoController.js`: upload file lên IPFS và lưu CID, chưa parse file.
- `backend/controllers/aiController.js`: chỉ nhận `text` từ request body.
- `backend/services/ipfsService.js`: chỉ upload file, không extract text.

### Hướng khắc phục đề xuất

1. Khi sinh viên upload báo cáo, backend cần extract text từ file PDF trước hoặc sau khi upload IPFS.
2. Bổ sung trường như `ExtractedText`, `ExtractStatus`, `ExtractError`, `OriginalFileName` vào `BaoCao`.
3. Khi giảng viên mở review, frontend/backend phải ưu tiên gửi `BaoCao.ExtractedText` sang AI thay vì chỉ dùng metadata đề tài.
4. Nếu file chưa extract được, hiển thị cảnh báo rõ: “AI đang chấm dựa trên mô tả đề tài, chưa đọc nội dung file báo cáo”.
5. Với file đã lưu IPFS, có thể bổ sung job tải file từ IPFS gateway, parse PDF, cache nội dung vào MongoDB.
6. Chỉ lưu điểm AI như điểm gợi ý/component score; giảng viên vẫn là người xác nhận điểm cuối cùng.

**2. AI chấm theo rubrics**
Nếu đề tài bật rubrics, hệ thống dùng `/analyze-with-rubrics`, cũng trong [phobert_analyzer.py](</mnt/d/Khóa Luận Kỹ Sư/Team_12.04.26/12.04.26/Web3GiangVien/ml-service/models/phobert_analyzer.py:112>).

Luồng này chi tiết hơn:

- Chia nội dung thành nhiều chunk theo heading hoặc paragraph.
- Với mỗi tiêu chí rubrics, tạo text đại diện từ:
  - `TenTieuChi`
  - `MoTa`
  - `GoiYChoAI`
- Tính similarity giữa từng chunk và từng tiêu chí.
- Với mỗi tiêu chí, lấy chunk có similarity cao nhất.
- Tính thêm tỷ lệ keyword match từ `GoiYChoAI`.
- Trộn điểm:

```text
blended_sim = 70% semantic similarity + 30% keyword hit rate
AI_DiemTieuChi = blended_sim * DiemToiDa * 1.3
```

Điểm từng tiêu chí bị giới hạn không vượt `DiemToiDa`.

Điểm tổng:

```text
total_weighted_score += AI_DiemTieuChi / DiemToiDa * TrongSo
final_score = total_weighted_score / 10
```

Vì tổng trọng số thường là 100, chia `/10` để đưa về thang 10.

Ví dụ: tiêu chí “Tổng quan hệ thống” trọng số 20%, tối đa 10 điểm. Nếu AI cho tiêu chí đó 8/10 thì đóng góp vào tổng là:

```text
8 / 10 * 20 = 16
```

Sau khi cộng tất cả tiêu chí, hệ thống chia 10 để ra điểm thang 10.

**3. AI gợi ý điểm tiến độ tuần**
Luồng này ở [tienDoController.js](</mnt/d/Khóa Luận Kỹ Sư/Team_12.04.26/12.04.26/Web3GiangVien/backend/controllers/tienDoController.js:586>).

AI không tự lưu điểm. Backend ghép các trường:

- `MucTieuTuan`
- `NoiDungDaLam`
- `KhoKhan`
- `KeHoachTuanSau`

Sau đó gọi lại cơ chế rubrics PhoBERT ở trên. Response trả về:

- `aiScore`
- `aiRubrics`
- `aiFeedback`
- `model`

Thông điệp trong source ghi rõ: **“chỉ tham khảo”**, giảng viên vẫn là người đánh giá chính.

**4. AI chấm bài test/code bằng SBERT**
Cơ chế này khác với chấm báo cáo. Với câu hỏi loại `Code`, backend gọi `/compare-code` trong [compare_code.py](</mnt/d/Khóa Luận Kỹ Sư/Team_12.04.26/12.04.26/Web3GiangVien/ml-service/routes/compare_code.py:26>).

Cách tính:

- Lấy code sinh viên và code mẫu giảng viên.
- Dùng model `paraphrase-multilingual-MiniLM-L12-v2`.
- Tính cosine similarity từ 0 đến 1.
- Điểm câu code:

```text
diem = similarity * DiemToiDa
```

Ví dụ câu code tối đa 2 điểm, similarity = 0.75 thì điểm = 1.5.

Với trắc nghiệm, không dùng AI: đúng đáp án thì được toàn bộ điểm câu, sai thì 0. Luồng này nằm ở [baiTestController.js](</mnt/d/Khóa Luận Kỹ Sư/Team_12.04.26/12.04.26/Web3GiangVien/backend/controllers/baiTestController.js:289>).

**Kết luận ngắn gọn**
AI hiện tại **không phải người chốt điểm cuối cùng**. AI chủ yếu tạo điểm gợi ý:

- Báo cáo thường: PhoBERT so nội dung với yêu cầu đề tài, cộng bonus ngữ nghĩa, trừ lặp.
- Báo cáo theo rubrics: PhoBERT so từng tiêu chí với chunk nội dung, tính điểm theo trọng số.
- Tiến độ tuần: dùng rubrics để gợi ý, không tự lưu.
- Bài test code: SBERT so code sinh viên với đáp án mẫu.

Điểm cuối cùng trong `DiemSo.Diem` vẫn là điểm backend nhận từ thao tác chấm của giảng viên, còn `AI_Score`, `AI_Feedback`, `RubricsResult.AI_DiemTieuChi` là dữ liệu tham khảo/lưu vết để so sánh AI với GV. Mình đã kiểm tra `AGENTS.md`, Web3Vault, và các source chính: `ml-service/models/phobert_analyzer.py`, `backend/services/aiService.js`, `backend/controllers/diemSoController.js`, `backend/controllers/tienDoController.js`, `backend/controllers/baiTestController.js`.
