# Đề xuất dữ liệu mẫu cho dự án Web3GiangVien

## 1. Kết luận nhanh

Nếu project này cần dữ liệu mẫu để demo, test luồng nghiệp vụ và chấm điểm AI/Web3, nên chuẩn bị dữ liệu theo 3 mức:

- **Mức tối thiểu để chạy demo:** giảng viên, sinh viên, đề tài, đăng ký đề tài, rubrics, bài test, báo cáo, điểm số.
- **Mức đầy đủ cho demo hội đồng:** thêm nhóm sinh viên, tiến độ, nhiều trạng thái đăng ký, nhiều bài báo cáo, dữ liệu AI và transaction hash giả lập.
- **Mức kiểm thử biên:** thêm dữ liệu lỗi, thiếu hồ sơ, hết hạn deadline, đề tài đã chốt, bài test đã đóng, sinh viên bị từ chối.

Luồng chính của dự án hiện tại là quản lý đề tài tốt nghiệp giữa giảng viên và sinh viên, có đăng nhập bằng ví, gợi ý đề tài bằng AI, nộp báo cáo lên IPFS, lưu hash/điểm lên blockchain và chấm điểm bằng rubrics.

## 2. Các nhóm dữ liệu mẫu cần có

### 2.1. Tài khoản giảng viên

Cần có ít nhất 2-3 giảng viên để demo phân quyền và quyền sở hữu đề tài.

Mỗi giảng viên nên có:

- `MaGV`
- `HoTen`
- `Email`
- `ChuyenNganh`
- `WalletAddress`

Nên tạo các mẫu như:

- Giảng viên Blockchain/Web3.
- Giảng viên AI/Data Science.
- Giảng viên Mobile/Fullstack.

Lý do cần: frontend và backend dùng giảng viên để tạo đề tài, tạo rubrics, quản lý đăng ký, duyệt sinh viên, xem báo cáo và chấm điểm.

### 2.2. Tài khoản sinh viên

Cần có khoảng 8-15 sinh viên để demo được danh sách, gợi ý đề tài, đăng ký, nhóm và cạnh tranh bài test.

Mỗi sinh viên nên có:

- `MaSV`
- `HoTen`
- `Email`
- `GPA`
- `ChuyenNganh`
- `KyNang`
- `WalletAddress`
- `DaCapNhatHoSo`

Nên chia sinh viên thành nhiều nhóm năng lực:

- Sinh viên mạnh Web3: Solidity, Ethers.js, Hardhat, ReactJS.
- Sinh viên mạnh AI: Python, PyTorch, Transformers, NLP.
- Sinh viên mạnh Mobile: React Native, WalletConnect, Redux.
- Sinh viên hồ sơ yếu hoặc chưa cập nhật đủ để test case gợi ý kém.

Lý do cần: AI SBERT trong `matchingService` lấy `GPA`, `ChuyenNganh`, `KyNang` để tính mức phù hợp với `YeuCau` của đề tài.

### 2.3. Đề tài

Cần có khoảng 8-12 đề tài mẫu, đủ nhiều để sinh viên nhìn thấy khác biệt khi AI gợi ý.

Mỗi đề tài nên có:

- `MaDeTai`
- `TenDeTai`
- `MoTa`
- `MoTaChiTiet`
- `YeuCau`
- `ChiTietBoSung`
- `Rubrics`
- `SuDungRubrics`
- `HienThiChiTietChoSV`
- `SoLuongSinhVien`
- `Deadline`
- `GiangVienHuongDan`
- `CoBaiTest`
- `TrangThai`

Nên có các trạng thái:

- `MoDangKy`: đề tài đang mở.
- `DaChot`: đề tài đã có sinh viên được duyệt.
- `HoanThanh`: đề tài đã có báo cáo và điểm.

Nên có các loại đề tài:

- Đề tài không có bài test, đăng ký là `ChoDuyet`.
- Đề tài có bài test, đăng ký là `ChoTest`.
- Đề tài nhóm có `SoLuongSinhVien` từ 2-3.
- Đề tài cá nhân có `SoLuongSinhVien = 1`.

### 2.4. Đăng ký đề tài

Cần seed dữ liệu cho collection `DangKyDeTai` để demo trạng thái đăng ký và duyệt.

Mỗi đăng ký cần:

- `DeTai`
- `SinhVien`
- `ThanhVien`
- `TrangThai`

Nên có đủ trạng thái:

- `ChoDuyet`: sinh viên đã đăng ký, chờ giảng viên duyệt.
- `ChoTest`: đề tài yêu cầu làm bài test trước khi duyệt.
- `DaDuyet`: sinh viên hoặc nhóm đã được duyệt.
- `TuChoi`: đăng ký bị từ chối.

Với đề tài nhóm, `ThanhVien` nên có:

- Một trưởng nhóm với `VaiTro = TruongNhom`, `TrangThaiTV = DaChapNhan`.
- Một thành viên đã nhận lời với `TrangThaiTV = DaChapNhan`.
- Một lời mời đang chờ với `TrangThaiTV = DaMoi`.
- Một lời mời bị từ chối với `TrangThaiTV = TuChoi`.

