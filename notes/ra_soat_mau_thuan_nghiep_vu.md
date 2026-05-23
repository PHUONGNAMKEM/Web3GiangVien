# Rà soát mâu thuẫn & thiếu sót về nghiệp vụ

> Tài liệu này liệt kê các điểm còn **mâu thuẫn** (giữa tài liệu thiết kế và mã nguồn) hoặc **thiếu** (quy tắc nghiệp vụ đã nêu nhưng chưa được hiện thực) trong hệ thống Web3GiangVien.
> Mỗi mục gồm: **Câu hỏi** → **Hiện trạng** (sự thật xác minh trong code) → **Đề xuất bổ sung**.
> Ngày rà soát: 2026-05-23. Phạm vi: `backend/models`, `backend/controllers`, `backend/server.js`, đối chiếu với `notes/*.md`.

---

## Bảng tổng hợp nhanh

| # | Nhóm | Vấn đề | Mức độ |
|---|------|--------|--------|
| 1 | Doc vs Code | Điều kiện hủy đăng ký khác giữa tài liệu và code | Trung bình |
| 2 | Doc vs Code | Mô tả "SV đăng ký đầu tiên = trưởng nhóm" không còn đúng | Thấp (lỗi tài liệu) |
| 3 | Doc vs Code | Thiếu tie-break theo điểm khi trùng thời gian nộp | Cao |
| 4 | State machine | `DangLamTest` được đọc nhưng không bao giờ được set | Cao |
| 5 | State machine | `DeTai.TrangThai = 'HoanThanh'` không bao giờ được set | Trung bình |
| 6 | State machine | Tên field & default trạng thái thành viên không nhất quán | Thấp |
| 7 | Thiếu ràng buộc | `Deadline` đề tài không được enforce | Cao |
| 8 | Thiếu ràng buộc | Không có deadline lập nhóm (group formation deadline) | Cao |
| 9 | Thiếu ràng buộc | `DaCapNhatHoSo` không được kiểm tra ở backend trước khi đăng ký | Trung bình |
| 10 | Thiếu ràng buộc | `transferLeader` không bị chặn khi nhóm đã chốt / đang đấu | Cao |
| 11 | Thiếu ràng buộc | Không có cơ chế "độc quyền phiên" (1 tab/nhóm) | Trung bình |
| 12 | Chấm điểm nhóm | Báo cáo nhóm phải chấm N lần, điểm có thể lệch giữa thành viên | Cao |
| 13 | Chấm điểm nhóm | Bài test "nộp 1 lần" là theo SV, không theo nhóm | Cao |
| 14 | Phân quyền | Đa số route ghi không có middleware xác thực | Rất cao |
| 15 | Phân quyền | `GiangVienCam` và `GiangVienCham` luôn bằng nhau | Thấp |
| 16 | AI nghiệp vụ | "Chấm điểm tiến độ bằng AI" thực chất là heuristic + GV chấm tay | Trung bình |
| 17 | AI nghiệp vụ | Ràng buộc lệch điểm rubrics ≤ 0.5 giới hạn quyền GV | Trung bình |
| 18 | Blockchain | Tiến độ tuần (TienDo) không ghi blockchain | Trung bình |

---

## A. Mâu thuẫn giữa tài liệu nghiệp vụ và mã nguồn

### 1. Điều kiện hủy đăng ký đề tài

**Câu hỏi:** Sinh viên/nhóm được hủy đăng ký đề tài ở những trạng thái nào?

