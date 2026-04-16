# 📋 Kế Hoạch Ghi Log — Hệ Thống Web3 Quản Lý Đồ Án

## Bối cảnh

Trong `implementation_planFix.md`, quyết định #2 nói **"❌ KHÔNG TẠO TransactionLog/AuthLog/ActionLog"** — đó là nói về việc **lưu log vào Database** (vì Blockchain đã đóng vai trò audit trail minh bạch). 

Tuy nhiên, **Application-level logging** (ghi file log trên server) vẫn là best practice bắt buộc cho:
- **Debug/Troubleshoot** khi production gặp lỗi
- **Monitor** hiệu năng hệ thống (API response time, AI inference time)
- **Audit** ai đã làm gì (ghi file, không phải DB)
- **Yêu cầu đồ án** — chứng minh hệ thống có cơ chế logging chuyên nghiệp

> [!IMPORTANT]
> **Khác biệt quan trọng:**
> - ❌ Database Log (ActionLog model) → Không tạo → đúng triết lý Web3
> - ✅ File-based Log (Winston) → **CẦN TẠO** → chuẩn production

---

## Thiết kế Logging

### Thư viện chọn

| Layer | Thư viện | Lý do |
|-------|----------|-------|
| **Backend (Node.js)** | **Winston** + **Morgan** | Winston = structured JSON log, Morgan = HTTP request log |
| **ML Service (Python)** | **logging** (built-in) | Có sẵn, chuẩn Python, kết hợp Uvicorn |

### 5 Loại Log

| # | Loại | Mô tả | Ví dụ |
|---|------|-------|-------|
| 1 | **HTTP Request** | Mọi API request đến server | `POST /api/detai 201 45ms` |
| 2 | **Business Action** | Hành động nghiệp vụ quan trọng | `[TOPIC] GV "abc" tạo đề tài "XYZ"` |
| 3 | **AI/ML** | Gọi PhoBERT, kết quả phân tích | `[AI] Rubrics analysis: 5 criteria, score=7.8, 3200ms` |
| 4 | **Blockchain** | Giao dịch on-chain | `[BLOCKCHAIN] finalizeGrade txHash=0x... gas=45000` |
| 5 | **Error** | Lỗi hệ thống, exceptions | `[ERROR] MongoDB timeout after 30s` |

### Log Levels

```
error   → Lỗi nghiêm trọng (DB disconnect, blockchain fail)
warn    → Cảnh báo (AI timeout, template immutability block)
info    → Hành động nghiệp vụ (tạo đề tài, chấm điểm, đăng ký)
http    → HTTP requests (Morgan)
debug   → Chi tiết debug (embedding vectors, similarity scores)
```

### Output Format

```
2026-04-16 10:30:15 [INFO]  [TOPIC] Tạo đề tài "Ứng dụng AI..." bởi GV 6614abc... | Rubrics: 5 tiêu chí
2026-04-16 10:30:16 [INFO]  [AI] Rubrics analysis completed | criteria=5 | chunks=8 | score=7.82 | time=3215ms
2026-04-16 10:30:17 [INFO]  [BLOCKCHAIN] finalizeGrade | student=6614def... | grade=8.5 | txHash=0xabc...
2026-04-16 10:30:18 [ERROR] [AI] PhoBERT service unreachable | port=8001 | retry=3
```

### File Rotation

```
backend/logs/
├── combined.log      ← Tất cả log (info+)
├── error.log         ← Chỉ error
├── http.log          ← HTTP requests (Morgan)
└── ai.log            ← AI/ML specific

ml-service/logs/
├── ml-service.log    ← Tất cả ML log
└── error.log         ← Chỉ error
```

- Rotation: **10MB** per file, giữ tối đa **5 files** cũ
- Logs directory tự tạo khi server khởi động

---

## Proposed Changes

### Backend (Node.js)

---

#### [NEW] `backend/config/logger.js`

Module trung tâm dùng Winston:

```javascript
const winston = require('winston');
const path = require('path');

const logDir = path.join(__dirname, '..', 'logs');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ' | ' + JSON.stringify(meta) : '';
      return `${timestamp} [${level.toUpperCase()}]  ${message}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.colorize({ all: true }) }),
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error', maxsize: 10485760, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log'), maxsize: 10485760, maxFiles: 5 }),
  ]
});

