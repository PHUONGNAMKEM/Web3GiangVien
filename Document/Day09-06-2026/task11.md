# Task: 11 Mục Cải Thiện UI, Cache & Realtime

## A. UI Fixes
- [x] #2: ProgressTracking.js — spacing Model/Provider tags
- [x] #4: ClassManagement.js — "Đang chờ" + icon alignment
- [x] #5: StudentDashboard.js — nút Chấp nhận/Từ chối cùng width
- [x] #11: SubmissionReview.js — Tag "Chờ SV nộp bài" → Button

## B. Cache Invalidation
- [x] #1: ReportUpload.js — invalidate student-dashboard sau upload
- [x] #3: CourseManagement.js — invalidate ['classes'] khi tạo/sửa môn
- [x] #5(load): StudentDashboard — refetchOnWindowFocus (mặc định đã bật)
- [x] #6(load): ClassManagement — nút Làm mới trong modal

## C. Nghiệp vụ #6
- [x] ClassManagement.js — hiển thị danh sách SV đã từ chối + nút "Thêm lại"

## D. Realtime (ưu tiên cao)
- [x] Backend: emit events khi SV nộp bài, GV chấm điểm, SV cập nhật tiến độ
- [x] Frontend: listen events và invalidate queries tương ứng

## Verification
- [x] Frontend build thành công (exit code 0)
