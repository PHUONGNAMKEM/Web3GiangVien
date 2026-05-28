# Playbook - Chay ML Service tren Windows

Muc dich: chay FastAPI ML service cho AI matching/analyze tren port `8001`.
Ap dung khi: can chay `ml-service` local de backend goi `/match-student`, `/analyze-report`, `/analyze-with-rubrics`.
Khong ap dung khi: da co ML service deploy rieng hoac Docker compose da khai bao ML service rieng.

## Boi canh da xac nhan

- Repo co tai lieu `ml-service/README.md` huong dan:
  - `pip install -r requirements.txt`
  - `uvicorn app:app --host 0.0.0.0 --port 8001 --reload`
- Backend dang goi ML service co dinh qua:
  - `http://127.0.0.1:8001/analyze-report`
  - `http://127.0.0.1:8001/analyze-with-rubrics`
  - `http://127.0.0.1:8001/match-student`
- Tren may PHONG, VS Code thay Python interpreter:
  - `C:\Users\PHONG\AppData\Local\Programs\Python\Python313\python.exe`
- PowerShell co the khong nhan lenh `python` hoac `uvicorn` neu Python chua vao PATH hoac chua activate `.venv`.

## Setup lan dau

Chay trong PowerShell:

```powershell
cd D:\HocTap\KLKS_Web3\Web3GiangVien\ml-service

& "C:\Users\PHONG\AppData\Local\Programs\Python\Python313\python.exe" --version

& "C:\Users\PHONG\AppData\Local\Programs\Python\Python313\python.exe" -m venv .venv

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip

python -m pip install -r requirements.txt
```

## Chay service sau khi setup xong

Neu da activate `.venv`:

```powershell
cd D:\HocTap\KLKS_Web3\Web3GiangVien\ml-service
.\.venv\Scripts\Activate.ps1
python -m uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

Neu PowerShell chan activate:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

Neu khong muon activate, chay truc tiep Python trong venv:

```powershell
cd D:\HocTap\KLKS_Web3\Web3GiangVien\ml-service
.\.venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

Day la cach nen dung cho cac lan sau vi khong phu thuoc PATH.

## Cach kiem tra ket qua

Mo trinh duyet:

```text
http://localhost:8001/healthz
```

Ket qua dung:

```json
{
  "status": "ok",
  "models_loaded": true
}
```

## Loi thuong gap

### `uvicorn : The term 'uvicorn' is not recognized`

Nguyen nhan:
- Chua cai dependencies trong `.venv`, hoac
- Chua activate `.venv`, hoac
- Script `uvicorn` khong nam trong PATH.

Cach xu ly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

### `python : The term 'python' is not recognized`

Nguyen nhan:
- Python da cai nhung PowerShell chua nhan PATH.
- VS Code co the van thay interpreter rieng.

Cach xu ly:

```powershell
& "C:\Users\PHONG\AppData\Local\Programs\Python\Python313\python.exe" --version
```

Neu lenh tren chay duoc, dung duong dan day du de tao `.venv`, sau do chay bang:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

## Luu y

- Khong can chay lai `python -m venv .venv` moi lan.
- Khong can cai lai `requirements.txt` moi lan, tru khi requirements thay doi hoac xoa `.venv`.
- Lan dau cai/chay co the lau vi `torch`, `transformers`, `sentence-transformers`, `underthesea` va model cache.
- Khong luu secret hoac API key vao note nay.
