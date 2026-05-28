# Plan Phase 2 — Pipeline trích xuất nội dung PDF để AI chấm đúng bài

## Vấn đề hiện tại (CRITICAL)

Hệ thống hiện tại **không hề đọc nội dung file PDF mà sinh viên nộp**:

1. `backend/controllers/baoCaoController.js:89` — chỉ upload file lên IPFS rồi **xóa file tạm**, không extract text.
2. `backend/models/BaoCao.js` — schema chỉ có `IPFS_CID`, không có field `ExtractedText`.
3. `frontend/src/components/lecturer/SubmissionReview.js:187` — `textForAI` được build từ metadata đề tài (`TenDeTai + MoTa + YeuCau`).
4. `backend/package.json` — không có thư viện PDF parsing (`pdf-parse`, `pdfjs-dist`...).
5. `ml-service/requirements.txt` — không có `pdfplumber`, `PyPDF2`, `pytesseract`.

**Hậu quả**: AI chấm điểm dựa trên mô tả đề tài, không phải nội dung bài làm thực của sinh viên.

## Kiến trúc đề xuất

Logic extract PDF đặt ở **ml-service (Python)** vì hệ sinh thái PDF parsing Python mạnh hơn Node.js và gần với PhoBERT.

```
[SV nộp PDF]
     ↓
baoCaoController.uploadBaoCao (backend)
     ├── 1. Upload IPFS → lấy CID (như cũ)
     ├── 2. [THÊM MỚI] Gọi ml-service POST /extract-pdf với file binary
     │        └── Trả về { text, page_count, method, warnings }
     ├── 3. [THÊM MỚI] Lưu ExtractedText vào BaoCao document
     └── 4. Xóa file tạm (như cũ)

[GV chấm điểm]
SubmissionReview.js → lấy baoCao.ExtractedText từ API → gửi sang AI
```

---

## Task 2.1 — ml-service: Thêm thư viện PDF

**File**: `ml-service/requirements.txt`

Thêm vào cuối:
```
pdfplumber>=0.11.0
PyMuPDF>=1.24.0
pytesseract>=0.3.13
Pillow>=10.0.0
```

> **Lưu ý môi trường**: `pytesseract` cần Tesseract binary cài trên OS. Trong `README.md` của ml-service, thêm hướng dẫn: `apt-get install tesseract-ocr tesseract-ocr-vie` (Linux) hoặc tải installer trên Windows. Nếu môi trường không cài được Tesseract thì OCR sẽ bị skip, native parsing vẫn chạy bình thường.

---

## Task 2.2 — ml-service: Tạo `utils/pdf_extractor.py`

**File mới**: `ml-service/utils/pdf_extractor.py`

```python
import io
import logging
import pdfplumber
import fitz  # PyMuPDF

logger = logging.getLogger('ml-service')

def extract_pdf_text(file_bytes: bytes) -> dict:
    """
    Trích xuất toàn bộ text từ PDF bytes.
    Ưu tiên native text; fallback sang OCR nếu text quá ít.
    
    Returns:
        {
            text: str,           # toàn bộ text
            page_count: int,
            method: 'native' | 'ocr' | 'failed',
            warnings: list[str]  # hidden text, injection hints, etc.
        }
    """
    warnings = []
    
    # === Bước 1: Native parse với pdfplumber ===
    try:
        pages_text = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                page_text = page.extract_text() or ''
                pages_text.append(page_text)
                
                # Kiểm tra hidden text (font size < 1)
                try:
                    for char in (page.chars or []):
                        if float(char.get('size', 12)) < 1:
                            warnings.append(f'Phát hiện text ẩn trang {page.page_number}')
                            break
                except Exception:
                    pass
        
        native_text = '\n\n'.join(pages_text).strip()
    except Exception as e:
        logger.error(f'[PDF] pdfplumber failed: {e}')
        native_text = ''
        page_count = 0

    # Nếu native text đủ dài → dùng luôn
    if len(native_text) >= 200:
        _check_injection_hints(native_text, warnings)
        return {
            'text': native_text,
            'page_count': page_count,
            'method': 'native',
            'warnings': warnings
        }
    
    # === Bước 2: OCR fallback ===
    try:
        import pytesseract
        from PIL import Image
        
        doc = fitz.open(stream=file_bytes, filetype='pdf')
        page_count = len(doc)
        ocr_pages = []
        
        for page_num in range(page_count):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=200)
            img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
            ocr_text = pytesseract.image_to_string(img, lang='vie+eng')
            ocr_pages.append(ocr_text)
        
        doc.close()
        ocr_result = '\n\n'.join(ocr_pages).strip()
        
        if len(ocr_result) >= 50:
            warnings.append('File PDF dạng scan - đã dùng OCR để đọc nội dung')
            _check_injection_hints(ocr_result, warnings)
            return {
                'text': ocr_result,
                'page_count': page_count,
                'method': 'ocr',
                'warnings': warnings
            }
    except ImportError:
        warnings.append('OCR không khả dụng (Tesseract chưa cài)')
    except Exception as e:
        logger.error(f'[PDF] OCR failed: {e}')
        warnings.append(f'OCR thất bại: {str(e)}')
    
    # === Thất bại ===
    return {
        'text': '',
        'page_count': page_count,
        'method': 'failed',
        'warnings': warnings + ['Không thể đọc nội dung file PDF']
    }


def _check_injection_hints(text: str, warnings: list):
    """Phát hiện dấu hiệu prompt injection trong text."""
    import re
    injection_patterns = [
        r'(hãy|please|vui lòng).{0,40}(chấm|cho|give|grade|score|đánh giá).{0,40}(10|100|max|cao nhất|tối đa)',
        r'(bỏ qua|ignore|disregard).{0,30}(rubric|tiêu chí|hướng dẫn|instruction)',
        r'(điểm|score)\s*(=|:)?\s*(10|100|tối đa|maximum)',
        r'system\s*prompt|forget.{0,20}previous',
    ]
    for pattern in injection_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            warnings.append(f'Cảnh báo: phát hiện nội dung có thể là prompt injection')
            break
```

