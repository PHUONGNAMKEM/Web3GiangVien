# So Sánh Triết Lý Thiết Kế: Google Classroom vs Web3GiangVien

**Ngày tạo:** 2026-05-29
**Chủ đề:** Phân tích sự khác biệt kiến trúc giữa mô hình nền tảng giáo dục đại chúng (Google Classroom) và hệ thống Web3GiangVien

---

## Phần 1 — Triết Lý Nền Tảng Giáo Dục Đại Chúng (Google Classroom Model)

Việc cho phép người dùng tự chọn vai trò (Học sinh hoặc Giảng viên) ngay khi mới tạo tài khoản là một quyết định mang tính chiến lược về **Thiết kế Sản phẩm (Product Design)** và **Kiến trúc Hệ thống (System Architecture)**.

Khi xây dựng các nền tảng hỗ trợ giảng dạy mang tính đại chúng (public services) như Google Classroom, các kỹ sư và quản lý sản phẩm thường tư duy dựa trên sự đánh đổi giữa trải nghiệm người dùng và tính bảo mật kiểm soát. Dưới đây là cách họ suy nghĩ khi thiết kế luồng (flow) này:

### 1.1 Ưu tiên "Giảm ma sát" (Zero-Friction Onboarding)

Với các ứng dụng public, mục tiêu tối thượng là tăng trưởng và thu hút người dùng (User Acquisition).

- Nếu hệ thống yêu cầu người dùng phải nộp giấy tờ chứng minh mình là giáo viên, hoặc phải chờ một Admin (quản trị viên) cấp quyền, tỷ lệ người dùng bỏ cuộc (drop-off rate) sẽ rất cao.
- Bằng cách cho phép tự chọn vai trò, hệ thống đưa người dùng vào thẳng màn hình chính để họ trải nghiệm core feature (tính năng cốt lõi) ngay lập tức. Tính dễ dùng được đặt lên hàng đầu.

### 1.2 Quản lý quyền theo Ngữ cảnh (Contextual RBAC)

Thắc mắc: *"Nhỡ một học sinh chọn nhầm hoặc cố tình chọn làm Giảng viên thì sao?"* Dưới góc độ kỹ thuật, hệ thống xử lý bằng cách không cấp quyền lực tuyệt đối cho cái mác "Giảng viên". Vai trò lúc đăng ký thực chất chỉ là một **Role mặc định** để tối ưu hóa giao diện (UI):

- **Nếu chọn Giáo viên:** Nút "Tạo lớp học" (Create Class) sẽ to và rõ ràng hơn.
- **Nếu chọn Học sinh:** Nút "Tham gia lớp học" (Join Class) sẽ được ưu tiên.

Tuy nhiên, quyền thực sự (Permissions) được gắn vào **Ngữ cảnh (Context)** của từng lớp học cụ thể, chứ không gắn vào định danh cá nhân:

- Một người tự nhận là "Giảng viên" có thể tạo ra một lớp học, nhưng lớp học đó sẽ trống rỗng. Họ không có quyền truy cập vào danh sách sinh viên hay dữ liệu của bất kỳ ai khác cho đến khi sinh viên tự nguyện nhập mã (Class Code) để tham gia.
- Một người có thể là Owner/Teacher ở Lớp A (do họ tự tạo), nhưng lại là Student ở Lớp B (do họ nhập mã tham gia). Hệ thống không hề bị xung đột logic.

### 1.3 Phân tán rủi ro (Decentralized Trust)

Thay vì dùng mô hình "Centralized" (như hệ thống ERP của doanh nghiệp hay cổng thông tin nội bộ của trường đại học – nơi tài khoản do phòng IT tạo và gán sẵn MSSV/Mã Giảng viên), Google Classroom dùng mô hình "Decentralized".

Họ đẩy trách nhiệm xác thực (Authentication) cho người dùng cuối:

- **"Trust but Verify"**: Nền tảng tin tưởng lựa chọn ban đầu của bạn. Nhưng tính hợp lệ của lớp học được bảo chứng bởi **mã lớp học (Class Code) hoặc email mời (Invitation link)**.
- Rủi ro hệ thống gần như bằng 0. Nếu ai đó tạo tài khoản giả làm giáo viên, họ chỉ tự chơi trong một "sandbox" (lớp học) của riêng họ và không gây ảnh hưởng đến dữ liệu chung.

### 1.4 Khả năng mở rộng (Scalability)

Thiết kế này giúp tiết kiệm hàng triệu giờ làm việc cho đội ngũ vận hành. Sẽ không cần một đội ngũ Admin khổng lồ để ngồi duyệt hàng triệu yêu cầu tạo tài khoản giáo viên trên toàn cầu. Nền tảng tự vận hành (self-serve) dựa trên các quy tắc nghiệp vụ (business rules) đã được code sẵn.

