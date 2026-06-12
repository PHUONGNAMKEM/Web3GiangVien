# UML Phân Tích & Thiết Kế — Web3 & AI Competition Platform (Cập nhật 11/06/2026)

> Vẽ lại đầy đủ theo hệ thống **hiện tại**: lớp học + lời mời, nhóm sinh viên, rubrics template, bài test cạnh tranh, nhật ký tiến độ, chấm điểm AI PhoBERT + nhận xét Gemini LLM, lưu IPFS + ghi blockchain, đăng nhập MetaMask/QR, vai trò Admin.
>
> Gồm 4 phần: **(1) Use Case Nghiệp Vụ**, **(2) Use Case Hệ Thống**, **(3) Sơ đồ Tuần Tự** nhiều luồng, **(4) Sơ đồ Phân Cấp Chức Năng**.

---

## 0. Tác Nhân (Actors)

| Tác nhân | Loại | Vai trò |
|----------|------|---------|
| **Sinh Viên** | Chính | Tham gia lớp, đăng ký/đấu đề tài, nộp báo cáo, ghi tiến độ, xem điểm |
| **Giảng Viên** | Chính | Quản lý môn/lớp/đề tài/rubrics, ra bài test, chấm điểm, chốt điểm on-chain |
| **Quản Trị Viên** | Chính | Duyệt yêu cầu cấp vai trò, quản lý người dùng |
| **Hệ thống AI** | Phụ | PhoBERT chấm ngữ nghĩa, SBERT gợi ý đề tài |
| **LLM Gemini** | Phụ | Sinh nhận xét tự nhiên từ kết quả chấm |
| **Blockchain Sepolia** | Phụ | Ghi bất biến điểm + CID |
| **IPFS Pinata** | Phụ | Lưu trữ phi tập trung file báo cáo |
| **Ví MetaMask** | Phụ | Định danh & ký giao dịch |

---

## 1. Use Case NGHIỆP VỤ (Business Use Case)

> Góc nhìn **mục tiêu nghiệp vụ** — hệ thống mang lại giá trị gì, không đi vào chi tiết kỹ thuật.

```mermaid
flowchart LR
    SV(("Sinh Viên"))
    GV(("Giảng Viên"))
    AD(("Quản Trị Viên"))
    BC(("Blockchain"))
    AIB(("AI / LLM"))

    subgraph BIZ ["Nền tảng Quản lý Đồ án Web3 và AI"]
        direction TB
        B1(["Tổ chức và quản lý đồ án, cuộc thi học thuật"])
        B2(["Tham gia đồ án và cạnh tranh đề tài"])
        B3(["Đánh giá nhanh, khách quan bằng AI"])
        B4(["Đảm bảo minh bạch, chống gian lận điểm"])
        B5(["Theo dõi tiến độ học tập định kỳ"])
        B6(["Quản trị người dùng và phân quyền"])
    end

    GV --- B1
    GV --- B3
    GV --- B5
    SV --- B2
    SV --- B5
    SV --- B3
    GV --- B4
    SV --- B4
    AD --- B6

    B4 -.->|đảm bảo bởi| BC
    B3 -.->|hỗ trợ bởi| AIB
```

**Diễn giải nghiệp vụ:**
- **B1 — Tổ chức đồ án:** GV mở môn học, lớp học, đăng đề tài kèm tiêu chí chấm (rubrics) và tùy chọn bài test sàng lọc.
- **B2 — Tham gia & cạnh tranh:** SV vào lớp, lập nhóm, được AI gợi ý đề tài hợp kỹ năng, đăng ký; nếu đề tài "hot" thì thi test cạnh tranh để giành suất.
- **B3 — Đánh giá bằng AI:** AI đọc trước báo cáo, cho điểm sơ bộ + nhận xét, giúp GV tiết kiệm thời gian.
- **B4 — Minh bạch:** Điểm cuối + bằng chứng file ghi bất biến lên blockchain, không ai sửa được.
- **B5 — Theo dõi tiến độ:** SV ghi nhật ký tuần kèm minh chứng; GV nhận xét/đánh giá.
- **B6 — Quản trị:** Admin duyệt ai được làm GV/SV.

---

## 2. Use Case HỆ THỐNG (System Use Case)

> Góc nhìn **chức năng hệ thống** — từng thao tác người dùng tương tác với hệ thống, kèm quan hệ include/extend và tác nhân phụ.

