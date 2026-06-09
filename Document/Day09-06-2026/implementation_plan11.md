# Kế Hoạch Triển Khai: 11 Mục Cải Thiện UI, Cache & Realtime

## Phân Nhóm Yêu Cầu

| Nhóm | Mục | Nội dung | Độ phức tạp |
|------|-----|----------|-------------|
| **A. UI Fix** | #2, #4, #5, #11 | CSS/layout fixes | Thấp |
| **B. Cache Invalidation** | #1, #3, #5(load), #6(load) | React Query invalidate | Trung bình |
| **C. Nghiệp vụ** | #6 (giải pháp SV từ chối) | Backend + Frontend | Trung bình |
| **D. Realtime** | #7, #8 | WebSocket events | Cao |
| **E. Tư vấn BA** | #9, #10 | Phân tích thiết kế | Chỉ phân tích |

---

## A. UI Fixes (Nhỏ, làm ngay)

### #2 — Model & Provider tags dính nhau (ProgressTracking.js)

**File:** [ProgressTracking.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/student/ProgressTracking.js#L230-L231)

Hiện tại 2 Tag nằm cạnh nhau không có gap:
```jsx
<Tag color="cyan">Model: ...</Tag>
<Tag color="geekblue">Provider: ...</Tag>
```
**Fix:** Wrap trong `<Space>` hoặc thêm `style={{ marginRight: 8 }}` cho tag đầu.

---

### #4 — "Lời mời đang chờ chấp nhận" → "Đang chờ" + Fix icon alignment (ClassManagement.js)

**File:** [ClassManagement.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/ClassManagement.js)

**Thay đổi:**
1. **Dòng 511:** Đổi text `"Lời mời đang chờ chấp nhận ({n})"` → `"Đang chờ ({n})"`
2. **Dòng 508-512:** Thêm `display: 'flex', alignItems: 'center', gap: 6` cho wrapper icon + text
3. **Dòng 377 (inviteColumns Trạng Thái):** Sửa Tag icon Clock — thêm `display: 'inline-flex', alignItems: 'center', gap: 4`

---

### #5 — Nút Chấp nhận / Từ chối chiều rộng không đều (StudentDashboard.js)

**File:** [StudentDashboard.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/student/StudentDashboard.js#L252-L258)

**Fix:** Thêm `style={{ width: 100 }}` cho cả 2 Button hoặc dùng `minWidth`.

---

### #11 — Tag "Chờ SV nộp bài" nhỏ hơn Button (SubmissionReview.js)

**File:** [SubmissionReview.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/SubmissionReview.js#L792)

Hiện tại dùng `<Tag>` → nhỏ hơn `<Button>`. 
**Fix:** Đổi thành `<Button disabled>` với style tương đương để đồng nhất kích thước.

---

## B. Cache Invalidation (React Query)

### #1 — Sinh viên nộp báo cáo xong phải reload mới thấy điểm AI

**Phân tích:** Sau khi upload, [ReportUpload.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/student/ReportUpload.js) đã invalidate `['progress-tracking']`. Tuy nhiên, điểm AI hiển thị ở trang **Kết Quả & Điểm** (`/student/progress`) lấy dữ liệu qua query key `['progress-tracking', userId, classId]`.

**Nguyên nhân:** Sau khi upload + AI chấm xong, backend trả về kết quả nhưng trang hiện tại (ReportUpload) invalidate cache trang khác (ProgressTracking). Vấn đề là **SV đang ở trang upload, chưa navigate sang trang progress** — khi navigate sang, cache đã bị stale nhưng react-query có thể dùng `staleTime` hoặc hiển thị data cũ trước.

**Fix:** 
- Thêm invalidate `['student-dashboard']` trong ReportUpload sau upload thành công
- Đảm bảo `staleTime: 0` cho query `progress-tracking` (hoặc mặc định)

---

### #3 — Tạo môn học xong, tạo lớp phải reload mới thấy môn học

**Phân tích:** CourseManagement invalidate `['courses']`, nhưng ClassManagement dùng query key `['classes']` và fetch cả `monHocs` bên trong. Khi SPA navigate từ Quản Lý Môn Học → Quản Lý Lớp Học, data `monHocs` trong `['classes']` vẫn là cache cũ.

**Fix:** Khi CourseManagement tạo/sửa/xóa môn học thành công, **thêm invalidate `['classes']`** để ClassManagement re-fetch kèm danh sách monHocs mới.

---

### #5 (phần load) — Sinh viên phải reload mới thấy lời mời lớp

**Phân tích:** Lời mời lớp được fetch trong query `['student-dashboard']`. Query này chạy 1 lần khi component mount. Không có polling hoặc WebSocket listener nào push lời mời mới.

**Fix tạm (không cần WebSocket):** Đặt `refetchInterval: 30000` (30s) cho query `['student-dashboard']` hoặc `refetchOnWindowFocus: true` (mặc định đã bật).

> [!NOTE]
> Giải pháp hoàn chỉnh là dùng WebSocket (xem mục D). Giải pháp tạm thời đủ dùng cho demo đồ án.

---

### #6 (phần load) — Giảng viên phải reload mới thấy SV chấp nhận/từ chối

**Phân tích:** Modal chi tiết lớp chỉ fetch 1 lần khi mở. Không có cơ chế tự cập nhật.

**Fix tạm:** Thêm nút **"Làm mới"** trong modal chi tiết lớp để giảng viên bấm refresh danh sách.

---

## C. Nghiệp vụ: Giảng viên không biết SV nào từ chối (#6)

### Vấn đề
Khi SV từ chối lời mời, `LoiMoiLopHoc.TrangThai` chuyển sang `'TuChoi'`. Nhưng ở giảng viên, `getInvitesByLopHoc` lấy TẤT CẢ lời mời, còn `pendingInvites` chỉ filter `ChoChapNhan` → mất thông tin từ chối.

### Giải pháp: Hiển thị cả lời mời đã từ chối

**Backend:** Không cần sửa — API `getInvitesByLopHoc` đã trả tất cả trạng thái.

**Frontend ([ClassManagement.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/ClassManagement.js#L116)):**

1. Thay vì chỉ filter `ChoChapNhan`, tách thành 2 danh sách:
   - `pendingInvites` = `ChoChapNhan` (đang chờ)
   - `rejectedInvites` = `TuChoi` (đã từ chối)
2. Hiển thị thêm bảng **"Đã từ chối"** bên dưới bảng **"Đang chờ"**:
   - Cột: Mã SV, Họ Tên, Email, Trạng Thái (Tag đỏ "Đã từ chối"), Nút "Mời lại"

> [!IMPORTANT]
> Backend đã hỗ trợ mời lại SV đã từ chối (dòng 45-50 trong loiMoiLopHocController.js). Chỉ cần gọi lại API invite với cùng SV ID.

---

## D. Realtime (#7, #8) — Kiểm Tra Toàn Bộ WebSocket Gaps

### Hiện trạng WebSocket

| Event | Backend Emit | Frontend Listen | Hoạt động? |
|-------|-------------|-----------------|-----------|
| `competition:winner` | ✅ baiTestController | ✅ EntranceTest.js | ✅ |
| `competition:status` | ✅ baiTestController | ✅ EntranceTest.js | ✅ |
| `qr:success` | ✅ authController | ✅ PendingApproval.js | ✅ |
| `admin:newRequest` | ✅ authController | ✅ AdminRequests.js, MainLayout.js | ✅ |
| `request_result` | ✅ adminController | ✅ PendingApproval.js | ✅ |

### Các luồng **CHƯA CÓ** realtime

| Luồng | Mô tả | Ưu tiên |
|-------|-------|---------|
| **SV nộp báo cáo → GV thấy** | GV đang ở trang review, SV nộp bài xong GV không biết | Cao |
| **GV chấm điểm → SV thấy** | SV đang ở trang kết quả, GV chấm xong SV không biết | Cao |
| **GV mời vào lớp → SV thấy** | SV phải reload dashboard mới thấy lời mời | Trung bình |
| **SV chấp nhận/từ chối lời mời → GV thấy** | GV phải đóng/mở lại modal mới thấy cập nhật | Trung bình |
| **SV cập nhật tiến độ → GV thấy** | GV phải reload mới thấy nhật ký mới | Cao |
| **GV đánh giá tiến độ → SV thấy** | SV phải reload mới thấy nhận xét GV | Trung bình |
| **SV đăng ký đề tài → GV thấy** | GV phải reload mới thấy đăng ký mới | Thấp |
| **GV duyệt đăng ký → SV thấy** | SV phải reload mới thấy kết quả duyệt | Trung bình |

### Đề xuất triển khai (cho demo đồ án)

Thay vì triển khai đầy đủ WebSocket cho tất cả luồng (tốn thời gian), đề xuất **kết hợp 2 cách:**

1. **WebSocket cho luồng ưu tiên cao:** Nộp bài, chấm điểm, tiến độ
2. **Polling/refetchOnFocus cho luồng ưu tiên thấp:** Lời mời, đăng ký

> [!WARNING]
> Triển khai toàn bộ 8 luồng WebSocket là một task lớn. Bạn muốn triển khai tất cả hay chỉ ưu tiên luồng cao?

---

## E. Tư Vấn BA

### #9 — Có nên làm trang Settings cho API keys?

**Kết luận: KHÔNG NÊN** trong scope đồ án này.

**Lý do:**
- API keys (MetaMask private key, MongoDB URI, ML Service URL) là **thông tin nhạy cảm**
- Lưu API keys trong database thay vì `.env` tạo ra lỗ hổng bảo mật nghiêm trọng
- Nếu trang Settings bị exploit → toàn bộ hệ thống bị compromised
- Trong production, các thông số này được quản lý qua CI/CD, Docker secrets hoặc cloud env vars
- Đồ án đã đủ tính năng, không cần thêm complexity

**Thay thế:** Nếu muốn demo tính năng cấu hình, có thể làm trang **"Cài đặt hệ thống"** cho Admin với các thông số **không nhạy cảm** như:
- Ngưỡng đạt bài test mặc định
- Số lần nộp báo cáo tối đa
- Thời gian mặc định cho deadline
- Bật/tắt tính năng blockchain verification

---

### #10 — Có nên triển khai quản lý thời gian/deadline do giảng viên đặt?

**Kết luận: NÊN LÀM** — đây là tính năng nghiệp vụ quan trọng.

**Phân tích hiện trạng:**
- Model [DeTai.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/models/DeTai.js) đã có field `HanChot` (deadline đăng ký)
- Nhưng **chưa có** deadline nộp báo cáo, deadline cập nhật tiến độ, deadline chấm điểm
- Giảng viên **không thể** kiểm soát tiến trình competition theo timeline

**Đề xuất schema bổ sung (mở rộng DeTai):**
```javascript
// Thêm vào DeTai schema
HanChotNopBai: { type: Date },      // Deadline nộp báo cáo
HanChotTienDo: { type: Date },      // Deadline cập nhật tiến độ cuối
HanChot ChamDiem: { type: Date },   // Deadline GV hoàn tất chấm
```

**Ảnh hưởng:**
- **Backend:** Kiểm tra deadline trước khi cho phép nộp bài, cập nhật tiến độ
- **Frontend (SV):** Hiện countdown/cảnh báo sắp hết hạn tại trang upload, progress log
- **Frontend (GV):** Hiện deadline trong chi tiết đề tài, form tạo đề tài thêm DatePicker
- **Trang review:** Hiện cảnh báo nếu deadline đã qua mà SV chưa nộp

> [!IMPORTANT]
> Tính năng này cần thay đổi cả backend logic (chặn nộp bài quá hạn) và frontend (hiển thị). Bạn muốn triển khai scope nào? Full enforcement hay chỉ hiển thị cảnh báo?

---

## Verification Plan

### Automated Tests
- Kiểm tra frontend build không lỗi: `npm run build`
- Kiểm tra backend start không crash: `npm run dev`

### Manual Verification
1. **#2:** Mở trang `/student/progress` → kiểm tra khoảng cách giữa tag Model và Provider
2. **#4:** Mở modal chi tiết lớp → kiểm tra icon Clock thẳng hàng với text
3. **#5:** Mở dashboard sinh viên → kiểm tra nút Chấp nhận/Từ chối cùng chiều rộng
4. **#11:** Mở trang `/lecturer/review` → kiểm tra kích thước Tag "Chờ SV nộp bài"
5. **#1:** Nộp báo cáo → navigate sang trang Kết quả → kiểm tra điểm AI hiển thị ngay
6. **#3:** Tạo môn học mới → vào Quản lý lớp → Tạo lớp → kiểm tra môn học mới xuất hiện
7. **#6:** SV từ chối lời mời → GV mở modal → kiểm tra thấy dòng "Đã từ chối"