**Tóm lại (Classroom):**
> Thay vì khóa chặt hệ thống từ cửa (strict access control), các nhà phát triển chọn cách mở toang cửa để mọi người dễ dàng vào trong, nhưng họ xây dựng các "vách ngăn logic" rất chặt chẽ giữa các tính năng. Bạn có thể tự nhận mình là ai cũng được, nhưng bạn chỉ có thể tương tác với những người chấp nhận sự kết nối của bạn.

---

## Phần 2 — Kiến Trúc Hiện Tại Của Web3GiangVien

Dựa trên khảo sát trực tiếp codebase:

### 2.1 Cơ chế Auth & Vai trò (authController.js)

```
Ví MetaMask ký challenge
        ↓
Backend tra cứu: có trong collection giangviens không?
  ├── Có → role_id = 'LECTURER_ROLE'
  └── Không → tra tiếp sinhviens
        ├── Có → role_id = 'STUDENT_ROLE'
        └── Không → auto-create SinhVien mới → role_id = 'STUDENT_ROLE'
        
JWT được ký với role_id cố định → mọi request sau dùng role này
```

**File nguồn:** `backend/controllers/authController.js` lines 57–74

### 2.2 Phân quyền (authz.js)

```javascript
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role_id)) { // kiểm tra toàn cục, không theo context
    return res.status(403).json({ ... });
  }
  next();
};
```

**File nguồn:** `backend/middleware/authz.js`

### 2.3 Cách giảng viên được tạo

Không có UI đăng ký. Giảng viên phải được **admin seed thủ công** vào MongoDB:
- `backend/seed_lecturer.js` — chèn thẳng ví MetaMask vào collection `giangviens`
- `backend/fix_lecturer.js` — sửa lỗi khi ví bị nhầm vào collection sinhviens

### 2.4 Cách sinh viên vào lớp

Không có class code. Giảng viên phải **thêm tay từng sinh viên**:

```
POST /api/lop-hoc/:id/sinh-vien
Body: { sinhVienId: "..." }
```

**File nguồn:** `backend/controllers/lopHocController.js` lines 138–175

### 2.5 Schema danh tính (hai collection tách biệt)

```
MongoDB:
  collection: sinhviens  (model SinhVien.js)  ← loại người riêng
  collection: giangviens (model GiangVien.js) ← loại người riêng
```

Không có một model User chung. Vai trò là **danh tính**, không phải **thuộc tính**.

---

## Phần 3 — Bảng So Sánh Trực Tiếp

| Trụ cột Classroom | Web3GiangVien hiện tại | Chênh lệch |
|---|---|---|
| Tự chọn vai trò khi đăng ký | Không có. Ví lạ → tự động thành SV. GV phải được admin seed. | Khác hoàn toàn |
| Contextual RBAC (quyền theo ngữ cảnh lớp) | Không có. Role toàn cục, cứng trong JWT. | Khác hoàn toàn |
| Join-by-code (SV tự vào lớp bằng mã) | Không có. GV thêm tay từng người. | Khác hoàn toàn |
| Self-serve, không cần Admin duyệt tài khoản | Không có. GV phải được Admin seed vào DB. | Khác hoàn toàn |
| Một user = nhiều vai trò tùy lớp | Không có. Một ví = một role duy nhất toàn hệ thống. | Khác hoàn toàn |

**Kết luận bảng:** 3 trụ cột triết lý Classroom — project hiện tại **không có cái nào**.

Project đang là mô hình **Centralized / strict access control** — chính xác là loại "ERP trường đại học" mà đoạn văn nêu ra để **đối lập** với Classroom.

---

## Phần 4 — Nếu Đổi Sang Triết Lý Classroom: Danh Sách Thứ Cần Triển Khai

### A. Lớp danh tính & Auth (đập đi xây lại nền)

| # | Việc cần làm | Mức độ lan tỏa |
|---|---|---|
| A1 | Gộp `SinhVien` + `GiangVien` thành một model `User` với field `role` chọn được | **Rất cao** — mọi controller gọi `.findOne()` đều phải sửa |
| A2 | Thêm màn hình + endpoint đăng ký có cho chọn vai trò | Trung bình |
| A3 | Bỏ auto-register-thành-student và bỏ sự phụ thuộc vào `seed_lecturer.js` | Thấp sau khi làm A1 |

### B. Contextual RBAC (phần nặng nhất)

