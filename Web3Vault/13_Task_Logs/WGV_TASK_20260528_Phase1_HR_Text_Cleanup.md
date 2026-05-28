# Nhật ký Nhiệm vụ: Dọn dẹp text "quản lý nhân sự" → "hỗ trợ học tập" (Phase 1)

- **ID Nhiệm vụ**: WGV_TASK_20260528_Phase1_HR_Text_Cleanup
- **Ngày thực hiện**: 28-05-2026
- **Trạng thái**: Hoàn thành (Đã kiểm tra sạch sẽ)

## 1. Vấn đề ban đầu
Giao diện UI (trang đăng nhập) và một số cấu hình, script seed dữ liệu của backend vẫn còn sót lại nhiều chuỗi văn bản liên quan đến hệ thống mẫu cũ "Quản lý nhân sự / HR" (ví dụ: *"Phòng Nhân sự"*, *"Cổng Thông Tin Nhân Sự"*, *"Nền tảng quản trị nhân sự phi tập trung"*, *"MoHinhNhanSu"*, *"employee@company.com"*, v.v.). Điều này gây mâu thuẫn domain và gây hiểu lầm cho người dùng/giảng viên/sinh viên về bản chất hệ thống.

## 2. Nguyên nhân
Đây là các text/metadata legacy từ template HR ban đầu của dự án, chưa được dọn dẹp triệt để trong quá trình chuyển dịch sang dự án **Web3 + AI Competition Platform hỗ trợ giảng dạy**.

## 3. Các file và khu vực liên quan
- **Frontend UI**:
  - `frontend/src/components/LoginPage.js` (UI trang login)
- **Backend Config & Metadata**:
  - `backend/package.json`
  - `backend/package-lock.json`
- **Scripts Seed Dữ Liệu**:
  - `backend/scripts/seed-ai-model-metadata.js`
  - `backend/scripts/seedRoles.js`
  - `backend/scripts/seedEmployees.js`
- **Tài liệu Hướng dẫn**:
  - `notes/user_guides/WGV_AUTH_0101_User_Guide_v1.md`

## 4. Cách xử lý đúng
Tiến hành chỉnh sửa và thay thế toàn bộ text cũ sang text học vụ mới (Sinh viên/Giảng viên/Đồ án):

1. **LoginPage.js**:
   - `Phòng Nhân sự` → `Ban quản lý khóa luận hoặc Giảng viên chủ nhiệm`
   - `Cổng Thông Tin Nhân Sự` → `Cổng Thông Tin Hỗ Trợ Học Tập`
   - `Nền tảng quản trị nhân sự phi tập trung` → `Nền tảng hỗ trợ học tập & quản lý đồ án phi tập trung`
   - `ứng dụng nhân viên` → `ứng dụng sinh viên`
2. **package.json & package-lock.json**:
   - Tên package: `web3-hr-backend` → `web3giangvien-backend`
   - Mô tả: `Web3 HR Management System Backend` → `Web3 Learning Support & Thesis Management Backend`
3. **seed-ai-model-metadata.js**:
   - Tên mô hình AI: `MoHinhNhanSu` → `MoHinhHoTroHocTap`
   - Mô tả nhóm dữ liệu: `thông tin cá nhân, công việc, hiệu suất, thái độ & phúc lợi` → `thông tin cá nhân, học tập, hiệu suất, nghiên cứu & hoạt động`
   - Nhãn text ví dụ: `nhân viên... phòng...` → `sinh viên... khóa...`
   - Local domain URI: `models.hr.local` → `models.learning.local`
4. **seedRoles.js**:
   - Sửa mô tả vai trò Manager: `Quản lý phòng ban, nhân viên...` → `Quản lý khóa luận, sinh viên và phê duyệt tiến độ`
   - Sửa mô tả vai trò Employee: `Nhân viên cơ bản với quyền truy cập hạn chế` → `Sinh viên với quyền truy cập theo vai trò`
5. **seedEmployees.js**:
   - Sửa email nhân viên mẫu: `employee@company.com` → `student@university.edu`
6. **WGV_AUTH_0101_User_Guide_v1.md**:
   - Cập nhật câu FAQ trang login hiển thị title để đồng bộ với UI mới.

## 5. Kết quả sau khi xử lý
- Đã chạy tìm kiếm bằng `grep` trên toàn bộ mã nguồn. Kết quả: **Không còn sót bất kỳ chuỗi text HR cũ nào** trong các file logic và giao diện được cấu hình.
- Các hằng số/biến kỹ thuật nội bộ (`employeeDid`, `EMPLOYEE_ROLE`...) được giữ nguyên để tránh breaking change với blockchain/smart contracts.

## 6. Lưu ý để tránh lặp lại lỗi
- **Tuyệt đối không sử dụng lại** các thuật ngữ HR cũ khi viết thêm tính năng, viết tài liệu hoặc tạo dữ liệu seed.
- **Tuân thủ đúng bộ quy tắc đặt tên** trong `AGENTS.md`: sử dụng GiangVien, SinhVien, DeTai, BaoCao, DiemSo... thay cho employee, department, payroll...
- Khi cập nhật UI, luôn kiểm tra các tài liệu hướng dẫn sử dụng (User Guides) đi kèm trong thư mục `notes/user_guides/` để cập nhật đồng bộ các ảnh chụp màn hình/mô tả/FAQ cho khớp với thực tế.
