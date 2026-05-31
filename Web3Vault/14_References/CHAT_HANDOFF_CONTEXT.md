# Handoff Context - Web3-GiangVien

Muc tieu: File nay dung de mo chat moi va tiep tuc ngay, khong mat ngu canh.

## 1) Snapshot tien do hien tai

- Giai doan 1: Don dep skeleton tu codebase HR cu (giu auth/web3/db core).
- Giai doan 2: Viet va deploy smart contract moi `ThesisManagement` len Sepolia.
- Giai doan 3: Tao backend models/controllers/services domain moi.
- Giai doan 4: Co 2 huong AI song song:
  - Huong A: Backend Node.js goi Hugging Face API (PhoBERT + SBERT).
  - Huong B: Da dung du khung `ml-service` theo dung cau truc 4.2 (FastAPI).

## 2) Ket qua da xac nhan

### 2.1 Smart contract
- File: `backend/contracts/ThesisManagement.sol`
- Compile thanh cong.
- Deploy Sepolia thanh cong.
- Contract address:
  - `THESIS_CONTRACT_ADDRESS=0x571cDa9353107de84E58D313022d02bF2efAc5E5`

### 2.2 Backend
- File route chinh: `backend/server.js`
- Route da co:
  - `/api/sinhvien`
  - `/api/giangvien`
  - `/api/detai`
  - `/api/baocao/upload`
  - `/api/diemso`
  - `/api/ai/analyze-report`
  - `/api/ai/match-student`
- Da tung chay backend thanh cong voi log:
  - `Server running on port 5000`
  - `MongoDB Connected: cluster0-shard-00-02.2sa07.mongodb.net`

### 2.3 ML service (da tao dung cau truc 4.2)
- `ml-service/app.py`
- `ml-service/requirements.txt`
- `ml-service/models/phobert_analyzer.py`
- `ml-service/models/sbert_matcher.py`
- `ml-service/routes/analyze.py`
- `ml-service/routes/match.py`
- `ml-service/utils/text_preprocessing.py`

## 3) Trang thai ky thuat quan trong

### 3.1 AI da tich hop o dau?

Huong A (Node backend):
- PhoBERT: `backend/services/aiService.js` -> model `vinai/phobert-base`
- SBERT: `backend/services/matchingService.js` -> model `sentence-transformers/all-MiniLM-L6-v2`
- Trigger qua:
  - `POST /api/ai/analyze-report`
  - `POST /api/ai/match-student`

Huong B (FastAPI ml-service):
- PhoBERT route: `POST /analyze-report`
- SBERT route: `POST /match-student`
- Health: `GET /healthz`

### 3.2 Cac phan con mock/chua production

- `backend/services/ipfsService.js`:
  - Dang tra CID mock `QmMockHash...` (chua upload that len Pinata).
- `backend/services/thesisContractService.js`:
  - Dang tra tx hash mock `0xMock...` (chua goi contract that).
- `backend/services/aiService.js`:
  - Co goi Hugging Face that, nhung `score/feedback` dang hard-code demo.
- `ml-service/models/*`:
  - La scaffold de giu API contract, scoring hien tai la heuristic.

### 3.3 Frontend dang bi blocker

- `frontend/src/App.js` dang import:
  - `./components/EmployeeDashboard`
  - `./components/AdminDashboard`
- 2 file nay khong con ton tai (da xoa khi don dep), nen frontend chua build/run duoc den khi tao dashboard moi.

## 4) Bien moi truong can co

### 4.1 backend/.env
- `MONGODB_URI=<mongodb atlas uri>`
- `JWT_SECRET=<secret>`
- `SEPOLIA_RPC_URL=<sepolia rpc>`
- `PRIVATE_KEY=<private key>`
- `THESIS_CONTRACT_ADDRESS=0x571cDa9353107de84E58D313022d02bF2efAc5E5`
- `HUGGINGFACE_API_KEY=<hf_xxx>`
- `PINATA_JWT=<pinata jwt>` (khi bat dau IPFS that)
- `PINATA_GATEWAY=<pinata gateway>` (khi bat dau IPFS that)

## 5) Lenh chay nhanh de verify

### 5.1 Backend
```bash
cd backend
npm install
npm start
```

### 5.2 Test backend health
```bash
curl http://localhost:5000/
```

### 5.3 Test AI route tren backend Node
```bash
curl -X POST http://localhost:5000/api/ai/analyze-report \
  -H "Content-Type: application/json" \
  -d '{"text":"Day la noi dung bao cao thu nghiem","topicRequirements":["NLP","Web3"]}'
```

```bash
curl -X POST http://localhost:5000/api/ai/match-student \
  -H "Content-Type: application/json" \
  -d '{"studentProfile":{"gpa":3.2},"topics":[{"_id":"1","title":"NLP cho tieng Viet","description":"Xu ly ngon ngu tu nhien"},{"_id":"2","title":"Blockchain co ban","description":"Smart contract EVM"}]}'
```

### 5.4 Chay FastAPI ml-service doc lap
```bash
cd ml-service
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001
```

## 6) Cong viec uu tien tiep theo

1. Chot kien truc AI chinh:
- Option 1: Giu AI tren backend Node goi Hugging Face.
- Option 2: Chuyen backend de goi `ml-service` (khuyen nghi cho mo rong).

2. Hoan thien frontend giai doan 5:
- Tao dashboard moi lecturer/student.
- Sua `frontend/src/App.js` theo route moi, bo import file da xoa.

3. Chuyen mock -> production:
- `thesisContractService.js` goi that qua ethers.
- `ipfsService.js` upload that len Pinata va tra CID that.
- AI scoring dung output model that (khong hard-code).

4. Them auth/phan quyen route moi:
- Gan `authenticateToken` va role lecturer/student cho route domain moi.

5. Viet bo test API (Postman collection hoac integration tests).

## 7) Prompt de mo chat moi

Copy doan nay vao chat moi:

"Toi dang lam du an Web3-GiangVien. Hay doc file CHAT_HANDOFF_CONTEXT.md va tiep tuc theo muc Cong viec uu tien tiep theo.
Trang thai hien tai:
- Smart contract ThesisManagement da deploy Sepolia: 0x571cDa9353107de84E58D313022d02bF2efAc5E5.
- Backend da co route domain moi va da ket noi MongoDB.
- Da co 2 huong AI: (A) backend Node goi Hugging Face, (B) FastAPI ml-service scaffold dung cau truc 4.2.
- Frontend dang blocker do App.js import EmployeeDashboard/AdminDashboard khong ton tai.
Yeu cau: tiep tuc hoan thien frontend giai doan 5 va chuyen cac service mock sang production." 