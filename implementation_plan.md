# Kế Hoạch Triển Khai: Kết nối Dữ liệu Thật và Lưu Điểm trên Blockchain

Hệ thống của chúng ta **đã có sẵn** Smart Contract (`ThesisManagement.sol`) và IPFS (`Pinata` thông qua `ipfsService.js`). Tuy nhiên, ở Frontend hiện tại vẫn đang dùng mock data dạng tĩnh để demo UI. 

Dưới đây là kế hoạch chuyển đổi sang dữ liệu thật và liên kết trên Blockchain để giải quyết các vấn đề bạn gặp phải:

## User Review Required

Vui lòng xem lại danh sách các module cần cập nhật và xác nhận để tôi tiến hành code.
> [!IMPORTANT]
> - Các thay đổi này liên đới cả Database (MongoDB) và Smart Contract (Blockchain).
> - Sinh viên sẽ thấy điểm ngay trên Dashboard nếu bài nộp đã được giảng viên chốt.

## Proposed Changes

---

### Dashboards (Sinh Viên & Giảng Viên)

Hiện tại `StudentDashboard` và `LecturerDashboard` ở frontend đang ghi cứng con số (`8.5`, `12`, `34`...). 

#### [MODIFY] [StudentDashboard.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/student/StudentDashboard.js)
- Thêm `useEffect` để fetch dữ liệu đề tài đang đăng ký, trạng thái nộp bài và trạng thái điểm (nếu đã được chấm).
- Thay thế điểm năng lực kỹ thuật và hiển thị bằng dữ liệu thật từ Backend (hoặc tính logic dựa vào lịch sử đề tài).

#### [MODIFY] [LecturerDashboard.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/LecturerDashboard.js)
- Thống kê thực tế số "Tổng Đề Tài Quản Lý" và "Sinh Viên Đã Hướng Dẫn" bằng cách gọi API Backend (tìm số lượng đăng ký duyệt).

---

### Logic Chấm Điểm & Lịch Sử (Backend + Frontend)

Giao diện chấm điểm đang bị cho phép chấm đi chấm lại vì `SubmissionReview.js` chỉ có hàm `setTimeout` giả lập. Chúng ta phải gọi xuống API.

#### [MODIFY] [SubmissionReview.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/lecturer/SubmissionReview.js)
- Kết nối nút "Ký Số MetaMask & Ghi Blockchain" (hàm `handleBlockchainMint`) dứt điểm gửi request `POST /api/diemso/chamdiem`.
- Nếu giảng viên đã chấm điểm, giao diện **vô hiệu hóa (disable)** nút chấm điểm, hiển thị Alert "Đã chốt điểm" kèm kết quả.

#### [MODIFY] [diemSoController.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/controllers/diemSoController.js)
- Cập nhật hàm `chamDiem` thực gọi đến function `finalizeGradeOnChain` vào SmartContract giả lập hoặc qua `thesisContractService`.
- Nếu sinh viên đã có điểm số cho báo cáo này, trả lỗi 400 "Đã được chấm".

#### [MODIFY] [apiService.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/services/apiService.js)
- Thêm các endpoint gọi API liên quan tới gửi Điểm Số (grade/review).

#### [MODIFY] [thesisContractService.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/services/thesisContractService.js)
- Thêm hàm `finalizeGradeOnChain(studentDID, topicId, grade, feedback, idx)` để hoàn thiện luồng ký giao dịch SmartContract.

---

## Open Questions

- Bạn đã cấu hình thành công `.env` cho Infura và Private Key trong `backend` chưa để gọi thật SmartContract, hay tạm thời chúng ta tiếp tục ghi vào DataBase và gọi hàm mock trả về _"MockTransactionHash"_ cho chức năng chấm điểm?

## Verification Plan

### Manual Verification
- Đăng nhập Giảng viên -> Vào Dashboard: Kiểm tra xem số sinh viên, đề tài đã khớp với Backend chưa.
- Mở chấm 1 sinh viên -> Bấm Chấm điểm -> Chờ hệ thống ghi nhận.
- Đóng cửa sổ và mở lại sinh viên đó -> Nút Chấm Điểm bị ẩn, ghi rõ "Đã được chấm trên Blockchain".
- Đăng nhập Sinh viên -> Dashboard -> Điểm đã hiển thị.
