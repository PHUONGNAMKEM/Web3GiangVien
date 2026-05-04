# Phân tích: QR Xác thực & Smart Contract

## 1. Phần QR Xác thực Blockchain

### 1.1. QR Code dùng để làm gì trong tài liệu gốc?

Theo tài liệu gốc (hệ thống HR quản lý nhân viên), QR Code xác thực Blockchain được sử dụng cho **2 mục đích chính**:

| Chức năng | Mô tả | Trạng thái hiện tại |
|:---|:---|:---|
| **Đăng nhập bằng QR** | Nhân viên quét mã QR để đăng nhập thay vì nhập username/password | ⚠️ UI có nhưng backend **không có route** `/api/qr/*` |
| **Chấm công / Điểm danh** | Nhân viên quét QR để chấm công (check-in/check-out) | ❌ Đã bị vô hiệu hóa hoàn toàn |

> [!IMPORTANT]
> QR Code trong tài liệu gốc **KHÔNG dùng cho thanh toán tiền**. Phần thanh toán lương/thưởng sử dụng smart contract `HRPayroll` với token `TestUSDT` — hoàn toàn tách biệt khỏi QR.

### 1.2. Hiện trạng QR trong codebase

#### Frontend (có sẵn nhưng bị disable):
- [LoginPage.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/LoginPage.js) — Có tab "QR Code" ở trang đăng nhập, có logic `handleQrScan` đầy đủ
- [QrScanner.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/components/QrScanner.js) — **Đã bị stub** chỉ hiển thị text "Tính năng Quét QR Điểm Danh đã bị vô hiệu hóa"
- [apiService.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/frontend/src/services/apiService.js#L196-L210) — Có 3 API methods: `getQrCode()`, `generateNewQrCode()`, `validateQrForLogin()`

#### Backend (config có nhưng route chưa đăng ký):
- [web3.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/config/web3.js#L82-L96) — Có đầy đủ ABI cho contract `QRAuthentication` (mintQRToken, verifyQRToken, recordQRUsage, revokeQRToken, isQRValid...)
- [deploy.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/scripts/deploy.js#L6-L11) — Script deploy có deploy `QRAuthentication` contract
- [server.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/server.js) — **KHÔNG có route `/api/qr/*`** nào được đăng ký

> [!WARNING]
> Frontend gọi tới `/api/qr/employee/:did`, `/api/qr/generate/:did`, `/api/qr/validate-login` — nhưng backend **không có** controller hay route nào handle các endpoint này. Nếu bật lại QR, cần tạo mới toàn bộ backend logic.

### 1.3. QR có liên quan đến hệ thống Giảng Viên không?

**Không trực tiếp**. QR xác thực blockchain trong tài liệu gốc được thiết kế cho:
- Hệ thống HR: nhân viên có thẻ QR blockchain → quét để đăng nhập / chấm công
- Mỗi QR code là một NFT trên blockchain, có hash, có trạng thái active/revoked

Trong hệ thống **Web3-GiangVien** (quản lý đồ án), QR xác thực **không cần thiết** vì:
- Đăng nhập đã dùng **MetaMask wallet signature** (challenge-response)
- Không có chấm công
- Không có thanh toán lương

**Tuy nhiên**, nếu bạn muốn thêm QR để:
- Sinh viên quét QR để xác thực khi nộp bài
- Giảng viên quét QR để xác thực khi chấm điểm
- ...thì có thể tùy chỉnh lại

### 1.4. Muốn bật lại QR cần làm gì?

```
1. Backend: Tạo model QrAuthentication (MongoDB schema)
2. Backend: Tạo controller qrController.js với các hàm:
   - generateQrCode (tạo QR mới, mint NFT trên blockchain)
   - validateQr (xác thực QR, gọi verifyQRToken trên contract)
   - getQrByUser (lấy QR của user)
3. Backend: Đăng ký route /api/qr/* trong server.js
4. Frontend: Cài thư viện quét QR thật (ví dụ: react-qr-reader hoặc html5-qrcode)
5. Frontend: Thay QrScanner.js stub bằng component quét camera thật
6. Deploy: Deploy contract QRAuthentication lên Sepolia
```

---

## 2. Phần Smart Contract — Remix IDE vs Hardhat

### 2.1. Tài liệu gốc dùng Remix IDE

Theo hình ảnh bạn gửi, tài liệu gốc sử dụng:
- **Remix IDE** (remix.ethereum.org) — IDE trực tuyến trên trình duyệt
- 2 contract: `TestUSDT.sol` (token ERC20) và `HRPayroll.sol` (hợp đồng trả lương)
- Deploy thủ công bằng "Injected Provider - MetaMask"
- Mạng: Sepolia Testnet

### 2.2. Codebase hiện tại dùng Hardhat

Hệ thống Web3-GiangVien hiện tại sử dụng:
- **Hardhat** — framework phát triển smart contract chuyên nghiệp
- Contract: `ThesisManagement.sol` (quản lý đồ án, hoàn toàn khác với HRPayroll)
- Deploy bằng script tự động ([deploy.js](file:///c:/Users/Lenovo/Downloads/FileTaiLieuHK8/DoAnKySu/Web3-GiangVien/backend/scripts/deploy.js))
- Đã compile và deploy thành công lên Sepolia: `0x571cDa9353107de84E58D313022d02bF2efAc5E5`

### 2.3. So sánh hai cách tiếp cận

| Tiêu chí | Remix IDE (Tài liệu gốc) | Hardhat (Hiện tại) |
|:---|:---|:---|
| **Loại** | Browser IDE (thủ công) | Framework CLI (chuyên nghiệp) |
| **Phù hợp cho** | Demo, học tập, prototype | Production, dự án thực tế |
| **Compile** | Click nút trên trình duyệt | `npx hardhat compile` (tự động) |
| **Deploy** | Thủ công qua MetaMask popup | Script tự động, lặp lại được |
| **Testing** | Không có / rất hạn chế | Unit test đầy đủ với Mocha/Chai |
| **ABI generation** | Copy thủ công | Tự động tạo trong `artifacts/` |
| **Version control** | Không | Git-friendly |
| **CI/CD** | Không | Có thể tích hợp |

> [!TIP]
> **Dùng Hardhat là ĐÚNG và CHUẨN hơn Remix IDE** cho dự án thực tế. Remix IDE chỉ phù hợp để demo nhanh hoặc học Solidity. Cách tiếp cận hiện tại của chúng ta hoàn toàn chính xác.

### 2.4. Smart contract hiện tại có chuẩn không?

#### ✅ Những gì đã đúng:
1. **ThesisManagement.sol** — Logic rõ ràng: registerTopic, submitReport, finalizeGrade, getSubmissionHistory
2. **Hardhat config** — Solidity 0.8.19, optimizer enabled, Sepolia network configured
3. **thesisContractService.js** — Backend tích hợp đúng cách với ethers.js v6, đọc ABI từ artifacts
4. **Deploy thành công** — Contract đã verified trên Sepolia

#### ⚠️ Những gì cần lưu ý:
1. **Không có access control** — Bất kỳ ai cũng có thể gọi `registerTopic`, `submitReport`, `finalizeGrade`. Nên thêm `onlyOwner` hoặc role-based access
2. **Không có OpenZeppelin** — Contract viết tay, không dùng các thư viện chuẩn (AccessControl, Ownable...)
3. **String-based mapping** — Dùng `string` làm key cho mapping (tốn gas), nên cân nhắc dùng `bytes32` hoặc `uint256`

### 2.5. Có cần thay đổi gì không?

> [!NOTE]
> **Không cần thay đổi gì lớn ở thời điểm hiện tại**. Smart contract đã deploy thành công, backend tích hợp đúng, flow hoạt động. Những cải tiến (access control, gas optimization) có thể làm ở phase sau khi cần deploy lại contract mới.

---

## Tóm tắt

| Câu hỏi | Trả lời |
|:---|:---|
| QR dùng ở đâu? | Chỉ ở **đăng nhập** và **chấm công** (KHÔNG dùng cho thanh toán) |
| QR có cần cho hệ thống Giảng Viên? | **Không bắt buộc** — đã có MetaMask login |
| Muốn bật QR cần gì? | Tạo backend route + controller + deploy QRAuthentication contract |
| Smart contract có chuẩn không? | **Có** — Hardhat chuẩn hơn Remix IDE. Contract ThesisManagement đã deploy OK |
| Cần thay đổi smart contract? | **Không cần** ở giai đoạn hiện tại |