```mermaid
flowchart LR
    SV(("Sinh Viên"))
    GV(("Giảng Viên"))
    AD(("Admin"))
    AI[["AI Service<br/>PhoBERT - SBERT"]]
    LLM[["Gemini LLM"]]
    IPFS[("IPFS Pinata")]
    BC[("Blockchain")]

    subgraph SYS ["HỆ THỐNG"]
        direction TB

        UA(["Đăng nhập ví MetaMask"])
        UAQ(["Đăng nhập bằng QR"])
        UAR(["Yêu cầu cấp vai trò"])

        UD1(["Duyệt hoặc Từ chối yêu cầu vai trò"])

        UG1(["Quản lý Môn học"])
        UG2(["Quản lý Lớp học"])
        UG2b(["Mời sinh viên vào lớp"])
        UG3(["Quản lý Đề tài"])
        UG4(["Quản lý Rubrics"])
        UG5(["Tạo Bài test cạnh tranh"])

        US1(["Chấp nhận lời mời vào lớp"])
        US2(["Quản lý Nhóm: tạo, mời, chốt"])
        US3(["Xem gợi ý đề tài - AI Matching"])
        US4(["Đăng ký Đề tài"])
        US5(["Làm Bài test cạnh tranh"])
        US6(["Nộp Báo cáo PDF"])
        US7(["Ghi Nhật ký tiến độ"])
        US8(["Xem Kết quả và Điểm"])

        UG6(["Duyệt và Chấm điểm báo cáo"])
        UC1(["Phân tích AI - chấm sơ bộ"])
        UC2(["Sinh nhận xét bằng LLM"])
        UC3(["Đánh giá tiến độ tuần"])
        UG7(["So sánh điểm AI và GV"])
        UG8(["Chốt điểm và Ghi On-chain"])
        UG9(["Đối chiếu dữ liệu Blockchain"])

        UI1(["Lưu file lên IPFS"])
        UI2(["Trích xuất và chunk PDF"])
    end

    SV --- UA
    GV --- UA
    SV --- UAQ
    GV --- UAQ
    SV --- UAR
    GV --- UAR
    AD --- UD1

    GV --- UG1
    GV --- UG2
    UG2 -.->|include| UG2b
    GV --- UG3
    GV --- UG4
    GV --- UG5

    SV --- US1
    SV --- US2
    SV --- US3
    SV --- US4
    SV --- US5
    SV --- US6
    SV --- US7
    SV --- US8

    US3 -.->|include| AI
    US6 -.->|include| UI1
    US6 -.->|include| UI2
    UI1 --- IPFS

    GV --- UG6
    UG6 -.->|include| UC1
    UC1 --- AI
    UC1 -.->|extend| UC2
    UC2 --- LLM
    GV --- UC3
    GV --- UG7
    GV --- UG8
    UG8 -.->|include| UG6
    UG8 --- BC
    GV --- UG9
    UG9 --- BC
```

**Ghi chú quan hệ:**
- `US6 include UI1, UI2`: Nộp báo cáo luôn kéo theo lưu IPFS + trích xuất/chunk PDF.
- `UG6 include UC1`: Mỗi lần mở chấm điểm đều gọi AI phân tích sơ bộ (có cache để không gọi lại).
- `UC1 extend UC2`: Nhận xét LLM là **tùy chọn** (GV bật toggle Gemini).
- `UG8 include UG6`: Chốt điểm bao gồm bước chấm; sau đó ghi blockchain.

---

## 3. Sơ Đồ TUẦN TỰ (Sequence Diagrams)

### 3.1. Đăng nhập bằng ví MetaMask
```mermaid
sequenceDiagram
    actor U as Người dùng
    participant FE as Web App (React)
    participant MM as MetaMask
    participant BE as Backend (Node.js)
    participant DB as MongoDB

    U->>FE: Bấm "Kết nối ví"
    FE->>MM: Yêu cầu kết nối và ký nonce
    MM-->>FE: Chữ ký (signature)
    FE->>BE: Gửi address và signature
    BE->>BE: Xác minh chữ ký
    BE->>DB: Tìm user theo WalletAddress
    alt Chưa có vai trò
        BE-->>FE: Yêu cầu chọn vai trò / chờ duyệt
    else Đã có vai trò
        BE-->>FE: Cấp JWT và thông tin user
        FE-->>U: Vào Dashboard theo vai trò
    end
```

### 3.2. SV được AI gợi ý và đăng ký đề tài (kèm ghép nhóm)
```mermaid
sequenceDiagram
    actor SV as Sinh Viên
    participant FE as Web App
    participant BE as Backend
    participant ML as AI Service (SBERT)
    participant DB as MongoDB

    SV->>FE: Mở "Đăng Ký Đề Tài"
    FE->>BE: Lấy hồ sơ SV và danh sách đề tài
    BE->>ML: Gửi kỹ năng SV và yêu cầu đề tài
    ML->>ML: Cosine similarity (matching)
    ML-->>BE: Phần trăm phù hợp từng đề tài
    BE-->>FE: Danh sách đề tài xếp hạng AI Gợi ý
    Note over SV,FE: SV phải có Nhóm đã CHỐT
    SV->>FE: Bấm "Đăng ký" đề tài
    FE->>BE: registerTopic(deTai, nhom)
    alt Đề tài có bài test
        BE-->>FE: Trạng thái ChoTest, chuyển làm test
    else Không có test
        BE->>DB: Lưu DangKyDeTai (ChoDuyet)
        BE-->>FE: Chờ GV duyệt
    end
```

