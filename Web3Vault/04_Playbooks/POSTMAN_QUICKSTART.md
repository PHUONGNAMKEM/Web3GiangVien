# Kiểm thử API bằng Postman — Hướng dẫn Nhanh

Làm theo từng bước dưới đây để test toàn bộ 101 route trong **~5 phút** mà không phải gõ tay route nào.

---

## Bước 0️⃣ — Chuẩn bị (chạy 1 lần)

### Terminal 1: Backend
```powershell
cd backend
npm install
npm run dev
# → Backend chạy ở http://localhost:5000
```

### Terminal 2: ML Service (cho các route /api/ai/*)
```powershell
cd ml-service
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
# → ML Service chạy ở http://localhost:8001
```

### Terminal 3: Seed dữ liệu
```powershell
cd backend
node seed_lecturer.js   # tạo ví giảng viên mẫu
node seed_topics.js     # tạo 4 đề tài mẫu
```

**Kiểm tra:**
- Backend sống: `curl http://localhost:5000` → trả về `{"healthy":true}`
- MongoDB kết nối: xem log terminal backend (không báo lỗi connection)
- ML Service sống: `curl http://localhost:8001/healthz` → `{"status":"ok"}`

---

## Bước 1️⃣ — Tạo JWT Token

Lấy private key của ví mẫu (giảng viên đã seed) rồi chạy:

```powershell
cd backend
node scripts/get-token.js 0xPRIVATE_KEY_CUA_VI
```

Script sẽ in ra:
```
🔑 Địa chỉ ví: 0x3081F8965F007A78C1502b51DAC0bD54E6f6dBBF
✅ Vai trò: LECTURER_ROLE
✅ User ID: 67abc... (lưu lại, dùng cho :gvId)
===== JWT TOKEN =====
eyJhbGciOiJIUzI1NiI...   ← COPY CHUỖI NÀY
```

**Lưu ý:** Nếu báo "CHƯA được đăng ký", cần chạy `seed_lecturer.js` trước và dùng private key của ví đó.

---

## Bước 2️⃣ — Import Collection vào Postman

**2a. Import HappyPath Collection** (khuyến nghị — sắp xếp đúng thứ tự)
1. **Mở Postman** → nút **Import** → chọn **File**
2. Chọn file: `backend/Web3GiangVien_HappyPath.postman_collection.json`
3. **Import** → xong, collection xuất hiện với 101 route theo thứ tự phụ thuộc

**2b. (Tùy chọn) Import FullTest Collection** (cho error cases)
- Chọn: `backend/Web3GiangVien_FullTest.postman_collection.json`
- Route không sắp xếp, dùng để test permission errors (403...), not found (404...)

**2c. Import Environment** (dùng chung cho cả 2 collection)
1. **Settings** (nút gear) → **Environments** → **Import**
2. Chọn: `backend/Web3GiangVien.postman_environment.json`

---

## Bước 3️⃣ — Dán Token vào Environment

1. Góc trên phải Postman → chọn environment **"Web3GiangVien Local"**
2. Nút **eye icon** → xem biến → dòng `token` → **Edit**
3. Dán chuỗi JWT từ bước 1 vào **Current value** → **Save**
4. (Tùy chọn) Dán `gvId` từ bước 1 vào biến `gvId`

---

## Bước 4️⃣ — Chạy HappyPath Collection

1. **Cây trái** → bấm vào tên collection **"Web3GiangVien HappyPath"**
2. Nút **Run** cạnh tên (hoặc Ctrl+Shift+E → Run Collection)
3. Popup **Collection Runner** xuất hiện
4. Kiểm tra:
   - **Environment**: "Web3GiangVien Local" ✓
   - **Delay (ms)**: 750 (để tránh race condition, tự động)
   - **Iterations**: 1
5. **Bấm nút Run** → Postman sẽ chạy **101 request theo đúng thứ tự phụ thuộc** (~2 phút)
6. **Dashboard** cuối hiển thị: ✓ Pass / ✗ Fail cho mỗi request