**Hiện trạng:**
- Tài liệu `mo_ta_yeu_cau_chuc_nang_va_dac_ta_use_case.md` (ràng buộc #3, dòng 288) ghi: *"Đăng ký chỉ có thể hủy khi còn ở trạng thái chờ duyệt"* (chỉ `ChoDuyet`).
- Mã nguồn `deTaiController.js:252` cho phép hủy ở `['ChoDuyet', 'ChoTest', 'DangLamTest']`.
- → Tài liệu và code không khớp (tài liệu viết trước khi có tính năng đấu đề tài).

**Đề xuất bổ sung:** Cập nhật tài liệu đặc tả theo logic thực tế. Đồng thời làm rõ quy tắc: sau khi nhóm đã `DaSubmit` (đã nộp bài test) thì **không** được hủy — điều này code đã đúng, chỉ cần đồng bộ tài liệu.

### 2. "Sinh viên đăng ký đầu tiên là trưởng nhóm"

**Câu hỏi:** Trưởng nhóm được xác định khi nào — lúc đăng ký đề tài hay lúc tạo nhóm?

**Hiện trạng:**
- Tài liệu (UC-04, dòng 153) mô tả: *"sinh viên đăng ký đầu tiên được xác định là trưởng nhóm"* → đây là luồng **cũ** (đăng ký cá nhân rồi mời thêm).
- Code hiện tại (`deTaiController.registerTopic`, `nhomController.createNhom`) dùng luồng **mới**: SV phải **tạo nhóm trước, chốt nhóm** rồi mới đăng ký đề tài bằng `nhomId`. Trưởng nhóm xác định khi tạo nhóm.

**Đề xuất bổ sung:** Viết lại UC-04 theo luồng group-first. Cân nhắc xóa hẳn các field backward-compat (`DangKyDeTai.SinhVien`, đăng ký không có `Nhom`) nếu không còn dùng, để tránh hai mô hình song song gây nhầm lẫn.

### 3. Tie-break theo điểm khi trùng thời gian nộp

**Câu hỏi:** Khi hai nhóm nộp bài test cùng thời điểm (T bằng nhau), nhóm nào thắng?

**Hiện trạng:**
- Tài liệu `nghiep_vu_he_thong_ban_cap_nhat.md` (mục 3, dòng 29-30) quy định: nếu `T_A = T_B` thì **chọn nhóm có điểm số S cao hơn**.
- Code `baiTestController.tryClaimWinner` chỉ so sánh `ThoiGianSubmit` với toán tử `$lt` (sớm hơn). Khi hai timestamp bằng nhau, không có nhánh tie-break theo điểm — nhóm nào chạy câu lệnh update atomic trước sẽ thắng (phụ thuộc thứ tự DB, không phải điểm).

**Đề xuất bổ sung:** Trong `tryClaimWinner`/`resolveWaitingGroups`, khi gặp nhóm có cùng `ThoiGianSubmit`, so sánh thêm `TongDiem` của `KetQuaTest`. Hoặc lưu thời gian nộp ở độ phân giải mili/micro-giây và chấp nhận xác suất trùng ~0 (tài liệu cũng nhắc microseconds).

---

## B. State machine / trạng thái không hoàn chỉnh

### 4. Trạng thái `DangLamTest` không bao giờ được set

**Câu hỏi:** Khi nào một đăng ký chuyển sang trạng thái "Đang làm bài test" (`DangLamTest`)?

**Hiện trạng:**
- `DangLamTest` được **đọc** ở nhiều nơi (`baiTestController.js:127,195,201`, `deTaiController.js:252`) và **hiển thị** trên UI (`TopicManagement.js:693,697`).
- Nhưng **không có dòng code nào set** trạng thái này. Luồng thực tế: `ChoDuyet` → (tạo bài test) → `ChoTest` → (nộp) → `DaSubmit`. Bước `ChoTest → DangLamTest` (SV bấm "bắt đầu làm bài") bị thiếu.

**Đề xuất bổ sung:** Thêm endpoint "bắt đầu làm bài test" set `ChoTest → DangLamTest` và ghi `ThoiGianBatDau`. Việc này cũng cần cho quy tắc "độc quyền phiên" (mục 11). Nếu không định dùng, nên bỏ `DangLamTest` khỏi enum để tránh state chết.

### 5. Đề tài không bao giờ chuyển sang `HoanThanh`

**Câu hỏi:** Vòng đời đề tài kết thúc thế nào? Khi nào đề tài được đánh dấu "Hoàn thành"?

**Hiện trạng:**
- `DeTai.TrangThai` có enum `['MoDangKy', 'DaChot', 'HoanThanh']` nhưng `'HoanThanh'` **không bao giờ được set** trong bất kỳ controller nào. Sau khi chấm điểm xong, đề tài vẫn ở `DaChot` mãi mãi.

**Đề xuất bổ sung:** Định nghĩa điều kiện hoàn thành (ví dụ: tất cả thành viên nhóm đã có `DiemSo` ghi blockchain thành công) → tự động set `HoanThanh`. Hoặc cho GV nút "Kết thúc đề tài". Việc này cũng giúp thống kê/khoá các thao tác sau khi hoàn thành.

### 6. Tên field & default trạng thái thành viên không nhất quán

**Câu hỏi:** Trạng thái một thành viên trong nhóm dùng field nào và default là gì?

**Hiện trạng:**
- `Nhom.ThanhVien.TrangThai` (default `'DaMoi'`) — dùng khi mời/chấp nhận vào nhóm.
- `DangKyDeTai.ThanhVien.TrangThaiTV` (default `'DaChapNhan'`) — bản sao thành viên khi đăng ký.
- Hai field cùng ý nghĩa nhưng **khác tên** (`TrangThai` vs `TrangThaiTV`) và **khác default**. Code phải nhớ đúng tên ở từng nơi, dễ sai (ví dụ query `'ThanhVien.TrangThaiTV'` ở chỗ này, `'ThanhVien.TrangThai'` ở chỗ kia).

**Đề xuất bổ sung:** Thống nhất một tên field (ví dụ `TrangThai`) cho cả hai schema. Nếu giữ tách biệt vì lý do lịch sử, ghi chú rõ trong model để tránh nhầm.

---

## C. Thiếu ràng buộc nghiệp vụ (đã nêu thiết kế nhưng chưa enforce)

### 7. `Deadline` đề tài không được enforce

**Câu hỏi:** Sau hạn `Deadline` của đề tài, sinh viên còn được đăng ký / nộp báo cáo không?

**Hiện trạng:**
- `DeTai.Deadline` là field **required**, nhưng chỉ được dùng để đẩy lên blockchain (`thesisContractService.js:134,168`).
- `registerTopic`, `uploadBaoCao`, `createProgressEntry` **không hề kiểm tra** `Deadline`. → Có thể đăng ký/nộp sau hạn.

**Đề xuất bổ sung:** Thêm kiểm tra `Date.now() <= deTai.Deadline` ở các thao tác đăng ký và nộp báo cáo (trả lỗi rõ ràng nếu quá hạn). Cân nhắc tách riêng `HanDangKy` và `HanNopBaoCao` vì hai mốc này thường khác nhau.

### 8. Không có deadline lập nhóm

**Câu hỏi:** Có mốc thời gian khóa việc tạo/sửa nhóm không?

**Hiện trạng:**
- `nghiep_vu_he_thong_ban_cap_nhat.md` (mục 1) yêu cầu: *"Hệ thống quy định một deadline riêng biệt cho việc tạo nhóm. Sau thời điểm này, người dùng không thể tiếp tục tạo mới nhóm"* và *"Khóa cứng (Locked-in)"*.
- Code **không có** field deadline lập nhóm, không có khóa cứng theo thời gian. `nhomController.createNhom` cho tạo nhóm bất kỳ lúc nào; việc khóa chỉ ở mức từng nhóm qua `DaChot` (thủ công).

**Đề xuất bổ sung:** Thêm cấu hình deadline lập nhóm (toàn hệ thống hoặc theo đợt). Sau hạn: chặn `createNhom`, `inviteMember`, `kickMember`, `leaveNhom`, và tự động coi các nhóm đủ thành viên là đã khóa.

### 9. `DaCapNhatHoSo` không được kiểm tra ở backend trước khi đăng ký

**Câu hỏi:** Sinh viên chưa hoàn thiện hồ sơ có đăng ký đề tài / tạo nhóm được không?

**Hiện trạng:**
- `DaCapNhatHoSo` được **set** khi cập nhật hồ sơ (`sinhVienController.js:88`), nhưng **không được kiểm tra** trong `registerTopic` hay `createNhom`.
- Tài liệu (UC-02, UC-04) ngụ ý phải hoàn thiện hồ sơ trước. Hiện việc ép buộc (nếu có) chỉ nằm ở frontend → có thể bị bỏ qua khi gọi API trực tiếp.

**Đề xuất bổ sung:** Kiểm tra `DaCapNhatHoSo === true` ở backend trước khi cho đăng ký/tạo/nhận lời mời nhóm.

### 10. `transferLeader` không bị chặn khi nhóm đã chốt / đang đấu

**Câu hỏi:** Trưởng nhóm có được chuyển quyền sau khi nhóm đã chốt hoặc đang đấu đề tài không?

**Hiện trạng:**
- `nghiep_vu_he_thong_ban_cap_nhat.md` (mục 1, dòng 12) quy định: *"Trong suốt quá trình đấu đề tài, Nhóm trưởng không được phép rời nhóm hoặc chuyển giao quyền hạn"*.
- Code: `leaveNhom`, `kickMember`, `inviteMember` đều chặn khi `nhom.DaChot`. **Nhưng `transferLeader` (`nhomController.js:239-272`) KHÔNG kiểm tra `DaChot`** → trưởng nhóm vẫn chuyển quyền được sau khi chốt. Mâu thuẫn trực tiếp với quy định.

**Đề xuất bổ sung:** Thêm guard `if (nhom.DaChot) return res.status(400)...` vào `transferLeader` (hoặc cho phép tới khi đề tài chưa `DaChot`, tùy quy định cuối cùng).

### 11. Không có cơ chế "độc quyền phiên" (1 tab/nhóm)

**Câu hỏi:** Hệ thống có chặn một nhóm mở nhiều tab/thiết bị khi làm bài test không?

**Hiện trạng:**
- Tài liệu yêu cầu *"Mỗi nhóm chỉ được phép mở 01 tab duy nhất... phiên cũ sẽ bị vô hiệu hóa (Invalidated)"* (mục 2).
- Code **không có** quản lý phiên làm bài, không có cơ chế invalidate. Bất kỳ thành viên nào cũng có thể gọi API nộp.

**Đề xuất bổ sung:** Nếu xem đây là yêu cầu thật, cần thêm khái niệm "phiên làm bài" (session token theo nhóm + đề tài) và logic vô hiệu hóa phiên cũ. Nếu chỉ là mong muốn, hạ xuống "nice-to-have" và ghi rõ trong tài liệu.

---

## D. Chấm điểm nhóm & bài test

### 12. Báo cáo nhóm phải chấm nhiều lần, điểm có thể lệch giữa các thành viên

**Câu hỏi:** Với đề tài nhóm, một báo cáo chung được chấm một lần cho cả nhóm hay chấm riêng từng thành viên?

**Hiện trạng:**
- Khi trưởng nhóm nộp, hệ thống tạo **N bản ghi `BaoCao`** (mỗi thành viên một bản, cùng `IPFS_CID`) — `baoCaoController.js:90-97`.
- `diemSoController.chamDiem` chấm **theo từng `BaoCao`** (`DiemSo` unique theo `BaoCao`). → GV phải chấm **N lần** cho cùng một nội dung báo cáo, và **không có ràng buộc** điểm các thành viên phải bằng nhau → dễ lệch điểm trong cùng một nhóm.
- On-chain: lúc nộp chỉ ghi 1 submission cho trưởng nhóm (`baoCaoController.js:105`), nhưng lúc chấm lại ghi N giao dịch (mỗi thành viên một `finalizeGrade`).

**Đề xuất bổ sung:** Quyết định rõ chính sách:
- *Phương án A (điểm nhóm):* chấm 1 lần → áp dụng cùng điểm/nhận xét cho tất cả thành viên (tạo N `DiemSo` cùng giá trị trong một transaction nghiệp vụ).
- *Phương án B (điểm cá nhân):* giữ chấm riêng nhưng bổ sung UI rõ ràng "đang chấm cho thành viên X" và cảnh báo khi điểm các thành viên lệch nhau.

### 13. Bài test "nộp 1 lần" là theo sinh viên, không theo nhóm

**Câu hỏi:** Trong đề tài có bài test cạnh tranh, ai trong nhóm là người làm bài, và "nộp 1 lần" tính theo nhóm hay theo cá nhân?

**Hiện trạng:**
- Tài liệu nói nhóm *"chỉ được phép nộp bài 1 lần duy nhất; kết quả nộp đó là kết quả chính thức của nhóm"* (mục 2).
- Code: `KetQuaTest` unique theo `(BaiTest, SinhVien)` — tức **mỗi SV** nộp 1 lần, không phải mỗi **nhóm**. `submitTest` cập nhật trạng thái đăng ký dựa trên thành viên đầu tiên tìm thấy ở trạng thái `ChoTest/DangLamTest`; thành viên nộp sau sẽ không còn khớp `dangKy` nên không kích hoạt lại logic thi đấu.
- → Thực chất "người nộp đầu tiên của nhóm" quyết định kết quả; các thành viên khác vẫn nộp được bản `KetQuaTest` riêng nhưng không ảnh hưởng. Hành vi này **không được mô tả** và dễ gây hiểu nhầm (điểm nhóm = điểm ai?).

**Đề xuất bổ sung:** Chốt quy tắc: chỉ **trưởng nhóm** được làm/nộp bài test đại diện (chặn thành viên khác), hoặc gộp điểm theo nhóm. Thêm unique theo nhóm (`BaiTest + Nhom`) thay vì theo SV nếu muốn "1 nhóm 1 lần nộp".

---

## E. Phân quyền / xác thực

### 14. Đa số route ghi không có middleware xác thực

**Câu hỏi:** Những thao tác quan trọng (chấm điểm, duyệt đăng ký, đánh giá tiến độ, tạo/xóa đề tài, thao tác nhóm) có yêu cầu đăng nhập và kiểm tra vai trò không?

**Hiện trạng:**
- Trong `server.js`, chỉ vài route có `authController.authenticateToken` (logout, mời/đáp lời mời ở `detai`, upload/xóa báo cáo).
- Các route **không có** middleware xác thực gồm: `POST /api/diemso` (chấm điểm), `PUT /api/dangky/:id/approve` (duyệt), `PUT /api/tiendo/:id/danhgia` (đánh giá), toàn bộ `/api/baitest/*`, `/api/nhom/*`, `/api/rubrics/*`, `POST/PUT/DELETE /api/detai`.
- Các controller có kiểm tra "đúng GV hướng dẫn" (`assertGiangVienOwnsDeTai`) nhưng **danh tính `giangVienId`/`sinhVienId` lấy từ `req.body`/`req.query`**, do client tự gửi. Vì `GiangVienHuongDan` của đề tài có thể tra qua `GET /api/detai`, một người bất kỳ có thể truyền đúng ID để chấm điểm/duyệt thay GV. → Kiểm tra quyền hiện tại chỉ đảm bảo *tính đúng logic*, không đảm bảo *an toàn*.

**Đề xuất bổ sung:** Thêm `authenticateToken` cho tất cả route ghi, và lấy danh tính từ token (`req.user`) thay vì từ body. Bổ sung middleware phân vai (chỉ GV mới gọi được API của GV, chỉ SV gọi API của SV).

### 15. `GiangVienCam` và `GiangVienCham` luôn bằng nhau

**Câu hỏi:** Hệ thống có phân biệt "giảng viên hướng dẫn" và "giảng viên chấm" không?

**Hiện trạng:**
- `DiemSo` tách hai field `GiangVienCam` (required) và `GiangVienCham` (optional), gợi ý mô hình hai vai trò khác nhau.
- Nhưng `diemSoController.chamDiem:142-143` gán **cả hai bằng cùng một `giangVienId`**. Mô hình hai GV không được dùng.

**Đề xuất bổ sung:** Nếu nghiệp vụ chỉ có GV hướng dẫn tự chấm → bỏ bớt một field cho gọn. Nếu định có hội đồng/GV phản biện chấm → cần luồng gán GV chấm riêng.

---

## F. AI scoring & Blockchain (nghiệp vụ)

### 16. "Chấm điểm tiến độ bằng AI" thực chất là heuristic + GV chấm tay

**Câu hỏi:** Điểm tiến độ tuần (`DiemTienDo`) do AI chấm hay do GV chấm?

**Hiện trạng:**
- `tienDoController.evaluateProgress` tính `DiemTienDo` từ **điểm GV nhập tay** theo `rubricsTuan` (trọng số × DiemGV). Không có lời gọi model AI nào.
- Phần "AI" với tiến độ chỉ là `detectAnomalies` — bộ **heuristic** phát hiện bất thường (giảm %, tăng đột biến, thiếu minh chứng, nộp dồn...), không phải model học máy.
- Tên gọi "hệ thống chấm điểm tiến độ AI" (xuất hiện ở tài liệu/PDF) dễ gây hiểu nhầm là AI tự chấm điểm tiến độ.

**Đề xuất bổ sung:** Thống nhất cách gọi: hoặc đổi tên thành "đánh giá tiến độ có hỗ trợ cảnh báo tự động", hoặc thực sự thêm bước AI gợi ý điểm tiến độ (tái dùng PhoBERT như chấm báo cáo) để đúng với tên gọi.

### 17. Ràng buộc lệch điểm rubrics ≤ 0.5 giới hạn quyền GV

**Câu hỏi:** Giảng viên có được phép cho điểm tổng khác với tổng điểm tính từ rubrics không?

**Hiện trạng:**
- `diemSoController.validateRubricsAgainstScore` từ chối lưu nếu `|điểm tổng - điểm tính từ rubrics| > 0.5` (`diemSoController.js:66`).
- Tài liệu (ràng buộc #7) nói *"Điểm chính thức là điểm do GV xác nhận"* → ngụ ý GV toàn quyền. Hai điều này hơi mâu thuẫn: GV không thể đặt điểm tổng lệch quá 0.5 so với tổng tiêu chí.

**Đề xuất bổ sung:** Làm rõ ý đồ: nếu muốn điểm tổng = tổng tiêu chí thì nên **tự động tính** điểm tổng từ rubrics (không cho nhập tay), bỏ ngưỡng 0.5. Nếu muốn GV có quyền điều chỉnh → nới/bỏ ngưỡng và ghi lý do điều chỉnh.

### 18. Tiến độ tuần không được ghi blockchain

**Câu hỏi:** Đánh giá tiến độ tuần có cần lưu vết trên blockchain như điểm số và bài test không?

**Hiện trạng:**
- `DiemSo` và `KetQuaTest` đều có field `TxHash` và ghi on-chain.
- `TienDo` **không có** field `TxHash`, `evaluateProgress` không ghi blockchain. Trong khi đó dự án có tính năng "weekly progress blockchain viewer" (theo lịch sử commit) → có thể kỳ vọng tiến độ cũng minh bạch on-chain.

**Đề xuất bổ sung:** Xác định rõ phạm vi minh bạch hóa: nếu tiến độ cần on-chain, thêm field `TxHash` cho `TienDo` và ghi hash đánh giá tuần khi GV chốt `Dat/KhongDat`. Nếu không, chỉnh tên/tài liệu của "blockchain viewer" để không gây hiểu nhầm.

---

## Gợi ý thứ tự xử lý

1. **Ưu tiên cao (an toàn & đúng đắn):** #14 (xác thực), #3 (tie-break điểm), #4 (`DangLamTest`), #7 (deadline), #10 (transferLeader), #12–13 (chấm điểm/nộp test theo nhóm).
2. **Ưu tiên trung bình (hoàn thiện vòng đời):** #5 (`HoanThanh`), #8 (deadline lập nhóm), #9 (check hồ sơ), #16–18 (AI/blockchain nghiệp vụ).
3. **Ưu tiên thấp (dọn dẹp & đồng bộ tài liệu):** #1, #2, #6, #11, #15.
