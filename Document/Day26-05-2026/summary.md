# Tóm Tắt Tổng Hợp — Công Cụ & Dịch Vụ Trong Dự Án Web3-GiangVien

> Tài liệu tổng hợp toàn bộ vấn đề, lưu ý, ưu nhược điểm xoay quanh 4 trụ cột công nghệ mà dự án sử dụng: **AI (SBERT + PhoBERT)**, **Hardhat (Smart Contract)**, **Blockchain Sepolia**, và **IPFS Pinata**.

---

## 1. AI — SBERT & PhoBERT

### 1.1 SBERT (`paraphrase-multilingual-MiniLM-L12-v2`)

**Vai trò:** Gợi ý đề tài phù hợp cho sinh viên dựa trên kỹ năng + GPA.

| Mục | Chi tiết |
|---|---|
| Kích thước model | ~470 MB |
| Ngôn ngữ | 50+ ngôn ngữ (có tiếng Việt) |
| Framework | `sentence-transformers` 3.1.1 (Python) |
| Chạy ở đâu | Local trên máy chủ (FastAPI port 8001) |
| Tốc độ | 200–500ms/request (CPU) |

**Ưu điểm:**
- ✅ Hỗ trợ đa ngôn ngữ — hiểu tiếng Việt mà **không cần fine-tune**
- ✅ Chạy hoàn toàn local → dữ liệu SV không rò rỉ ra bên ngoài
- ✅ Không tốn phí API (không gọi OpenAI, Google, Claude...)
- ✅ Công thức `60% semantic + 40% GPA` cân bằng hợp lý giữa chuyên môn và năng lực nền tảng
- ✅ Tái sử dụng (reuse) cho cả chức năng so sánh code bài test (`/compare-code`)
- ✅ F1-Score ≈ 0.85 — mức chính xác tốt cho bài toán gợi ý

**Nhược điểm:**
- ⚠️ Kích thước 470MB, lần đầu tải về qua Internet mất thời gian
- ⚠️ Mô hình multilingual chung → độ chính xác tiếng Việt không bằng mô hình chuyên biệt (như PhoBERT)
- ⚠️ So sánh code dựa trên semantic (ý nghĩa) chứ **không chạy thử code** → không thay thế được code execution test
- ⚠️ Nếu SV chưa có điểm môn nào ≥ 7.0, AI mặc định text = "Chưa phân hóa kỹ năng" → gợi ý kém chính xác

**Lưu ý quan trọng:**
- Lần đầu khởi động server ML, model tự động tải từ Hugging Face Hub về cache ổ cứng. Các lần sau dùng từ cache
- Threshold hiển thị tag "Gợi ý" ở frontend là `match_score > 0.3`

---

### 1.2 PhoBERT (`vinai/phobert-base`)

**Vai trò:** Chấm điểm báo cáo PDF + phân tích theo tiêu chí Rubrics.

| Mục | Chi tiết |
|---|---|
| Kích thước model | ~540 MB |
| Ngôn ngữ | **Chuyên biệt tiếng Việt** (VinAI phát triển) |
| Tokenizer | BPE cho tiếng Việt + Underthesea word segmentation |
| Max tokens | 256 tokens (~200-250 từ tiếng Việt ≈ nửa trang A4) |
| Framework | `transformers` 4.45.2 (PyTorch) |
| Tốc độ | 300ms–3s/request (CPU), phụ thuộc độ dài text |

**Ưu điểm:**
- ✅ Mô hình **chuyên biệt tiếng Việt** → hiểu ngữ cảnh tiếng Việt tốt hơn SBERT
- ✅ Hệ thống **Chunking** đã giải quyết giới hạn 256 tokens: tự chia PDF theo heading (Chương/Mục) → phân tích từng chunk → tổng hợp
- ✅ Ngưỡng semantic matching = 0.45 phù hợp: nhận diện được paraphrase (SV diễn đạt khác nhưng cùng ý)
- ✅ Công thức chấm minh bạch: Base (độ dài) + Bonus (chất lượng) = Final Score
- ✅ Trả feedback có ý nghĩa (không chỉ trả điểm số)
- ✅ Chạy local, bảo mật nội dung báo cáo

