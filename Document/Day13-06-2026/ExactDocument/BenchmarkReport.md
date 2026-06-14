# Benchmark khách quan các mô hình embedding tiếng Việt (STS)

> **Mục tiêu:** so sánh *khách quan* mức độ hiệu quả/chính xác của các mô hình embedding cho luồng chấm điểm — đo trên bộ dữ liệu **có điểm do người gán**, tránh việc tự chấm chủ quan.
> Script: [ml-service/scripts/benchmark_sts.py](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/ml-service/scripts/benchmark_sts.py).

## 1. Vì sao chọn tác vụ STS (không phải "chấm điểm bài văn")

Hệ thống production chấm báo cáo bằng **cosine similarity** giữa embedding *đoạn báo cáo* và *tiêu chí/yêu cầu* (xem [phobert_analyzer.py](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/ml-service/models/phobert_analyzer.py)). Vì vậy thước đo trung thực nhất cho "model nào hiệu quả" là **STS – Semantic Textual Similarity**: cho 2 câu kèm **điểm tương đồng do người gán (0–5)**, đo xem **cosine của model có khớp đánh giá của người không**. Đây cũng chính là chuẩn vàng mà các paper Sentence-BERT dùng để so sánh mô hình.

> [!NOTE]
> Hai phương án từng cân nhắc và **lý do loại**:
> - *AES chấm điểm bài văn (bộ 99 chunk Việt):* chỉ 3 tài liệu gốc, nhãn sinh tự động → chạy thử cho tương quan **≈ 0 cho mọi model** (nhiễu), không kết luận được.
> - *ASAP (13k bài, điểm người thật):* là **tiếng Anh** → đưa cho model tiếng Việt là sai ngôn ngữ, kết quả không áp dụng được cho hệ thống tiếng Việt.

## 2. Thiết lập

- **Dataset:** `doanhieung/vi-stsbenchmark` — bản dịch tiếng Việt của STS Benchmark.
  - **8.628 cặp câu**, cột `sentence1`, `sentence2`, `score` (0–5).
  - Điểm tương đồng là **của người thật** (từ STS-B gốc); câu tiếng Việt là **dịch máy** (lưu ý ở mục 5).
- **4 mô hình:**
  - `PhoBERT-CLS` — `vinai/phobert-base`, vector `[CLS]` (đúng cách hệ thống đang dùng).
  - `vietnamese-sbert` — `keepitreal/vietnamese-sbert`.
  - `bkai-bi-encoder` — `bkai-foundation-models/vietnamese-bi-encoder`.
  - `TF-IDF` — baseline đếm từ (không deep learning), để có mốc so sánh.
- **Tiền xử lý:** tách từ `underthesea` cho cả 4 (công bằng, giống pipeline thật).
- **Quy trình:** `embed(câu1)`, `embed(câu2)` → `cosine` → so với điểm người. **Không train, không hồi quy** — đúng như production.

## 3. Chỉ số đo

| Chỉ số | Ý nghĩa | Tốt khi |
|---|---|---|
| **Spearman** | tương quan thứ hạng giữa cosine và điểm người (chỉ số CHÍNH của STS) | càng gần **1** |
| **Pearson** | tương quan tuyến tính cosine ↔ điểm người | càng gần **1** |
| **MAE / RMSE** | sai số sau khi quy cosine về thang 0–5 (tham khảo) | càng **nhỏ** |
| **cos std** | độ giãn của cosine; nhỏ = "dồn cục", khó phân biệt | càng **rộng** |

## 4. Kết quả (8.628 cặp)

> [!TIP]
> **Model hiệu quả nhất (Spearman cao nhất): `vietnamese-sbert`** (Spearman=0.8266 = 82.7/100, Pearson=0.8390).

| Mô hình | Spearman ↑ | Pearson ↑ | MAE ↓ | RMSE ↓ | cos mean | cos std | Chiều | Thời gian (s) |
|---|---|---|---|---|---|---|---|---|
| **TF-IDF** (baseline) | 0.6847 | 0.6984 | 0.861 | 1.123 | 0.479 | 0.263 | 8000 | 13.2 |
| **PhoBERT-CLS** (hiện tại) | 0.3188 | 0.2856 | 1.779 | 2.196 | 0.859 | 0.108 | 768 | 419.6 |
| **vietnamese-sbert** | **0.8266** | **0.8390** | **0.712** | **0.913** | 0.609 | 0.261 | 768 | 341.6 |
| **bkai-bi-encoder** | 0.7312 | 0.7488 | 0.833 | 1.048 | 0.595 | 0.242 | 768 | 329.9 |

