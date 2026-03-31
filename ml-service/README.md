# ML Service - PhoBERT & SBERT Scaffold

Service này đã được dựng theo cấu trúc giai đoạn 4.2:

- `app.py`
- `requirements.txt`
- `models/phobert_analyzer.py`
- `models/sbert_matcher.py`
- `routes/analyze.py`
- `routes/match.py`
- `utils/text_preprocessing.py`

## Chạy service

### 1) Cài dependencies

```bash
cd ml-service
pip install -r requirements.txt
```

### 2) Start FastAPI

```bash
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

## Endpoints

### Health check

`GET /healthz`

### Analyze report (PhoBERT flow)

`POST /analyze-report`

Body mẫu:

```json
{
  "text": "Noi dung bao cao tieng Viet...",
  "topic_requirements": ["NLP", "Blockchain"]
}
```

### Match student (SBERT flow)

`POST /match-student`

Body mẫu:

```json
{
  "student": {
    "gpa": 3.2,
    "major_scores": {
      "nlp": 8.0,
      "web3": 7.5
    }
  },
  "topics": [
    {
      "topic_id": "DT001",
      "requirements": ["NLP", "Transformers"]
    }
  ]
}
```

## Lưu ý quan trọng

- Bản hiện tại là scaffold chạy được API contract để tích hợp backend nhanh.
- `models/phobert_analyzer.py` và `models/sbert_matcher.py` đang dùng scoring logic nhẹ để tránh phụ thuộc nặng khi bootstrap.
- Bạn có thể thay thế logic này bằng infer thật từ Hugging Face hoặc model local ở bước nâng cấp tiếp theo.