| # | Việc cần làm | Mức độ lan tỏa |
|---|---|---|
| B1 | Thêm model **membership**: `(User × LopHoc × vaiTrò_trong_lớp)` với vaiTrò = owner/teacher/student | **Rất cao** — schema mới hoàn toàn |
| B2 | Viết lại middleware `requireRole`: từ "đọc role cố định trong JWT" → "tra vai trò của user trong đúng resource" | **Rất cao** — mọi route dùng `requireRole` phải đổi |
| B3 | Bỏ `role_id` nhúng cứng trong JWT, chỉ giữ danh tính | Trung bình |

### C. Join-by-code

| # | Việc cần làm | Mức độ lan tỏa |
|---|---|---|
| C1 | Thêm field `maVaoLop` (class code) vào model `LopHoc` | Thấp |
| C2 | Thêm endpoint `POST /api/lop-hoc/join` nhận class code | Thấp |
| C3 | Frontend SV: thêm nút "Tham gia lớp bằng mã" | Thấp |

### D. Blockchain — điểm vướng thật sự

| # | Việc cần làm | Ghi chú |
|---|---|---|
| D1 | Thiết kế lại cơ chế tin cậy on-chain nếu cho phép self-select vai trò GV | Nếu ai cũng tự nhận là GV được, việc một địa chỉ ví bất kỳ ghi điểm lên blockchain trở thành **lỗ hổng bảo mật thật** |

---

## Phần 5 — Phân Tích & Kết Luận

### 5.1 Tại sao triết lý Classroom KHÔNG khớp với bài toán này

Đoạn văn phân tích về Classroom **đúng hoàn toàn**… cho Google Classroom, vì rủi ro ở đó gần bằng 0: kẻ giả danh GV chỉ "tự chơi trong sandbox của mình". **Nhưng Web3GiangVien khác bản chất:**

- Đây là quản lý **khóa luận tốt nghiệp**, có **chấm điểm chính thức ghi lên blockchain**.
- MSSV và mã giảng viên **vốn dĩ là do nhà trường cấp** — danh tính authoritative là *đúng nghiệp vụ*, không phải "ma sát thừa".
- Điểm số on-chain là **dữ liệu pháp lý/học vụ**. "Trust but Verify" kiểu Classroom không chấp nhận được khi hậu quả là điểm tốt nghiệp giả.

### 5.2 Mô hình centralized của dự án không phải thiếu sót — nó là lựa chọn đúng

Mô hình hiện tại (Centralized / strict access control) không phải là thiếu sót cần sửa. Nó là **lựa chọn kiến trúc phù hợp** với domain quản lý học vụ có yếu tố blockchain/pháp lý.

### 5.3 Gợi ý hybrid thực tế (điểm cân bằng tốt nhất)

Nếu mục tiêu là **giảm ma sát** mà không phá vỡ bảo mật, chỉ lấy **một thứ** từ Classroom:

> **Triển khai join-by-code cho sinh viên vào lớp** (Phần C ở trên).

**Lý do đây là điểm cân bằng tốt nhất:**

| Tiêu chí | Đánh giá |
|---|---|
| Giảm ma sát thật sự | ✅ GV không cần thêm tay từng người |
| Rủi ro bảo mật | ✅ Gần bằng 0 — SV chỉ vào được lớp có mã, không leo thang quyền |
| Không đụng tới blockchain | ✅ Không ảnh hưởng tính toàn vẹn dữ liệu on-chain |
| Scope triển khai | ✅ Nhỏ gọn — 3 việc ở Phần C, không cần đập nền |
| Danh tính GV vẫn do nhà trường xác thực | ✅ Giữ nguyên `seed_lecturer` hoặc nâng cấp thành admin panel |

**Giữ nguyên:** danh tính giảng viên do admin/nhà trường xác thực — đừng cho self-select vai trò GV.

---

## Phần 6 — Nguồn Tham Chiếu (Files Đã Khảo Sát)

| File | Nội dung khảo sát |
|---|---|
| `backend/controllers/authController.js` | Luồng xác thực MetaMask, logic gán role, auto-register |
| `backend/middleware/authz.js` | Cơ chế kiểm tra quyền (`requireRole`) |
| `backend/seed_lecturer.js` | Cách giảng viên được tạo trong hệ thống |
| `backend/controllers/lopHocController.js` | Luồng quản lý lớp học, cách thêm sinh viên (`addSinhVien`) |
| `Web3Vault/01_Workflows/luong-quanly-monhoc-lophoc-detai.md` | Sơ đồ nghiệp vụ tổng thể |
| `Web3Vault/08_Database/schema-monhoc-lophoc.md` | Schema MonHoc, LopHoc |

---

*Tài liệu phân tích kiến trúc — Web3GiangVien — Team_12.04.26 — 2026-05-29*
