const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const morgan = require('morgan');
const connectDB = require('./config/db');
const logger = require('./config/logger');
require('dotenv').config();

const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// HTTP Request Logging (Morgan → Winston)
const morganStream = { write: (message) => logger.info(`[HTTP] ${message.trim()}`) };
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

const rateLimit = require('express-rate-limit');

// Rate limiter cho upload báo cáo (ngăn spam file)
const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 3,              // tối đa 3 lần upload/phút/IP
    message: { error: 'Quá nhiều lần upload. Vui lòng thử lại sau 1 phút.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter cho AI scoring
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Quá nhiều yêu cầu chấm điểm. Vui lòng thử lại sau.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter cho login (chống brute force)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 20,
    message: { error: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Socket.IO
io.on('connection', (socket) => {
  logger.info(`[SOCKET] User connected: ${socket.id}`);

  // Nhóm join room cạnh tranh theo đề tài
  socket.on('competition:join', ({ deTaiId, nhomId }) => {
    socket.join(`competition:${deTaiId}`);
    socket.nhomId = nhomId;
    socket.deTaiId = deTaiId;
    logger.info(`[SOCKET] Nhom ${nhomId} joined competition room: ${deTaiId}`);
  });

  // Nhóm rời room
  socket.on('competition:leave', ({ deTaiId }) => {
    socket.leave(`competition:${deTaiId}`);
    logger.info(`[SOCKET] Left competition room: ${deTaiId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`[SOCKET] User disconnected: ${socket.id}`);
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
      cb(null, `report-${uniqueSuffix}.pdf`); // Luôn đặt extension .pdf, bỏ qua extension gốc
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // Giảm từ 50MB → 20MB
  fileFilter: function (req, file, cb) {
    // Chỉ chấp nhận MIME type PDF
    const allowedMimes = ['application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Chỉ chấp nhận file PDF.'), false);
    }
    cb(null, true);
  }
});

// Import Controllers
const authController = require('./controllers/authController');
const sinhVienController = require('./controllers/sinhVienController');
const giangVienController = require('./controllers/giangVienController');
const deTaiController = require('./controllers/deTaiController');
const baoCaoController = require('./controllers/baoCaoController');
const diemSoController = require('./controllers/diemSoController');
const aiController = require('./controllers/aiController');
const tienDoController = require('./controllers/tienDoController');
const rubricsController = require('./controllers/rubricsController');
const baiTestController = require('./controllers/baiTestController');
const blockchainController = require('./controllers/blockchainController');
const nhomController = require('./controllers/nhomController');

// Middleware xác thực & phân quyền
const { authenticateToken } = authController;
const { requireRole } = require('./middleware/authz');
const requireLecturer = [authenticateToken, requireRole('LECTURER_ROLE')];
const requireStudent = [authenticateToken, requireRole('STUDENT_ROLE')];
const requireAuth = [authenticateToken];


// 1. Root verify
app.get('/', (req, res) => {
  res.send('Web3 Giảng Viên API is running...');
});

// 2. Auth routes
app.post('/api/auth/challenge', loginLimiter, authController.generateChallenge);
app.post('/api/auth/verify', loginLimiter, authController.verifySignature);
app.post('/api/auth/logout', authController.authenticateToken, authController.logout);

// 3. Sinh Viên
app.get('/api/sinhvien', sinhVienController.getAll);
app.get('/api/sinhvien/:id', sinhVienController.getById);
app.post('/api/sinhvien', sinhVienController.create);
app.put('/api/sinhvien/:id', sinhVienController.update);
app.put('/api/sinhvien/:id/profile', sinhVienController.updateProfile);
app.get('/api/sinhvien/masv/:maSV', sinhVienController.findByMaSV);
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
app.post('/api/detai', ...requireLecturer, deTaiController.create);
app.put('/api/detai/:id', ...requireLecturer, deTaiController.update);
app.delete('/api/detai/:id', ...requireLecturer, deTaiController.delete);
app.post('/api/detai/:id/register', ...requireStudent, deTaiController.registerTopic);

// 5b. Đăng Ký Đề Tài (quản lý)
app.get('/api/dangky/sinhvien/:svId', ...requireAuth, deTaiController.getMyRegistration);
app.get('/api/dangky/giangvien/:gvId', ...requireLecturer, deTaiController.getRegistrationsByLecturer);
app.put('/api/dangky/:id/approve', ...requireLecturer, deTaiController.approveRegistration);
app.delete('/api/dangky/:id', ...requireStudent, deTaiController.cancelRegistration);

// 5c. Nhóm sinh viên
app.post('/api/detai/:id/invite', ...requireStudent, deTaiController.inviteMember);
app.get('/api/detai/invitations/:svId', ...requireAuth, deTaiController.getMyInvitations);
app.post('/api/detai/invitation/:id/respond', ...requireStudent, deTaiController.respondToInvitation);

// 6. Báo Cáo
app.post('/api/baocao/upload', ...requireStudent, uploadLimiter, upload.single('file'), baoCaoController.uploadBaoCao);
app.get('/api/baocao/detai/:deTaiId', baoCaoController.getBaoCaoByDeTai);
app.get('/api/baocao/sinhvien/:svId', baoCaoController.getMyBaoCao);
app.delete('/api/baocao/:id', ...requireStudent, baoCaoController.deleteBaoCao);
app.get('/api/baocao/giangvien/:gvId', ...requireLecturer, baoCaoController.getBaoCaoByLecturer);
app.get('/api/baocao/:id/extracted', ...requireLecturer, baoCaoController.getExtractedText);

// 7. Điểm Số
app.post('/api/diemso', ...requireLecturer, aiLimiter, diemSoController.chamDiem);
app.put('/api/diemso/:id/retry-blockchain', ...requireLecturer, aiLimiter, diemSoController.retryBlockchain);
app.get('/api/diemso/sinhvien/:svId', ...requireAuth, diemSoController.getDiemBySinhVien);
app.get('/api/diemso/comparison/:gvId', ...requireLecturer, diemSoController.getComparison);

// 7.1. Blockchain read-only debug routes (khong hien tren UI)
app.get('/api/blockchain/contracts', blockchainController.getContracts);
app.get('/api/blockchain/db-records', blockchainController.getThesisDbRecords);
app.get('/api/blockchain/thesis/db-records', blockchainController.getThesisDbRecords);
app.get('/api/blockchain/thesis/topic/:topicId', blockchainController.getThesisTopic);
app.get('/api/blockchain/thesis/submissions', blockchainController.getThesisSubmissions);

// 8. Tiến Độ
app.post('/api/tiendo', ...requireStudent, tienDoController.createProgressEntry);
app.get('/api/tiendo/sinhvien/:svId', ...requireAuth, tienDoController.getProgressBySinhVien);
app.get('/api/tiendo/detail/:id', ...requireAuth, tienDoController.getProgressDetail);
app.put('/api/tiendo/:id', ...requireStudent, tienDoController.updateProgressEntry);
app.put('/api/tiendo/:id/danhgia', ...requireLecturer, tienDoController.evaluateProgress);
app.get('/api/tiendo/:id/ai-suggest', ...requireLecturer, tienDoController.aiSuggestProgress);
app.get('/api/tiendo/:svId', ...requireAuth, tienDoController.getProgressBySV);
app.get('/api/tiendo/detai/:deTaiId', ...requireAuth, tienDoController.getProgressByTopic);
app.put('/api/tiendo/:id/nhanxet', ...requireLecturer, tienDoController.commentProgress);

// 9. AI / ML Services
app.post('/api/ai/analyze-report', ...requireLecturer, aiLimiter, aiController.analyzeReport);
app.post('/api/ai/analyze-rubrics', ...requireLecturer, aiLimiter, aiController.analyzeReportWithRubrics);
app.post('/api/ai/match-student', ...requireStudent, aiLimiter, aiController.matchStudent);

// 10. Rubrics Template
app.get('/api/rubrics/giangvien/:gvId', ...requireLecturer, rubricsController.getTemplatesByGV);
app.post('/api/rubrics', ...requireLecturer, rubricsController.createTemplate);
app.put('/api/rubrics/:id', ...requireLecturer, rubricsController.updateTemplate);
app.delete('/api/rubrics/:id', ...requireLecturer, rubricsController.deleteTemplate);
app.put('/api/rubrics/:id/default', ...requireLecturer, rubricsController.setDefaultTemplate);
app.post('/api/rubrics/:id/apply/:deTaiId', ...requireLecturer, rubricsController.applyTemplate);

// 11. Bài Test Cạnh Tranh Đầu Vào
app.post('/api/baitest', ...requireLecturer, baiTestController.createTest);
app.get('/api/baitest/detai/:deTaiId', ...requireLecturer, baiTestController.getTestByTopic);
app.get('/api/baitest/detai/:deTaiId/student', ...requireStudent, baiTestController.getTestForStudent);
app.post('/api/baitest/:id/start', ...requireStudent, baiTestController.startTest);
app.post('/api/baitest/:id/submit', ...requireStudent, baiTestController.submitTest);
app.get('/api/baitest/:id/results', ...requireLecturer, baiTestController.getTestResults);
app.post('/api/baitest/:id/select-winner', ...requireLecturer, baiTestController.selectWinner);
app.delete('/api/baitest/:id', ...requireLecturer, baiTestController.deleteTest);
app.get('/api/baitest/check/:deTaiId/:sinhVienId', ...requireAuth, baiTestController.checkSubmitted);

// 12. Quản Lý Nhóm
app.post('/api/nhom', ...requireStudent, nhomController.createNhom);
app.get('/api/nhom/sinhvien/:svId', ...requireAuth, nhomController.getNhomBySinhVien);
app.get('/api/nhom/invites/:svId', ...requireAuth, nhomController.getPendingInvites);
app.get('/api/nhom/:id', ...requireAuth, nhomController.getNhomById);
app.post('/api/nhom/:id/invite', ...requireStudent, nhomController.inviteMember);
app.post('/api/nhom/:id/respond', ...requireStudent, nhomController.respondToInvite);
app.delete('/api/nhom/:id/kick/:svId', ...requireStudent, nhomController.kickMember);
app.post('/api/nhom/:id/leave', ...requireStudent, nhomController.leaveNhom);
app.post('/api/nhom/:id/transfer-leader', ...requireStudent, nhomController.transferLeader);
app.post('/api/nhom/:id/chot', ...requireStudent, nhomController.chotNhom);
app.delete('/api/nhom/:id', ...requireStudent, nhomController.deleteNhom);

// Multer error handler
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            error: 'File qua lon. Toi da 20MB.',
            code: 'FILE_TOO_LARGE'
        });
    }
    if (err.message && err.message.includes('PDF')) {
        return res.status(400).json({
            error: err.message,
            code: 'INVALID_FILE_TYPE'
        });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            error: 'File khong hop le.',
            code: 'UNEXPECTED_FILE'
        });
    }
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            error: 'Origin khong duoc phep',
            code: 'CORS_BLOCKED'
        });
    }
    logger.error(`[SERVER] Unhandled error: ${err.message}`);
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Co loi xay ra tren server.'
            : err.message
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`[SERVER] Web3 Giảng Viên API running on port ${PORT}`);
});