module.exports = logger;
```

---

#### [MODIFY] `backend/server.js`

- Import logger + Morgan
- Thay `console.log` → `logger.info`
- Thêm Morgan middleware ghi HTTP request log

---

#### [MODIFY] `backend/config/db.js`

- Thay `console.log/error` → `logger.info/error`

---

#### [MODIFY] `backend/controllers/rubricsController.js`

Thêm log cho các hành động Rubrics:
```
logger.info(`[RUBRICS] Template "${template.TenMau}" created by GV ${GiangVien}`);
logger.warn(`[RUBRICS] Blocked edit on applied template ${id} (DaApDung=true)`);
logger.info(`[RUBRICS] Template "${template.TenMau}" applied to topic "${deTai.TenDeTai}"`);
```

---

#### [MODIFY] `backend/controllers/deTaiController.js`

```
logger.info(`[TOPIC] Created "${body.TenDeTai}" by GV ${body.GiangVienHuongDan} | Rubrics: ${body.SuDungRubrics}`);
logger.info(`[TOPIC] Deleted topic ${topicId}`);
logger.info(`[TOPIC] Registration ${registrationId} approved`);
```

---

#### [MODIFY] `backend/controllers/diemSoController.js`

```
logger.info(`[GRADE] Student ${sinhVienId} graded ${diem}/10 for topic ${deTaiId} | AI: ${aiScore} | txHash: ${txHash}`);
logger.error(`[GRADE] Failed to grade student ${sinhVienId}: ${err.message}`);
```

---

#### [MODIFY] `backend/controllers/aiController.js`

```
logger.info(`[AI] Report analysis requested | textLength=${text.length}`);
logger.info(`[AI] Rubrics analysis requested | criteria=${rubrics.length}`);
logger.error(`[AI] Analysis failed: ${err.message}`);
```

---

#### [MODIFY] `backend/services/aiService.js`

```
logger.info(`[AI] Calling FastAPI /analyze-report | textLength=${text.length}`);
logger.info(`[AI] Calling FastAPI /analyze-with-rubrics | criteria=${rubrics.length}`);
logger.info(`[AI] Response received | score=${data.score} | time=${elapsed}ms`);
```

---

#### [MODIFY] `backend/services/thesisContractService.js`

```
logger.info(`[BLOCKCHAIN] submitReport | student=${studentDID} | topic=${topicId} | cid=${ipfsCID}`);
logger.info(`[BLOCKCHAIN] finalizeGrade | student=${studentDID} | grade=${grade} | txHash=${receipt.transactionHash}`);
logger.error(`[BLOCKCHAIN] Transaction failed: ${err.message}`);
```

---

#### [MODIFY] `backend/controllers/baoCaoController.js`

```
logger.info(`[REPORT] Uploaded by student ${sinhVienId} | topic=${deTaiId} | CID=${ipfsCid}`);
logger.info(`[REPORT] Group report created for ${memberCount} members`);
```

---

### ML Service (Python)

---

#### [NEW] `ml-service/utils/log_config.py`

```python
import logging
import os

def setup_logging():
    log_dir = os.path.join(os.path.dirname(__file__), '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(os.path.join(log_dir, 'ml-service.log'), encoding='utf-8'),
        ]
    )
    return logging.getLogger('ml-service')
```

---

#### [MODIFY] `ml-service/app.py`

- Import và gọi `setup_logging()` tại startup

---

#### [MODIFY] `ml-service/models/phobert_analyzer.py`

- Thay `print()` → `logger.info()`
- Thêm log cho inference time, chunk count, similarity scores

---

#### [MODIFY] `ml-service/routes/analyze.py`

- Log mỗi request đến + kết quả trả về

---

## Tổng kết thay đổi

| Layer | Files mới | Files sửa |
|-------|-----------|-----------|
| **Backend** | `config/logger.js` | `server.js`, `config/db.js`, 5 controllers, 2 services |
| **ML Service** | `utils/log_config.py` | `app.py`, `phobert_analyzer.py`, `analyze.py` |
| **Dependencies** | `npm i winston morgan` | — |

## Verification Plan

1. Khởi động backend → Kiểm tra `logs/combined.log` tạo được
2. Gọi API tạo đề tài → Kiểm tra log `[TOPIC]` xuất hiện
3. Gọi AI analyze → Kiểm tra log `[AI]` với thời gian inference
4. Chấm điểm → Kiểm tra log `[GRADE]` + `[BLOCKCHAIN]`
5. Trigger lỗi (tắt ML service) → Kiểm tra `logs/error.log`
