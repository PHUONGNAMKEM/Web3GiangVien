# Phân Tích Toàn Diện – 7 Vấn Đề Hệ Thống Web3 Đồ Án

## Tổng quan hiện trạng sau khi nghiên cứu codebase

Hệ thống hiện tại gồm:
- **Frontend**: React + Ant Design (4 tab sinh viên: Dashboard, Đăng ký Đề tài, Nộp Báo cáo, Tiến độ)
- **Backend**: Node.js + MongoDB (models: SinhVien, GiangVien, DeTai, DangKyDeTai, BaoCao, DiemSo)
- **ML Service**: FastAPI (PhoBERT + SBERT) trên port 8001
- **Blockchain**: Solidity smart contract `ThesisManagement.sol` trên Sepolia
- **Storage**: Pinata IPFS cho file báo cáo

---

## 1. 📋 Sinh viên nhập năng lực (Kỹ năng, Điểm số)

### Hiện trạng
- Model `SinhVien` đã có các field: `GPA`, `ChuyenNganh`, `KyNang[]`
- **Dashboard sinh viên** hiển thị GPA và KyNang nhưng **chỉ đọc** (read-only)
- Trang `TopicRegistration` gọi `getStudentProfile()` để lấy profile → gửi cho SBERT matching
- **KHÔNG có giao diện nào cho sinh viên tự nhập/cập nhật** GPA, ChuyenNganh, KyNang

### Giải pháp đề xuất
Thêm một **form chỉnh sửa Profile** ngay trong Dashboard sinh viên hoặc tạo tab "Hồ sơ cá nhân":
- Cho phép SV nhập/sửa: `HoTen`, `Email`, `ChuyenNganh`, `GPA`, `KyNang[]`
- Khi SV cập nhật xong → SBERT matching tự động đối sánh lại khi vào trang Đăng ký Đề tài

> [!TIP]
> Mức độ phức tạp: **THẤP**. Chỉ cần thêm 1 form edit + 1 API endpoint `PUT /api/sinhvien/:id/profile`.

---

## 2. 📊 Tiến độ làm bài (Progress Updates)

### Hiện trạng
- Tab "Tiến Độ" hiện tại (`ProgressTracking.js`) chỉ là **timeline tổng quan** của quá trình (Đăng ký → Nộp bài → AI phân tích → GV chấm → Blockchain)
- **KHÔNG CÓ** chức năng cho sinh viên cập nhật tiến độ công việc (ví dụ: "Đã hoàn thành chương 2", "Đang code phần backend", v.v.)

### Giải pháp đề xuất – **Thêm tab "Nhật Ký Tiến Độ" (Progress Log)**

Mình đề xuất **2 phương án**, bạn chọn 1:

#### Phương án A: Thêm tab mới "Nhật ký tiến độ" (Khuyên chọn ✅)
- Sinh viên có tab riêng để cập nhật tiến độ dạng timeline/log
- Mỗi entry gồm: ngày, mô tả công việc, phần trăm hoàn thành, file đính kèm (optional)
- Giảng viên xem được ở bên Duyệt Báo Cáo hoặc tab riêng

#### Phương án B: Tích hợp vào tab "Tiến Độ" hiện tại
- Giữ timeline Steps ở trên
- Thêm phần "Nhật ký cập nhật" ở dưới với nút "Thêm cập nhật mới"

### Cấu trúc dữ liệu đề xuất (Model mới: `TienDo`)
```javascript
const tienDoSchema = new mongoose.Schema({
  DeTai: { type: ObjectId, ref: 'DeTai', required: true },
  SinhVien: { type: ObjectId, ref: 'SinhVien', required: true },
  NoiDung: { type: String, required: true },       // Mô tả công việc
  PhanTramHoanThanh: { type: Number, default: 0 }, // 0-100%
  LoaiCapNhat: { type: String, enum: ['NghienCuu', 'ThietKe', 'LapTrinh', 'KiemThu', 'VietBaoCao', 'Khac'] },
  FileDinhKem: { type: String },                   // CID trên IPFS (optional)
  NhanXetGV: { type: String },                     // GV có thể comment
}, { timestamps: true });
```

> [!IMPORTANT]  
> Mức độ phức tạp: **TRUNG BÌNH**. Cần tạo model mới, API CRUD, component sinh viên + phần hiển thị cho giảng viên.

