# CÔNG THỨC CHẤM ĐIỂM CỦA PhoBERT

Trích xuất trực tiếp từ mã nguồn `ml-service/models/phobert_analyzer.py`.
PhoBERT có 2 luồng chấm điểm tùy theo cách Giảng viên cấu hình đề tài:

========================================================================

## LUỒNG 1: CHẤM ĐIỂM NHANH (HÀM `analyze`)

Được kích hoạt khi Giảng viên KHÔNG tạo Rubrics chi tiết,
chỉ cung cấp danh sách yêu cầu kỹ thuật chung (topic_requirements).

### Công thức tổng quát:

  Score = MIN( 10.0 , MAX( 0.0 , 5.0 + S_density - S_penalty + S_bonus ) )

### Giải thích từng thành phần:

### 1. Điểm nền cố định: 5.0
- Mọi bài báo cáo đều bắt đầu từ mốc 5.0 điểm (Trung bình).
- Điểm nền KHÔNG phụ thuộc vào độ dài văn bản.
- Từ đây, AI sẽ cộng/trừ điểm dựa trên chất lượng nội dung.

### 2. S_density (Điểm Mật Độ Chuyên Môn) — Tối đa: +1.5 điểm
Đo lường mức độ sinh viên đề cập đến các yêu cầu kỹ thuật của đề tài.

  S_density = (total_hits / Tổng số yêu cầu) * 1.5

Trong đó total_hits được tính bằng cách lấy GIÁ TRỊ LỚN HƠN giữa 2 phương pháp:
- Phương pháp 1 (Regex): Hàm extract_requirement_hits() đếm số lần
  từ khóa yêu cầu xuất hiện trực tiếp trong văn bản (so khớp chuỗi).
- Phương pháp 2 (AI): PhoBERT tính Cosine Similarity giữa toàn bộ
  văn bản và từng yêu cầu. Nếu similarity > 0.45 thì tính là 1 hit.

  total_hits = MAX( hits_regex , hits_semantic )

Ý nghĩa: Dù sinh viên viết bằng lời văn riêng (không chứa chính xác từ khóa)
nhưng ý nghĩa vẫn khớp, AI vẫn nhận diện được nhờ Cosine Similarity.

### 3. S_penalty (Điểm Phạt Copy-Paste) — Tối đa: -3.0 điểm
Phát hiện gian lận bằng cách đo tỷ lệ câu bị lặp lại trong văn bản.

  repetition_ratio = 1.0 - (Số câu duy nhất / Tổng số câu)
  S_penalty = repetition_ratio * 3.0

Ví dụ: Bài có 100 câu, trong đó 30 câu bị lặp lại y hệt.
  repetition_ratio = 1.0 - (70/100) = 0.3
  S_penalty = 0.3 * 3.0 = 0.9 (bị trừ 0.9 điểm)

Ngoài ra, nếu repetition_ratio > 0.3 (lặp hơn 30%), hệ thống sẽ cảnh báo
"Phát hiện nội dung lặp lại — kiểm tra copy-paste".

### 4. S_bonus (Điểm Thưởng Ngữ Nghĩa) — Tối đa: +2.0 điểm
Thưởng thêm điểm khi sinh viên viết đúng trọng tâm đề tài.

  S_bonus = 2.0 * MIN( 1.0 , total_hits / Tổng số yêu cầu )

Nghĩa là: Nếu sinh viên đáp ứng 100% yêu cầu, được thưởng tối đa 2.0 điểm.
Nếu đáp ứng 50% yêu cầu, được thưởng 1.0 điểm.

### 5. Hàm giới hạn MIN() và MAX()
- MAX(0.0, ...): Đảm bảo điểm không bao giờ âm.
- MIN(10.0, ...): Đảm bảo điểm không bao giờ vượt quá 10.

### Ví dụ tính toán hoàn chỉnh (Luồng 1):
- Đề tài có 4 yêu cầu kỹ thuật: ["React", "MongoDB", "JWT", "REST API"]
- Sinh viên viết đúng 3/4 yêu cầu → total_hits = 3
- Tỷ lệ lặp: 10% → repetition_ratio = 0.1

Tính toán:
  S_density = (3/4) * 1.5 = 1.125
  S_penalty = 0.1 * 3.0 = 0.3
  S_bonus   = 2.0 * MIN(1.0, 3/4) = 2.0 * 0.75 = 1.5

  base_score = 5.0 + 1.125 - 0.3 = 5.825
  Score = MIN(10.0, MAX(0.0, 5.825 + 1.5)) = MIN(10.0, 7.325) = 7.33 điểm

========================================================================

## LUỒNG 2: CHẤM ĐIỂM THEO RUBRICS (HÀM `analyze_with_rubrics`)

Được kích hoạt khi Giảng viên CÓ tạo Rubrics chi tiết
(gồm TenTieuChi, MoTa, DiemToiDa, TrongSo, GoiYChoAI).
Luồng này sử dụng kỹ thuật CHUNKING để xẻ nhỏ văn bản trước khi phân tích.

### Bước 1: Tính Hệ Số Tương Đồng Tổng Hợp (Blended Similarity - BS)
Với mỗi Tiêu chí, AI tìm đoạn văn (chunk) tốt nhất rồi tính:

  BS = (0.7 * SemanticSim_max) + (0.3 * KHR)

