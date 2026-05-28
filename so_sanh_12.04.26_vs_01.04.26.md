# So sánh project 12.04.26 với 01.04.26

Tài liệu này ghi nhận những điểm khác biệt chính giữa hai bản project `12.04.26/Web3GiangVien` và `Team_01.04.26/Web3GiangVien`.

Lưu ý: file so sánh này được tạo sau khi đối chiếu nên không tính vào chênh lệch gốc giữa hai bản project.

## So sánh nhanh

| Hạng mục | Bản 12.04.26 | Bản 01.04.26 |
| --- | --- | --- |
| Chức năng chính | Có thêm luồng nhật ký tiến độ cho sinh viên và nhận xét từ giảng viên | Chưa có luồng nhật ký tiến độ |
| File backend mới | `backend/controllers/tienDoController.js`, `backend/models/TienDo.js` | Không có |
| File frontend mới | `frontend/src/components/student/ProgressLog.js` | Không có |
| Tài liệu giải thích hệ thống | Có `web3_ai_system_explanation.md` và `analysis_report_advance.md` | Không có các file tương ứng |
| Tài liệu nghiệp vụ/hướng dẫn | Ít hơn | Nhiều hơn, gồm `DAC_TA_NGHIEP_VU_HE_THONG.md`, `GIAI_THICH_SU_DUNG_2_AI.md`, `HUONG_DAN_KHOI_CHAY_DU_AN.md`, `NGHIEP_VU_DANG_TRIEN_KHAI.md` |
| File `.env` | Không thấy trong cây thư mục đã đối chiếu | Có `backend/.env` và `frontend/.env` |

## 1. Khác biệt về chức năng

### Bản 12.04.26

- Có thêm luồng **nhật ký tiến độ của sinh viên**.
- Sinh viên có thể tạo mới báo cáo tiến độ, xem lịch sử tiến độ.
- Giảng viên có thể nhận xét tiến độ.

### Các file mới liên quan

- `backend/controllers/tienDoController.js`
- `backend/models/TienDo.js`
- `frontend/src/components/student/ProgressLog.js`
- `analysis_report_advance.md`
- `implementation_planFix.md`
- `web3_ai_system_explanation.md`

## 2. Khác biệt về tài liệu

### Bản 12.04.26

- Có thêm tài liệu giải thích hệ thống AI/Web3 chi tiết hơn.
- Có các file nổi bật:
  - `web3_ai_system_explanation.md`
  - `analysis_report_advance.md`
  - `implementation_planFix.md`

### Bản 01.04.26

- Có nhiều tài liệu hướng dẫn và mô tả nghiệp vụ hơn.
- Các file nổi bật:
  - `DAC_TA_NGHIEP_VU_HE_THONG.md`
  - `GIAI_THICH_SU_DUNG_2_AI.md`
  - `HUONG_DAN_KHOI_CHAY_DU_AN.md`
  - `NGHIEP_VU_DANG_TRIEN_KHAI.md`
  - `GIAI_THICH_SU_DUNG_2_AI.pdf`
  - `HUONG_DAN_KHOI_CHAY_DU_AN.pdf`
  - `NGHIEP_VU_DANG_TRIEN_KHAI.pdf`

## 3. Khác biệt về cấu hình môi trường

- Bản 01.04.26 có `backend/.env` và `frontend/.env`.
- Bản 12.04.26 không có hai file `.env` này trong cây thư mục đã đối chiếu.

## 4. Những phần không thấy khác biệt nội dung

- Các file trùng tên giữa hai bản nhìn chung không có thay đổi nội dung sau khi đối chiếu hash.
- Khác biệt chủ yếu nằm ở việc **thêm file mới** và **bổ sung chức năng tiến độ**.

## 5. Danh sách file chỉ có ở từng bản

### Chỉ có ở bản 12.04.26

- `analysis_report_advance.md`
- `backend/controllers/tienDoController.js`
- `backend/models/TienDo.js`
- `frontend/src/components/student/ProgressLog.js`
- `implementation_planFix.md`
- `web3_ai_system_explanation.md`

### Chỉ có ở bản 01.04.26

- `backend/.env`
- `DAC_TA_NGHIEP_VU_HE_THONG.md`
- `frontend/.env`
- `GIAI_THICH_SU_DUNG_2_AI.md`
- `GIAI_THICH_SU_DUNG_2_AI.pdf`
- `HUONG_DAN_KHOI_CHAY_DU_AN.md`
- `HUONG_DAN_KHOI_CHAY_DU_AN.pdf`
- `NGHIEP_VU_DANG_TRIEN_KHAI.md`
- `NGHIEP_VU_DANG_TRIEN_KHAI.pdf`

## 6. Kết luận ngắn

- Bản 12.04.26 là bản mở rộng tính năng, tập trung vào tracking tiến độ và ghi nhận nhận xét.
- Bản 01.04.26 thiên về tài liệu hướng dẫn, nghiệp vụ và mô tả triển khai.
