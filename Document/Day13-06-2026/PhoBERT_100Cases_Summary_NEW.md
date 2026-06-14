# Kết quả kiểm thử 100 Cases — PhoBERT Analyze Report (Production)

**Ngày chạy:** 13/06/2026 18:11:18
**API:** `http://ai.web3.giangvien.ifanit.io.vn/analyze-report`
**Threshold MATCH:** score > 5.0
**Công thức:** Base 5.0 + Keyword 1.5 + Semantic 2.5 - Repetition 3.0

---

## 1. Độ chính xác (Accuracy / F1-Score)

| Chỉ số | Giá trị | Phần trăm |
|---|---|---|
| **Tổng test cases** | 100 | — |
| MATCH cases | 59 | — |
| MISMATCH cases | 41 | — |
| True Positive (TP) | 58 | — |
| True Negative (TN) | 4 | — |
| False Positive (FP) | 37 | — |
| False Negative (FN) | 1 | — |
| **Accuracy** | **0.6200** | **62.00%** |
| **Precision** | **0.6105** | **61.05%** |
| **Recall** | **0.9831** | **98.31%** |
| **F1-Score** | **0.7532** | **75.32%** |

## 2. Throughput (Thời gian phản hồi)

| Chỉ số | Giá trị |
|---|---|
| **Trung bình** | **12021 ms** (12.0s) |
| Nhanh nhất (Min) | 5924 ms |
| Chậm nhất (Max) | 20471 ms |
| P50 (Median) | 11797 ms |
| P95 | 16364 ms |
| Tổng thời gian | 1202.1s (20.0 phút) |
| Throughput ước tính | ~5.0 req/phút |

## 3. Lỗi / Cảnh báo

| Chỉ số | Giá trị |
|---|---|
| Errors (timeout/HTTP) | 0 |
| Security flags triggered | 51/100 |
| Repetition rate > 20% | 4/100 |

## 4. Chi tiết từng case