---

## Task 2.3 — ml-service: Thêm endpoint `/extract-pdf`

**File**: `ml-service/routes/extract_pdf.py` (tạo mới)

```python
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException

from utils.pdf_extractor import extract_pdf_text

logger = logging.getLogger('ml-service')
router = APIRouter()

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

@router.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    if not file.content_type or 'pdf' not in file.content_type.lower():
        raise HTTPException(status_code=400, detail='Chỉ chấp nhận file PDF')
    
    file_bytes = await file.read()
    
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail='File rỗng')
    
    # Kiểm tra magic bytes
    if not file_bytes.startswith(b'%PDF'):
        raise HTTPException(status_code=400, detail='File không hợp lệ (không phải PDF)')
    
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail='File quá lớn (tối đa 20MB)')
    
    logger.info(f'[EXTRACT] Processing PDF | size={len(file_bytes)} bytes | name={file.filename}')
    
    result = extract_pdf_text(file_bytes)
    
    logger.info(f'[EXTRACT] Done | method={result["method"]} | pages={result["page_count"]} | textLen={len(result["text"])} | warnings={len(result["warnings"])}')
    
    return result
```

**File**: `ml-service/app.py` — thêm import và include router:
```python
from routes.extract_pdf import router as extract_pdf_router
# ...
app.include_router(extract_pdf_router)
```

---

## Task 2.4 — backend: Mở rộng schema BaoCao

**File**: `backend/models/BaoCao.js`

Thêm các field mới vào schema (sau field `NgayNop`):

```javascript
ExtractedText: { type: String, default: null },
ExtractedAt: { type: Date, default: null },
PageCount: { type: Number, default: null },
ExtractionMethod: { 
    type: String, 
    enum: ['native', 'ocr', 'failed', null], 
    default: null 
},
ExtractionWarnings: { type: [String], default: [] }
```

---

## Task 2.5 — backend: Thêm hàm `extractPdf` vào aiService

**File**: `backend/services/aiService.js`

Thêm vào cuối file:

```javascript
const FormData = require('form-data');
const fs = require('fs');

const EXTRACT_PDF_ENDPOINT = process.env.ML_SERVICE_URL 
    ? `${process.env.ML_SERVICE_URL}/extract-pdf` 
    : 'http://127.0.0.1:8001/extract-pdf';

exports.extractPdf = async (filePath) => {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath), {
            filename: 'report.pdf',
            contentType: 'application/pdf'
        });
        
        const response = await axios.post(EXTRACT_PDF_ENDPOINT, form, {
            headers: form.getHeaders(),
            timeout: 120000 // 2 phút cho OCR
        });
        
        return response.data; // { text, page_count, method, warnings }
    } catch (error) {
        logger.warn(`[AI] PDF extraction failed: ${error.message}`);
        return { text: '', page_count: 0, method: 'failed', warnings: [error.message] };
    }
};
```

**Lưu ý**: Cài thêm `form-data` nếu chưa có trong package.json: `npm install form-data`.

---

## Task 2.6 — backend: Sửa baoCaoController để extract sau upload

**File**: `backend/controllers/baoCaoController.js`

Thêm `require('../services/aiService')` ở đầu file (nếu chưa có).

Sửa đoạn sau dòng `ipfsCid = ipfsResult.IpfsHash;` (line ~90), **trước** dòng `const payload = acceptedMembers.map(...)`:

```javascript
// [MỚI] Extract text từ PDF trước khi xóa file tạm
let extractionResult = { text: '', page_count: 0, method: 'failed', warnings: [] };
try {
    const aiService = require('../services/aiService');
    extractionResult = await aiService.extractPdf(req.file.path);
    logger.info(`[REPORT] PDF extracted | method=${extractionResult.method} | pages=${extractionResult.page_count} | textLen=${extractionResult.text.length}`);
    if (extractionResult.warnings.length > 0) {
        logger.warn(`[REPORT] PDF warnings: ${extractionResult.warnings.join('; ')}`);
    }
} catch (extractErr) {
    logger.warn(`[REPORT] PDF extraction skipped: ${extractErr.message}`);
}
```

