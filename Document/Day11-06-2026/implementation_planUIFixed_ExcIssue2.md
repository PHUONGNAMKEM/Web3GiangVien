# Sửa lỗi & Cải tiến UX: Tiến Độ, Minh Chứng Upload, Cảnh Báo Toggle, Badge Thông Báo

Người dùng yêu cầu sửa 4 vấn đề liên quan đến module Tiến Độ và Nộp Báo Cáo.

## Tổng Quan Các Vấn Đề

| # | Vấn đề | Vị trí | Mức độ |
|---|--------|--------|--------|
| 1 | Lỗi TypeError `null.toString()` khi SV xem tiến độ → chờ lâu, 500 Error | `ProgressTracking.js:40` | Bug |
| 2 | Minh chứng cần cho upload file thay vì chỉ nhập URL | `ProgressLog.js` form + Backend | Feature |
| 3 | Badge cảnh báo tiến độ (vàng - SV, đỏ - GV) cần có nút X tắt/thu nhỏ thành icon, bấm lại hiện ra | `ProgressLog.js`, `SubmissionReview.js` | UX |
| 4 | Chấm đỏ notification trên button Tiến Độ của GV cần mất đi sau khi bấm đọc | `SubmissionReview.js` | Bug/UX |

---

## Proposed Changes

### 1. Fix TypeError `null.toString()` trong ProgressTracking.js

#### [MODIFY] [ProgressTracking.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/student/ProgressTracking.js)

**Nguyên nhân:** Dòng 40 gọi `(g.DeTai?._id || g.DeTai).toString()` nhưng nếu `g.DeTai` là `null`, thì `g.DeTai?._id` = `undefined`, và `undefined || null` = `null` → `null.toString()` throw TypeError.

**Fix:** Thêm null-check:
```diff
- const topicGrade = diemRes.find(g => (g.DeTai?._id || g.DeTai).toString() === deTaiId.toString());
+ const topicGrade = diemRes.find(g => {
+   const gDeTaiId = g.DeTai?._id || g.DeTai;
+   return gDeTaiId && deTaiId && String(gDeTaiId) === String(deTaiId);
+ });
```

---

### 2. Cho sinh viên upload file minh chứng (thay vì chỉ nhập URL)

#### [MODIFY] [server.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/server.js)

- Thêm multer config cho upload minh chứng (chấp nhận ảnh, PDF, zip — giới hạn 5MB/file, tối đa 5 file)
- Thêm route `POST /api/tiendo/upload-minhchung` dùng multer upload file, trả về URL
- Serve thư mục `uploads/minhchung` qua express.static

#### [MODIFY] [tienDoController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/controllers/tienDoController.js)

- Thêm controller `uploadMinhChung` để nhận file upload từ multer, lưu vào `uploads/minhchung/`, trả về URL tuyệt đối

#### [MODIFY] [aiService.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/services/aiService.js)

- Thêm hàm `uploadMinhChung(formData)` gọi API upload file minh chứng

#### [MODIFY] [ProgressLog.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/student/ProgressLog.js)

- Trong form minh chứng: thay ô `URL` (Input text) bằng `Upload.Dragger` hoặc `Upload` component của Ant Design
- Khi user chọn file → gọi API `uploadMinhChung` → nhận URL → set vào form field `url`
- Vẫn giữ option nhập URL thủ công (có thể toggle giữa upload file và nhập URL)
- Hiển thị preview tên file khi đã upload thành công

---

### 3. Badge cảnh báo tiến độ có thể tắt/mở (toggle X → icon)

#### [MODIFY] [ProgressLog.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/student/ProgressLog.js)

**Vị trí:** Dòng 384-392 — Alert cảnh báo tiến độ (màu vàng) cho sinh viên

- Thêm state `dismissedWarnings` (Set of item._id) để track những cảnh báo đã tắt
- Khi tắt: thu nhỏ thành icon ⚠️ nhỏ, bấm vào hiện lại Alert
- Pattern tham chiếu: giống `alertProgressClosed` trong SubmissionReview.js (Tóm Tắt Tiến Độ Tuần tab GV)

```
Khi mở:  [Alert warning] Cảnh báo tiến độ — Nội dung ... [X]
Khi tắt: ⚠️ (icon nhỏ, bấm vào hiện lại)
```

#### [MODIFY] [SubmissionReview.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/SubmissionReview.js)

**Vị trí:** Dòng 1758-1767 — Alert cảnh báo (màu đỏ) trong Progress Drawer của GV

- Thêm state `dismissedDrawerWarnings` (Set of item._id)
- Khi tắt: thu nhỏ thành icon 🔴 nhỏ, bấm vào hiện lại
- Pattern giống alertProgressClosed đã có sẵn ở section "Tóm Tắt Tiến Độ Tuần" (dòng 1411-1437)

> [!NOTE]
> Section "Tóm Tắt Tiến Độ Tuần" (dòng 1411-1437) đã có pattern toggle tắt/mở đúng yêu cầu. Cần áp dụng tương tự cho:
> - Cảnh báo tiến độ trong Progress Drawer (GV view, dòng 1758-1767)
> - Cảnh báo tiến độ trong ProgressLog (SV view, dòng 384-392)

---

### 4. Chấm đỏ notification trên button Tiến Độ (GV) mất đi khi bấm đọc

#### [MODIFY] [SubmissionReview.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/SubmissionReview.js)

**Vị trí:** Dòng 1003-1014 — Button "Tiến Độ" với `Badge dot`

**Hiện tại:** `hasPendingProgress` check từ `progressPendingMap` → hiện chấm đỏ khi có tiến độ chưa đánh giá. Khi GV bấm "Tiến Độ" → `viewProgress()` gọi `fetchStudentProgress()` → cập nhật `progressPendingMap` (dòng 168-177) → nhưng giá trị vẫn > 0 vì đếm bằng `countPendingProgress` (filter status 'ChoDanhGia').

**Vấn đề:** Badge dot biểu thị "có tiến độ chưa đọc" nhưng logic hiện tại đếm "tiến độ chưa đánh giá". GV bấm đọc rồi nhưng chưa đánh giá → badge vẫn hiển thị.

**Giải pháp:** Khi GV mở drawer tiến độ (bấm nút Tiến Độ), đánh dấu đã "đọc" bằng cách:
- Thêm state `readProgressKeys` (Set) — lưu các submission key đã đọc
- Khi `viewProgress()` được gọi → thêm key vào `readProgressKeys`
- Badge dot điều kiện: `hasPendingProgress && !readProgressKeys.has(key)` — tức là có pending VÀ chưa đọc mới hiện dot
- Reset `readProgressKeys` khi data refetch (refetchInterval 20s) — nếu có tiến độ MỚI → dot hiện lại

---

## Verification Plan

### Automated Tests
- Build frontend không lỗi: `npm run build`

### Manual Verification
- **Bug #1:** SV vào trang Tiến Độ Xét Duyệt → không còn TypeError trong console, trang load nhanh
- **Feature #2:** SV cập nhật tiến độ → phần Minh chứng có nút upload file → upload thành công → hiển thị tên file + link
- **UX #3:** SV xem nhật ký tiến độ → cảnh báo vàng có nút X → bấm X → thu nhỏ thành icon → bấm icon → hiện lại. Tương tự GV view cảnh báo đỏ
- **UX #4:** GV xem bảng duyệt báo cáo → nút Tiến Độ có chấm đỏ → bấm vào đọc → chấm đỏ mất → nếu SV nộp tiến độ mới → chấm đỏ hiện lại
