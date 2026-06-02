# Triển khai tính năng "Đối Chiếu Blockchain" (route `/lecturer/blockchain`)

> Tổng hợp toàn bộ nội dung đã triển khai trong phiên làm việc ngày **02/06/2026**.
> Mục tiêu: biến trang debug blockchain thành một tính năng chính thức cho Giảng viên, dùng để
> **đối chiếu dữ liệu điểm số giữa Database và Blockchain nhằm chứng minh dữ liệu không bị giả mạo**.

---

## 0. Bối cảnh

Trang gốc là một **trang debug độc lập** (`/blockchain`), không nằm trong menu, không có bảo mật.
Luồng dữ liệu: `Ethereum Sepolia` → `ethers.js (Infura RPC)` → `blockchainController.js` → REST API → `BlockchainDebugPage.js` → bảng Ant Design.

Các file chính liên quan:
- Frontend: `frontend/src/components/debug/BlockchainDebugPage.js`
- Frontend: `frontend/src/App.js`, `frontend/src/components/layout/MainLayout.js`
- Backend: `backend/controllers/blockchainController.js`, `backend/server.js`
- Backend: `backend/services/thesisContractService.js` (luồng ghi on-chain — không sửa, chỉ tham chiếu)
- Contract: `backend/contracts/ThesisManagement.sol` (v1), `ThesisManagementV2.sol` (v2)

---

## 1. Đưa trang vào menu chính

- Chuyển route công khai `/blockchain` → route con **`/lecturer/blockchain`** (nằm trong `MainLayout` + `ProtectedRoute`).
  - `App.js`: gỡ route public, thêm `<Route path="blockchain" element={<BlockchainDebugPage />} />` trong nhóm `/lecturer`.
- Thêm mục menu Giảng viên: **"Đối Chiếu Blockchain"** (icon `ShieldCheck` — tượng trưng chống giả mạo) trong `MainLayout.js`.
- Cập nhật tiêu đề/mô tả trang: *"Đối chiếu dữ liệu điểm số giữa Database và Blockchain để chứng minh dữ liệu không bị giả mạo."*

---

## 2. Khắc phục các điểm không phù hợp với phiên bản hiện tại

### 2.1. Lỗ hổng bảo mật — route công khai 🔴
- **Frontend:** route giờ bắt buộc đăng nhập đúng `LECTURER_ROLE` (nhờ `ProtectedRoute`).
- **Backend** (`server.js`): thêm middleware `...requireLecturer` cho cả 5 route `/api/blockchain/*`.
  - Trước đó các route này hoàn toàn public → lộ địa chỉ contract, ví sinh viên, điểm số, IPFS CID.

### 2.2. Hiệu năng — vòng lặp N+1 🟡
- `getThesisDbRecords` trước đây gọi `getSubmissionHistory` lên Ethereum **tuần tự** cho từng báo cáo → với `limit=50` có thể treo 15–50s.
- Đã đổi sang đọc **song song có giới hạn** (xem mục 6.2).

### 2.3. Không nhất quán kiến trúc 🟡
- `BlockchainDebugPage.js` trước dùng `axios` trực tiếp + `API_URL` hardcode.
- Đã chuyển sang dùng **`apiService`** (tự đính kèm token Bearer + interceptor 401 chung như toàn project).

---

## 3. Đổi smart contract đang dùng

- `backend/.env` → `THESIS_CONTRACT_ADDRESS`:
  - Cũ: `0x1a828360B971409677a5280912fED2bE846cB025`
  - Mới (đúng contract minh hoạ): `0x571cDa9353107de84E58D313022d02bF2efAc5E5`
- HR Payroll (`0xfAFaf2532b6148fA52e3ff0453dEcc85417bb33E`) và Token (`0x052bd64b3f565698270f3fcdf98d7502d21f2377`) giữ nguyên (đã khớp).
- Lưu ý: file `backend/.env.render` (deploy Render) **chưa đổi** — cần đồng bộ nếu deploy.

---

## 4. Sắp xếp lại bố cục (UI order)

Thứ tự hiển thị trên trang sau khi chỉnh:
1. **Contract hệ thống**
2. **Tra cứu đề tài** + **Lịch sử nộp và chấm** (đã đẩy lên trên)
3. **Dữ liệu DB đã đối chiếu Blockchain** (bảng dài + phân trang đưa xuống dưới)

---

## 5. Hai bug logic trong đối chiếu (đã fix)