**Nhược điểm:**
- ⚠️ Giới hạn 256 tokens/lần → cần chunking, tăng thời gian xử lý
- ⚠️ Điểm base tính theo chiều dài → bài spam 10000 chữ rác vẫn được 8.0/10 (trần base)
- ⚠️ Cần Underthesea cho word segmentation → thêm dependency, thỉnh thoảng lỗi với văn bản đặc biệt
- ⚠️ Không nhận diện được đạo văn (plagiarism detection)
- ⚠️ Chạy trên CPU chậm hơn GPU 3-5 lần

**Lưu ý quan trọng:**
- Bài spam được 8.0 nhưng feedback sẽ cảnh báo "Thiếu kiến thức cốt lõi" → **giảng viên là người quyết định điểm cuối cùng**, AI chỉ tham khảo
- Muốn 9.0–10.0 **bắt buộc** nội dung phải khớp yêu cầu chuyên môn (bonus +2.0)
- PDF 50–100 trang vẫn phân tích bình thường nhờ chunking
- Rubrics analysis (`analyze_with_rubrics`) dẫn chiếu chunk cụ thể cho mỗi tiêu chí → GV biết AI dựa vào đoạn nào để chấm

---

### 1.3 Tổng hợp đánh giá AI

| Chỉ số | SBERT (Gợi ý đề tài) | PhoBERT (Chấm báo cáo) | SBERT (So sánh code) |
|---|---|---|---|
| Accuracy | ~85–90% | ~80–85% | ~70–75% |
| F1-Score | ~0.85 | ~0.78 | N/A |
| Tốc độ (CPU) | 200–500ms | 300ms–3s | 100–300ms |
| Chi phí | $0 | $0 | $0 |
| Phụ thuộc API ngoài | Không | Không | Không |

---

## 2. Hardhat — Công Cụ Phát Triển Smart Contract

### 2.1 Hardhat là gì và vai trò trong dự án?

**Hardhat** là framework phát triển smart contract hàng đầu cho Ethereum. Trong dự án, Hardhat đảm nhiệm toàn bộ vòng đời của smart contract: **viết code Solidity → biên dịch → deploy lên mạng → verify**.

| Mục | Chi tiết |
|---|---|
| Phiên bản | `hardhat` 2.28.6 |
| Plugin | `@nomicfoundation/hardhat-toolbox` 5.0.0 |
| File config | `backend/hardhat.config.js` |
| Ngôn ngữ contract | Solidity 0.8.19 |
| Contract chính | `ThesisManagementV2.sol` (168 dòng) |
| Vị trí contracts | `backend/contracts/` |
| Vị trí scripts | `backend/scripts/` |
| ABI output | `backend/artifacts/contracts/.../*.json` |

### 2.2 Cấu hình Hardhat trong dự án

```javascript
// backend/hardhat.config.js
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,    // ✅ Bật tối ưu gas
        runs: 200,        // Tối ưu cho 200 lần gọi hàm
        details: { yul: true }  // ✅ Bật Yul optimizer nâng cao
      },
      viaIR: true,        // ✅ Dùng IR pipeline (tối ưu hơn)
    },
  },
  networks: {
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,       // Infura RPC
      accounts: [process.env.PRIVATE_KEY]      // Ví deploy
    }
  },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY }  // Verify contract
};
```

### 2.3 Quy trình sử dụng Hardhat

| Bước | Lệnh | Mô tả |
|---|---|---|
| 1. Biên dịch | `npx hardhat compile` | Compile `.sol` → ABI JSON (`backend/artifacts/`) |
| 2. Test local | `npx hardhat node` | Chạy blockchain giả trên máy (localhost:8545) |
| 3. Deploy localhost | `npx hardhat run scripts/deploy-thesis-v2.js --network localhost` | Deploy lên mạng giả để test |
| 4. Deploy Sepolia | `npx hardhat run scripts/deploy-thesis-v2.js --network sepolia` | Deploy lên testnet thật |
| 5. Verify | `npx hardhat verify --network sepolia <address>` | Xác minh source code trên Etherscan |

**Script deploy (`deploy-thesis-v2.js`) làm gì:**
1. Lấy deployer wallet từ `PRIVATE_KEY` trong `.env`
2. Kiểm tra số dư ETH của deployer
3. Compile + deploy contract `ThesisManagementV2`
4. In ra địa chỉ contract mới → cập nhật vào `.env` (`THESIS_CONTRACT_ADDRESS`)