![Tương quan với điểm người](C:/Users/Lenovo/.gemini/antigravity/brain/a8477dcb-6bf7-4400-a910-1eaf34db1fff/benchmark_sts_correlation.png)

## 5. Phân tích

- **vietnamese-sbert thắng rõ rệt (Spearman 0.827).** Nó được huấn luyện chuyên cho *độ tương đồng câu đối xứng* — đúng dạng "đoạn báo cáo ↔ tiêu chí" của ta. `bkai-bi-encoder` (0.731) cũng tốt nhưng nó tối ưu cho *truy hồi* (query↔document, bất đối xứng) nên ở tác vụ STS đối xứng nhỉnh kém hơn một chút.
- **PhoBERT-CLS (đang dùng) kém nhất — chỉ 0.319, thua cả TF-IDF (0.685).** Đây là bằng chứng định lượng mạnh: dùng `[CLS]` của PhoBERT thô làm vector câu **không phù hợp cho cosine**, đúng phát hiện trong paper Sentence-BERT.
- **Vì sao PhoBERT phải nhân hệ số ×1.5 trong hệ thống:** `cos std` của PhoBERT chỉ **0.108** (mean 0.859) — mọi cặp câu đều dồn quanh ~0.86, gần như không phân biệt được giống/khác. SBERT có `cos std` ~0.26 (giãn gấp ~2.4 lần) nên điểm phân tách tự nhiên. Con số này lý giải đúng hiện tượng "điểm dồn cục" và lý do phải bù hệ số trong [phobert_analyzer.py](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/ml-service/models/phobert_analyzer.py).
- **TF-IDF cao bất ngờ (0.685):** STS-B có nhiều cặp câu chia sẻ từ vựng, nên đếm từ vẫn bắt được phần lớn — càng cho thấy PhoBERT-CLS yếu tới mức thua cả baseline từ vựng.

## 6. Kết luận & Khuyến nghị

> [!IMPORTANT]
> **Khách quan, trên 8.628 cặp câu có điểm người gán:** `vietnamese-sbert` là mô hình hiệu quả nhất cho luồng chấm dựa trên cosine, kế đến `bkai-bi-encoder`; còn `PhoBERT-CLS` (đang dùng) **kém nhất, thua cả TF-IDF**.

**Đề xuất hành động:**
1. **Đổi model luồng chấm** sang `keepitreal/vietnamese-sbert` (qua `SentenceTransformer`) — phù hợp nhất với tác vụ tương đồng đối xứng; cân nhắc `bkai-bi-encoder` nếu nghiêng về truy hồi.
2. **Bỏ/giảm hệ số ×1.5** sau khi đổi: SBERT có `cos std` rộng nên không cần bù; giữ ×1.5 sẽ làm điểm phình.
3. Giữ cơ chế **bật/tắt model** để so trước/sau khi chuyển trên dữ liệu báo cáo thật.

## 7. Giới hạn (nêu rõ để khách quan)

> [!WARNING]
> - Câu tiếng Việt là **dịch máy** từ STS-B, có thể lệch sắc thái so với tiếng Việt bản địa → con số tuyệt đối mang tính tham khảo, nhưng **so sánh tương đối giữa các model là công bằng** (mọi model nhận cùng dữ liệu, cùng tiền xử lý).
> - STS đo *độ tương đồng câu*, gần với cơ chế cosine của hệ thống nhưng **không trùng khít 100%** với việc "chấm điểm rubric trên báo cáo dài". Muốn nghiệm thu cuối cùng vẫn nên đo thêm trên **báo cáo thật có điểm giảng viên** khi có dữ liệu đó.
> - Đây là **đánh giá zero-shot** (không fine-tune trên domain Blockchain/AI). Nếu fine-tune thêm, cả SBERT lẫn PhoBERT đều có thể cải thiện.