| Case | Score | Expected | Predicted | Result | Time (ms) |
|---|---|---|---|---|---|
| Ca 1 | 6.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 11118 |
| Ca 2 | 7.89 | MATCH (1) | MATCH (1) | True Positive (TP) | 11314 |
| Ca 3 | 7.67 | MATCH (1) | MATCH (1) | True Positive (TP) | 9354 |
| Ca 4 | 8.96 | MATCH (1) | MATCH (1) | True Positive (TP) | 8486 |
| Ca 5 | 5.0 | MATCH (1) | MISMATCH (0) | False Negative (FN) | 5924 |
| Ca 6 | 5.35 | MATCH (1) | MATCH (1) | True Positive (TP) | 9551 |
| Ca 7 | 7.52 | MATCH (1) | MATCH (1) | True Positive (TP) | 10982 |
| Ca 8 | 7.49 | MATCH (1) | MATCH (1) | True Positive (TP) | 11139 |
| Ca 9 | 9.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 13282 |
| Ca 10 | 6.95 | MATCH (1) | MATCH (1) | True Positive (TP) | 12176 |
| Ca 11 | 7.67 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 10356 |
| Ca 12 | 7.64 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 10719 |
| Ca 13 | 6.33 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 10237 |
| Ca 14 | 7.44 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 8426 |
| Ca 15 | 8.66 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 12021 |
| Ca 16 | 9.0 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11647 |
| Ca 17 | 8.92 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11242 |
| Ca 18 | 6.33 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 9950 |
| Ca 19 | 5.0 | MISMATCH (0) | MISMATCH (0) | True Negative (TN) | 14208 |
| Ca 20 | 6.33 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 8543 |
| Ca 21 | 8.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 10447 |
| Ca 22 | 8.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 13407 |
| Ca 23 | 7.72 | MATCH (1) | MATCH (1) | True Positive (TP) | 11883 |
| Ca 24 | 8.91 | MATCH (1) | MATCH (1) | True Positive (TP) | 12037 |
| Ca 25 | 7.62 | MATCH (1) | MATCH (1) | True Positive (TP) | 6623 |
| Ca 26 | 8.97 | MATCH (1) | MATCH (1) | True Positive (TP) | 11492 |
| Ca 27 | 5.0 | MISMATCH (0) | MISMATCH (0) | True Negative (TN) | 10539 |
| Ca 28 | 7.97 | MATCH (1) | MATCH (1) | True Positive (TP) | 11890 |
| Ca 29 | 7.97 | MATCH (1) | MATCH (1) | True Positive (TP) | 13436 |
| Ca 30 | 8.91 | MATCH (1) | MATCH (1) | True Positive (TP) | 11141 |
| Ca 31 | 8.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 12255 |
| Ca 32 | 8.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 12422 |
| Ca 33 | 7.94 | MATCH (1) | MATCH (1) | True Positive (TP) | 12373 |
| Ca 34 | 6.33 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11701 |
| Ca 35 | 7.89 | MATCH (1) | MATCH (1) | True Positive (TP) | 13063 |
| Ca 36 | 9.0 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 12248 |
| Ca 37 | 7.91 | MATCH (1) | MATCH (1) | True Positive (TP) | 12505 |
| Ca 38 | 8.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 14347 |
| Ca 39 | 7.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 11068 |
| Ca 40 | 7.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 10799 |
| Ca 41 | 9.0 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 12368 |
| Ca 42 | 7.67 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11029 |
| Ca 43 | 9.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 15700 |
| Ca 44 | 9.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 11917 |
| Ca 45 | 6.33 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 12346 |
| Ca 46 | 8.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 12298 |
| Ca 47 | 7.62 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 15095 |
| Ca 48 | 5.0 | MISMATCH (0) | MISMATCH (0) | True Negative (TN) | 15501 |
| Ca 49 | 7.61 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11668 |
| Ca 50 | 8.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 10111 |
| Ca 51 | 7.97 | MATCH (1) | MATCH (1) | True Positive (TP) | 15008 |
| Ca 52 | 7.93 | MATCH (1) | MATCH (1) | True Positive (TP) | 14958 |
| Ca 53 | 7.49 | MATCH (1) | MATCH (1) | True Positive (TP) | 11298 |
| Ca 54 | 8.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 6231 |
| Ca 55 | 8.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 10481 |
| Ca 56 | 6.8 | MATCH (1) | MATCH (1) | True Positive (TP) | 13461 |
| Ca 57 | 8.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 8358 |
| Ca 58 | 8.9 | MATCH (1) | MATCH (1) | True Positive (TP) | 14001 |
| Ca 59 | 9.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 11561 |
| Ca 60 | 8.92 | MATCH (1) | MATCH (1) | True Positive (TP) | 11032 |
| Ca 61 | 7.67 | MATCH (1) | MATCH (1) | True Positive (TP) | 11150 |
| Ca 62 | 8.9 | MATCH (1) | MATCH (1) | True Positive (TP) | 11815 |
| Ca 63 | 9.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 12167 |
| Ca 64 | 9.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 11779 |
| Ca 65 | 5.0 | MISMATCH (0) | MISMATCH (0) | True Negative (TN) | 20187 |
| Ca 66 | 8.98 | MATCH (1) | MATCH (1) | True Positive (TP) | 14139 |
| Ca 67 | 8.97 | MATCH (1) | MATCH (1) | True Positive (TP) | 12381 |
| Ca 68 | 7.85 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11555 |
| Ca 69 | 8.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 11410 |
| Ca 70 | 7.64 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11064 |
| Ca 71 | 8.76 | MATCH (1) | MATCH (1) | True Positive (TP) | 13704 |
| Ca 72 | 7.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 11293 |
| Ca 73 | 6.21 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11164 |
| Ca 74 | 6.91 | MATCH (1) | MATCH (1) | True Positive (TP) | 12186 |
| Ca 75 | 7.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 12964 |
| Ca 76 | 7.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 13702 |
| Ca 77 | 6.89 | MATCH (1) | MATCH (1) | True Positive (TP) | 18215 |
| Ca 78 | 7.94 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 16364 |
| Ca 79 | 6.3 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 10344 |
| Ca 80 | 7.64 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11459 |
| Ca 81 | 6.33 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 7353 |
| Ca 82 | 8.97 | MATCH (1) | MATCH (1) | True Positive (TP) | 13457 |
| Ca 83 | 6.33 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 16351 |
| Ca 84 | 7.63 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 12837 |
| Ca 85 | 9.0 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11605 |
| Ca 86 | 8.97 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11751 |
| Ca 87 | 7.96 | MATCH (1) | MATCH (1) | True Positive (TP) | 9581 |
| Ca 88 | 7.56 | MATCH (1) | MATCH (1) | True Positive (TP) | 12037 |
| Ca 89 | 6.26 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 10922 |
| Ca 90 | 6.33 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11211 |
| Ca 91 | 9.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 20471 |
| Ca 92 | 8.94 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 12000 |
| Ca 93 | 6.29 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11562 |
| Ca 94 | 7.52 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 12545 |
| Ca 95 | 9.0 | MATCH (1) | MATCH (1) | True Positive (TP) | 12678 |
| Ca 96 | 6.33 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 18540 |
| Ca 97 | 8.94 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 11797 |
| Ca 98 | 6.33 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 8634 |
| Ca 99 | 7.67 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 13280 |
| Ca 100 | 7.67 | MISMATCH (0) | MATCH (1) | False Positive (FP) | 13667 |