### 2.4 Tối ưu mà Hardhat đã thực hiện

| Tối ưu | Giải thích | Hiệu quả |
|---|---|---|
| **Optimizer enabled** | Solidity compiler tối ưu bytecode | Giảm gas 10-20% |
| **runs = 200** | Tối ưu cho 200 lần gọi hàm (cân bằng deploy cost vs runtime cost) | Phù hợp dự án giáo dục |
| **Yul optimizer** | Sử dụng Yul intermediate language cho tối ưu sâu hơn | Giảm thêm 5-10% gas |
| **viaIR = true** | Dùng Intermediate Representation pipeline mới | Bytecode nhỏ hơn, gas ít hơn |
| **bytes32 keys (V2)** | Contract V2 dùng `keccak256` hash thay string | Tiết kiệm 30-50% gas so với V1 |

### 2.5 So sánh V1 vs V2

| Tiêu chí | V1 (`ThesisManagement.sol`) | V2 (`ThesisManagementV2.sol`) |
|---|---|---|
| Mapping key | `string` (tốn gas) | `bytes32` (tiết kiệm gas) |
| Access control | Không có (ai cũng gọi được) | `onlyOwner` (chỉ GV deploy mới gọi được) |
| Hàm | 5 hàm | 8 hàm (thêm `submitTestResult`, `getTestResults`, `getTestResultCount`) |
| Gas `registerTopic` | ~280,000 | ~180,000 (**-36%**) |
| Gas `submitReport` | ~200,000 | ~120,000 (**-40%**) |
| Gas `finalizeGrade` | ~160,000 | ~95,000 (**-41%**) |
| Bảo mật | Thấp | Cao (onlyOwner) |

### 2.6 Ưu nhược điểm Hardhat

**Ưu điểm:**
- ✅ Biên dịch nhanh, output ABI tự động vào `artifacts/` → backend đọc trực tiếp
- ✅ Hỗ trợ nhiều network (localhost test, Sepolia production) qua config
- ✅ Optimizer + Yul + viaIR giảm gas đáng kể
- ✅ Verify contract trên Etherscan bằng 1 lệnh
- ✅ Plugin `hardhat-toolbox` tích hợp sẵn ethers.js, testing, coverage
- ✅ Hỗ trợ `hardhat node` chạy blockchain giả → test nhanh không cần faucet

**Nhược điểm:**
- ⚠️ Dự án **chưa viết unit test cho smart contract** (`hardhat test` chưa có test file)
- ⚠️ Không có file `test/` trong project → chưa test edge cases (ví dụ: gọi `finalizeGrade` 2 lần cùng submission)
- ⚠️ Phiên bản Solidity 0.8.19 không phải mới nhất (mới nhất 0.8.28+)
- ⚠️ Config `etherscan.apiKey` chưa set trong `.env` → chưa verify contract trên Etherscan
- ⚠️ `runs = 200` chỉ tối ưu cho 200 lần gọi, nếu dùng lâu dài (>1000 lần gọi) nên tăng lên

**Lưu ý quan trọng:**
- ABI file nằm ở `backend/artifacts/contracts/ThesisManagementV2.sol/ThesisManagementV2.json` — backend service (`thesisContractService.js`) tự động đọc file này
- Nếu sửa contract → **phải chạy lại `npx hardhat compile`** trước khi backend đọc ABI mới
- Deploy lên Sepolia cần có SepoliaETH trong ví (lấy miễn phí từ faucet)
- Contract V2 đã deploy tại địa chỉ: `0x85AA2D7Dc5EC09bbe297a908b0551C8a5b305d9B`

---

## 3. Blockchain Sepolia Testnet

### 3.1 Thông tin mạng

| Mục | Chi tiết |
|---|---|
| Tên mạng | Ethereum Sepolia Testnet |
| Chain ID | 11155111 |
| Consensus | Proof of Stake (PoS) |
| Block time | ~12 giây |
| RPC Provider | Infura (`sepolia.infura.io/v3/...`) |
| Gas token | SepoliaETH (miễn phí từ faucet) |
| Contract address | `0x85AA2D7Dc5EC09bbe297a908b0551C8a5b305d9B` |
| Tương tác | Ethers.js v6.8.0 (backend Node.js) |

