# Plan: Tối Ưu Cache + Index cho các Route còn lại

**Ngày:** 30-05-2026  
**Tham chiếu:** Áp dụng cùng chiến lược đã thành công với `GET /api/detai` (avg 907ms → 7ms)

---

## Tổng quan các thay đổi

| File | Thay đổi | Loại |
|------|----------|------|
| `backend/controllers/sinhVienController.js` | Thêm cache global + invalidate | Task 1 |
| `backend/controllers/giangVienController.js` | Thêm cache global + invalidate | Task 1 |
| `backend/controllers/monHocController.js` | Thêm cache per-gvId + fix N+1 query | Task 1 + 1b |
| `backend/controllers/lopHocController.js` | Thêm cache per-gvId + invalidate | Task 1 |
| `backend/models/MonHoc.js` | Thêm index `{ GiangVien: 1 }` | Task 2 |
| `backend/models/LopHoc.js` | Thêm index `{ GiangVien: 1 }` | Task 2 |

---

## Task 1A — Cache cho `sinhVienController.js`

**Vấn đề hiện tại:** `getAll` gọi `SinhVien.find({})` mỗi request, không giới hạn.

**File:** `backend/controllers/sinhVienController.js`

**Thêm vào đầu file** (sau `require`):
```javascript
let _svCache = { data: null, ts: 0 };
const SV_CACHE_TTL = 30 * 1000;

function invalidateSvCache() {
    _svCache = { data: null, ts: 0 };
}
```

**Thay hàm `getAll`:**
```javascript
exports.getAll = async (req, res) => {
    try {
        if (_svCache.data && Date.now() - _svCache.ts < SV_CACHE_TTL) {
            return res.json(_svCache.data);
        }
        const list = await SinhVien.find({});
        _svCache = { data: list, ts: Date.now() };
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
```

**Thêm `invalidateSvCache()` vào các hàm mutation:**

- Cuối `exports.create`, trước `res.status(201).json(newSV)`:
  ```javascript
  invalidateSvCache();
  ```
- Cuối `exports.update`, trước `res.json(updated)`:
  ```javascript
  invalidateSvCache();
  ```
- Cuối `exports.delete`, trước `res.json({ message: 'Deleted successfully' })`:
  ```javascript
  invalidateSvCache();
  ```
- Cuối `exports.updateProfile`, trước `res.json({ message: 'Cập nhật hồ sơ thành công!', data: updated })`:
  ```javascript
  invalidateSvCache();
  ```

---

## Task 1B — Cache cho `giangVienController.js`

**Vấn đề hiện tại:** `getAll` gọi `GiangVien.find({})` mỗi request.

**File:** `backend/controllers/giangVienController.js`

**Thêm vào đầu file** (sau `require`):
```javascript
let _gvCache = { data: null, ts: 0 };
const GV_CACHE_TTL = 30 * 1000;

function invalidateGvCache() {
    _gvCache = { data: null, ts: 0 };
}
```

**Thay hàm `getAll`:**
```javascript
exports.getAll = async (req, res) => {
    try {
        if (_gvCache.data && Date.now() - _gvCache.ts < GV_CACHE_TTL) {
            return res.json(_gvCache.data);
        }
        const list = await GiangVien.find({});
        _gvCache = { data: list, ts: Date.now() };
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
```

**Thêm `invalidateGvCache()` vào các hàm mutation:**

- Cuối `exports.create`, trước `res.status(201).json(newGV)`:
  ```javascript
  invalidateGvCache();
  ```
- Cuối `exports.update`, trước `res.json(updated)`:
  ```javascript
  invalidateGvCache();
  ```
- Cuối `exports.delete`, trước `res.json({ message: 'Deleted successfully' })`:
  ```javascript
  invalidateGvCache();
  ```

---

## Task 1C — Cache + Fix N+1 cho `monHocController.js`

**Vấn đề hiện tại:** `getByGiangVien` có 2 vấn đề:

1. **N+1 query:** Với mỗi môn học, gọi 2 `countDocuments` riêng → 10 môn = **20 query thêm**
   ```javascript
   // Hiện tại — BAD
   const result = await Promise.all(monHocs.map(async (mh) => {
       const soDeTai  = await DeTai.countDocuments({ MonHoc: mh._id });   // N lần
       const soLopHoc = await LopHoc.countDocuments({ MonHoc: mh._id });  // N lần
       return { ...mh.toObject(), soDeTai, soLopHoc };
   }));
   ```

