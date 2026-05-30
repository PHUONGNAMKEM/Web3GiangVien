# WGV_TASK_20260530_Phase15_StudentFilter_ClassInvite

## Vấn đề ban đầu

1. **Quản lý Sinh Viên** hiển thị **toàn bộ** sinh viên trong hệ thống, không phân biệt giảng viên nào. Thiếu cột Lớp/Môn/GV.
2. **Quản lý Lớp Học** khi thêm/import sinh viên → add trực tiếp vào lớp. Không có bước xác nhận từ phía sinh viên.

## Nguyên nhân

- `StudentManagement.js` gọi `GET /api/sinhvien` (lấy all) thay vì lọc theo phạm vi giảng viên.
- `ClassManagement.js` gọi `addSinhVienToLop` / `importSinhVienToLop` push thẳng vào `LopHoc.SinhVien[]`.

## Cách xử lý đúng

### A. Lọc sinh viên theo giảng viên

- **Backend**: Thêm `getSinhVienByGiangVien` vào `lopHocController.js`
  - Query `LopHoc.find({ GiangVien: gvId })` + populate SinhVien, MonHoc, GiangVien
  - Trả flat list: mỗi item = `{ sinhVien, lopHoc, monHoc, giangVien }`
  - Route: `GET /api/lophoc/giangvien/:gvId/sinhvien` (requireLecturer)
- **Frontend**: `StudentManagement.js` gọi `getSinhVienByGV(user.id)`, dùng `useMemo` gộp theo `_id` sinh viên, hiển thị nhiều Tags cho Lớp/Môn/GV trên cùng 1 dòng.

### B. Cơ chế lời mời lớp học

- **Model mới**: `LoiMoiLopHoc` (`LopHoc`, `SinhVien`, `GiangVien`, `TrangThai: ChoChapNhan | DaChapNhan | TuChoi`)
  - Unique index: `{ LopHoc: 1, SinhVien: 1 }`
  - Lý do dùng model riêng: nếu nhồi trạng thái vào `LopHoc.SinhVien[]` sẽ phá vỡ logic cũ (mọi nơi dùng SinhVien[] = đã confirmed)
- **Controller**: `loiMoiLopHocController.js` với 6 hàm:
  - `inviteSinhVien` — mời 1 SV (cho phép re-invite nếu đã từ chối)
  - `inviteBatch` — import batch MaSV thành lời mời
  - `respondToInvite` — SV chấp nhận/từ chối (nếu chấp nhận → push vào LopHoc.SinhVien[])
  - `getInvitesByLopHoc` — GV xem lời mời của 1 lớp
  - `getMyClassInvites` — SV xem lời mời pending
  - `cancelInvite` — GV hủy lời mời pending
- **Frontend ClassManagement**: "Thêm Sinh Viên" → "Mời Sinh Viên", "Import" → "Import Lời Mời"
  - Lọc SV đã có trong lớp + đang pending khi search
  - Hiển thị bảng "Lời mời đang chờ" với nút Hủy
- **Frontend StudentDashboard**: Fetch `getMyClassInvites`, render Alert cards với nút Chấp nhận/Từ chối

## File liên quan

| File | Hành động |
|------|-----------|
| `backend/models/LoiMoiLopHoc.js` | [NEW] Model lời mời lớp học |
| `backend/controllers/loiMoiLopHocController.js` | [NEW] Controller lời mời |
| `backend/controllers/lopHocController.js` | [MODIFY] Thêm `getSinhVienByGiangVien` |
| `backend/server.js` | [MODIFY] Thêm import + routes mới |
| `frontend/src/services/managementService.js` | [MODIFY] Thêm 7 methods mới |
| `frontend/src/components/lecturer/StudentManagement.js` | [MODIFY] Rewrite: scoped data + cột mới |
| `frontend/src/components/lecturer/ClassManagement.js` | [MODIFY] Rewrite: invite flow + pending table |
| `frontend/src/components/student/StudentDashboard.js` | [MODIFY] Thêm class invite UI |

## Kết quả sau fix

- ✅ Giảng viên chỉ thấy SV thuộc lớp mình, kèm context Lớp/Môn/GV
- ✅ Thêm/import SV → tạo lời mời, SV phải chấp nhận mới vào lớp
- ✅ GV thấy danh sách lời mời pending, có thể hủy
- ✅ SV thấy lời mời lớp học trên dashboard, bấm chấp nhận/từ chối
- ✅ Build thành công không lỗi

## Lưu ý

- `LopHoc.SinhVien[]` vẫn chỉ chứa SV đã confirmed. Logic cũ (đăng ký đề tài, nhóm, tiến độ...) không bị ảnh hưởng.
- API cũ `addSinhVien` / `importSinhVien` vẫn tồn tại nhưng frontend không gọi nữa (fallback cho admin/debug).
- Unique index trên `LoiMoiLopHoc` ngăn duplicate invite cho cùng SV+LopHoc.