Sửa `const payload = acceptedMembers.map(tv => ({` để thêm các field mới:

```javascript
const payload = acceptedMembers.map(tv => ({
    DeTai: deTaiId,
    SinhVien: tv.SinhVien,
    TieuDe: tieuDe || 'Báo cáo đồ án',
    IPFS_CID: ipfsCid,
    // [MỚI]
    ExtractedText: extractionResult.text || null,
    ExtractedAt: extractionResult.text ? new Date() : null,
    PageCount: extractionResult.page_count || null,
    ExtractionMethod: extractionResult.method || null,
    ExtractionWarnings: extractionResult.warnings || []
}));
```

---

## Task 2.7 — frontend: Sửa SubmissionReview để dùng ExtractedText

**File**: `frontend/src/components/lecturer/SubmissionReview.js`

Tìm đoạn build `textForAI` từ metadata (khoảng line 187):

```javascript
const textForAI = `Báo cáo Đồ án: ${topic?.TenDeTai || ''}.
${topic?.MoTa || ''}. 
Sinh viên sử dụng: ${(topic?.YeuCau || []).join(', ')}.`;
```

Thay bằng logic ưu tiên `ExtractedText`:

```javascript
const extractedText = submission?.baoCao?.ExtractedText;
const metadataFallback = [
    `Đề tài: ${topic?.TenDeTai || ''}`,
    topic?.MoTa ? `Mô tả: ${topic.MoTa}` : '',
    (topic?.YeuCau || []).length > 0 ? `Yêu cầu: ${topic.YeuCau.join(', ')}` : ''
].filter(Boolean).join('\n');

const textForAI = extractedText || metadataFallback;

// Hiển thị cảnh báo nếu dùng fallback
const isUsingFallback = !extractedText;
```

Thêm UI cảnh báo khi dùng fallback (ví dụ Ant Design Alert):

```jsx
{isUsingFallback && (
    <Alert
        type="warning"
        message="Chưa trích xuất được nội dung PDF"
        description="AI đang chấm dựa trên mô tả đề tài, không phải nội dung báo cáo thực tế. Điểm có thể không chính xác."
        showIcon
        style={{ marginBottom: 12 }}
    />
)}
{!isUsingFallback && submission?.baoCao?.ExtractionMethod && (
    <Alert
        type="success"
        message={`Đã đọc ${submission.baoCao.PageCount || '?'} trang PDF (${submission.baoCao.ExtractionMethod === 'ocr' ? 'OCR' : 'native'})`}
        showIcon
        style={{ marginBottom: 12 }}
    />
)}
```

---

## Task 2.8 — Script backfill cho báo cáo cũ (tùy chọn)

**File mới**: `backend/scripts/backfill-pdf-extraction.js`

Script này sẽ:
1. Lấy tất cả BaoCao có `ExtractedText = null` (báo cáo cũ).
2. Với mỗi báo cáo: tải file từ IPFS → extract → cập nhật DB.

```javascript
// Chạy: node scripts/backfill-pdf-extraction.js
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const connectDB = require('../config/db');
const BaoCao = require('../models/BaoCao');
const ipfsService = require('../services/ipfsService');
const aiService = require('../services/aiService');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

async function run() {
    await connectDB();
    const unprocessed = await BaoCao.find({ ExtractedText: null }).lean();
    logger.info(`[BACKFILL] Found ${unprocessed.length} reports without extracted text`);
    
    for (const bc of unprocessed) {
        try {
            // Tải từ IPFS về temp file
            const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${bc.IPFS_CID}`;
            const response = await axios.get(ipfsUrl, { responseType: 'arraybuffer', timeout: 30000 });
            const tmpPath = path.join(__dirname, '../uploads/reports', `backfill-${bc._id}.pdf`);
            fs.writeFileSync(tmpPath, Buffer.from(response.data));
            
            const result = await aiService.extractPdf(tmpPath);
            fs.unlinkSync(tmpPath);
            
            await BaoCao.findByIdAndUpdate(bc._id, {
                ExtractedText: result.text || null,
                ExtractedAt: result.text ? new Date() : null,
                PageCount: result.page_count || null,
                ExtractionMethod: result.method,
                ExtractionWarnings: result.warnings
            });
            logger.info(`[BACKFILL] OK ${bc._id} | method=${result.method} | pages=${result.page_count}`);
        } catch (err) {
            logger.error(`[BACKFILL] FAILED ${bc._id}: ${err.message}`);
        }
    }
    
    await mongoose.disconnect();
    logger.info('[BACKFILL] Done');
}

run();
```

---

## Verification

1. Nộp 1 file PDF test (có text) → kiểm tra MongoDB `BaoCao.ExtractedText` có nội dung.
2. Nộp 1 file PDF scan (chỉ ảnh) → kiểm tra `ExtractionMethod = 'ocr'`.
3. Vào màn hình chấm điểm GV → kiểm tra badge "Đã đọc X trang" hiển thị.
4. Thử nộp file .exe đổi extension → phải bị reject (magic bytes check).

## Effort
5-7 ngày dev + test.