Lý do cần: controller có các luồng đăng ký, mời thành viên, phản hồi lời mời, duyệt và hủy đăng ký.

### 2.5. Rubrics template và rubrics theo đề tài

Cần có 3-5 mẫu rubrics để giảng viên áp dụng nhanh vào đề tài.

Mỗi template cần:

- `TenMau`
- `MoTaMau`
- `GiangVien`
- `TieuChi`
- `MacDinh`
- `DaApDung`
- `SoLuotDung`

Mỗi tiêu chí nên có:

- `TenTieuChi`
- `MoTa`
- `TrongSo`
- `DiemToiDa`
- `GoiYChoAI`

Tổng `TrongSo` trong một rubrics phải bằng 100%.

Nên có mẫu:

- Rubrics đồ án Web3.
- Rubrics đồ án AI/NLP.
- Rubrics đồ án ứng dụng mobile.
- Rubrics báo cáo nghiên cứu.

Lý do cần: backend validate rubrics khi tạo đề tài, và ML service dùng rubrics để phân tích báo cáo theo từng tiêu chí.

### 2.6. Bài test đầu vào

Cần có bài test cho một số đề tài cạnh tranh.

Mỗi bài test cần:

- `DeTai`
- `TieuDe`
- `MoTa`
- `CauHoi`
- `ThoiGianLam`
- `TrangThai`

Câu hỏi nên gồm cả:

- `TracNghiem`: có `LuaChon`, `DapAnDung`, `Diem`.
- `Code`: có `NgonNgu`, `DapAnMau`, `Diem`.

Nên seed thêm `KetQuaTest` cho vài sinh viên:

- Sinh viên điểm cao để được chọn.
- Sinh viên điểm trung bình.
- Sinh viên nộp code gần đúng để test `AI_Similarity`.

Lý do cần: đề tài có `CoBaiTest = true` sẽ đưa đăng ký vào trạng thái `ChoTest`, sau đó giảng viên chọn người thắng và đóng bài test.

### 2.7. Tiến độ thực hiện

Cần có dữ liệu `TienDo` cho các đăng ký đã được duyệt.

Mỗi tiến độ cần:

- `DeTai`
- `SinhVien`
- `NoiDung`
- `PhanTramHoanThanh`
- `LoaiCapNhat`
- `FileDinhKem`
- `NhanXetGV`

Nên có các mốc:

- 10%: đăng ký đề cương.
- 30%: hoàn thành phân tích yêu cầu.
- 60%: hoàn thành prototype.
- 85%: hoàn thành báo cáo bản nháp.
- 100%: hoàn tất nộp báo cáo.

Lý do cần: màn hình theo dõi tiến độ của sinh viên và giảng viên sẽ có dữ liệu thật để xem, nhận xét và kiểm tra lịch sử.

### 2.8. Báo cáo nộp bài

Cần có dữ liệu `BaoCao` cho các đề tài đã được duyệt.

Mỗi báo cáo cần:

- `DeTai`
- `SinhVien`
- `TieuDe`
- `IPFS_CID`
- `SubmitTxHash`
- `NgayNop`

Với đề tài nhóm, nên tạo báo cáo cho tất cả thành viên được chấp nhận, vì controller upload báo cáo có logic tạo báo cáo theo nhóm.

Nên có:

- Báo cáo có CID/IPFS hash hợp lệ dạng mẫu.
- Báo cáo có transaction hash submit giả lập.
- Một vài file PDF mẫu đặt trong `backend/uploads/reports` nếu cần demo upload/download nội bộ.

### 2.9. Điểm số và kết quả chấm

Cần seed `DiemSo` cho một số báo cáo đã nộp.

Mỗi điểm số cần:

- `BaoCao`
- `GiangVienCam`
- `SinhVien`
- `DeTai`
- `Diem`
- `NhanXet`
- `AI_Score`
- `AI_Feedback`
- `RubricsResult`
- `TxHash`

Nên có nhiều mức:

- Điểm cao: 8.5-9.5.
- Điểm khá: 7.0-8.0.
- Điểm thấp: 5.0-6.5.

Nếu đề tài dùng rubrics, `RubricsResult` nên có điểm AI và điểm giảng viên cho từng tiêu chí để màn hình so sánh hiển thị rõ.

### 2.10. Dữ liệu mô phỏng AI

Cần có dữ liệu đầu vào đủ tốt để AI tạo kết quả có ý nghĩa:

- `KyNang` và `ChuyenNganh` của sinh viên phải khớp một phần với `YeuCau` của đề tài.
- `YeuCau` đề tài nên là các keyword rõ ràng như `Solidity`, `ReactJS`, `NLP`, `Transformers`, `Python`, `React Native`.
- Nội dung báo cáo mẫu nên có đoạn text dài, chứa keyword theo rubrics.
- Một vài báo cáo nên thiếu keyword để test feedback xấu.

Không nhất thiết seed trực tiếp output AI vào database, nhưng nếu muốn demo nhanh không phụ thuộc ML service thì có thể seed `AI_Score`, `AI_Feedback`, `RubricsResult`.

