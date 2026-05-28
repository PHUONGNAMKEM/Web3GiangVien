# Nhật ký Nhiệm vụ: Ràng buộc bảo mật cho chấm điểm AI (Phase 3.1 - 3.4)

- **ID Nhiệm vụ**: WGV_TASK_20260528_Phase3_Security_Scoring
- **Ngày thực hiện**: 28-05-2026
- **Trạng thái**: Hoàn thành (Đã triển khai và đồng bộ)

## 1. Vấn đề ban đầu
Hệ thống cũ thiếu các cơ chế bảo mật cơ bản tại các điểm nhạy cảm:
- Cho phép upload file lên tới 50MB mà không kiểm tra MIME type thực tế hay Magic Bytes (dễ bị bypass định dạng để upload shell script độc hại).
- Không có cơ chế Rate Limiting chống spam API nộp bài, chấm điểm, và brute-force đăng nhập MetaMask.
- Sinh viên có thể dùng các kỹ thuật Prompt Injection trong báo cáo để ra lệnh đè cho AI tự chấm điểm tối đa, hoặc spam từ khóa (keyword stuffing) để tăng điểm.
- ML Service FastAPI mở CORS dạng wildcard `*` và không có cơ chế xác thực nội bộ (ai cũng có thể gọi trực tiếp API chấm điểm nếu biết IP).

## 2. Nguyên nhân
Đây là các thiếu sót bảo mật từ giai đoạn prototype, chưa được củng cố các lớp phòng thủ chiều sâu và xác thực giao tiếp giữa các service.

## 3. Các file và khu vực liên quan
- **Backend (Express)**:
  - `backend/server.js`
  - `backend/controllers/baoCaoController.js`
  - `backend/services/aiService.js`
  - `backend/package.json`
  - `backend/.env` & `backend/.env.example`
- **ML Service (FastAPI)**:
  - `ml-service/app.py`
  - `ml-service/routes/analyze.py`
  - `ml-service/utils/text_security.py` [Mới]
  - `ml-service/requirements.txt`
  - `ml-service/.env` & `ml-service/.env.example` [Mới]

## 4. Giải pháp triển khai đúng
Tôi đã triển khai đầy đủ các cơ chế bảo mật từ Phase 3.1 đến 3.4:

1. **File Upload Hardening (Phase 3.1)**:
   - Sửa Multer config: Giảm size xuống 20MB, lọc `application/pdf`, và ép cứng đuôi file `.pdf`.
   - Viết middleware bắt lỗi Multer để trả về 400 Bad Request rõ ràng khi quá dung lượng/sai định dạng.
   - Thêm bước kiểm tra Magic Bytes (`%PDF`) bằng cách đọc Buffer file tạm trong `baoCaoController.js` trước khi lưu/upload IPFS. Xóa file ngay lập tức nếu không khớp.
2. **Rate Limiting (Phase 3.2)**:
   - Tích hợp `express-rate-limit` ở backend: giới hạn upload (3 lần/phút), AI scoring (10 lần/phút), và login challenge/verify (20 lần/15 phút).
   - Tích hợp `slowapi` ở ml-service: giới hạn 5 lần gọi/phút cho các API phân tích PhoBERT.
3. **Prompt Injection & Input Validation (Phase 3.3)**:
   - Giới hạn text đầu vào tối đa 300,000 ký tự và tối đa 20 rubrics bằng Pydantic Field để tránh DoS/tràn bộ nhớ.
   - Xây dựng module `text_security.py` quét Regex phát hiện prompt injection, tỷ lệ lặp lại câu (> 20%), và tỷ lệ Type-Token Ratio (< 25% - phát hiện keyword stuffing).
   - Trả về `security_flags` cùng kết quả chấm điểm.
4. **CORS & Internal Auth (Phase 3.4)**:
   - CORS whitelist trong ml-service chỉ cho phép từ URL backend.
   - Thêm FastAPI Middleware kiểm tra token `X-Internal-Token` đính kèm trong header. Trả về 403 nếu sai/thiếu.
   - Tích hợp `load_dotenv` vào Python ml-service để nạp biến cấu hình.
   - Backend đính kèm token bảo mật khi gọi sang ml-service.

## 5. Kết quả
- Quá trình cài đặt thư viện `express-rate-limit` và `slowapi` diễn ra thành công.
- Không phát sinh lỗi cú pháp hay lỗi crash luồng chạy hiện tại. Giao tiếp giữa hai service được bảo vệ an toàn bằng token bí mật.

## 6. Lưu ý để tránh lặp lại lỗi
- **Bắt buộc** phải cấu hình đồng bộ khóa `INTERNAL_TOKEN` giống nhau ở file `.env` của cả backend và ml-service khi triển khai lên môi trường Live (Production). Nếu cấu hình lệch, backend sẽ bị ml-service từ chối (403 Forbidden).
- Luôn giữ nguyên cơ chế ép đuôi file upload sang `.pdf` trong filename generator của Multer để triệt tiêu hoàn toàn lỗ hổng bypass định dạng file (ví dụ: `shell.php.pdf`).