### 3.3. Bài test cạnh tranh (Entrance Test)
```mermaid
sequenceDiagram
    actor SV as Trưởng nhóm
    participant FE as Web App
    participant BE as Backend
    participant DB as MongoDB
    actor GV as Giảng Viên

    SV->>FE: Bắt đầu làm bài test
    FE->>BE: startBaiTest(test, nhom)
    BE->>DB: Cập nhật DangLamTest
    SV->>FE: Nộp đáp án
    FE->>BE: submitBaiTest(đáp án)
    BE->>BE: Tự chấm trắc nghiệm và tính thời gian
    BE->>DB: Lưu KetQuaTest
    BE-->>FE: Hiển thị kết quả
    GV->>FE: Xem bảng kết quả các nhóm
    GV->>FE: Chọn nhóm thắng
    FE->>BE: selectTestWinner(dangKy)
    BE->>DB: Nhóm thắng DaDuyet, còn lại Thua
    BE-->>SV: Thông báo realtime kết quả
```

### 3.4. Nộp báo cáo (PDF lên IPFS và trích xuất)
```mermaid
sequenceDiagram
    actor SV as Sinh Viên (Trưởng nhóm)
    participant FE as Web App
    participant BE as Backend
    participant IPFS as Pinata (IPFS)
    participant ML as AI Service
    participant DB as MongoDB

    SV->>FE: Tải lên file báo cáo PDF
    FE->>BE: upload (multipart)
    BE->>IPFS: Pin file và nhận CID
    IPFS-->>BE: IPFS_CID
    BE->>ML: extract-pdf (đọc text mọi trang, OCR nếu cần)
    ML-->>BE: text, số trang, cảnh báo
    BE->>DB: Lưu BaoCao (CID, ExtractedText, PageCount)
    BE-->>FE: Nộp thành công, hiển thị CID
    Note over BE: Bắn thông báo realtime cho GV
```

### 3.5. GV chấm điểm với AI, nhận xét Gemini và ghi blockchain
```mermaid
sequenceDiagram
    actor GV as Giảng Viên
    participant FE as Web App
    participant BE as Backend
    participant ML as AI Service (PhoBERT)
    participant LLM as Gemini
    participant MM as MetaMask
    participant SC as Blockchain
    participant DB as MongoDB

    GV->>FE: Mở bài nộp để chấm
    FE->>BE: Lấy ExtractedText và AICache
    alt Có cache hợp lệ
        BE-->>FE: Trả kết quả AI đã lưu, không gọi lại
    else Chưa có cache
        FE->>ML: analyze-with-rubrics (job_id)
        Note over ML: Chunk, embed sliding window,<br/>tính điểm và nhận xét theo tiêu chí
        ML-->>FE: Điểm AI và rubrics_result
        FE->>BE: saveAiCache (lưu bền)
    end
    opt GV bật toggle "Nhận xét AI Gemini"
        FE->>BE: /ai/llm-feedback
        BE->>LLM: Diễn giải điểm thành nhận xét tự nhiên
        LLM-->>BE: Nhận xét
        BE-->>FE: Hiển thị nhận xét Gemini
    end
    GV->>FE: Điều chỉnh điểm và chốt
    FE->>MM: Ký giao dịch
    MM-->>FE: Chữ ký
    FE->>BE: chamDiem(payload)
    BE->>DB: Lưu DiemSo kèm AI_LLM_Feedback
    BE->>SC: Ghi CID, điểm, DID
    SC-->>BE: TxHash
    BE-->>FE: Hoàn tất, đã ghi on-chain
    Note over BE: Bắn thông báo realtime cho SV
```

### 3.6. Ghi và đánh giá nhật ký tiến độ tuần
```mermaid
sequenceDiagram
    actor SV as Sinh Viên
    participant FE as Web App
    participant BE as Backend
    participant DB as MongoDB
    actor GV as Giảng Viên

    SV->>FE: Tạo nhật ký tuần (mục tiêu, đã làm, minh chứng)
    FE->>BE: createProgressEntry
    BE->>BE: Kiểm tra cảnh báo (thiếu minh chứng, nội dung ngắn)
    BE->>DB: Lưu TienDo
    BE-->>GV: Thông báo realtime "tiến độ mới"
    GV->>FE: Mở xem tiến độ
    opt GV muốn AI gợi ý điểm tuần
        FE->>BE: /tiendo/:id/ai-suggest
        BE-->>FE: Điểm tham khảo (PhoBERT)
    end
    GV->>FE: Nhận xét và đánh giá tuần
    FE->>BE: evaluateProgress
    BE->>DB: Lưu đánh giá
```