### 5.1. Bug 1 — Báo cáo NHÓM bị báo sai "chưa khớp" 🔴
- **Nguyên nhân:** khi nộp, `submitReportOnChain(requesterId, ...)` chỉ ghi on-chain **một lần** dưới ID **người nộp**; nhưng `BaoCao.insertMany` tạo **một báo cáo cho mỗi thành viên**. Khi đối chiếu, mỗi thành viên tra on-chain bằng ID của chính mình → các thành viên không phải người nộp → on-chain rỗng → báo "CID chưa khớp" oan.
- **Fix:** trong `getThesisDbRecords`, nếu tra bằng ID của chính mình không khớp CID → tìm bằng chứng từ **thành viên cùng nhóm** (cùng `DeTai` + cùng `IPFS_CID`). Nếu khớp → đánh dấu `matchedVia: 'group'`.
- **UI:** hiển thị **"CID khớp (nhóm)"** cho các thành viên này.

### 5.2. Bug 2 — `Promise.all` có thể bị Infura chặn rate-limit 🟡
- Đổi tuần tự → `Promise.all` thuần (50 call cùng lúc) dễ dính **429 Too Many Requests**.
- **Fix:**
  - **Gom cặp `(studentId, topicId)` duy nhất** → mỗi cặp chỉ gọi on-chain 1 lần (khử trùng lặp).
  - **Gọi theo lô giới hạn** `CONCURRENCY = 5` (chạy `Promise.all` theo từng lô 5 call) → nhanh nhưng không burst quá ngưỡng.

---

## 6. Hiển thị điểm chung của nhóm

- **Nguyên nhân:** điểm (`DiemSo`) chỉ lưu **một bản cho người đại diện nhóm**; thành viên khác có `grade = null` → cột DB hiện "Chưa chấm" dù on-chain đã có điểm → mâu thuẫn.
- **Fix backend:** nếu báo cáo không có `DiemSo` riêng → **mượn điểm của thành viên cùng nhóm** (cùng đề tài + cùng IPFS_CID), gắn cờ `fromGroup: true`.
- **Fix frontend:** tag "Chấm" thêm hậu tố **"(theo nhóm)"**.

---

## 7. Cải thiện UI/UX (giá trị thô → thân thiện)

| Trước | Sau |
|---|---|
| `found` / `empty` / `error` | **Đã có on-chain** / **Chưa có on-chain** / **Lỗi đọc chain** |
| `Chấm: DaGhi` | **Chấm: Đã ghi** (map cả `Pending`→"Đang ghi", `LoiGhi`→"Lỗi ghi", `ChuaGhi`→"Chưa ghi") |
| `Tx: 0xMockSyncedOnChain` | **Đồng bộ từ chain** (in nghiêng, ẩn hash giả) |
| Hash thật dài 66 ký tự | Rút gọn `0x1234abcd…ef5678` (copy vẫn ra đầy đủ) |
| `Raw grade: 57` | **Điểm gốc (×10): 57** |
| Nhãn thường | **In đậm** các nhãn: "Báo cáo:", "CID:", "Điểm:", "Student DID:"… để tách label/nội dung |

- **Banner tổng kết** phía trên bảng:
  - Tất cả khớp → **xanh**: *"Tất cả N bản ghi đều khớp Blockchain — không phát hiện sai lệch."*
  - Có lệch → **vàng**: *"X/Y bản ghi khớp Blockchain. Z bản ghi chưa khớp — cần kiểm tra."*
- Helper `stripReportLabel` bỏ tiền tố "Báo cáo" lặp trong tiêu đề.

---

## 8. Link tra cứu công khai trên Etherscan (Sepolia)

- Helper: `etherscanTxUrl(hash)` → `https://sepolia.etherscan.io/tx/<hash>`; `etherscanAddressUrl(addr)` → `.../address/<addr>`.
- **Mã tx thật** → link xanh bấm được (mở tab mới) + nút copy hash đầy đủ. Áp dụng cho: cột DB (Grade tx), phần mở rộng (Submit tx / Grade tx).
- **3 địa chỉ contract** (Thesis / HR Payroll / Token) ở card "Contract hệ thống" và contract ở card "Tra cứu đề tài" → link `/address/...`.
- Quy tắc hiển thị tx: thật → link; `0xMock...` → "Đồng bộ từ chain (không có tx thật)" (không link); rỗng → `-`.

---

## 9. Backfill — truy hồi mã tx THẬT cho dữ liệu cũ

### Vấn đề
Các bài đã chốt điểm on-chain từ trước nhưng DB lưu `0xMockSyncedOnChain` (mã giả) → không link Etherscan được. Mã tx **không nằm trong storage** của contract, nhưng **mỗi event log đính kèm `transactionHash`**.

### Sự thật về contract (có thể truy hồi)
```solidity
event ReportSubmitted(... indexed studentDID, ... indexed topicId, string ipfsCID);
event GradeFinalized(... indexed studentDID, ... indexed topicId, uint8 grade);
```
Vì 2 event indexed theo student + topic → dùng `queryFilter` lọc đúng giao dịch.