---

## 3. 🤖 Vai trò AI trong điểm số cuối cùng

### Hiện trạng
- AI (PhoBERT) chỉ **gợi ý điểm** (`AI_Score`) và feedback
- Giảng viên có thể thay đổi điểm tùy ý bằng `InputNumber` trước khi ký MetaMask
- Điểm lưu on-chain là `Diem` (điểm GV quyết định), `AI_Score` chỉ lưu tham khảo trong DB
- Model `DiemSo` lưu cả `Diem` (GV), `AI_Score` (AI), `AI_Feedback`

### Phân tích & Đề xuất

Trong thực tế đồ án, **điểm cuối cùng phải do giảng viên quyết định**. AI chỉ nên đóng vai trò **tham khảo/gợi ý**. Đây là cách hệ thống đang hoạt động và **đã hợp lý**.

Tuy nhiên, có thể nâng cấp thêm:

| Phương án | Mô tả | Khuyên dùng? |
|-----------|-------|:------------:|
| **A. AI chỉ gợi ý** (hiện tại) | GV tự quyết 100%, AI chỉ hiển thị tham khảo | ✅ Phù hợp thực tế |
| **B. Điểm trung bình** | `Diem = (AI_Score * w1 + GV_Score * w2)` với trọng số | ⚠️ Phức tạp, cần cân nhắc |
| **C. AI chấm tự động + GV duyệt** | AI ra điểm trước, GV chỉ cần approve hoặc override | Có thể xem xét |

> [!TIP]
> Khuyến nghị: **Giữ phương án A** (AI gợi ý, GV quyết định). Đây là cách tiếp cận an toàn và phù hợp với bối cảnh giáo dục. Nếu muốn nâng cấp, có thể hiển thị rõ hơn phần so sánh `AI Score` vs `GV Score` khi GV chấm.

---

## 4. 🔒 Khóa nộp bài sau khi chấm điểm

### Hiện trạng
- Trang `ReportUpload.js` **luôn cho phép hủy nộp** bất kể đã chấm điểm hay chưa
- Nút "Hủy Nộp (Xóa bài & Nộp lại)" hiển thị khi `hasSubmission = true`
- **KHÔNG kiểm tra** xem bài đã được chấm điểm chưa

### Đây là lỗi logic! ❌

Sau khi GV đã chấm điểm và ghi lên blockchain:
- Sinh viên **KHÔNG được phép** hủy nộp
- Vì điểm đã on-chain, xóa báo cáo sẽ gây inconsistency

### Giải pháp
Cần thêm logic kiểm tra:
```javascript
// Kiểm tra xem đã có điểm chưa
const diemRes = await aiApiService.getDiemBySinhVien(user.id);
const isGraded = diemRes?.some(d => d.BaoCao?._id === existingBaoCao?._id);

// Nếu đã chấm → ẩn nút hủy, hiển thị thông báo
{hasSubmission && !isGraded && (
  <Button danger onClick={handleUnsubmit}>Hủy Nộp</Button>
)}
{isGraded && (
  <Alert type="success" message="Bài đã được chấm điểm. Không thể hủy nộp." />
)}
```

> [!WARNING]
> Mức độ phức tạp: **THẤP** nhưng **RẤT QUAN TRỌNG** – cần fix ngay để tránh mất dữ liệu.

---

## 5. 🦊 Quản lý tài khoản MetaMask

### Hiện trạng
- Hệ thống dùng **MetaMask wallet** để đăng nhập (Challenge-Response, ký chữ ký)
- Nếu wallet chưa có trong DB → **auto-register** là sinh viên mới (`authController.js` dòng 65-73)
- Mỗi MetaMask account = 1 địa chỉ ví = 1 sinh viên/giảng viên
- **Vấn đề**: 1 sinh viên có thể tạo nhiều account MetaMask → nhiều tài khoản SV

### Phân tích

| Vấn đề | Giải thích |
|--------|-----------|
| 1 SV tạo nhiều ví | Hệ thống tự register mới → duplicate |
| Không thể cấp hàng loạt | MetaMask là self-custody, private key do user tự quản |
| Không có admin panel | Không có chức năng quản lý user |

### Giải pháp đề xuất

