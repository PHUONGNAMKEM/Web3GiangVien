# Plan: Tối Ưu Hiệu Năng Backend — GET /api/detai

**Mục tiêu:** Giảm avg response time từ ~907ms xuống < 200ms, tăng throughput từ 35 req/s lên > 500 req/s khi 100 VU đồng thời.  
**Ngày tạo:** 30-05-2026  
**File cần sửa chính:** `backend/controllers/deTaiController.js`, `backend/models/DangKyDeTai.js`

---

## Bối cảnh & vấn đề hiện tại

Endpoint `GET /api/detai` (`deTaiController.getAll`) hiện thực hiện **3 bước nặng mỗi request**:

```
backend/controllers/deTaiController.js  (line 7–35)

exports.getAll = async (req, res) => {
    // BƯỚC 1: Load toàn bộ DeTai collection + populate GiangVien
    const list = await DeTai.find({}).populate('GiangVienHuongDan').lean();

    // BƯỚC 2: Load toàn bộ DangKyDeTai (không giới hạn), lọc trên RAM
    const activeRegs = await DangKyDeTai.find({ 
        TrangThai: { $nin: ['TuChoi', 'Thua'] } 
    }).select('DeTai Nhom TrangThai');

    // BƯỚC 3: Xử lý map/reduce trên RAM rồi merge vào list
    ...
    res.json(result);
};
```

Hệ quả: 35 request/giây → 35 lần query toàn bộ DB/giây → MongoDB bão hòa → avg 907ms.

---

## Task 1 — Thêm In-Memory Cache (ưu tiên cao nhất)

**Mục tiêu:** Giảm 99% số lần hit DB. Dữ liệu đề tài ít thay đổi (GV tạo mới, SV đăng ký) nên cache 30 giây là an toàn.

**File:** `backend/controllers/deTaiController.js`

**Thay đổi:**

Thêm biến cache ở đầu file (sau các `require`), trước `exports.getAll`:

```javascript
// Cache cho getAll — TTL 30 giây
let _deTaiCache = { data: null, ts: 0 };
const DETAI_CACHE_TTL = 30 * 1000; // 30 giây

// Gọi hàm này mỗi khi dữ liệu đề tài thay đổi (create/update/delete)
function invalidateDeTaiCache() {
    _deTaiCache = { data: null, ts: 0 };
}
```

Sửa hàm `getAll` thành:

```javascript
exports.getAll = async (req, res) => {
    try {
        // Trả cache nếu còn hạn
        if (_deTaiCache.data && Date.now() - _deTaiCache.ts < DETAI_CACHE_TTL) {
            return res.json(_deTaiCache.data);
        }

        const list = await DeTai.find({}).populate('GiangVienHuongDan').lean();

        const activeRegs = await DangKyDeTai.find({ 
            TrangThai: { $nin: ['TuChoi', 'Thua'] } 
        }).select('DeTai Nhom TrangThai');

        const regCountMap = {};
        const chotMap = {};
        activeRegs.forEach(r => {
            const deTaiId = r.DeTai.toString();
            regCountMap[deTaiId] = (regCountMap[deTaiId] || 0) + 1;
            if (r.TrangThai === 'DaDuyet') chotMap[deTaiId] = true;
        });

        const result = list.map(t => ({
            ...t,
            SoDangKy: regCountMap[t._id.toString()] || 0,
            DaChotNhom: !!chotMap[t._id.toString()]
        }));

        // Lưu cache
        _deTaiCache = { data: result, ts: Date.now() };
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
```

Thêm `invalidateDeTaiCache()` vào các hàm làm thay đổi dữ liệu:

- Cuối hàm `create` (line ~87), trước `res.status(201).json(newItem)`:
  ```javascript
  invalidateDeTaiCache();
  ```
- Cuối hàm `update` (line ~99), trước `res.json(updated)`:
  ```javascript
  invalidateDeTaiCache();
  ```
- Cuối hàm `delete` (line ~109), trước `res.json({ message: 'Deleted successfully' })`:
  ```javascript
  invalidateDeTaiCache();
  ```
- Cuối hàm `approveRegistration` khi `trangThai === 'DaDuyet'` (line ~310):
  ```javascript
  invalidateDeTaiCache();
  ```
- Cuối hàm `registerTopic` (line ~185), trước `res.status(201).json(...)`:
  ```javascript
  invalidateDeTaiCache();
  ```

**Kết quả kỳ vọng:** Sau request đầu tiên (miss cache), tất cả request trong 30 giây tiếp theo trả về từ RAM → avg response ~5–20ms, throughput > 1000 req/s.

---

## Task 2 — Thêm MongoDB Index cho DangKyDeTai

**Mục tiêu:** Query `find({ TrangThai: { $nin: [...] } })` hiện đang **full-scan** collection. Thêm index giúp MongoDB filter nhanh hơn — quan trọng khi cache miss và phải query thật.

**File:** `backend/models/DangKyDeTai.js`

**Kiểm tra trước:** File đã có 2 index ở line 29–31:
```javascript
dangKyDeTaiSchema.index({ DeTai: 1, Nhom: 1 }, { unique: true, sparse: true });
dangKyDeTaiSchema.index({ DeTai: 1, SinhVien: 1 }, { unique: true, sparse: true });
```

