# Task: Triển Khai Rubrics Chấm Điểm

## Sprint 1: Backend + ML

- [x] R1.1 — Model `RubricsTemplate.js` mới
- [x] R1.2 — Mở rộng model `DeTai.js` thêm `Rubrics[]` + `HienThiChiTietChoSV`
- [x] R1.3 — Mở rộng model `DiemSo.js` thêm `RubricsResult[]`
- [x] R1.4 — Controller `rubricsController.js` CRUD + guard immutability
- [x] R1.5 — Sửa `deTaiController.js` validate Rubrics + update template usage
- [x] R1.6 — Sửa `diemSoController.js` lưu RubricsResult
- [x] R1.7 — ML: `pdf_chunker.py` module chunking
- [x] R1.8 — ML: `phobert_analyzer.py` thêm `analyze_with_rubrics()`
- [x] R1.9 — ML: route `/analyze-with-rubrics`
- [x] R1.10 — Backend: `aiService.js` + `aiController.js` + routes mới trong `server.js`

## Sprint 2: Frontend

- [x] R2.1 — Frontend `aiService.js`: thêm API calls Rubrics
- [x] R2.2 — `RubricsManagement.js`: Tab quản lý Rubrics Template
- [x] R2.3 — `TopicManagement.js`: Form chọn/nhập Rubrics + toggle SV visibility
- [x] R2.4 — `SubmissionReview.js`: Hiển thị chấm theo Rubrics + matched chunks
- [x] R2.5 — `MainLayout.js` + `App.js`: Thêm route/tab "Quản Lý Rubrics"

## Verification

- [/] Build frontend kiểm tra syntax/compile
