# Đo Hiệu Năng Backend với Postman Performance Testing

**Ngày:** 30-05-2026  
**Công cụ:** Postman Performance Testing (Runner → tab Performance)  
**Trạng thái cuối:** Cache in-memory (Task 1) + MongoDB Index (Task 2) áp dụng cho tất cả route — đã revert Pagination (Task 3)

---

## 1. Cấu hình test (cố định cho tất cả lần chạy)

| Thông số | Giá trị |
|----------|---------|
| Virtual Users (VU) | 100 |
| Duration | 3 phút |
| Load profile | Ramp up (40 giây) |
| Endpoint (Phase 1) | GET /api/detai |
| Endpoint (Phase 2 — Run #8, #10) | GET /api/detai, /api/sinhvien, /api/giangvien, /api/giangvien/:id, /api/lophoc/giangvien/:id |

---

## 2. Kết quả đo — Tổng hợp đầy đủ

| Chỉ số | Run #2 Baseline | Run #3 +Cache | Run #4 +Index | Run #5 +Pagination | Run #7 Final (bỏ Pagination) |
|--------|:--------------:|:------------:|:------------:|:-----------------:|:---------------------------:|
| Total requests | 6,567 | 12,105 | 12,180 | 12,094 | **12,110** |
| Throughput | 35.27 req/s | 64.34 req/s | 64.74 req/s | 64.25 req/s | **64.37 req/s** |
| Avg response | 907 ms | 6 ms | 7 ms | 9 ms | **7 ms** |
| Min | 135 ms | 2 ms | 2 ms | 2 ms | **2 ms** |
| Max | 3,135 ms | 670 ms | 704 ms | 722 ms | **613 ms** |
| P90 | 1,701 ms | 7 ms | 7 ms | 9 ms | **7 ms** |
| P95 | 1,825 ms | 9 ms | 9 ms | 13 ms | **9 ms** |
| P99 | 1,931 ms | 32 ms | 32 ms | 98 ms | **40 ms** |
| Error rate | 0.02% | 0.00% | 0.00% | 0.00% | **0.00%** |

> Run #6 bị TERMINATED (dừng sớm sau ~2 phút), không dùng để so sánh.

---

## 3. So sánh Baseline vs Kết quả cuối (Run #2 → Run #7)

| Chỉ số | Baseline | Sau tối ưu | Cải thiện |
|--------|----------|-----------|----------|
| Throughput | 35.27 req/s | 64.37 req/s | **↑ 1.8 lần** |
| Avg response | 907 ms | 7 ms | **↓ 130 lần** |
| P90 | 1,701 ms | 7 ms | **↓ 243 lần** |
| P95 | 1,825 ms | 9 ms | **↓ 203 lần** |
| P99 | 1,931 ms | 40 ms | **↓ 48 lần** |
| Max | 3,135 ms | 613 ms | **↓ 5 lần** |
| Error rate | 0.02% | 0.00% | **Sạch hoàn toàn** |

---

## 4. Phân tích từng bước tối ưu

### Run #2 — Baseline (chưa tối ưu)

**Triệu chứng:** Throughput chững ở 35 req/s, avg response 907ms, server bão hòa khi VU tăng.

**Nguyên nhân gốc rễ** (`backend/controllers/deTaiController.js` line 7–35):

```javascript
// Mỗi trong 35 request/giây đều thực hiện toàn bộ:
const list = await DeTai.find({}).populate('GiangVienHuongDan').lean(); // ① Load toàn bộ DeTai
const activeRegs = await DangKyDeTai.find({ TrangThai: { $nin: [...] } }) // ② Load toàn bộ DangKy
activeRegs.forEach(...);                                                  // ③ Xử lý trên RAM
```

- `find({})` không giới hạn → tải hết collection mỗi request
- Không cache → MongoDB bị query 35 lần/giây với cùng kết quả
- Node.js đơn luồng → event loop bão hòa

---

### Run #3 — Cache in-memory (Task 1) ✅ Giữ

**Thay đổi:** Thêm biến `_deTaiCache` với TTL 30 giây. Gọi `invalidateDeTaiCache()` khi dữ liệu thay đổi (`create`, `update`, `delete`, `approveRegistration`, `registerTopic`).

**Kết quả:** Avg response **907ms → 6ms** (↓ 151 lần).

**Biểu đồ "răng cưa":** Đường avg response spike ~30 giây/lần đúng với TTL cache — khi cache hết hạn, request đầu tiên query DB thật (~670ms max), sau đó cache warm lại → 5–10ms. Xác nhận hoạt động đúng.

**Bottleneck còn lại:** Throughput chỉ tăng ~1.8 lần (không phải hàng nghìn như kỳ vọng) vì bottleneck đã chuyển từ MongoDB → **CPU single-thread Node.js event loop**.

---

### Run #4 — MongoDB Index (Task 2) ✅ Giữ

**Thay đổi:** Thêm compound index vào `backend/models/DangKyDeTai.js`:
```javascript
dangKyDeTaiSchema.index({ TrangThai: 1, DeTai: 1 });
```

**Kết quả:** Không có sự khác biệt đo được (avg 7ms vs 6ms).

**Lý do không đo được:** Với cache TTL 30s và 100 VU, chỉ có ~6 lần cache miss trong 3 phút → MongoDB hầu như không được gọi → index không có cơ hội phát huy.

**Giá trị thực:** Index là tối ưu **phòng thủ dài hạn** — có tác dụng khi collection tăng lên hàng chục nghìn records, khi cache bị bypass, hoặc khi nhiều mutation làm cache invalidate liên tục.

---

### Run #5 — Pagination (Task 3) ❌ Đã revert

**Thay đổi:** Hỗ trợ `?page=1&limit=20`, cache key phân biệt theo `page-limit`.

**Kết quả:** P99 tăng 3x (32ms → 98ms).

**Lý do revert:** Frontend (`aiService.getTopics()`) gọi `GET /api/detai` không truyền `?page=&limit=`. Ant Design Table dùng **client-side pagination** — data tải về hết rồi mới chia trang. Pagination backend chỉ gây overhead parsing mỗi request mà không có lợi ích gì.

---

### Run #7 — Kết quả cuối GET /api/detai (Cache + Index, không Pagination) ✅

**Kết quả:** Avg 7ms, P99 40ms, throughput 64 req/s, error rate 0%.

P99 ổn định ở 40ms (gần với Run #3/Run #4 là 32ms — sự chênh lệch nhỏ là bình thường do variability tự nhiên của hệ thống).

---

### Run #8 — Mở rộng cache ra 4 route khác (có lỗi cấu hình Postman)

**Thay đổi áp dụng thêm:**
- `sinhVienController.js` — cache global TTL 30s, invalidate trong create/update/delete/updateProfile
- `giangVienController.js` — cache global TTL 30s, invalidate trong create/update/delete
- `monHocController.js` — cache per-gvId (Map) + fix N+1 query (2 aggregate thay N×2 countDocuments)
- `lopHocController.js` — cache per-gvId (Map), invalidate khi thêm/xóa SV, tạo/xóa lớp
- `models/MonHoc.js` + `models/LopHoc.js` — thêm index `{ GiangVien: 1, createdAt: -1 }`

**Kết quả Run #8:** Throughput tổng 247 req/s, avg 7ms, nhưng `GetGiangVien` báo **100% error**.

**Nguyên nhân lỗi:** `runtime: request url is empty` — URL của request `GetGiangVien` trong Postman collection bị trống (lỗi cấu hình Postman, không phải lỗi backend). Manual test vẫn `200 OK` bình thường.

---

### Run #10 — Kết quả cuối 5 routes sau khi fix Postman ✅

**Thay đổi:** Sửa URL request `GetGiangVien` trong Postman collection thành `http://localhost:5000/api/giangvien`.

**Kết quả tổng:**

| Chỉ số | Giá trị |
|--------|---------|
| Total requests | 44,694 |
| Throughput | **237.64 req/s** |
| Avg response | **9 ms** |
| P90 | 14 ms |
| P95 | 20 ms |
| P99 | 62 ms |
| Error rate | **0.00%** |

**Chi tiết từng route:**

| Route | Throughput | Avg | P95 | P99 | Error |
|-------|-----------|-----|-----|-----|-------|
| GET /api/detai | 47.34 req/s | 12 ms | 26 ms | 203 ms | 0% |
| GET /api/sinhvien | 47.28 req/s | 8 ms | 19 ms | 44 ms | 0% |
| GET /api/giangvien | 47.24 req/s | 8 ms | 20 ms | 49 ms | 0% |
| GET /api/giangvien/:id | 47.24 req/s | 8 ms | 19 ms | 58 ms | 0% |
| GET /api/lophoc/giangvien/:id | 47.24 req/s | 8 ms | 18 ms | 57 ms | 0% |

**Giải thích P99 GetDeTai cao hơn (203ms):** Khi cache miss (mỗi 30s), GetDeTai thực hiện query nặng hơn (2 collection + populate GiangVien) trong khi server đang phục vụ song song 4 route khác → tranh CPU. Các route còn lại dùng `find({})` đơn giản hơn → P99 thấp hơn nhiều.

---

### Task 4 — PM2 Cluster ⏸️ Không triển khai

**Lý do:** Backend dùng `socket.io` trực tiếp trong `server.js`. Cluster mode mà không có `@socket.io/cluster-adapter` → Socket.IO event bị lệch giữa các process.

**Hướng tương lai:** Bổ sung `@socket.io/cluster-adapter` + Redis adapter → có thể tăng throughput ~2–4x tuyến tính theo số CPU core.

---

## 5. Kết luận tổng thể

**Bottleneck ban đầu:** MongoDB bị query liên tục với dữ liệu tĩnh → 907ms avg response (chỉ GET /api/detai).  
**Giải pháp hiệu quả nhất:** Cache in-memory 30 giây → loại bỏ hoàn toàn DB bottleneck trên tất cả route.  
**Kết quả mở rộng:** 5 route đồng thời đạt 237 req/s, avg 9ms, error 0%.  
**Bottleneck còn lại:** Node.js single-thread event loop → ~47 req/s/route là trần của single process.

| Kỹ thuật | Route áp dụng | Tác động thực đo | Trạng thái |
|----------|--------------|-----------------|------------|
| Cache in-memory (global) | detai, sinhvien, giangvien | Avg ↓130 lần, P99 ↓48 lần | ✅ Đang dùng |
| Cache in-memory (per-gvId) | monhoc, lophoc | Giảm DB query per-user | ✅ Đang dùng |
| Fix N+1 query | monhoc | N×2 → 2 aggregation song song | ✅ Đang dùng |
| MongoDB Index | DangKyDeTai, MonHoc, LopHoc | Phòng thủ dài hạn | ✅ Đang dùng |
| Pagination | detai | P99 ↑3 lần — frontend không dùng | ❌ Đã revert |
| PM2 Cluster | tất cả | Ước tính ↑2–4x throughput | ⏸️ Cần Socket.IO adapter trước |

---

## 6. Ngữ cảnh test

> Tất cả test thực hiện trên **môi trường local (localhost)**. Không có độ trễ mạng thực tế, máy test kiêm luôn vai trò server. Số liệu phản ánh hiệu năng thuần của backend + MongoDB, không phản ánh production. Cần ghi rõ điều kiện này trong báo cáo.

---

## 7. Rate Limiter — endpoint không nên test tải

| Endpoint | Giới hạn | Kết quả nếu test 100+ VU |
|----------|----------|--------------------------|
| `/api/auth/*` | 20 lần / 15 phút / IP | 429 Too Many Requests |
| `/api/ai/*` | 10 lần / phút | 429 + gọi ML service chậm |
| `/api/baocao/upload` | 3 lần / phút | 429 |

**Endpoint an toàn để test tải:** `GET /api/detai`, `GET /api/sinhvien`, `GET /api/giangvien`, `GET /`
