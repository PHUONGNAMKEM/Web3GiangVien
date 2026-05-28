# Plan Phase 1 — Dọn dẹp text "quản lý nhân sự" → "hỗ trợ học tập"

## Mục tiêu
Thay thế tất cả chuỗi text liên quan đề tài mẫu cũ "quản lý nhân sự / HR" bằng ngôn ngữ phù hợp với hệ thống "hỗ trợ học tập / quản lý đồ án tốt nghiệp".

## Phạm vi thay đổi

### 1. `frontend/src/components/LoginPage.js` — Loại A (UI, cần sửa gấp)

| Line approx | Old text | New text |
|---|---|---|
| ~118 | `Vui lòng liên hệ Phòng Nhân sự` | `Vui lòng liên hệ Ban quản lý khóa luận hoặc Giảng viên chủ nhiệm` |
| ~497 | `Cổng Thông Tin Nhân Sự` | `Cổng Thông Tin Hỗ Trợ Học Tập` |
| ~507 | `Nền tảng quản trị nhân sự phi tập trung` | `Nền tảng hỗ trợ học tập & quản lý đồ án phi tập trung` |
| ~651 | `Quét mã QR từ ứng dụng nhân viên` | `Quét mã QR từ ứng dụng sinh viên` |

**Cách thực hiện**: Dùng Grep tìm chính xác line, sau đó Edit từng chỗ.

### 2. `backend/package.json` — Loại B (metadata package)

| Field | Old | New |
|---|---|---|
| `name` | `web3-hr-backend` | `web3giangvien-backend` |
| `description` | `Web3 HR Management System Backend` | `Web3 Learning Support & Thesis Management Backend` |

**Lưu ý**: KHÔNG thay đổi các script command name — chỉ sửa `name` và `description`.

### 3. `backend/scripts/seed-ai-model-metadata.js` — Loại B (seed data)

Tìm và sửa:
- `MoHinhNhanSu` → `MoHinhHoTroHocTap`
- `models.hr.local` → `models.learning.local`
- Ví dụ text có `[ma_nhan_vien]`, `phòng [phong_ban]` → `[ma_sinh_vien]`, `khóa [khoa_hoc]`

### 4. `backend/scripts/seedRoles.js` — Loại C (descriptions)

Sửa description của các role:
- `Quản lý phòng ban, nhân viên và phê duyệt các yêu cầu` → `Quản lý khóa luận, sinh viên và phê duyệt tiến độ`
- `Nhân viên cơ bản với quyền truy cập hạn chế` → `Sinh viên với quyền truy cập theo vai trò`

### 5. `backend/scripts/seedEmployees.js` — Loại B (nếu file tồn tại)

- Email mẫu `employee@company.com` → `student@university.edu`

## Không sửa

- Bất kỳ variable/function name nội bộ như `employeeDid`, `employeeWallet` trong smart contract / web3.js — đây là implementation detail, đổi gây breaking change.
- Các file trong `backend/contracts/README.md` — chỉ là docs tùy chọn.

## Verification sau khi sửa

Chạy grep để đảm bảo không còn sót:

```powershell
Get-ChildItem -Recurse -Path "backend","frontend","ml-service" -Include "*.js","*.jsx","*.ts","*.tsx","*.py","*.json" |
  Select-String -Pattern "nhân sự|nhân viên|HR Management|employee@company|Cổng Thông Tin Nhân|nền tảng quản trị nhân|ứng dụng nhân viên|Phòng Nhân sự|MoHinhNhanSu|models\.hr\.local" |
  Select-Object Path,LineNumber,Line
```

Kết quả mong đợi: 0 matches (ngoại trừ file plan này).

## Effort
~0.5 ngày. Không ảnh hưởng logic, chỉ thay text.