### Triển khai (chọn hướng: **Backfill 1 lần vào DB**)
- Backend — endpoint mới **`POST /api/blockchain/backfill-tx`** (`...requireLecturer`):
  1. Quét `DiemSo` có `TxHash` rỗng/`0xMock` → `queryFilter(GradeFinalized(studentKey, topicKey))` → khớp theo giá trị điểm / submission index → lưu `transactionHash` thật, set `TrangThaiBlockchain = 'DaGhi'`.
  2. Quét `BaoCao` có `SubmitTxHash` rỗng/`0xMock` → `queryFilter(ReportSubmitted(...))` → khớp theo `IPFS_CID` → lưu tx thật.
  3. Trả về thống kê `{ grade: {scanned, updated, failed}, report: {...} }`.
- Frontend — nút **"Truy hồi tx thật"** (icon History) cạnh nút "Tải lại" trên card DB → gọi endpoint, báo `message`, tự tải lại bảng.

### Điều kiện & lưu ý
- Chỉ truy hồi được nếu **giao dịch THẬT từng tồn tại** (event đã phát). Mock thuần (chưa từng gọi `finalizeGrade` on-chain) → giữ nguyên (tính `failed`).
- **Nên thêm `THESIS_DEPLOY_BLOCK=<block deploy contract>` vào `.env`** để `queryFilter` quét từ block đó thay vì từ 0 → nhanh & tránh một số RPC từ chối dải block quá rộng.
- Nhóm: chỉ người nộp thật mới có `ReportSubmitted` event → thành viên khác giữ `Submit tx: -` (đúng thực tế).

---

## 10. Giải thích các field "tx" (ghi nhớ)

- **tx = transaction = giao dịch on-chain**, mỗi lần ghi dữ liệu tạo ra một mã băm `0x...` (66 ký tự) duy nhất — như "số biên lai", tra công khai trên Etherscan.
- **Submit tx**: mã giao dịch lúc **nộp báo cáo** (ghi CID lên chain) — `submitReportOnChain`.
- **Grade tx**: mã giao dịch lúc **chốt điểm** — `finalizeGradeOnChain`.
- **`0xMockSyncedOnChain`**: KHÔNG phải mã thật. Khi điểm đã chốt trên chain từ trước, hệ thống chỉ đọc lại & đồng bộ về DB (self-healing, không phát sinh giao dịch mới) nên gắn mã giả này.
- Tx thật mới xuất hiện khi **chấm một bài CHƯA từng ghi điểm on-chain** (cần ví server `PRIVATE_KEY` có Sepolia ETH, contract hợp lệ, RPC hoạt động).

---

## 11. Danh sách file đã thay đổi

**Backend**
- `backend/.env` — đổi `THESIS_CONTRACT_ADDRESS`.
- `backend/server.js` — thêm `requireLecturer` cho route blockchain + route `POST /api/blockchain/backfill-tx`.
- `backend/controllers/blockchainController.js` — fix N+1 + nhóm trong `getThesisDbRecords`, mượn điểm nhóm, thêm `backfillTxHashes`.

**Frontend**
- `frontend/src/App.js` — chuyển route vào `/lecturer/blockchain`.
- `frontend/src/components/layout/MainLayout.js` — thêm menu "Đối Chiếu Blockchain".
- `frontend/src/components/debug/BlockchainDebugPage.js` — dùng `apiService`, đảo bố cục, nhãn thân thiện, in đậm label, rút gọn hash, banner tổng kết, link Etherscan, nút "Truy hồi tx thật".

---

## 12. Cách chạy / kiểm thử

1. **Restart backend** (nạp `.env` mới + route + controller mới).
2. Đăng nhập tài khoản **Giảng viên** → menu trái có **"Đối Chiếu Blockchain"**.
3. Trên trang:
   - Bảng "Dữ liệu DB đã đối chiếu Blockchain" hiển thị trạng thái khớp/không khớp + banner tổng kết.
   - Bấm **"Truy hồi tx thật"** để cập nhật mã tx cho dữ liệu cũ → các mã thành link Etherscan.
   - Bấm vào địa chỉ contract / mã tx để mở Etherscan Sepolia (tra cứu công khai).
4. Để có tx THẬT mới: chấm một bài chưa từng ghi điểm on-chain qua flow "Ký Số MetaMask & Ghi Blockchain".

### (Tuỳ chọn) Cấu hình thêm để backfill ổn định
```
# backend/.env
THESIS_DEPLOY_BLOCK=<số block deploy contract 0x571cDa...Ac5E5 trên Sepolia>
```