### 3.2 Ưu nhược điểm

**Ưu điểm:**
- ✅ **Hoàn toàn miễn phí** — ETH test lấy từ faucet, $0 cho mọi giao dịch
- ✅ Hoạt động **giống hệt Mainnet** — cùng EVM, cùng Solidity, cùng cách tương tác
- ✅ Dữ liệu **bất biến** — điểm số và CID file một khi ghi lên chain không ai sửa/xóa được
- ✅ Events log (`TopicRegistered`, `ReportSubmitted`, `GradeFinalized`) → audit trail minh bạch
- ✅ Phù hợp **dự án giáo dục** — mục tiêu là minh bạch, không phải giao dịch tài chính
- ✅ Có thể verify contract trên Sepolia Etherscan (etherscan.io)

**Nhược điểm:**
- ⚠️ ETH trên Sepolia **không có giá trị kinh tế thực** — không mua bán được
- ⚠️ Block time ~12s → mỗi giao dịch mất 12-36s để xác nhận (chậm hơn Web2)
- ⚠️ Faucet đôi khi bị giới hạn (mỗi 24h mới lấy được 1 lần)
- ⚠️ Nếu Sepolia testnet bị deprecated trong tương lai → phải migrate sang testnet mới
- ⚠️ Throughput blockchain thấp (~3-5 tx/phút) so với API thông thường (~200 req/s)
- ⚠️ Nếu chuyển sang Mainnet → chi phí tăng đáng kể (~$0.19–$0.36/giao dịch)

**Lưu ý quan trọng:**
- Backend sử dụng kiến trúc **Hybrid**: đăng ký linh hoạt trên MongoDB (miễn phí, nhanh) → chỉ ghi blockchain ở bước cuối cùng (chốt điểm, nộp báo cáo) → tiết kiệm gas tối đa
- Hàm `finalizeGrade` có auto-register topic + auto-submit report nếu chưa có on-chain → không bị lỗi khi GV chốt điểm
- Private key ví deploy lưu trong `.env` — **KHÔNG ĐƯỢC commit lên git**

---

## 4. IPFS Pinata — Lưu Trữ File Phi Tập Trung

### 4.1 Thông tin dịch vụ

| Mục | Chi tiết |
|---|---|
| Provider | Pinata Cloud |
| SDK | `pinata-web3` v0.5.4 (Node.js) |
| Gateway | `scarlet-high-stingray-706.mypinata.cloud` |
| Plan hiện tại | **Free** (1GB storage, 50GB bandwidth) |
| Replication | 2 vùng (FRA1 Frankfurt + NYC1 New York) |
| File type | PDF báo cáo (tối đa 50MB/file) |

### 4.2 Ưu nhược điểm

**Ưu điểm:**
- ✅ File **bất biến** — CID (Content Identifier) = hash của nội dung file, sửa 1 byte → CID khác hoàn toàn
- ✅ CID lưu on-chain = **bằng chứng file gốc** không thể giả mạo
- ✅ Phi tập trung — file được replicate ở nhiều vùng địa lý
- ✅ Free plan **đủ dùng** cho quy mô ≤ 200 SV (tổng ~400MB)
- ✅ SDK đơn giản: `pinata.upload.file(fileObject)` → nhận `IpfsHash` (CID)
- ✅ Backend tự động xóa file tạm sau khi upload thành công (giải phóng ổ cứng)

**Nhược điểm:**
- ⚠️ **Phụ thuộc dịch vụ bên thứ 3** — nếu Pinata đóng cửa hoặc hết hạn → file mất truy cập
- ⚠️ Free plan giới hạn **1GB storage + 50GB bandwidth/tháng**
- ⚠️ Tốc độ download qua gateway **chậm hơn CDN** thông thường
- ⚠️ Cần Internet để upload — không hoạt động offline
- ⚠️ JWT token Pinata lưu trong `.env` — nếu lộ, người khác có thể upload file rác vào tài khoản
- ⚠️ IPFS không hỗ trợ xóa file (đã upload = tồn tại vĩnh viễn trên mạng IPFS, chỉ có thể "unpin" trên Pinata)

