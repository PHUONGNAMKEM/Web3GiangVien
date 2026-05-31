# Hướng dẫn chạy dự án Web3GiangVien

Tài liệu này mô tả các bước cơ bản để chạy dự án ở môi trường local.

## 1. Yêu cầu trước khi chạy

- Node.js `>= 18`
- npm
- Python `>= 3.10`
- MongoDB hoặc MongoDB Atlas
- Git
- Nếu chạy bằng Docker: Docker và Docker Compose

## 2. Cấu trúc dịch vụ

- `backend`: API Node.js/Express, mặc định chạy ở port `5000`
- `frontend`: React app, mặc định chạy ở port `3000`
- `ml-service`: FastAPI service, mặc định chạy ở port `8001`

## 3. Chạy theo cách thủ công

### Bước 1: Chuẩn bị biến môi trường cho backend

Vào thư mục `backend` và tạo file `.env` từ mẫu:

```powershell
cd backend
Copy-Item .env.example .env
```

Sau đó mở file `.env` và điền các giá trị cần thiết, tối thiểu nên kiểm tra:

- `MONGODB_URI`
- `JWT_SECRET`
- `ML_SERVICE_URL=http://localhost:8001`
- `FRONTEND_URL=http://localhost:3000`
- Các địa chỉ contract nếu bạn dùng phần Web3

### Bước 2: Cài đặt và chạy ML service

```powershell
cd ml-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

Nếu `Activate.ps1` bị chặn bởi chính sách PowerShell, có thể mở PowerShell với quyền phù hợp hoặc dùng cách kích hoạt môi trường ảo tương ứng trên máy bạn.

### Bước 3: Cài đặt và chạy backend

Mở terminal mới:

```powershell
cd backend
npm install
npm run dev
```

Nếu không muốn chạy chế độ phát triển, có thể dùng:

```powershell
npm start
```

### Bước 4: Cài đặt và chạy frontend

Mở terminal mới khác:

```powershell
cd frontend
npm install
npm start
```

Frontend sẽ chạy ở `http://localhost:3000`.

## 4. Thứ tự khởi động nên dùng

Nên chạy theo thứ tự này để tránh lỗi kết nối:

1. MongoDB
2. `ml-service` ở port `8001`
3. `backend` ở port `5000`
4. `frontend` ở port `3000`

## 5. Chạy bằng Docker Compose

Trong thư mục `docker` có file `docker-compose.yml` cho `mongodb`, `backend`, và `frontend`.

Chạy:

```powershell
cd docker
docker compose up --build
```

Lưu ý:

- Cấu hình Docker Compose hiện tại chưa bao gồm `ml-service`
- Nếu frontend hoặc backend cần gọi ML service, bạn vẫn phải chạy `ml-service` riêng hoặc bổ sung service này vào compose

## 6. Kiểm tra sau khi chạy

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- ML service: `http://localhost:8001`

Nếu có health check hoặc route kiểm tra riêng, bạn có thể mở thêm endpoint tương ứng để xác nhận từng service đã khởi động thành công.

## 7. Ghi chú

- Không commit file `.env`
- Nếu cài dependency xong mà vẫn lỗi, hãy kiểm tra lại phiên bản Node.js và Python
- Nếu backend báo lỗi kết nối database, kiểm tra lại `MONGODB_URI`
- Nếu backend không gọi được AI/ML, kiểm tra lại `ML_SERVICE_URL`