2. **Không cache:** Mỗi request lặp lại toàn bộ.

**Cache type:** Per-gvId (mỗi GV có data khác nhau) → dùng `Map`.

**File:** `backend/controllers/monHocController.js`

**Thêm vào đầu file** (sau các `require`):
```javascript
const _monHocCache = new Map();
const MONHOC_CACHE_TTL = 30 * 1000;

function invalidateMonHocCache(gvId) {
    if (gvId) {
        _monHocCache.delete(String(gvId));
    } else {
        _monHocCache.clear();
    }
}
```

**Thay toàn bộ hàm `getByGiangVien`:**
```javascript
exports.getByGiangVien = async (req, res) => {
  try {
    const { gvId } = req.params;

    const cached = _monHocCache.get(gvId);
    if (cached && Date.now() - cached.ts < MONHOC_CACHE_TTL) {
        return res.json({ success: true, data: cached.data });
    }

    const monHocs = await MonHoc.find({ GiangVien: gvId })
      .populate('GiangVien', 'HoTen MaGV')
      .sort({ createdAt: -1 })
      .lean();

    if (monHocs.length === 0) {
        _monHocCache.set(gvId, { data: [], ts: Date.now() });
        return res.json({ success: true, data: [] });
    }

    // Fix N+1: gộp 2 count thành 1 aggregation mỗi loại
    const monHocIds = monHocs.map(mh => mh._id);

    const [deTaiCounts, lopHocCounts] = await Promise.all([
        DeTai.aggregate([
            { $match: { MonHoc: { $in: monHocIds } } },
            { $group: { _id: '$MonHoc', count: { $sum: 1 } } }
        ]),
        LopHoc.aggregate([
            { $match: { MonHoc: { $in: monHocIds } } },
            { $group: { _id: '$MonHoc', count: { $sum: 1 } } }
        ])
    ]);

    const deTaiMap  = Object.fromEntries(deTaiCounts.map(r  => [r._id.toString(), r.count]));
    const lopHocMap = Object.fromEntries(lopHocCounts.map(r => [r._id.toString(), r.count]));

    const result = monHocs.map(mh => ({
        ...mh,
        soDeTai:  deTaiMap[mh._id.toString()]  || 0,
        soLopHoc: lopHocMap[mh._id.toString()] || 0
    }));

    _monHocCache.set(gvId, { data: result, ts: Date.now() });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[MonHoc] getByGiangVien error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách môn học' });
  }
};
```

> **Lợi ích fix N+1:** Thay N×2 query bằng 2 aggregation chạy song song (`Promise.all`) → từ 20 DB round-trips xuống còn 3 (1 find + 2 aggregate).

**Thêm `invalidateMonHocCache(gvId)` vào các hàm mutation:**

- Cuối `exports.create`, trước `res.status(201).json(...)`:
  ```javascript
  invalidateMonHocCache(GiangVien); // GiangVien là từ req.body
  ```
- Cuối `exports.update`, trước `res.json(...)`:
  ```javascript
  invalidateMonHocCache(monHoc.GiangVien);
  ```
- Cuối `exports.delete`, trước `res.json(...)`:
  ```javascript
  invalidateMonHocCache(); // clear all vì không biết gvId sau khi xóa
  ```

---

## Task 1D — Cache cho `lopHocController.js`

**Vấn đề hiện tại:** `getByGiangVien` query MongoDB mỗi request, không cache.

**Cache type:** Per-gvId → dùng `Map`.

**File:** `backend/controllers/lopHocController.js`

**Thêm vào đầu file** (sau các `require`):
```javascript
const _lopHocCache = new Map();
const LOPHOC_CACHE_TTL = 30 * 1000;

function invalidateLopHocCache(gvId) {
    if (gvId) {
        _lopHocCache.delete(String(gvId));
    } else {
        _lopHocCache.clear();
    }
}
```

**Thay hàm `getByGiangVien`:**
```javascript
exports.getByGiangVien = async (req, res) => {
  try {
    const { gvId } = req.params;

    const cached = _lopHocCache.get(gvId);
    if (cached && Date.now() - cached.ts < LOPHOC_CACHE_TTL) {
        return res.json({ success: true, data: cached.data });
    }

    const lopHocs = await LopHoc.find({ GiangVien: gvId })
      .populate('MonHoc', 'MaMonHoc TenMonHoc')
      .populate('GiangVien', 'HoTen MaGV')
      .sort({ createdAt: -1 });

    const result = lopHocs.map(lh => ({
      ...lh.toObject(),
      siSo: lh.SinhVien ? lh.SinhVien.length : 0
    }));

    _lopHocCache.set(gvId, { data: result, ts: Date.now() });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[LopHoc] getByGiangVien error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách lớp học' });
  }
};
```