### 3.7. Admin duyệt yêu cầu cấp vai trò
```mermaid
sequenceDiagram
    actor U as Người dùng mới
    participant FE as Web App
    participant BE as Backend
    participant DB as MongoDB
    actor AD as Admin

    U->>FE: Chọn vai trò SV/GV và gửi yêu cầu
    FE->>BE: Tạo RoleRequest
    BE->>DB: Lưu (ChoDuyet)
    BE-->>AD: Thông báo realtime "yêu cầu mới"
    AD->>FE: Xem danh sách yêu cầu
    AD->>FE: Duyệt hoặc Từ chối
    FE->>BE: Cập nhật trạng thái
    BE->>DB: Gán vai trò cho user nếu duyệt
    BE-->>U: Có thể đăng nhập với vai trò mới
```

---

## 4. Sơ Đồ PHÂN CẤP CHỨC NĂNG (Functional Hierarchy)

```mermaid
flowchart TD
    ROOT["HỆ THỐNG WEB3 và AI COMPETITION PLATFORM"]

    ROOT --- M0["0. Xác thực và Phân quyền"]
    ROOT --- M1["1. Quản lý Đào tạo - GV"]
    ROOT --- M2["2. Tham gia và Nộp bài - SV"]
    ROOT --- M3["3. Đánh giá và Chấm điểm"]
    ROOT --- M4["4. Web3 và Minh bạch"]
    ROOT --- M5["5. Quản trị hệ thống"]

    M0 --- M01["0.1 Đăng nhập ví MetaMask"]
    M0 --- M02["0.2 Đăng nhập QR"]
    M0 --- M03["0.3 Yêu cầu và cấp vai trò"]

    M1 --- M11["1.1 Quản lý Môn học"]
    M1 --- M12["1.2 Quản lý Lớp học"]
    M1 --- M13["1.3 Mời sinh viên vào lớp"]
    M1 --- M14["1.4 Quản lý Đề tài"]
    M1 --- M15["1.5 Quản lý Rubrics"]
    M1 --- M16["1.6 Tạo Bài test cạnh tranh"]

    M2 --- M21["2.1 Tham gia lớp - nhận lời mời"]
    M2 --- M22["2.2 Quản lý Nhóm"]
    M2 --- M23["2.3 AI Gợi ý đề tài - Matching"]
    M2 --- M24["2.4 Đăng ký Đề tài"]
    M2 --- M25["2.5 Làm Bài test cạnh tranh"]
    M2 --- M26["2.6 Nộp Báo cáo PDF"]
    M2 --- M27["2.7 Nhật ký Tiến độ"]
    M2 --- M28["2.8 Xem Kết quả và Điểm"]

    M3 --- M31["3.1 Trích xuất và Chunk PDF"]
    M3 --- M32["3.2 Chấm AI PhoBERT - rubrics hoặc không"]
    M3 --- M33["3.3 Nhận xét LLM - Gemini"]
    M3 --- M34["3.4 Chấm điểm thủ công GV"]
    M3 --- M35["3.5 So sánh điểm AI và GV"]
    M3 --- M36["3.6 Đánh giá tiến độ tuần"]
    M3 --- M37["3.7 Cache kết quả AI"]

    M4 --- M41["4.1 Upload file lên IPFS - Pinata"]
    M4 --- M42["4.2 Ghi điểm và CID lên Smart Contract"]
    M4 --- M43["4.3 Truy xuất và đối chiếu TxHash"]
    M4 --- M44["4.4 Thẻ QR xác thực blockchain"]

    M5 --- M51["5.1 Duyệt yêu cầu vai trò"]
    M5 --- M52["5.2 Quản lý người dùng"]
    M5 --- M53["5.3 Thông báo realtime Socket"]
```

---

## 5. Ghi chú khác biệt so với bản gốc (02/06/2026)

| Hạng mục | Bản gốc | Bản này (hiện tại) |
|----------|---------|--------------------|
| Lớp học | Chưa có | Có Lớp học + cơ chế **lời mời** SV |
| Nhóm | Chưa rõ | Có **quản lý nhóm** tạo/mời/chốt |
| Bài test | Chưa có | Có **bài test cạnh tranh** giành đề tài |
| Tiến độ | Chưa có | Có **nhật ký tiến độ tuần** + minh chứng |
| Nhận xét | Chỉ AI score | Thêm **nhận xét LLM Gemini** bật/tắt |
| Hiệu năng | — | Thêm **cache kết quả AI** không chấm lại |
| Vai trò | SV/GV | Thêm **Admin** + luồng duyệt vai trò |
| Đăng nhập | MetaMask | Thêm **QR login** |
