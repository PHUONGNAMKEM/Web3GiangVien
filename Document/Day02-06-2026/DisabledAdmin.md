# Kế hoạch Disable Chức Năng Admin Duyệt Role

Theo trao đổi với Thầy, hệ thống sẽ bỏ quy trình Admin duyệt Giảng viên. Khi đăng nhập lần đầu bằng ví mới, người dùng chọn Role (Giảng viên hoặc Sinh viên) → hệ thống tạo tài khoản ngay lập tức → vào thẳng Dashboard tương ứng. Không chờ duyệt, không cần Admin.

## Đánh Giá Bản Kế Hoạch Cũ — Các Vấn Đề Phát Hiện

> [!WARNING]
> Bản kế hoạch trước chỉ đề cập thay đổi ở Backend `authController.js`, nhưng thiếu **5 điểm quan trọng** khiến nếu chỉ sửa Backend thì Frontend vẫn sẽ chuyển hướng sai và hiển thị text cũ.

| # | Vấn đề | Mức nghiêm trọng |
|---|--------|-------------------|
| 1 | **Frontend `LoginPage.js` dòng 265-266**: `handleSelectLecturer` sau khi gọi API thành công sẽ redirect sang `/pending-approval` thay vì `/dashboard` | 🔴 **Chặn luồng** — Giảng viên mới sẽ bị kẹt ở trang chờ duyệt |
| 2 | **Frontend `RoleSelection.js` dòng 94, 109, 152**: Nút bấm hiển thị "Yêu cầu cấp quyền Giảng Viên", "Gửi yêu cầu phê duyệt", và text "Vui lòng cung cấp thông tin để Admin xét duyệt..." — gây nhầm lẫn UX khi không còn Admin duyệt | 🟡 Nhầm lẫn UX |
| 3 | **Frontend `RoleSelection.js` dòng 91, 96-99**: Logic `rejectedCountToday >= 3` sẽ disable nút Giảng viên — không còn ý nghĩa khi bỏ Admin duyệt | 🟡 Logic thừa |
| 4 | **Backend `authController.js` dòng 73-82 & 216-224**: Cả `verifySignature` và `verifyQrSignature` đều check RoleRequest pending → trả về `isPending: true` → Frontend chuyển sang `/pending-approval`. Người dùng cũ đang kẹt ở trạng thái pending sẽ không bao giờ vào được hệ thống | 🔴 **Chặn luồng** |
| 5 | **Backend `authController.js` dòng 324-371**: Luồng `registerWithRole` cho LECTURER_ROLE tạo `RoleRequest` thay vì `GiangVien` → trả `isPending: true` thay vì `token` + `user` | 🔴 **Chặn luồng** |

## Proposed Changes

### Backend

---

#### [MODIFY] [authController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/controllers/authController.js)

**Thay đổi 1 — `verifySignature` (dòng 73-82):**
- Comment out / bỏ qua đoạn check `RoleRequest.findOne({ status: 'pending' })`.
- Nếu ví chưa có trong `GiangVien`, `SinhVien`, `Admin` → trả `needsRoleSelection: true` như cũ (bỏ qua nhánh `isPending`).
- Giữ nguyên logic `rejectedCountToday` nhưng nó sẽ không ảnh hưởng gì nữa (không xóa, chỉ disable).

**Thay đổi 2 — `verifyQrSignature` (dòng 216-224):**
- Tương tự thay đổi 1, comment out đoạn check `RoleRequest` pending.

**Thay đổi 3 — `registerWithRole` (dòng 324-371):**
- Khi `role === 'LECTURER_ROLE'`: Thay vì tạo `RoleRequest` và trả `isPending`, hệ thống sẽ:
  1. Tạo trực tiếp document `GiangVien` mới (tương tự cách tạo `SinhVien` ở dòng 301-322).
  2. Sinh `MaGV` tự động bằng `GV${uuidv4().substring(0, 6).toUpperCase()}`.
  3. Cấp JWT Token ngay lập tức.
  4. Trả về `{ success: true, token, user }` để Frontend lưu và chuyển hướng.
- Giữ nguyên code cũ dưới dạng comment `/* DISABLED: Admin approval flow */`.

---

### Frontend

---

#### [MODIFY] [LoginPage.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/LoginPage.js)

**Thay đổi 1 — `handleSelectLecturer` (dòng 261-272):**
- Đổi redirect từ `/pending-approval` → `/dashboard` (vì Backend giờ trả về token + user thay vì `isPending`).

**Thay đổi 2 — `handleConnectWallet` & `handleQrScan` (dòng 151-156, 204-209):**
- Bỏ qua / comment out block xử lý `result.isPending` (redirect `/pending-approval`). Nếu Backend không bao giờ trả `isPending` nữa thì block này sẽ không chạy, nhưng nên comment out để code sạch.

---

#### [MODIFY] [RoleSelection.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/RoleSelection.js)

**Thay đổi 1 — Nút Giảng Viên (dòng 85-95):**
- Đổi text nút từ "Yêu cầu cấp quyền Giảng Viên" → "Vào với tư cách Giảng Viên".
- Bỏ điều kiện `disabled` liên quan `rejectedCountToday >= 3` (giữ code cũ dưới dạng comment).

**Thay đổi 2 — Dialog text (dòng 109):**
- Đổi "Vui lòng cung cấp thông tin để Admin xét duyệt quyền Giảng viên" → "Vui lòng cung cấp thông tin để hoàn tất đăng ký Giảng viên."

**Thay đổi 3 — Nút submit trong Dialog (dòng 152):**
- Đổi text từ "Gửi yêu cầu phê duyệt" → "Đăng ký Giảng Viên".

**Thay đổi 4 — Bỏ text "Đã bị từ chối" (dòng 96-100):**
- Comment out đoạn hiển thị `rejectedCountToday`.

## Các File KHÔNG Sửa (Giữ Nguyên / Disable)

| File | Lý do giữ |
|------|-----------|
| `backend/models/RoleRequest.js` | Model vẫn tồn tại, không xóa |
| `backend/controllers/adminController.js` | API admin vẫn tồn tại, không xóa |
| `frontend/src/components/admin/*` | Giao diện admin vẫn tồn tại |
| `frontend/src/components/PendingApproval.js` | Trang vẫn tồn tại nhưng sẽ không ai bị redirect đến nữa |
| `App.js` route `/pending-approval` | Route vẫn tồn tại nhưng không ai dùng |
| `App.js` route `/admin/*` | Route admin vẫn tồn tại, tài khoản Admin cũ vẫn dùng được |

## Verification Plan

### Manual Verification
1. **Ví mới hoàn toàn** → Đăng nhập → Chọn "Giảng Viên" → Điền form → Bấm "Đăng ký" → **Kỳ vọng:** Vào thẳng Dashboard Giảng Viên, KHÔNG hiện trang chờ duyệt.
2. **Ví mới** → Chọn "Sinh Viên" → **Kỳ vọng:** Vào thẳng Dashboard Sinh Viên (không thay đổi so với hiện tại).
3. **Ví cũ đang pending** → Đăng nhập lại → **Kỳ vọng:** Hiện lại màn hình chọn Role (vì bỏ check pending) → Chọn Role → Vào thẳng hệ thống.
4. **Ví Giảng Viên/Sinh Viên đã có** → Đăng nhập → **Kỳ vọng:** Vào Dashboard như bình thường (không ảnh hưởng).
5. **Kiểm tra nút Giảng Viên** → **Kỳ vọng:** Hiển thị "Vào với tư cách Giảng Viên" thay vì "Yêu cầu cấp quyền", không bị disable.