### 2.11. Dữ liệu mô phỏng Web3/IPFS

Cần có dữ liệu giả lập để demo khi không muốn gọi blockchain thật:

- Ví MetaMask mẫu cho giảng viên và sinh viên.
- `IPFS_CID` mẫu, ví dụ CID bắt đầu bằng `Qm...` hoặc CID v1 bắt đầu bằng `bafy...`.
- `SubmitTxHash` cho báo cáo.
- `TxHash` cho điểm số.
- Contract address trong `.env` nếu demo gọi contract thật.

Nên phân biệt rõ:

- Dữ liệu demo offline: hash giả nhưng đúng format.
- Dữ liệu demo tích hợp thật: hash được trả về từ Sepolia/IPFS.

## 3. Bộ dữ liệu tối thiểu đề xuất

Một bộ seed nhỏ nhưng đủ demo nên có:

- 3 giảng viên.
- 12 sinh viên.
- 10 đề tài.
- 4 rubrics template.
- 5 đề tài dùng rubrics.
- 3 đề tài có bài test.
- 10 đăng ký đề tài.
- 3 nhóm sinh viên.
- 6 kết quả bài test.
- 15 bản ghi tiến độ.
- 6 báo cáo.
- 6 điểm số.
- 6 transaction hash giả lập.
- 6 IPFS CID giả lập.

Với bộ này có thể demo được gần như toàn bộ flow: đăng nhập ví, cập nhật hồ sơ, AI gợi ý đề tài, đăng ký, mời nhóm, làm bài test, giảng viên duyệt, theo dõi tiến độ, nộp báo cáo, AI phân tích, chấm điểm và xem so sánh điểm.

## 4. Thứ tự seed nên dùng

Nên tạo dữ liệu theo thứ tự sau để tránh lỗi tham chiếu ObjectId:

1. Tạo giảng viên.
2. Tạo sinh viên.
3. Tạo rubrics template theo giảng viên.
4. Tạo đề tài, gắn `GiangVienHuongDan`, rubrics và deadline.
5. Tạo bài test cho các đề tài có `CoBaiTest = true`.
6. Tạo đăng ký đề tài, kèm thành viên nhóm nếu có.
7. Tạo kết quả bài test cho các đăng ký `ChoTest`.
8. Tạo tiến độ cho các đăng ký `DaDuyet`.
9. Tạo báo cáo cho đề tài đã duyệt.
10. Tạo điểm số, AI feedback và transaction hash.

## 5. Các dữ liệu có thể bỏ qua lúc đầu

Các script trong `backend/scripts` còn có dấu vết của hệ HR/payroll như roles, departments, employees, attendance, KPI, payroll. Nếu mục tiêu hiện tại là demo Web3GiangVien quản lý đề tài thì chưa cần seed các phần đó, trừ khi frontend hoặc bài thuyết trình vẫn cần màn hình HR cũ.

Nên ưu tiên luồng thesis/project trước:

- `SinhVien`
- `GiangVien`
- `DeTai`
- `DangKyDeTai`
- `RubricsTemplate`
- `BaiTest`
- `KetQuaTest`
- `TienDo`
- `BaoCao`
- `DiemSo`

## 6. Lưu ý về dữ liệu mẫu hiện có

Repo đang có `backend/seed_topics.js` và `backend/seed_lecturer.js`, nhưng cần kiểm tra kỹ trước khi dùng vì một số field trong script cũ không khớp hoàn toàn với model hiện tại.

Ví dụ:

- Model `GiangVien` hiện tại dùng `MaGV`, `HoTen`, `Email`, `ChuyenNganh`, `WalletAddress`.
- `seed_lecturer.js` lại dùng các field kiểu `ho_ten`, `dia_chi_vi`, `chuyen_nganh`.

Vì vậy nếu tạo seed mới, nên viết script mới dựa trực tiếp trên các model trong `backend/models`, không nên copy nguyên script cũ.

## 7. File đã dùng để xác nhận

Không tìm thấy file convention như `convention/QUY_UOC_DAT_TEN_VA_RULE.md` và cũng không thấy `structure/module_map.json`, nên phần đánh giá này được xác nhận từ source chính:

- `backend/server.js`
- `backend/models/SinhVien.js`
- `backend/models/GiangVien.js`
- `backend/models/DeTai.js`
- `backend/models/DangKyDeTai.js`
- `backend/models/RubricsTemplate.js`
- `backend/models/BaiTest.js`
- `backend/models/KetQuaTest.js`
- `backend/models/TienDo.js`
- `backend/models/BaoCao.js`
- `backend/models/DiemSo.js`
- `backend/controllers/deTaiController.js`
- `backend/controllers/baoCaoController.js`
- `backend/controllers/baiTestController.js`
- `backend/controllers/rubricsController.js`
- `backend/controllers/diemSoController.js`
- `backend/services/matchingService.js`
- `backend/services/aiService.js`
- `frontend/src/services/apiService.js`
- `huong_dan_chay_project.md`
- `web3_ai_system_explanation.md`

