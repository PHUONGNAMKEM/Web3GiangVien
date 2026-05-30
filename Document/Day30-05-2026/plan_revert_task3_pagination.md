# Plan: Bỏ Task 3 — Revert Pagination khỏi GET /api/detai

**Ngày:** 30-05-2026  
**File cần sửa:** `backend/controllers/deTaiController.js`  
**Lý do:** Frontend không truyền `?page=&limit=` khi gọi `/api/detai` (dùng client-side pagination của Ant Design Table). Pagination backend chỉ gây overhead mỗi request, làm P99 tệ hơn 3 lần (32ms → 98ms) mà không có lợi ích gì.

---

## Trạng thái hiện tại (sau Task 3)

`backend/controllers/deTaiController.js` line 7–36:

```javascript
// Cache cho getAll - TTL 30 giay
// Lưu cache theo từng bộ page/limit để không trả nhầm dữ liệu giữa các trang.
const _deTaiCache = new Map();
const DETAI_CACHE_TTL = 30 * 1000;

function invalidateDeTaiCache() {
    _deTaiCache.clear();
}

exports.getAll = async (req, res) => {
    try {
        const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
        const page = hasPagination ? parseInt(req.query.page, 10) : null;
        const limit = hasPagination ? parseInt(req.query.limit, 10) : null;

        if (hasPagination && (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1)) {
            return res.status(400).json({ error: 'page và limit phải là số nguyên dương.' });
        }

        const cacheKey = hasPagination ? `page:${page}:limit:${limit}` : 'all';
        const cached = _deTaiCache.get(cacheKey);
        if (cached && (Date.now() - cached.ts) < DETAI_CACHE_TTL) {
            return res.json(cached.data);
        }

        let query = DeTai.find({}).populate('GiangVienHuongDan').lean();
        if (hasPagination) {
            query = query.skip((page - 1) * limit).limit(limit);
        }
        const list = await query;
        // ...
```

---

## Trạng thái mục tiêu (sau Task 1 + Task 2, không có Task 3)

Thay toàn bộ phần trên bằng:

```javascript
// Cache cho getAll — TTL 30 giây
let _deTaiCache = { data: null, ts: 0 };
const DETAI_CACHE_TTL = 30 * 1000;

function invalidateDeTaiCache() {
    _deTaiCache = { data: null, ts: 0 };
}

exports.getAll = async (req, res) => {
    try {
        if (_deTaiCache.data && Date.now() - _deTaiCache.ts < DETAI_CACHE_TTL) {
            return res.json(_deTaiCache.data);
        }

        const list = await DeTai.find({}).populate('GiangVienHuongDan').lean();
        // ...
```

---

## Thay đổi cụ thể

### 1. Thay khai báo cache (line 7–14)

**Xóa:**
```javascript
// Cache cho getAll - TTL 30 giay
// Lưu cache theo từng bộ page/limit để không trả nhầm dữ liệu giữa các trang.
const _deTaiCache = new Map();
const DETAI_CACHE_TTL = 30 * 1000;

function invalidateDeTaiCache() {
    _deTaiCache.clear();
}
```

**Thay bằng:**
```javascript
// Cache cho getAll — TTL 30 giây
let _deTaiCache = { data: null, ts: 0 };
const DETAI_CACHE_TTL = 30 * 1000;

function invalidateDeTaiCache() {
    _deTaiCache = { data: null, ts: 0 };
}
```

### 2. Thay phần đầu hàm `getAll` (line 16–36)

**Xóa toàn bộ đoạn này:**
```javascript
exports.getAll = async (req, res) => {
    try {
        const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
        const page = hasPagination ? parseInt(req.query.page, 10) : null;
        const limit = hasPagination ? parseInt(req.query.limit, 10) : null;

        if (hasPagination && (!Number.isInteger(page) || !Number.isInteger(limit) || page < 1 || limit < 1)) {
            return res.status(400).json({ error: 'page và limit phải là số nguyên dương.' });
        }

        const cacheKey = hasPagination ? `page:${page}:limit:${limit}` : 'all';
        const cached = _deTaiCache.get(cacheKey);
        if (cached && (Date.now() - cached.ts) < DETAI_CACHE_TTL) {
            return res.json(cached.data);
        }

        let query = DeTai.find({}).populate('GiangVienHuongDan').lean();
        if (hasPagination) {
            query = query.skip((page - 1) * limit).limit(limit);
        }
        const list = await query;
```

**Thay bằng:**
```javascript
exports.getAll = async (req, res) => {
    try {
        if (_deTaiCache.data && Date.now() - _deTaiCache.ts < DETAI_CACHE_TTL) {
            return res.json(_deTaiCache.data);
        }

        const list = await DeTai.find({}).populate('GiangVienHuongDan').lean();
```

### 3. Thay phần lưu cache ở cuối `getAll`

Tìm đoạn lưu cache (hiện dùng `Map.set`):
```javascript
_deTaiCache.set(cacheKey, { data: result, ts: Date.now() });
```

**Thay bằng:**
```javascript
_deTaiCache = { data: result, ts: Date.now() };
```

---

## Kiểm tra sau khi sửa

1. Khởi động lại backend: `npm start`
2. `GET http://localhost:5000/api/detai` → phải trả `200 OK` với danh sách đầy đủ
3. Chạy lại Postman Performance test (100 VU, 3 phút, Ramp up 40s)
4. Kỳ vọng P99 trở về ~32ms (bằng Run #4), throughput ~64 req/s

---

## Không cần thay đổi gì thêm

- `backend/models/DangKyDeTai.js` — giữ nguyên (index từ Task 2 vẫn có giá trị)
- Các lời gọi `invalidateDeTaiCache()` trong `create`, `update`, `delete`, `approveRegistration`, `registerTopic` — **giữ nguyên**, chỉ thay đổi implementation bên trong hàm
- `frontend/` — không đụng vào
