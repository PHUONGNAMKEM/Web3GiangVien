# Benchmark AES — so sánh model trên điểm người chấm

- Dataset: `combined_dataset.csv` | số mẫu: **99** | thang điểm: 5.02191–8.91249 | CV: 5-fold
- Quy trình: embedding → Ridge regression (cross-validation) → so với điểm người.

| Mô hình | Pearson ↑ | Spearman ↑ | QWK ↑ | MAE ↓ | RMSE ↓ | Chiều | Thời gian (s) |
|---|---|---|---|---|---|---|---|
| TF-IDF (baseline) | -0.123 | -0.121 | -0.114 | 1.130 | 1.326 | 3017 | 1.7 |
| PhoBERT-CLS (hiện tại) | -0.136 | -0.177 | -0.081 | 1.508 | 1.772 | 768 | 30.4 |
| PhoBERT-window (production) | -0.062 | -0.080 | -0.041 | 1.393 | 1.681 | 768 | 44.6 |
| vietnamese-sbert | 0.056 | 0.094 | 0.112 | 1.326 | 1.723 | 768 | 31.5 |
| bkai-bi-encoder | 0.037 | 0.032 | 0.003 | 1.278 | 1.592 | 768 | 30.3 |

**Model hiệu quả nhất (QWK cao nhất): `vietnamese-sbert`** (QWK=0.112, Pearson=0.056, MAE=1.326).

