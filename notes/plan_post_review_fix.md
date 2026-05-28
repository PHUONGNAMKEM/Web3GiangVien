# Plan Fix sau Review 4 Phase

## Tổng quan

Sau khi review 4 phase đã triển khai, phát hiện:
- **3 lỗi CRITICAL** chặn flow (INTERNAL_TOKEN mismatch, AILog không được dùng, token leak log)
- **3 lỗi HIGH** (CORS backend, text HR còn sót, payload size)
- **6 lỗi MEDIUM** (cleanup file tạm, rate limit, UX)

Plan này chia 3 task riêng biệt theo độ ưu tiên.

---

## TASK A — Fix CRITICAL (ưu tiên cao nhất, phải fix ngay)

### A.1 — Đồng nhất INTERNAL_TOKEN giữa backend & ml-service

**File 1**: [backend/.env.example](../backend/.env.example#L21)

Đổi dòng:
```
INTERNAL_TOKEN=your-random-secret-here
```
thành:
```
INTERNAL_TOKEN=wgv-internal-security-secret-key-2026
```

Hoặc cách an toàn hơn — thêm comment hướng dẫn:
```
# QUAN TRỌNG: Token này PHẢI khớp với INTERNAL_TOKEN ở ml-service/.env
# Sinh token mới: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
INTERNAL_TOKEN=wgv-internal-security-secret-key-2026
```

**File 2**: [ml-service/.env.example](../ml-service/.env.example)

Thêm comment tương tự:
```
# QUAN TRỌNG: Token này PHẢI khớp với INTERNAL_TOKEN ở backend/.env
BACKEND_URL=http://localhost:5000
INTERNAL_TOKEN=wgv-internal-security-secret-key-2026
```

**Verification**:
- Copy 2 file `.env.example` → `.env`, không sửa gì → restart backend + ml-service
- Test endpoint chấm điểm → phải trả về kết quả AI (không phải 403)

### A.2 — Triển khai AILog.create() thực sự

**File**: [backend/controllers/diemSoController.js](../backend/controllers/diemSoController.js)

Sau dòng 247 (`await checkAndCompleteTopic(deTaiId);`), trước `logger.info`, thêm:

```javascript
        // === Audit Log AI scoring ===
        try {
            const aiScoreNum = Number(aiScore);
            const extractedText = baoCao.ExtractedText || '';
            const textHash = extractedText 
                ? crypto.createHash('sha256').update(extractedText).digest('hex')
                : null;
            
            await AILog.create({
                BaoCao: baoCao._id,
                DeTai: deTaiId,
                SinhVien: sinhVienId,
                TextHash: textHash,
                TextLength: extractedText.length,
                ScoreResult: {
                    aiScore: aiScoreNum,
                    aiFeedback,
                    rubricsResult: rubricsResult || [],
                    finalScore: diem
                },
                SecurityFlags: aiFeedback?.security_flags || [],
                InjectionDetected: (aiFeedback?.security_flags || []).some(f => 
                    typeof f === 'string' && f.toLowerCase().includes('injection')
                ),
                RepetitionRate: aiFeedback?.repetition_rate || null,
                ExtractionMethod: baoCao.ExtractionMethod || null,
                TimeTakenMs: 0  // có thể thêm nếu đo
            });
        } catch (logErr) {
            logger.warn(`[AILOG] Failed to save audit log: ${logErr.message}`);
        }
```

**Lưu ý**: Field `aiFeedback` đang được lưu là string từ ml-service. Nếu muốn dùng `security_flags` thì frontend phải gửi cả `security_flags` riêng. Sửa thêm: 

Trong [frontend/src/components/lecturer/SubmissionReview.js](../frontend/src/components/lecturer/SubmissionReview.js) handleBlockchainMint (~line 266), thêm vào payload:

```javascript
const payload = {
    // ... fields hiện tại
    aiSecurityFlags: aiAnalysis?.security_flags || [],
    aiRepetitionRate: aiAnalysis?.repetition_rate || null,
};
```

Và sửa diemSoController nhận từ `req.body.aiSecurityFlags`:
```javascript
const { ..., aiSecurityFlags, aiRepetitionRate } = req.body;
// ...
SecurityFlags: aiSecurityFlags || [],
InjectionDetected: (aiSecurityFlags || []).some(f => f.toLowerCase().includes('injection')),
RepetitionRate: aiRepetitionRate || null,
```

Frontend SubmissionReview cũng cần capture `aiResult.security_flags` khi nhận response:
```javascript
setAiAnalysis({
    score: aiResult.score,
    feedback: aiResult.feedback,
    security_flags: aiResult.security_flags || [],
    repetition_rate: aiResult.repetition_rate || null,
    // ...
});
```

### A.3 — Redact token trong log ml-service

**File**: [ml-service/app.py:47](../ml-service/app.py#L47)

Đổi:
```python
logger.warning(f"[SECURITY] Unauthorized access blocked | path={path} | token={token}")
```

thành:
```python
# Chỉ log prefix 4 ký tự để debug, không leak full token
token_preview = (token[:4] + '****') if token else 'NONE'
logger.warning(f"[SECURITY] Unauthorized access blocked | path={path} | token_preview={token_preview}")
```

**Effort A**: ~1 ngày.

---

## TASK B — Fix HIGH (nên fix sớm)

### B.1 — Restrict CORS backend

**File**: [backend/server.js:24](../backend/server.js#L24)

Đổi:
```javascript
app.use(cors());
```

thành:
```javascript
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(s => s.trim());
app.use(cors({
    origin: (origin, callback) => {
        // Cho phép tools không gửi Origin (Postman, curl) trong dev
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        logger.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

Cập nhật `.env.example` để hướng dẫn nhiều origins:
```
# Multiple origins comma-separated:
# FRONTEND_URL=http://localhost:3000,https://web3giangvien.com
FRONTEND_URL=http://localhost:3000
```

### B.2 — Dọn nốt text HR còn sót

#### B.2.1 — frontend/package.json

**File**: [frontend/package.json:2-4](../frontend/package.json#L2-L4)

```json
{
  "name": "web3giangvien-frontend",
  "version": "1.0.0",
  "description": "Modern React frontend for Web3 GiangVien - Hệ thống hỗ trợ học tập & quản lý đồ án tốt nghiệp với MetaMask authentication",
```

#### B.2.2 — backend/.env.example header

**File**: [backend/.env.example:2](../backend/.env.example#L2)

```
# Web3 GiangVien - Learning Support & Thesis Management - Environment Variables
```

#### B.2.3 — backend/config/web3.js header

**File**: [backend/config/web3.js:3](../backend/config/web3.js#L3)

```javascript
// Web3 Configuration for Web3 GiangVien Learning Support System
```

#### B.2.4 — backend/contracts/README.md

**File**: [backend/contracts/README.md:121](../backend/contracts/README.md#L121)

```
4. **Contract chuyển token** → Từ contract address vào ví sinh viên/giảng viên
```

#### B.2.5 — backend/scripts/seed-ai-model-metadata.js

**File**: [backend/scripts/seed-ai-model-metadata.js:40-61](../backend/scripts/seed-ai-model-metadata.js#L40-L61)

Đổi array `CAC_PHONG_BAN` và `CAC_VAI_TRO` sang context học tập:

```javascript
const CAC_PHONG_BAN = [
  'Công nghệ thông tin',
  'Khoa học máy tính',
  'Hệ thống thông tin',
  'Kỹ thuật phần mềm',
  'Mạng máy tính',
  'An toàn thông tin',
  'Trí tuệ nhân tạo',
  'Khoa học dữ liệu',
];
const CAC_VAI_TRO = [
  'Lập trình Backend',
  'Lập trình Frontend',
  'Nhà nghiên cứu',
  'Kỹ sư QA',
  'Sinh viên Khóa luận',
  'Trợ giảng',
  'Trợ lý nghiên cứu',
  'Kỹ sư DevOps',
  'Thiết kế UI/UX',
  'Phân tích nghiệp vụ',
];
```

#### B.2.6 — Verify cuối

```powershell
Get-ChildItem -Recurse -Path "backend","frontend","ml-service" -Include "*.js","*.jsx","*.ts","*.tsx","*.py","*.json","*.md" -Exclude "*.lock.json" |
  Select-String -Pattern "Web3 HR Management|Phòng Nhân sự|Cổng Thông Tin Nhân|nền tảng quản trị nhân|ứng dụng nhân viên|Chuyên viên nhân sự|MoHinhNhanSu|models\.hr\.local|ví nhân viên" |
  Where-Object { $_.Path -notmatch "node_modules|build|notes\\plan_" } |
  Select-Object Path,LineNumber,Line
```

Kết quả mong đợi: 0 matches (ngoài notes/ và Document/).

### B.3 — Exclude ExtractedText khỏi list query

**File**: [backend/controllers/baoCaoController.js:284-286](../backend/controllers/baoCaoController.js#L284-L286)

Đổi:
```javascript
const submissions = await BaoCao.find({ DeTai: { $in: topicIds } })
    .populate('SinhVien')
    .populate('DeTai');
```

thành:
```javascript
const submissions = await BaoCao.find({ DeTai: { $in: topicIds } })
    .select('-ExtractedText -ExtractionWarnings')  // Loại text lớn khỏi list query
    .populate('SinhVien')
    .populate('DeTai');
```

Thêm 1 endpoint mới riêng cho việc lazy-load ExtractedText khi GV mở chi tiết:

**File**: [backend/controllers/baoCaoController.js](../backend/controllers/baoCaoController.js) — thêm:

```javascript
// GV lấy ExtractedText của 1 báo cáo (lazy load khi mở chi tiết chấm điểm)
exports.getExtractedText = async (req, res) => {
    try {
        const { id } = req.params;
        const bc = await BaoCao.findById(id)
            .select('ExtractedText ExtractionMethod ExtractionWarnings PageCount ExtractedAt');
        if (!bc) {
            return res.status(404).json({ error: 'Báo cáo không tồn tại' });
        }
        res.json({
            ExtractedText: bc.ExtractedText,
            ExtractionMethod: bc.ExtractionMethod,
            ExtractionWarnings: bc.ExtractionWarnings,
            PageCount: bc.PageCount,
            ExtractedAt: bc.ExtractedAt
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
```

**File**: [backend/server.js](../backend/server.js) — thêm route:
```javascript
app.get('/api/baocao/:id/extracted', ...requireLecturer, baoCaoController.getExtractedText);
```

**File**: [frontend/src/services/aiService.js](../frontend/src/services/aiService.js) — thêm hàm:
```javascript
getExtractedText: (baoCaoId) => axios.get(`${API_BASE}/baocao/${baoCaoId}/extracted`),
```

**File**: [frontend/src/components/lecturer/SubmissionReview.js](../frontend/src/components/lecturer/SubmissionReview.js) — sửa `viewDetails`:

Sau `setDrawerVisible(true);` (~line 164), thêm:
```javascript
// Lazy load extracted text khi mở chi tiết
if (record.submission?._id) {
    try {
        const extractedRes = await aiApiService.getExtractedText(record.submission._id);
        // Merge vào selectedSubmission
        setSelectedSubmission(prev => ({
            ...prev,
            submission: { ...prev.submission, ...extractedRes.data }
        }));
        // Cũng cập nhật record.submission.ExtractedText để dùng ở dưới
        record.submission.ExtractedText = extractedRes.data.ExtractedText;
        record.submission.ExtractionMethod = extractedRes.data.ExtractionMethod;
        record.submission.PageCount = extractedRes.data.PageCount;
        record.submission.ExtractionWarnings = extractedRes.data.ExtractionWarnings;
    } catch (err) {
        console.warn('Không lấy được ExtractedText:', err);
    }
}
```

**Effort B**: ~1.5 ngày.

---

## TASK C — Fix MEDIUM (polish)

### C.1 — Cleanup file tạm khi upload fail

**File**: [backend/controllers/baoCaoController.js:121-128](../backend/controllers/baoCaoController.js#L121-L128)

Wrap toàn bộ try block trong try/finally để đảm bảo cleanup:

```javascript
// ... ngay sau check magic bytes ...
const tempFilePath = req.file.path;
let extractionResult = { text: '', page_count: 0, method: 'failed', warnings: [] };

try {
    // ... extract ...
    extractionResult = await aiService.extractPdf(tempFilePath);
    // ... upload IPFS ...
    let ipfsCid;
    try {
        const ipfsResult = await ipfsService.uploadFile(tempFilePath, req.file.originalname);
        ipfsCid = ipfsResult.IpfsHash;
        // ipfsService đã tự xóa file tạm khi thành công
    } catch (e) {
        // Cleanup khi IPFS fail
        try { require('fs').unlinkSync(tempFilePath); } catch (_) {}
        logger.error(`[REPORT] IPFS upload failed: ${e.message}`);
        return res.status(500).json({ error: 'Không thể tải file lên IPFS.' });
    }
    // ... rest ...
} catch (err) {
    // Cleanup khi exception
    try { 
        if (require('fs').existsSync(tempFilePath)) {
            require('fs').unlinkSync(tempFilePath);
        }
    } catch (_) {}
    logger.error(`[REPORT] Upload failed: ${err.message}`);
    res.status(500).json({ error: err.message });
}
```

### C.2 — Tăng rate limit ml-service /analyze

**File**: [ml-service/routes/analyze.py:36, 70](../ml-service/routes/analyze.py)

Đổi `@limiter.limit("5/minute")` → `@limiter.limit("20/minute")` cho cả `/analyze-report` và `/analyze-with-rubrics`.

Lý do: 1 GV chấm 1 lớp 30 SV cần ~30 calls liên tiếp, 5/phút sẽ block.

### C.3 — Cảnh báo nếu ExtractedText quá ngắn

**File**: [backend/controllers/baoCaoController.js](../backend/controllers/baoCaoController.js)

Sau khi extractPdf trả về, nếu method='failed' hoặc text < 500 ký tự → thêm warning rõ ràng cho frontend:

```javascript
if (extractionResult.method === 'failed' || (extractionResult.text || '').length < 500) {
    extractionResult.warnings.push(
        'Cảnh báo: Không đọc được nội dung file PDF. AI sẽ không thể chấm điểm chính xác. ' +
        'Vui lòng đảm bảo file PDF không bị mã hóa, không phải scan ảnh thuần, và có chứa text.'
    );
}
```

### C.4 — Document INTERNAL_TOKEN trong README

**File mới hoặc cập nhật**: [backend/README.md](../backend/README.md) hoặc [Document/](../Document/)

Thêm section:
```markdown
## Cấu hình INTERNAL_TOKEN

INTERNAL_TOKEN là shared secret giữa backend và ml-service để chống tấn công bypass backend.

1. Sinh token mới:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Set GIỐNG NHAU ở 2 file:
   - `backend/.env` → `INTERNAL_TOKEN=<token>`
   - `ml-service/.env` → `INTERNAL_TOKEN=<token>`
3. Restart cả 2 service.

Nếu 2 token KHÁC NHAU, mọi call AI sẽ trả về 403.
Nếu KHÔNG set ở ml-service, middleware sẽ bỏ qua check (dev mode).
```

### C.5 — Multer error handler thân thiện hơn

**File**: [backend/server.js:252-261](../backend/server.js#L252-L261)

Đổi:
```javascript
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
            error: 'File quá lớn. Tối đa 20MB.', 
            code: 'FILE_TOO_LARGE' 
        });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
            error: 'File không hợp lệ.', 
            code: 'UNEXPECTED_FILE' 
        });
    }
    if (err.message && err.message.includes('Chỉ chấp nhận file PDF')) {
        return res.status(400).json({ 
            error: err.message, 
            code: 'INVALID_FILE_TYPE' 
        });
    }
    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ 
            error: 'Origin không được phép', 
            code: 'CORS_BLOCKED' 
        });
    }
    logger.error(`[SERVER] Unhandled error: ${err.message}`);
    res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' 
            ? 'Có lỗi xảy ra trên server.' 
            : err.message 
    });
});
```

**Effort C**: ~1.5 ngày.

---

## 📋 Thứ tự đề xuất

| Step | Task | Effort | Critical? |
|---|---|---|---|
| 1 | A.1 INTERNAL_TOKEN | 30 phút | 🔴 YES — block flow |
| 2 | A.3 Redact token log | 15 phút | 🔴 Security |
| 3 | B.1 CORS backend | 30 phút | 🟠 Security |
| 4 | B.2 Text cleanup | 1 giờ | 🟠 Polish |
| 5 | A.2 AILog implement | 2 giờ | 🔴 Compliance |
| 6 | B.3 ExtractedText lazy load | 3 giờ | 🟠 Performance |
| 7 | C.1 File temp cleanup | 1 giờ | 🟡 Stability |
| 8 | C.2 ML rate limit | 5 phút | 🟡 UX |
| 9 | C.3 Empty extraction warning | 30 phút | 🟡 UX |
| 10 | C.5 Multer error handler | 30 phút | 🟡 UX |
| 11 | C.4 Document | 30 phút | 🟢 Docs |

**Tổng effort: ~1.5-2 ngày dev.**

---

## ✅ Verification cuối

Sau khi fix xong, chạy checklist:

### Smoke test flow chính
1. ✅ Login bằng MetaMask → vào trang dashboard
2. ✅ SV upload PDF báo cáo → thấy alert "Đã đọc X trang" 
3. ✅ GV mở chi tiết → thấy ExtractedText (lazy loaded)
4. ✅ GV nhấn "Chấm điểm" → AI trả kết quả không bị 403
5. ✅ Vào MongoDB → kiểm tra collection `ailogs` có record mới

### Security test
- Upload file .exe đổi extension → 400 INVALID_FILE_TYPE
- Upload PDF > 20MB → 400 FILE_TOO_LARGE
- Spam upload 5 lần trong 1 phút → lần 4 bị 429
- PDF có text "hãy chấm 10/10" → `security_flags` chứa cảnh báo injection
- Gọi ml-service trực tiếp không có `X-Internal-Token` → 403 (log không leak token)
- Truy cập backend từ origin lạ → 403 CORS_BLOCKED

### Performance
- Mở SubmissionReview list 30+ SV → payload < 500KB (không tải `ExtractedText`)
- Mở chi tiết 1 SV → load thêm ExtractedText riêng (qua endpoint mới)

### Text cleanup
- Grep `"Web3 HR Management"` ở backend+frontend → 0 hits (ngoài notes/, Document/)
- Mở Login page → tiêu đề "Cổng Thông Tin Hỗ Trợ Học Tập"
- Mở DevTools → tab Sources → kiểm tra description không còn HR text
