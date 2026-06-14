# Dataset cho hệ thống AES Phase 1

## Tổng quan
- **Tổng số chunk:** 124
- **Train:** 74 chunks (59.7%)
- **Validation:** 25 chunks (20.2%)
- **Test:** 25 chunks (20.2%)

## Files
- `train_dataset.json/csv` - Training data
- `val_dataset.json/csv` - Validation data  
- `test_dataset.json/csv` - Test data
- `dataset_statistics.json` - Thống kê chi tiết

## Format dữ liệu
Mỗi chunk có:
- `text`: Nội dung văn bản
- `score`: Điểm số (0-10)
- `grammar_error`: Lỗi ngữ pháp (0/1)
- `technical_error`: Lỗi thuật ngữ kỹ thuật (0/1)
- `logic_error`: Lỗi logic (0/1)
- `structure_error`: Lỗi cấu trúc (0/1)

## Thống kê điểm số
- **Overall:** 7.02 ± 1.18
- **Train:** 7.04 ± 1.20
- **Val:** 7.15 ± 1.20
- **Test:** 6.85 ± 1.05

## Tỷ lệ lỗi
- **Grammar:** 53.2%
- **Technical:** 45.2%
- **Logic:** 41.1%
- **Structure:** 50.8%

## Sử dụng
```python
import json
import pandas as pd

# Load JSON
with open('train_dataset.json', 'r', encoding='utf-8') as f:
    train_data = json.load(f)

# Load CSV
train_df = pd.read_csv('train_dataset.csv')
```
