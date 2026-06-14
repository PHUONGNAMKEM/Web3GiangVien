# BÀI TEST CHUẨN — So sánh các mô hình embedding tiếng Việt cho luồng chấm điểm

**Ngày:** 13/06/2026 · **Script:** [ml-service/scripts/benchmark_sts.py](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/ml-service/scripts/benchmark_sts.py) · **Phần cứng:** CPU

---

## 1. Mục tiêu & phạm vi

So sánh **khách quan** 4 mô hình biến văn bản thành vector (embedding) theo 2 trục:
- **Độ chính xác** — cosine của model bám sát đánh giá tương đồng của *người* tới đâu.
- **Tốc độ** — thời gian sinh embedding.

Để từ đó quyết định mô hình nào phù hợp nhất cho **luồng chấm điểm bằng cosine similarity** của hệ thống.

---

## 2. Bộ dữ liệu

| Mục | Nội dung |
|---|---|
| **Tên** | STS Benchmark (bản dịch tiếng Việt) |
| **Nguồn** | HuggingFace: [`doanhieung/vi-stsbenchmark`](https://huggingface.co/datasets/doanhieung/vi-stsbenchmark) |
| **Gốc** | STS Benchmark (SemEval) — điểm tương đồng do **người** gán |
| **Kích thước** | **8.628 cặp câu** (train 5.749 / dev 1.500 / test 1.379) |
| **Cột dùng** | `sentence1`, `sentence2`, `score` (0–5) |
| **Thang điểm** | 0 = khác hẳn nghĩa … 5 = cùng nghĩa (trung bình 2.63) |

### Mẫu ví dụ (trích thật từ dataset)

| score | sentence1 | sentence2 |
|---|---|---|
| **0.0** | "5 quốc gia gặp nhau trên khói mù" | "Cuộc hôn nhân của Putin kết thúc" |
| **2.8** | "Con gái chúng tôi luôn thích tắm, nhưng ra ngoài... không quá nhiều." | "Vợ tôi và tôi ban đầu có cùng vấn đề với cặp song sinh mới sinh…" |
| **5.0** | "Biểu tình tiếp tục diễn ra ở thủ đô Ukraine căng thẳng" | "Biểu tình tiếp tục diễn ra ở thủ đô Ukraine" |

### Input / Output của bài test

- **Input:** một cặp câu `(sentence1, sentence2)` + điểm người `score`.
- **Output trung gian:** mỗi model sinh `vector1 = f(sentence1)`, `vector2 = f(sentence2)` → `cosine(vector1, vector2)` ∈ [−1, 1].
- **Output cuối:** các chỉ số so **cosine** (do máy tính) với **score** (do người gán) trên toàn bộ 8.628 cặp.

> [!WARNING]
> **Lưu ý khách quan:** điểm tương đồng là **của người thật**, nhưng câu tiếng Việt là **dịch máy** từ bản gốc → con số tuyệt đối mang tính tham khảo; **so sánh tương đối giữa các model là công bằng** vì mọi model nhận cùng dữ liệu, cùng tiền xử lý.

---

## 3. Các mô hình so sánh

| Model | Nguồn HuggingFace | Loại | Giới thiệu ngắn |
|---|---|---|---|
| **PhoBERT-CLS** *(đang dùng)* | [`vinai/phobert-base`](https://huggingface.co/vinai/phobert-base) | Encoder RoBERTa | Mô hình ngôn ngữ tiếng Việt đơn ngữ đầu tiên quy mô lớn (VinAI, 2020), train trên ~20GB văn bản Việt, 135M tham số, giới hạn 256 token. Là **encoder đọc-hiểu**, KHÔNG được tối ưu để sinh vector câu → lấy `[CLS]` đem so cosine là dùng "sai mục đích". |
| **vietnamese-sbert** | [`keepitreal/vietnamese-sbert`](https://huggingface.co/keepitreal/vietnamese-sbert) | Sentence-BERT | SBERT xây trên PhoBERT, fine-tune bằng mạng siamese để **cosine ≈ độ giống nghĩa**. Dùng mean-pooling, chuyên cho **tương đồng câu đối xứng** — đúng dạng "đoạn báo cáo ↔ tiêu chí". |
| **bkai-bi-encoder** | [`bkai-foundation-models/vietnamese-bi-encoder`](https://huggingface.co/bkai-foundation-models/vietnamese-bi-encoder) | Bi-encoder | Bi-encoder 768 chiều (BKAI), train trên MS MARCO + SQuAD v2 (dịch Việt) + Zalo Legal Retrieval 2021. Tối ưu cho **truy hồi** (câu hỏi ↔ tài liệu, bất đối xứng). |
| **TF-IDF** *(baseline)* | scikit-learn (không phải HF) | Thống kê từ vựng | Vector hoá theo tần suất từ, **không hiểu ngữ nghĩa**. Làm mốc tham chiếu: model deep phải vượt được mốc này mới có giá trị. |

---

## 4. Quy trình xử lý

```
                 ┌─────────────── cho TỪNG cặp câu (×8.628) ───────────────┐
sentence1 ──► tách từ (underthesea) ──► f(·) ──► vector1 ─┐
                                                          ├─► cosine(v1,v2) ─► sim ∈ [−1,1]
sentence2 ──► tách từ (underthesea) ──► f(·) ──► vector2 ─┘
                                                                     │
score (người) ───────────────────────────────────────────────────┐ │
                                                                  ▼ ▼
                                          Spearman / Pearson / MAE / RMSE
```

1. **Tiền xử lý:** tách từ tiếng Việt bằng `underthesea` (các model nền PhoBERT đều yêu cầu) — áp dụng cho **cả 4** để công bằng.
2. **Sinh embedding:** mỗi model biến mỗi câu thành 1 vector.
   - PhoBERT-CLS: lấy vector token `[CLS]` (đúng cách hệ thống đang chạy).
   - SBERT / bkai: `SentenceTransformer.encode`.
   - TF-IDF: fit trên toàn bộ câu rồi transform.
3. **Tính tương đồng:** `cosine(vector1, vector2)` cho từng cặp — **KHÔNG train, KHÔNG hồi quy**, đúng như production.
4. **Đối chiếu với người:** so toàn bộ chuỗi cosine với chuỗi `score` bằng các chỉ số ở mục 5.

---

## 5. Chỉ số đo

| Chỉ số | Ý nghĩa | Tốt khi |
|---|---|---|
| **Spearman** ↑ | Tương quan **thứ hạng** cosine ↔ điểm người. *Chỉ số CHÍNH của STS* (xếp cặp giống→khác có khớp người không). | gần **1** |
| **Pearson** ↑ | Tương quan **tuyến tính** cosine ↔ điểm người. | gần **1** |
| **MAE / RMSE** ↓ | Sai số sau khi quy cosine về thang 0–5 (tham khảo). | càng **nhỏ** |
| **cos std** | Độ giãn của cosine. Nhỏ = "dồn cục", mọi cặp na ná nhau → khó phân biệt. | càng **rộng** |
| **Tốc độ** (sent/s) | Số câu sinh embedding mỗi giây (CPU). | càng **cao** |

---

## 6. Kết quả

### 6.1. Độ chính xác (8.628 cặp)

| Hạng | Mô hình | Spearman ↑ | Pearson ↑ | MAE ↓ | RMSE ↓ | cos std |
|---|---|---|---|---|---|---|
| 🥇 | **vietnamese-sbert** | **0.827** | **0.839** | **0.712** | **0.913** | 0.261 |
| 🥈 | **bkai-bi-encoder** | 0.731 | 0.749 | 0.833 | 1.048 | 0.242 |
| 🥉 | **TF-IDF** (baseline) | 0.685 | 0.698 | 0.861 | 1.123 | 0.263 |
| 4 | **PhoBERT-CLS** *(đang dùng)* | **0.319** | 0.286 | 1.779 | 2.196 | **0.108** |

![Tương quan với điểm người](C:/Users/Lenovo/.gemini/antigravity/brain/a8477dcb-6bf7-4400-a910-1eaf34db1fff/benchmark_sts_correlation.png)

![Biểu đồ đường - Độ chính xác](C:/Users/Lenovo/.gemini/antigravity/brain/a8477dcb-6bf7-4400-a910-1eaf34db1fff/accuracy_line_chart.png)
### 6.2. Tốc độ (sinh embedding 17.256 câu = 2×8.628, trên CPU)

| Mô hình | Tổng thời gian | ~Câu/giây | Chiều vector |
|---|---|---|---|
| **TF-IDF** | 13.2 s | **~1.307** | 8.000 |
| **bkai-bi-encoder** | 329.9 s | ~52 | 768 |
| **vietnamese-sbert** | 341.6 s | ~51 | 768 |
| **PhoBERT-CLS** | 419.6 s | ~41 | 768 |

![Biểu đồ đường - Tốc độ](C:/Users/Lenovo/.gemini/antigravity/brain/a8477dcb-6bf7-4400-a910-1eaf34db1fff/speed_line_chart.png)
> [!NOTE]
> TF-IDF nhanh vượt trội nhưng **chính xác kém** (0.685) → không đáng đổi. Trong nhóm deep, **vietnamese-sbert vừa chính xác nhất vừa nhanh hơn PhoBERT-CLS** (~51 so với ~41 câu/s). Trên GPU cả 3 model deep sẽ nhanh hơn nhiều lần và khoảng cách tốc độ thu hẹp.

---

## 7. Vì sao cách làm này hợp lý & đúng với cơ chế hệ thống

1. **Đo đúng thứ hệ thống dùng.** Luồng chấm trong [phobert_analyzer.py](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/ml-service/models/phobert_analyzer.py) cho điểm bằng **cosine** giữa embedding *đoạn báo cáo* và *tiêu chí*. STS đo **chính xác** năng lực đó: cosine có phản ánh độ giống nghĩa mà người cảm nhận không. Không thêm tầng huấn luyện nào che mất bản chất.
2. **Ground truth khách quan.** Điểm do **người** gán (không phải ta tự chấm) → tránh chủ quan; 8.628 cặp đủ lớn để con số ổn định.
3. **Công bằng tuyệt đối giữa các model.** Cùng dữ liệu, cùng bước tách từ, cùng phép cosine — chỉ khác *mô hình embedding*, nên chênh lệch phản ánh đúng năng lực mô hình.
4. **Giải thích được hiện tượng trong hệ thống thật.** `cos std` của PhoBERT chỉ **0.108** (mọi cặp dồn quanh ~0.86) ↔ đúng hiện tượng "điểm dồn cục" và là **lý do định lượng** vì sao production phải nhân hệ số ×1.5 để bù. SBERT có `cos std` ~0.26 (giãn ~2.4 lần) nên phân tách điểm tự nhiên, không cần bù.

---

## 8. Kết luận

> [!IMPORTANT]
> **Khách quan trên 8.628 cặp câu có điểm người gán:** `vietnamese-sbert` (Spearman **0.827**) là mô hình hiệu quả nhất cho luồng chấm dựa trên cosine — vừa chính xác nhất vừa nhanh hơn PhoBERT. `PhoBERT-CLS` đang dùng **kém nhất (0.319), thua cả baseline TF-IDF**, vì `[CLS]` thô không sinh ra để so cosine.

**Hướng tiếp theo (sẽ quyết định & thực hiện):**
1. **Tích hợp THÊM** mô hình chấm bằng `vietnamese-sbert`, cho người dùng **chọn linh hoạt** giữa các model (giữ PhoBERT để đối chứng).
2. **Fine-tune lại PhoBERT** (theo kiểu sentence-embedding / siamese) trên dữ liệu domain, rồi **chạy lại bài test này** để so công bằng sau fine-tune.
3. Khi có **báo cáo thật kèm điểm giảng viên**, bổ sung phép đo trên dữ liệu đó để nghiệm thu tuyệt đối.

---

### Phụ lục — Tái lập

```bash
pip install datasets sentence-transformers underthesea scikit-learn scipy matplotlib transformers torch
python ml-service/scripts/benchmark_sts.py --split all
# kết quả: Document/Day13-06-2026/benchmark_sts_table.md + benchmark_sts_correlation.png
```

**Tài liệu liên quan:** [báo cáo phân tích chi tiết](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/Document/Day13-06-2026/benchmark_sts_report.md) · [bảng kết quả](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/Document/Day13-06-2026/benchmark_sts_table.md)