#### Phương án A: Admin tạo tài khoản sẵn (Khuyên chọn ✅)
1. **Admin/GV tạo danh sách SV** trước trong DB (MaSV, HoTen, Email)
2. SV vẫn dùng MetaMask đăng nhập lần đầu
3. Nhưng thay vì auto-register → **yêu cầu SV liên kết ví** với tài khoản đã tạo sẵn (nhập MaSV hoặc Email để verify)
4. Sau khi liên kết → ghi wallet address vào record SV đã có

Luồng:
```
[SV cài MetaMask] → [Kết nối ví] → [Hệ thống hỏi: "Nhập Mã SV để liên kết"]
    → [SV nhập MaSV + Email] → [Hệ thống tìm record đã tạo] → [Ghi WalletAddress]
```

#### Phương án B: Dùng script tạo ví hàng loạt (Không khuyên)
- Dùng ethers.js tạo 50-100 ví tự động → export private key
- **Rủi ro bảo mật cao**: ai giữ private key? Nếu bị lộ thì sao?

> [!IMPORTANT]
> Khuyến nghị: **Phương án A** – Cho GV/Admin tạo danh sách SV trước, SV tự liên kết ví. An toàn và thực tế nhất.

---

## 6. 📝 Chi tiết đề tài & Thông tin GVHD

### Hiện trạng

**Model `DeTai`** hiện chỉ có:
- `TenDeTai` (tên)
- `MoTa` (mô tả cốt lõi - ngắn)
- `YeuCau[]` (yêu cầu công nghệ - tags)
- `GiangVienHuongDan` (1 GV duy nhất)
- `Deadline`, `TrangThai`

**Thiếu so với thực tế** (như hình bạn gửi):

| Thông tin thực tế | Có trong hệ thống? |
|-------------------|:-------------------:|
| Tên đề tài | ✅ |
| Mô tả chi tiết (dài) | ❌ Chỉ có MoTa ngắn |
| Mục tiêu đề tài | ❌ |
| Yêu cầu nội dung | ❌ |
| Yêu cầu khác | ❌ |
| GVHD (tên, email) | ⚠️ Có ref nhưng SV không thấy tên |
| Nhiều GVHD | ❌ Chỉ 1 |
| Bộ môn | ❌ |
| Định hướng (Ứng dụng/Nghiên cứu) | ❌ |

### Giải pháp đề xuất

#### A. Mở rộng Model `DeTai`
```javascript
const deTaiSchema = new mongoose.Schema({
  MaDeTai: { type: String, required: true, unique: true },
  TenDeTai: { type: String, required: true },
  MoTa: { type: String },                    // Mô tả cốt lõi (ngắn)
  MoTaChiTiet: { type: String },             // ← MỚI: Mô tả chi tiết (dài)
  MucTieu: { type: String },                 // ← MỚI: Mục tiêu đề tài
  YeuCauNoiDung: { type: String },           // ← MỚI: Yêu cầu nội dung
  YeuCauKhac: { type: String },              // ← MỚI: Yêu cầu khác
  YeuCau: [{ type: String }],                // Tags công nghệ (cho SBERT)
  Deadline: { type: Date, required: true },
  GiangVienHuongDan: [{ type: ObjectId, ref: 'GiangVien' }], // ← THAY ĐỔI: Array thay vì 1
  BoMon: { type: String },                   // ← MỚI
  DinhHuong: { type: String, enum: ['UngDung', 'NghienCuu', 'KetHop'] }, // ← MỚI
  TrangThai: { type: String, enum: ['MoDangKy', 'DaChot', 'HoanThanh'], default: 'MoDangKy' }
}, { timestamps: true });
```

#### B. Cập nhật giao diện Sinh viên
- Card đề tài: Hiển thị tên GVHD (populate từ ref)
- Thêm nút "Xem chi tiết" → Modal/Drawer hiển thị đầy đủ thông tin
- Giữ card preview ngắn gọn, chi tiết chỉ khi click vào

#### C. Cập nhật form tạo đề tài của GV
- Thêm các field mới vào Modal tạo đề tài
- Cho phép chọn nhiều GVHD (co-advisor)

> [!IMPORTANT]
> Mức độ phức tạp: **TRUNG BÌNH**. Cần sửa model, API, form GV tạo đề tài, và card hiển thị cho SV.

---