**Thêm index mới** sau line 31 (trước `module.exports`):

```javascript
// Index cho query getAll: lọc theo TrangThai để đếm nhóm active
dangKyDeTaiSchema.index({ TrangThai: 1, DeTai: 1 });
```

Đây là **compound index** khớp chính xác với query trong `getAll`:
```javascript
DangKyDeTai.find({ TrangThai: { $nin: ['TuChoi', 'Thua'] } }).select('DeTai Nhom TrangThai')
```

**Lưu ý:** Index mới tự động được tạo lần tiếp theo khi kết nối MongoDB (Mongoose auto-sync index khi `autoIndex: true` — mặc định trong dev).

---

## Task 3 — Thêm Pagination cho GET /api/detai

**Mục tiêu:** Giới hạn số bản ghi trả về mỗi request. Không bắt buộc frontend thay đổi ngay vì có fallback (nếu không truyền `page`/`limit` thì trả tất cả như cũ).

**File:** `backend/controllers/deTaiController.js` — hàm `getAll`

**Thay đổi** (thêm vào ngay sau khi check cache, trước query DB):

```javascript
exports.getAll = async (req, res) => {
    try {
        // Đọc pagination params — mặc định không giới hạn nếu không truyền
        const page  = parseInt(req.query.page)  || null;
        const limit = parseInt(req.query.limit) || null;

        // Cache key phân biệt theo page/limit
        const cacheKey = `${page}-${limit}`;
        if (_deTaiCache[cacheKey] && Date.now() - _deTaiCache[cacheKey].ts < DETAI_CACHE_TTL) {
            return res.json(_deTaiCache[cacheKey].data);
        }

        // Query với pagination nếu có
        let query = DeTai.find({}).populate('GiangVienHuongDan').lean();
        if (page && limit) {
            query = query.skip((page - 1) * limit).limit(limit);
        }
        const list = await query;

        // ... phần còn lại giữ nguyên (query activeRegs, map result) ...

        // Lưu cache theo key
        if (!_deTaiCache || typeof _deTaiCache !== 'object') _deTaiCache = {};
        _deTaiCache[cacheKey] = { data: result, ts: Date.now() };
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
```

> **Lưu ý:** Nếu tích hợp pagination vào cache thì cần đổi `_deTaiCache` từ object đơn giản thành Map (key theo page-limit). Nếu thấy phức tạp, có thể bỏ qua pagination trong lần này và chỉ làm Task 1 + Task 2.

---

## Task 4 — Chạy Node.js đa tiến trình với PM2 Cluster

**Mục tiêu:** Node.js mặc định chỉ dùng 1 CPU core. PM2 cluster mode tạo 1 process/core → tăng throughput tuyến tính theo số core.

**Cách thực hiện** (chạy trong terminal, không sửa code):

```powershell
# Cài PM2 toàn cục (nếu chưa có)
npm install -g pm2

# Chạy server với số process = số CPU cores
cd "d:\Khóa Luận Kỹ Sư\Team_12.04.26\12.04.26\Web3GiangVien\backend"
pm2 start server.js -i max --name web3giangvien

# Kiểm tra status
pm2 list
pm2 monit   # theo dõi real-time CPU/RAM mỗi process
```

**Lưu ý về Socket.IO:** Server đang dùng `socket.io`. Khi chạy cluster nhiều process, các Socket.IO event sẽ không shared giữa các process. Nếu ứng dụng phụ thuộc nặng vào Socket.IO (real-time), cần thêm `@socket.io/cluster-adapter`. Nếu chỉ test HTTP throughput thì bỏ qua vấn đề này.

---

## Thứ tự triển khai khuyến nghị

| Bước | Task | File sửa | Rủi ro | Thời gian ước tính |
|------|------|----------|--------|-------------------|
| 1 | Cache in-memory (Task 1) | `deTaiController.js` | Thấp — chỉ thêm biến + check | 15–20 phút |
| 2 | MongoDB Index (Task 2) | `DangKyDeTai.js` | Rất thấp — thêm 1 dòng index | 5 phút |
| 3 | Pagination (Task 3) | `deTaiController.js` | Thấp — có fallback | 20–30 phút |
| 4 | PM2 Cluster (Task 4) | Không sửa code | Trung bình (Socket.IO) | 10 phút |

**Làm Task 1 + Task 2 là đủ để thấy kết quả rõ rệt.** Task 3 và 4 là cải tiến thêm.

---

## Kiểm tra sau khi triển khai

1. Khởi động lại backend (`npm start` hoặc `pm2 restart web3giangvien`).
2. Test thủ công: `GET http://localhost:5000/api/detai` → phải trả `200 OK`.
3. Chạy lại Postman Performance test với **cùng cấu hình** (100 VU, 3 phút, Ramp up 40s).
4. Bấm **"Compare runs"** trong Postman để so sánh biểu đồ trước/sau.

**Kỳ vọng sau Task 1 + 2:**

| Chỉ số | Trước | Sau (kỳ vọng) |
|--------|-------|---------------|
| Avg response | 907 ms | < 50 ms |
| P95 | 1,825 ms | < 200 ms |
| Throughput | 35 req/s | > 500 req/s |
| Error rate | 0.02% | ~0% |