**Lần đầu chạy sẽ có 403** ở route `/api/admin/*` (yêu cầu ADMIN role) — **đó là đúng**, đây là test case phân quyền! Ignore nó.

---

## Cách đọc kết quả Dashboard

Sau khi chạy xong, bạn sẽ thấy dashboard hiển thị kết quả từng request:

```
✅ Passed (X)  ❌ Failed (Y)  ⏭️ Skipped (0)

Requests:
✓ GET auth/challenge          [200]  6ms
✓ POST auth/verify            [200]  8ms
✓ GET sinhvien/getAll         [200]  12ms
✓ GET detai/getAll            [200]  15ms
✓ POST detai/create           [201]  25ms  (lưu deTaiId)
✓ GET detai/getById           [200]  10ms
✓ POST nhom/create            [201]  18ms  (lưu nhomId)
✗ POST nhom/chot              [404]  ← fail (xem error message)
...
```

### Giải thích các status

| Status | Ý nghĩa | Hành động |
|--------|---------|----------|
| ✓ 200 | OK | Pass ✅ |
| ✓ 201 | Created | Pass ✅, test script lưu ID |
| ✗ 400 | Bad Request | Fail — body sai format |
| ✗ 401 | Unauthorized | Token hết hạn → chạy lại `get-token.js` |
| ✗ 403 | Forbidden | **Vai trò sai** (đúng khi test admin route) |
| ✗ 404 | Not Found | ID không tồn tại (request trước fail) |
| ✗ 500 | Server Error | Lỗi backend — kiểm tra terminal backend log |

### Lỗi hay gặp & cách fix

| Lỗi | Nguyên nhân | Fix |
|-----|-----------|-----|
| Lần lượt fail từ POST tạo dữ liệu | Token hết hạn, vai trò sai, MongoDB disconnect | Chạy lại `get-token.js`, kiểm tra MongoDB |
| 403 ở `/api/admin/*` | Yêu cầu ADMIN role, token là LECTURER | **Bình thường** — test case phân quyền |
| 404 ở request dùng ID | Dữ liệu chưa tạo (POST trước fail) | Xem log request POST trước, fix lỗi đó trước |
| "ML service unavailable" ở /api/ai/ | FastAPI port 8001 chưa chạy | `cd ml-service && uvicorn app:app --port 8001` |
| "Cannot read property '_id'" ở test script | Response không có data._id (POST fail) | Check HTTP status của POST trước, phải 201 mới lưu |

---

## (Tùy chọn) Tạo thêm Token Sinh Viên để test Phân quyền

Nếu muốn test case "SV không được tạo đề tài" (phải trả 403), cần token sinh viên khác:

```powershell
# Đăng ký sinh viên qua UI hoặc:
cd backend
node scripts/get-token.js 0xPRIVATE_KEY_SINH_VIEN_KHAC
```

Lưu token này vào biến `tokenStudent` trong environment → edit request `POST /api/detai` thay `Authorization` thành `Bearer {{tokenStudent}}` để test.

---

## Vòng lặp Test nhanh hàng ngày

Khi code thay đổi:

```powershell
# Terminal Backend
npm run dev

# Terminal ML
uvicorn app:app --port 8001 --reload

# Lấy token (nếu ví seed lại)
node scripts/get-token.js 0x...

# Dán token vào Postman, bấm Run collection
```

---

## Tiếp theo: Xem Chi tiết Request/Response

Mỗi request trong collection đã có:
- **URL** (tự thay {{baseUrl}}, {{deTaiId}}, {{gvId}}...)
- **Body** (JSON mẫu để POST/PUT)
- **Test script** (tự động lưu ID response vào environment)

Bấm vào request trong cây → **Params / Body / Tests** để chỉnh sửa.

---

**Ngại gì không được, báo lại — mình sửa collection hoặc script luôn! 🚀**