## 7. 📁 Quản lý file nộp bài & Download trên Pinata

### Hiện trạng
- Sinh viên nộp file PDF → upload lên **Pinata IPFS** → nhận `IPFS_CID`
- CID được lưu trong DB (`BaoCao.IPFS_CID`)
- **Giảng viên** ở trang Duyệt Báo Cáo chỉ thấy CID nhưng **KHÔNG CÓ** nút download trực tiếp
- Trên Pinata Dashboard (như hình bạn gửi), tất cả files nằm chung → KHÓ phân biệt nhóm/SV nào

### Vấn đề cụ thể
1. **GV không thể download bài từ hệ thống** → phải tự lên Pinata tìm CID → bất tiện
2. **Không có cấu trúc folder** trên Pinata → bài nộp chung 1 đống
3. **Không có convention đặt tên file**

### Giải pháp đề xuất

#### A. Thêm nút Download/Xem trực tiếp cho GV (Ưu tiên cao nhất ✅)
Trong `SubmissionReview.js`, thêm link download:
```javascript
// IPFS Gateway URL (Pinata hoặc public gateway)
const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${submission.IPFS_CID}`;
// hoặc: `https://scarlet-high-stingray-706.mypinata.cloud/ipfs/${submission.IPFS_CID}`

<Button href={ipfsUrl} target="_blank" icon={<Download />}>
  Tải xuống báo cáo
</Button>
```

#### B. Convention đặt tên file tự động
Khi SV nộp, hệ thống tự đổi tên file trước khi upload:
```
Format: {MaSV}_{MaDeTai}_{timestamp}.pdf
VD: SV001_DT_1712345678_20260408.pdf
```
→ Trên Pinata sẽ nhìn rõ file của ai

#### C. Pinata Group/Folder (Nâng cao, có thể bỏ qua)
- Pinata API hỗ trợ **metadata** và **keyvalues** khi upload
- Có thể thêm metadata: `{ group: "DeTai_X", student: "SV001" }`
- **Nhưng**: Pinata free plan có giới hạn, và IPFS về bản chất là flat (không có folder thật sự)
- **Kết luận**: Không nên phức tạp hóa. Chỉ cần convention tên file + link download trong hệ thống là đủ

> [!TIP]
> Mức độ phức tạp: 
> - **THẤP** cho giải pháp A (thêm nút download) – nên làm ngay
> - **THẤP** cho giải pháp B (convention tên) – đổi tên file trước khi upload  
> - **CAO** cho giải pháp C (folder/group) – không cần thiết

---

## 📌 Tóm tắt Ưu tiên triển khai

| # | Vấn đề | Mức ưu tiên | Phức tạp | Cần làm? |
|---|--------|:-----------:|:--------:|:--------:|
| 4 | Khóa hủy nộp sau chấm điểm | 🔴 Cao | Thấp | ✅ Fix ngay |
| 7A | Nút download cho GV | 🔴 Cao | Thấp | ✅ Làm ngay |
| 1 | Form nhập năng lực SV | 🟡 Trung bình | Thấp | ✅ Nên làm |
| 6 | Mở rộng chi tiết đề tài | 🟡 Trung bình | Trung bình | ✅ Nên làm |
| 2 | Tab nhật ký tiến độ | 🟡 Trung bình | Trung bình | ❓ Tùy bạn |
| 5 | Liên kết ví MetaMask | 🟢 Thấp | Trung bình | ❓ Tùy quy mô |
| 3 | Vai trò AI trong điểm | 🟢 Thấp | — | ✅ Giữ nguyên |

---

## ❓ Câu hỏi cần bạn quyết định

1. **Tiến độ (Vấn đề 2)**: Bạn muốn **Phương án A** (tab mới) hay **Phương án B** (tích hợp tab cũ)?
2. **Đề tài (Vấn đề 6)**: Bạn muốn thêm tất cả fields (mục tiêu, yêu cầu nội dung, bộ môn, định hướng) hay chỉ thêm `MoTaChiTiet` + cho thấy tên GVHD?
3. **Tài khoản (Vấn đề 5)**: Trong phạm vi đồ án, bạn có muốn làm tính năng admin tạo SV trước không, hay giữ auto-register hiện tại?
4. **Bạn muốn bắt đầu triển khai vấn đề nào trước?**