Trong đó:
- SemanticSim_max: Cosine Similarity cao nhất giữa vector tiêu chí
  và tất cả các chunks. PhoBERT sẽ tự tìm đúng chương/phần phù hợp nhất.
- KHR (Keyword Hit Rate): Tỷ lệ từ khóa (GoiYChoAI) bắt được
  trong chunk tốt nhất đó.
  KHR = Số từ khóa tìm thấy / Tổng số từ khóa giảng viên gợi ý

Lưu ý: Nếu Giảng viên KHÔNG cung cấp GoiYChoAI (danh sách từ khóa trống),
KHR sẽ mặc định = 0.5 (trung lập, không ảnh hưởng điểm).

### Bước 2: Tính Điểm Thô cho từng Tiêu Chí (Raw Criterion Score)

  Điểm Tiêu Chí = MIN( Điểm Tối Đa , MAX( 0 , BS * Điểm Tối Đa * 1.3 ) )

Trong đó:
- Điểm Tối Đa (DiemToiDa): Do Giảng viên cấu hình trên giao diện web.
- Hệ số 1.3 (Scaling Factor): Hệ số khuếch đại do AI thường chấm khắt khe
  (Cosine Similarity hiếm khi đạt 1.0). Nhân 1.3 giúp điểm tự nhiên hơn.
- Hàm MIN(): Đảm bảo điểm không vượt quá Điểm Tối Đa dù nhân hệ số 1.3.

### Bước 3: Tính Tổng Điểm Cuối Cùng (Final Weighted Score)

  Final Score = TỔNG [ (Điểm Tiêu Chí_i / Điểm Tối Đa_i) * Trọng Số_i ] / 10

Trong đó:
- Trọng Số (TrongSo): Do Giảng viên tự cấu hình cho mỗi tiêu chí.
- Phép chia cho 10: Quy đổi kết quả về hệ 10.

### Ví dụ tính toán hoàn chỉnh (Luồng 2):
Giảng viên tạo 2 Rubrics:
  - Tiêu chí A: "Cơ sở lý thuyết" | Điểm Tối Đa = 10 | Trọng Số = 60
  - Tiêu chí B: "Cài đặt hệ thống" | Điểm Tối Đa = 10 | Trọng Số = 40

Kết quả AI:
  - Tiêu chí A: SemanticSim_max = 0.72, KHR = 0.80
    BS_A = 0.7 * 0.72 + 0.3 * 0.80 = 0.504 + 0.240 = 0.744
    Điểm A = MIN(10, 0.744 * 10 * 1.3) = MIN(10, 9.672) = 9.67

  - Tiêu chí B: SemanticSim_max = 0.50, KHR = 0.33
    BS_B = 0.7 * 0.50 + 0.3 * 0.33 = 0.350 + 0.099 = 0.449
    Điểm B = MIN(10, 0.449 * 10 * 1.3) = MIN(10, 5.837) = 5.84

  Final Score = [(9.67/10 * 60) + (5.84/10 * 40)] / 10
             = [58.02 + 23.36] / 10
             = 81.38 / 10
             = 8.14 điểm (hệ 10)

========================================================================

## PHỤ LỤC: CƠ CHẾ NHẬN XÉT TỰ ĐỘNG (ADAPTIVE THRESHOLD)

Chỉ áp dụng cho Luồng 2 (Rubrics). Thay vì đặt ngưỡng cứng,
hệ thống tính ngưỡng động dựa trên phân phối thống kê:

  good_threshold = MIN( 0.75 , Mean + 0.5 * StdDev )
  ok_threshold   = MAX( 0.20 , Mean - 0.5 * StdDev )

Trong đó Mean và StdDev là giá trị trung bình và độ lệch chuẩn
của Cosine Similarity giữa tiêu chí đó và TẤT CẢ chunks.

Quy tắc nhận xét:
  - best_sim >= good_threshold → "Tốt: [Chunk] thể hiện rõ nội dung..."
  - best_sim >= ok_threshold   → "Khá: Có đề cập nhưng chưa sâu..."
  - best_sim < ok_threshold    → "Yếu: Thiếu nội dung liên quan..."

========================================================================

## TỔNG KẾT: CÁC THÔNG SỐ HARD-CODE TRONG HỆ THỐNG

| Thông số                    | Giá trị | Vị trí code (dòng)         | Loại         |
|-----------------------------|---------|----------------------------|--------------|
| Điểm nền (Base Score)       | 5.0     | phobert_analyzer.py:88     | Luồng 1      |
| Hệ số mật độ (Density Cap)  | 1.5     | phobert_analyzer.py:79     | Luồng 1      |
| Hệ số phạt lặp (Penalty)   | 3.0     | phobert_analyzer.py:61     | Luồng 1      |
| Hệ số thưởng (Bonus Cap)   | 2.0     | phobert_analyzer.py:80     | Luồng 1      |
| Ngưỡng Similarity           | 0.45    | phobert_analyzer.py:75     | Luồng 1      |
| Trọng số Semantic           | 0.7     | phobert_analyzer.py:178    | Luồng 2      |
| Trọng số Keyword            | 0.3     | phobert_analyzer.py:178    | Luồng 2      |
| Hệ số khuếch đại (Scale)    | 1.3     | phobert_analyzer.py:183    | Luồng 2      |
| KHR mặc định (neutral)      | 0.5     | phobert_analyzer.py:175    | Luồng 2      |
