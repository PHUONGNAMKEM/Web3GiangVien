# Walkthrough: Fix Tiến Độ UX Issues

## Tổng quan

Sửa 3 vấn đề liên quan đến module Tiến Độ và Cảnh Báo.

---

## Fix #1: TypeError `null.toString()` — ProgressTracking.js

**File:** [ProgressTracking.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/student/ProgressTracking.js#L40-L43)

**Nguyên nhân:** `g.DeTai` có thể null (khi đề tài bị xóa hoặc dữ liệu không đầy đủ), dẫn đến `(null).toString()` crash → TypeError → console error 500 → chờ lâu.

**Cách fix:** Thêm null-check trước khi so sánh:

```diff
- const topicGrade = diemRes.find(g => (g.DeTai?._id || g.DeTai).toString() === deTaiId.toString());
+ const topicGrade = diemRes.find(g => {
+   const gDeTaiId = g.DeTai?._id || g.DeTai;
+   return gDeTaiId && deTaiId && String(gDeTaiId) === String(deTaiId);
+ });
```

---

## Fix #3: Toggle cảnh báo tiến độ (tắt/mở bằng X → icon)

### SV View (màu vàng) — ProgressLog.js

**File:** [ProgressLog.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/student/ProgressLog.js#L384-L406)

- Thêm import `ExclamationCircleFilled` từ `@ant-design/icons`
- Thêm state `dismissedWarnings` (Set of item._id)
- Alert warning giờ có `closable` → bấm X → thu nhỏ thành icon ⚠️ + text ngắn
- Bấm icon → hiện lại Alert đầy đủ

### GV Drawer (màu đỏ) — SubmissionReview.js

**File:** [SubmissionReview.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/SubmissionReview.js#L1786-L1815)

- Thêm state `dismissedDrawerWarnings` (Set of item._id)
- Cảnh báo đỏ trong Progress Drawer giờ có nút X → thu nhỏ thành icon 🔴 + "Cảnh báo (N)"
- Bấm icon → hiện lại Alert đầy đủ
- Reset dismissed state mỗi lần mở drawer mới

> [!NOTE]
> Pattern tham chiếu: giống section "Tóm Tắt Tiến Độ Tuần" (dòng 1445-1471) đã có sẵn `alertProgressClosed` toggle.

---

## Fix #4: Chấm đỏ notification mất khi GV bấm đọc

**File:** [SubmissionReview.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/SubmissionReview.js)

**Logic:**
1. Thêm state `readProgressKeys` (Set) — track các submission key đã đọc
2. Khi GV bấm nút "Tiến Độ" → `viewProgress()` thêm record key vào `readProgressKeys`
3. Badge dot condition: `hasPendingProgress && !allRead` — chỉ hiện dot nếu chưa đọc
4. Thêm `prevPendingMapRef` + `useEffect` theo dõi `progressPendingMap`:
   - Khi refetch (mỗi 20s) phát hiện pending count **tăng** (SV nộp tiến độ mới) → xóa key khỏi `readProgressKeys` → dot hiện lại

**Luồng hoạt động:**
```
SV nộp tiến độ mới → refetch → pendingMap[key] tăng → dot hiện 🔴
GV bấm "Tiến Độ" → viewProgress() → key vào readProgressKeys → dot mất ✅
SV nộp thêm tiến độ → refetch → pendingMap[key] tăng → key bị xóa khỏi readProgressKeys → dot hiện lại 🔴
```

---

## Files Modified

| File | Changes |
|------|---------|
| `ProgressTracking.js` | Null-check dòng 40 |
| `ProgressLog.js` | Import ExclamationCircleFilled, state dismissedWarnings, toggle Alert warning |
| `SubmissionReview.js` | States readProgressKeys + dismissedDrawerWarnings, viewProgress mark-read, badge dot logic, drawer warning toggle, useEffect reset on new data |