**Lưu ý quan trọng:**
- "Pin" nghĩa là giữ file luôn sẵn sàng truy cập. Nếu "unpin" → file vẫn tồn tại trên IPFS nhưng có thể bị garbage collect sau một thời gian
- Nên **backup file quan trọng** ở nơi khác ngoài Pinata (ví dụ: local storage, cloud backup)
- Khi quy mô > 500 SV → nâng lên plan Picnic ($20/tháng, 25GB)

---

## 5. Đánh Giá Tổng Hợp

### 5.1 Bảng đánh giá toàn diện

| Công cụ/Dịch vụ | Điểm (1-5) | Ưu điểm nổi bật | Hạn chế chính | Chi phí |
|---|---|---|---|---|
| **SBERT** | ⭐⭐⭐⭐ (4/5) | Đa ngôn ngữ, F1~0.85, chạy local | Code compare chỉ semantic | $0 |
| **PhoBERT** | ⭐⭐⭐⭐ (4/5) | Chuyên biệt tiếng Việt, chunking | Bài spam được 8.0 base | $0 |
| **Hardhat** | ⭐⭐⭐⭐ (4/5) | Optimizer mạnh, deploy dễ | Chưa có unit test | $0 |
| **Sepolia** | ⭐⭐⭐⭐⭐ (5/5) | Miễn phí, bất biến, giống Mainnet | Không có giá trị kinh tế | $0 |
| **Pinata/IPFS** | ⭐⭐⭐⭐ (4/5) | File bất biến, CID on-chain | Phụ thuộc dịch vụ bên thứ 3 | $0 |

**Điểm tổng: 21/25 — Mức đánh giá: TỐT**

### 5.2 Nhận xét tổng quan

**Kiến trúc Hybrid (MongoDB + Blockchain) là quyết định thiết kế đúng đắn nhất của dự án.** Thay vì ghi mọi thứ lên blockchain (tốn gas, chậm), hệ thống chỉ ghi dữ liệu quan trọng nhất (điểm cuối cùng, file báo cáo, kết quả test) lên Sepolia → tiết kiệm chi phí triệt để.

**AI chạy local là lợi thế bảo mật lớn.** Dữ liệu sinh viên (điểm số, kỹ năng, nội dung báo cáo) không bao giờ rời khỏi server → tuân thủ bảo mật thông tin giáo dục. So với việc gọi API OpenAI/Claude (dữ liệu gửi ra ngoài), giải pháp này an toàn hơn nhiều.

**Hardhat + Solidity optimizer đã tối ưu gas tốt**, đặc biệt V2 tiết kiệm 30-50% so với V1 nhờ bytes32 keys. Tuy nhiên, thiếu unit test cho smart contract là điểm cần cải thiện.

### 5.3 Tổng chi phí vận hành

| Thành phần | Chi phí/tháng |
|---|---|
| AI (SBERT + PhoBERT) — local | **$0** |
| Blockchain — Sepolia Testnet | **$0** |
| IPFS — Pinata Free | **$0** |
| Database — MongoDB Atlas Free | **$0** |
| Hardhat — dev tool local | **$0** |
| **TỔNG CỘNG** | **$0/tháng** |

> Với quy mô ≤ 200 sinh viên, toàn bộ hệ thống vận hành **hoàn toàn miễn phí**. Khi scale lên > 500 SV, chi phí duy nhất phát sinh là Pinata Picnic ($20/tháng).

### 5.4 Khuyến nghị cải thiện (nếu phát triển tiếp)

| # | Hạng mục | Khuyến nghị | Mức ưu tiên |
|---|---|---|---|
| 1 | Hardhat Testing | Viết unit test cho `ThesisManagementV2.sol` bằng `hardhat test` | Cao |
| 2 | Etherscan Verify | Set `ETHERSCAN_API_KEY` và verify contract trên Sepolia Etherscan | Trung bình |
| 3 | PhoBERT Anti-spam | Thêm penalty cho bài có tỷ lệ nội dung lặp (repetition detection) | Trung bình |
| 4 | IPFS Backup | Backup file PDF lên cloud storage thứ 2 (S3, Google Drive) | Thấp |
| 5 | Code Execution | Bổ sung sandbox chạy code thật cho bài test lập trình chuyên sâu | Thấp |
| 6 | Layer 2 | Nếu chuyển production, dùng Polygon/Arbitrum thay Mainnet (gas rẻ hơn 100x) | Tương lai |
