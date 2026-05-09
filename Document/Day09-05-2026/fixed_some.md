# Walkthrough: Sửa lỗi & Cải tiến luồng Bài Test

## Tổng quan thay đổi

Đã sửa **4 bug** và thêm **4 cải tiến** trên 7 files. Thay đổi lớn nhất: chuyển từ cơ chế **cạnh tranh thủ công** (GV chọn nhóm thắng) sang **auto pass/fail** (ngưỡng đạt 75%).

## Thay đổi chi tiết

### Backend (3 files)

| File | Thay đổi |
|------|----------|
| [BaiTest.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/models/BaiTest.js) | + Field `NguongDat` (default 75%) |
| [baiTestController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/controllers/baiTestController.js) | `createTest`: nhận nguongDat. `submitTest`: auto approve/reject dựa ngưỡng. `getTestForStudent`: trả NguongDat cho SV xem |
| [deTaiController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/controllers/deTaiController.js) | `getAll`: thêm flag `DaCoDangKy`. `registerTopic`: check 1 nhóm/đề tài. `cancelRegistration`: cho phép `ChoTest` |

### Frontend Student (2 files)

| File | Thay đổi |
|------|----------|
| [TopicRegistration.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/student/TopicRegistration.js) | Reload state sau đăng ký → hiện Alert test. Ẩn đề tài đã có nhóm. Check đã nộp test → hiện "Đã hoàn thành". |
| [EntranceTest.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/student/EntranceTest.js) | Hiện kết quả Đạt ✅ / Không đạt ❌ với ngưỡng cụ thể |

### Frontend Lecturer (2 files)

| File | Thay đổi |
|------|----------|
| [TopicManagement.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/TopicManagement.js) | Drawer xử lý `ChoTest` → hiện "⏳ Đang chờ làm bài test" thay vì "Từ Chối" |
| [EntranceTestManager.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/EntranceTestManager.js) | Tab Thông tin: hiện chi tiết câu hỏi + đáp án + ngưỡng đạt. Form tạo: input ngưỡng. Bảng kết quả: bỏ nút Chọn, thêm cột Đạt/Không đạt |

## Flow mới

```
SV đăng ký đề tài có test
    ↓
Trạng thái: ChoTest → Hiện nút "Bắt Đầu Làm Bài Test"
    ↓
SV làm test → Hệ thống chấm tự động
    ↓
Score >= 75%? ── Có ──→ Auto DaDuyet + Đề tài DaChot + Test DaDong
                  Không → Auto TuChoi → Đề tài mở lại cho SV khác
```

## Validation
- ✅ App frontend compile OK, không lỗi console
- ✅ Backend auto-reload (nodemon)
- ⚠️ Cần test thực tế bằng cách đăng ký + làm bài test
