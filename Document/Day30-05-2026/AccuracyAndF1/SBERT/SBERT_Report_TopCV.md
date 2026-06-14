# Kết quả kiểm thử SBERT (Recommendation) - Dữ liệu TopCV

**Số lượng sinh viên:** 100
**Số lượng đề tài:** 100
**Mỗi sinh viên được SBERT xếp hạng trên tổng số 100 đề tài.**

## Chỉ số Ranking (Hệ Recommendation)
| Metric | Ý nghĩa | Giá trị |
|---|---|---|
| **Hit@1** | Gợi ý top 1 trúng ngay đề tài phù hợp | **27.0%** |
| **Hit@3** | Đề tài phù hợp nằm trong top 3 gợi ý | **42.0%** |
| **Hit@5** | Đề tài phù hợp nằm trong top 5 gợi ý | **46.0%** |
| **MRR** | Mean Reciprocal Rank (Càng gần 1 càng tốt) | **0.3772** |

## Throughput
- Thời gian trung bình 1 request (Match 1 SV với 100 Đề tài): **11590 ms**