**Thêm `invalidateLopHocCache(gvId)` vào các hàm mutation:**

- Cuối `exports.create`, trước `res.status(201).json(...)`:
  ```javascript
  invalidateLopHocCache(GiangVien); // GiangVien là từ req.body
  ```
- Cuối `exports.update`, trước `res.json(...)`:
  ```javascript
  invalidateLopHocCache(); // clear all vì update không biết gvId
  ```
- Cuối `exports.addSinhVien`, trước `res.json(...)`:
  ```javascript
  invalidateLopHocCache(); // clear all vì không biết gvId của lớp
  ```
- Cuối `exports.removeSinhVien`, trước `res.json(...)`:
  ```javascript
  invalidateLopHocCache();
  ```
- Cuối `exports.delete`, trước `res.json(...)`:
  ```javascript
  invalidateLopHocCache();
  ```

---

## Task 2A — MongoDB Index cho `MonHoc.js`

**File:** `backend/models/MonHoc.js`

**Thêm vào trước `module.exports`:**
```javascript
// Index cho query getByGiangVien: filter theo GiangVien + sort theo createdAt
monHocSchema.index({ GiangVien: 1, createdAt: -1 });
```

Khớp chính xác với query: `MonHoc.find({ GiangVien: gvId }).sort({ createdAt: -1 })`.

---

## Task 2B — MongoDB Index cho `LopHoc.js`

**File:** `backend/models/LopHoc.js`

**Thêm vào trước `module.exports`:**
```javascript
// Index cho query getByGiangVien: filter theo GiangVien + sort theo createdAt
lopHocSchema.index({ GiangVien: 1, createdAt: -1 });
```

Khớp chính xác với query: `LopHoc.find({ GiangVien: gvId }).sort({ createdAt: -1 })`.

---

## Không cần index thêm cho SinhVien / GiangVien

`SinhVien` và `GiangVien` đã có `unique: true` trên `MaSV`, `MaGV`, `Email`, `WalletAddress` — Mongoose tự tạo index cho các field này. Query `find({})` là full-scan nhưng cache đã che hoàn toàn nên không cần index thêm.

---

## Thứ tự triển khai khuyến nghị

| Bước | Task | File | Thời gian ước tính |
|------|------|------|--------------------|
| 1 | 1A — Cache sinhVien | `sinhVienController.js` | 10 phút |
| 2 | 1B — Cache giangVien | `giangVienController.js` | 10 phút |
| 3 | 2A — Index MonHoc | `models/MonHoc.js` | 2 phút |
| 4 | 2B — Index LopHoc | `models/LopHoc.js` | 2 phút |
| 5 | 1C — Cache + Fix N+1 monHoc | `monHocController.js` | 20 phút |
| 6 | 1D — Cache lopHoc | `lopHocController.js` | 15 phút |

---

## Kiểm tra sau khi triển khai

1. Restart backend: `npm start`
2. Test thủ công từng endpoint:
   - `GET http://localhost:5000/api/sinhvien` → `200 OK`
   - `GET http://localhost:5000/api/giangvien` → `200 OK`
   - `GET http://localhost:5000/api/monhoc/giangvien/:gvId` → `200 OK`, field `soDeTai` và `soLopHoc` còn đúng
   - `GET http://localhost:5000/api/lophoc/giangvien/:gvId` → `200 OK`
3. Test mutation: tạo/sửa/xóa 1 bản ghi → gọi lại GET → phải thấy dữ liệu mới (cache đã invalidate)

---

## Lưu ý quan trọng

- **Không cache `GET /api/lophoc/:id/detail`** — endpoint này trả data real-time (danh sách SV + đăng ký đề tài), thay đổi liên tục.
- **Cache per-gvId** (monHoc, lopHoc) dùng `Map` — mỗi GV có cache riêng, invalidate chỉ xóa entry của GV đó, không ảnh hưởng GV khác.
- **TTL 30 giây** là đồng nhất với `deTaiController` — dễ điều chỉnh sau nếu cần.
