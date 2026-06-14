# Benchmark STS tiếng Việt — so sánh model trên điểm tương đồng do người gán

- Dataset: `vi-stsbenchmark` | split: **all** | số cặp: **8628** | thang điểm: 0–5
- Quy trình: embed 2 câu → cosine → so với điểm người (KHÔNG train — giống production).
- **Spearman** là chỉ số chính của STS (đo model xếp hạng độ giống có khớp người không).

| Mô hình | Spearman ↑ | Pearson ↑ | MAE ↓ | RMSE ↓ | cos mean | cos std | Chiều | Thời gian (s) |
|---|---|---|---|---|---|---|---|---|
| TF-IDF (baseline) | 0.6847 | 0.6984 | 0.861 | 1.123 | 0.479 | 0.263 | 8000 | 13.2 |
| PhoBERT-CLS (hiện tại) | 0.3188 | 0.2856 | 1.779 | 2.196 | 0.859 | 0.108 | 768 | 419.6 |
| vietnamese-sbert | 0.8266 | 0.8390 | 0.712 | 0.913 | 0.609 | 0.261 | 768 | 341.6 |
| bkai-bi-encoder | 0.7312 | 0.7488 | 0.833 | 1.048 | 0.595 | 0.242 | 768 | 329.9 |

**Model hiệu quả nhất (Spearman cao nhất): `vietnamese-sbert`** (Spearman=0.8266 = 82.7/100, Pearson=0.8390).

