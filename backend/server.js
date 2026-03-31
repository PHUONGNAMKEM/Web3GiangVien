const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Socket.IO
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
app.set('io', io);

// Multer config for IPFS / File Uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, 'uploads', 'reports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);  
      const ext = path.extname(file.originalname);
      cb(null, `report-${uniqueSuffix}${ext}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Import Controllers
const authController = require('./controllers/authController');
const sinhVienController = require('./controllers/sinhVienController');
const giangVienController = require('./controllers/giangVienController');
const deTaiController = require('./controllers/deTaiController');
const baoCaoController = require('./controllers/baoCaoController');
const diemSoController = require('./controllers/diemSoController');
const aiController = require('./controllers/aiController');


// 1. Root verify
app.get('/', (req, res) => {
  res.send('Web3 Giảng Viên API is running...');
});

// 2. Auth routes
app.post('/api/auth/challenge', authController.generateChallenge);
app.post('/api/auth/verify', authController.verifySignature);
app.post('/api/auth/logout', authController.authenticateToken, authController.logout);

// 3. Sinh Viên
app.get('/api/sinhvien', sinhVienController.getAll);
app.get('/api/sinhvien/:id', sinhVienController.getById);
app.post('/api/sinhvien', sinhVienController.create);
app.put('/api/sinhvien/:id', sinhVienController.update);
app.delete('/api/sinhvien/:id', sinhVienController.delete);

// 4. Giảng Viên
app.get('/api/giangvien', giangVienController.getAll);
app.get('/api/giangvien/:id', giangVienController.getById);
app.post('/api/giangvien', giangVienController.create);
app.put('/api/giangvien/:id', giangVienController.update);
app.delete('/api/giangvien/:id', giangVienController.delete);

// 5. Đề Tài
app.get('/api/detai', deTaiController.getAll);
app.get('/api/detai/:id', deTaiController.getById);
app.post('/api/detai', deTaiController.create);
app.put('/api/detai/:id', deTaiController.update);
app.delete('/api/detai/:id', deTaiController.delete);
app.post('/api/detai/:id/register', deTaiController.registerTopic);

// 5b. Đăng Ký Đề Tài (quản lý)
app.get('/api/dangky/sinhvien/:svId', deTaiController.getMyRegistration);
app.get('/api/dangky/giangvien/:gvId', deTaiController.getRegistrationsByLecturer);
app.put('/api/dangky/:id/approve', deTaiController.approveRegistration);

// 6. Báo Cáo
app.post('/api/baocao/upload', upload.single('file'), baoCaoController.uploadBaoCao);
app.get('/api/baocao/detai/:deTaiId', baoCaoController.getBaoCaoByDeTai);
app.get('/api/baocao/sinhvien/:svId', baoCaoController.getMyBaoCao);
app.delete('/api/baocao/:id', baoCaoController.deleteBaoCao);
app.get('/api/baocao/giangvien/:gvId', baoCaoController.getBaoCaoByLecturer);

// 7. Điểm Số
app.post('/api/diemso', diemSoController.chamDiem);
app.get('/api/diemso/sinhvien/:svId', diemSoController.getDiemBySinhVien);

// 8. AI / ML Services
app.post('/api/ai/analyze-report', aiController.analyzeReport);
app.post('/api/ai/match-student', aiController.matchStudent);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
