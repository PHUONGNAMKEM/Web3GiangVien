const BaiTest = require('../models/BaiTest');
const KetQuaTest = require('../models/KetQuaTest');
const DeTai = require('../models/DeTai');
const DangKyDeTai = require('../models/DangKyDeTai');
const logger = require('../config/logger');

// GV tạo bài test cho đề tài
exports.createTest = async (req, res) => {
    try {
        const { deTaiId, tieuDe, moTa, cauHoi, thoiGianLam, nguongDat } = req.body;

        const deTai = await DeTai.findById(deTaiId);
        if (!deTai) return res.status(404).json({ error: 'Không tìm thấy đề tài.' });

        // Kiểm tra đã có bài test chưa
        const existing = await BaiTest.findOne({ DeTai: deTaiId });
        if (existing) return res.status(400).json({ error: 'Đề tài này đã có bài test. Vui lòng xóa bài cũ trước.' });

        const baiTest = await BaiTest.create({
            DeTai: deTaiId,
            TieuDe: tieuDe || `Bài test: ${deTai.TenDeTai}`,
            MoTa: moTa || '',
            CauHoi: cauHoi || [],
            ThoiGianLam: thoiGianLam || 30,
            NguongDat: nguongDat != null ? nguongDat : 75
        });

        // Đánh dấu đề tài có bài test
        await DeTai.findByIdAndUpdate(deTaiId, { CoBaiTest: true });

        // Chuyển tất cả đăng ký đang ChoDuyet → ChoTest
        await DangKyDeTai.updateMany(
            { DeTai: deTaiId, TrangThai: 'ChoDuyet' },
            { TrangThai: 'ChoTest' }
        );

        logger.info(`[TEST] Created test for topic ${deTaiId} | questions=${cauHoi?.length || 0}`);
        res.status(201).json({ message: 'Tạo bài test thành công', data: baiTest });
    } catch (err) {
        logger.error(`[TEST] Create failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// Lấy bài test theo đề tài
exports.getTestByTopic = async (req, res) => {
    try {
        const baiTest = await BaiTest.findOne({ DeTai: req.params.deTaiId }).populate('DeTai', 'TenDeTai MaDeTai');
        if (!baiTest) return res.status(404).json({ error: 'Chưa có bài test cho đề tài này.' });
        res.json(baiTest);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Lấy bài test cho SV (ẩn đáp án)
exports.getTestForStudent = async (req, res) => {
    try {
        const baiTest = await BaiTest.findOne({ DeTai: req.params.deTaiId }).populate('DeTai', 'TenDeTai MaDeTai');
        if (!baiTest) return res.status(404).json({ error: 'Chưa có bài test cho đề tài này.' });
        if (baiTest.TrangThai === 'DaDong') return res.status(400).json({ error: 'Bài test đã đóng.' });

        // Ẩn đáp án đúng và code mẫu
        const safeCauHoi = baiTest.CauHoi.map(c => ({
            LoaiCauHoi: c.LoaiCauHoi,
            NoiDung: c.NoiDung,
            LuaChon: c.LuaChon,
            NgonNgu: c.NgonNgu,
            Diem: c.Diem
            // KHÔNG trả DapAnDung, DapAnMau
        }));

        res.json({
            _id: baiTest._id,
            DeTai: baiTest.DeTai,
            TieuDe: baiTest.TieuDe,
            MoTa: baiTest.MoTa,
            CauHoi: safeCauHoi,
            ThoiGianLam: baiTest.ThoiGianLam,
            TrangThai: baiTest.TrangThai,
            NguongDat: baiTest.NguongDat,
            soCauHoi: baiTest.CauHoi.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// SV nộp bài test → AI chấm tự động
exports.submitTest = async (req, res) => {
    try {
        const { sinhVienId, traLoi, thoiGianBatDau } = req.body;
        const baiTest = await BaiTest.findById(req.params.id);
        if (!baiTest) return res.status(404).json({ error: 'Không tìm thấy bài test.' });
        if (baiTest.TrangThai === 'DaDong') return res.status(400).json({ error: 'Bài test đã đóng.' });

        // Kiểm tra đã nộp chưa
        const existing = await KetQuaTest.findOne({ BaiTest: baiTest._id, SinhVien: sinhVienId });
        if (existing) return res.status(400).json({ error: 'Bạn đã nộp bài test này rồi.' });

        // Chấm điểm tự động
        const ketQuaTraLoi = [];
        let tongDiem = 0;
        let diemToiDa = 0;

        for (let i = 0; i < baiTest.CauHoi.length; i++) {
            const cauHoi = baiTest.CauHoi[i];
            const svAnswer = traLoi?.[i] || '';
            diemToiDa += cauHoi.Diem || 1;

            if (cauHoi.LoaiCauHoi === 'TracNghiem') {
                // So khớp đáp án trực tiếp
                const isCorrect = svAnswer.toUpperCase().trim() === (cauHoi.DapAnDung || '').toUpperCase().trim();
                const diem = isCorrect ? (cauHoi.Diem || 1) : 0;
                tongDiem += diem;
                ketQuaTraLoi.push({
                    CauHoiIndex: i,
                    LoaiCauHoi: 'TracNghiem',
                    TraLoiText: svAnswer,
                    Diem: diem,
                    DiemToiDa: cauHoi.Diem || 1,
                    DungSai: isCorrect
                });
            } else if (cauHoi.LoaiCauHoi === 'Code') {
                // Dùng SBERT so sánh code SV vs code mẫu GV
                let similarity = 0;
                try {
                    const axios = require('axios');
                    const response = await axios.post('http://127.0.0.1:8001/compare-code', {
                        student_code: svAnswer,
                        answer_code: cauHoi.DapAnMau || ''
                    }, { timeout: 15000 });
                    similarity = response.data.similarity || 0;
                } catch (aiErr) {
                    logger.warn(`[TEST] SBERT compare-code failed: ${aiErr.message}`);
                    similarity = 0;
                }

                const diem = Math.round(similarity * (cauHoi.Diem || 1) * 100) / 100;
                tongDiem += diem;
                ketQuaTraLoi.push({
                    CauHoiIndex: i,
                    LoaiCauHoi: 'Code',
                    TraLoiText: svAnswer,
                    Diem: diem,
                    DiemToiDa: cauHoi.Diem || 1,
                    AI_Similarity: Math.round(similarity * 100) / 100
                });
            }
        }

        // Ghi kết quả blockchain (non-blocking)
        let txHash = null;
        try {
            const contractService = require('../services/thesisContractService');
            const scoreForChain = Math.round((tongDiem / diemToiDa) * 100); // 0-100
            txHash = await contractService.submitTestResultOnChain(
                baiTest.DeTai.toString(), sinhVienId, scoreForChain / 10
            );
        } catch (bcErr) {
            logger.warn(`[TEST] Blockchain submit failed (non-blocking): ${bcErr.message}`);
        }

        const ketQua = await KetQuaTest.create({
            BaiTest: baiTest._id,
            DeTai: baiTest.DeTai,
            SinhVien: sinhVienId,
            TraLoi: ketQuaTraLoi,
            TongDiem: Math.round(tongDiem * 100) / 100,
            DiemToiDa: diemToiDa,
            TxHash: txHash,
            ThoiGianBatDau: thoiGianBatDau ? new Date(thoiGianBatDau) : null,
            ThoiGianNop: new Date()
        });

        // === AUTO APPROVE / REJECT dựa trên ngưỡng đạt ===
        const phanTram = diemToiDa > 0 ? Math.round((tongDiem / diemToiDa) * 100) : 0;
        const nguongDat = baiTest.NguongDat || 75;
        const isDat = phanTram >= nguongDat;

        // Tìm đăng ký của SV cho đề tài này
        const dangKy = await DangKyDeTai.findOne({
            DeTai: baiTest.DeTai,
            TrangThai: 'ChoTest',
            $or: [
                { SinhVien: sinhVienId },
                { 'ThanhVien.SinhVien': sinhVienId, 'ThanhVien.TrangThaiTV': 'DaChapNhan' }
            ]
        });

        let autoResult = 'none';
        if (dangKy) {
            if (isDat) {
                await DangKyDeTai.findByIdAndUpdate(dangKy._id, { TrangThai: 'DaDuyet' });
                await DeTai.findByIdAndUpdate(baiTest.DeTai, { TrangThai: 'DaChot' });
                await BaiTest.findByIdAndUpdate(baiTest._id, { TrangThai: 'DaDong' });
                autoResult = 'approved';
                logger.info(`[TEST] Auto-approved: student ${sinhVienId} scored ${phanTram}% >= ${nguongDat}%`);
            } else {
                await DangKyDeTai.findByIdAndUpdate(dangKy._id, { TrangThai: 'TuChoi' });
                autoResult = 'rejected';
                logger.info(`[TEST] Auto-rejected: student ${sinhVienId} scored ${phanTram}% < ${nguongDat}%`);
            }
        }

        logger.info(`[TEST] Student ${sinhVienId} submitted test | score=${tongDiem}/${diemToiDa} | txHash=${txHash || 'N/A'}`);
        res.status(201).json({
            message: isDat ? 'Chúc mừng! Bạn đạt ngưỡng yêu cầu, đề tài đã được duyệt tự động!' : 'Bạn chưa đạt ngưỡng yêu cầu.',
            data: ketQua,
            blockchainStatus: txHash ? 'success' : 'failed',
            autoResult,
            phanTram,
            nguongDat,
            isDat
        });
    } catch (err) {
        logger.error(`[TEST] Submit failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// GV xem kết quả tất cả SV cho 1 bài test
exports.getTestResults = async (req, res) => {
    try {
        const results = await KetQuaTest.find({ BaiTest: req.params.id })
            .populate('SinhVien', 'HoTen MaSV Email')
            .sort({ TongDiem: -1 });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GV chọn nhóm thắng → auto-approve
exports.selectWinner = async (req, res) => {
    try {
        const { dangKyId } = req.body;
        const baiTest = await BaiTest.findById(req.params.id);
        if (!baiTest) return res.status(404).json({ error: 'Không tìm thấy bài test.' });

        // Duyệt nhóm thắng
        await DangKyDeTai.findByIdAndUpdate(dangKyId, { TrangThai: 'DaDuyet' });

        // Từ chối các nhóm còn lại
        await DangKyDeTai.updateMany(
            { DeTai: baiTest.DeTai, _id: { $ne: dangKyId }, TrangThai: 'ChoTest' },
            { TrangThai: 'TuChoi' }
        );

        // Đóng bài test
        await BaiTest.findByIdAndUpdate(baiTest._id, { TrangThai: 'DaDong' });

        logger.info(`[TEST] Winner selected: registration ${dangKyId} for topic ${baiTest.DeTai}`);
        res.json({ message: 'Đã chọn nhóm thắng và duyệt đề tài!' });
    } catch (err) {
        logger.error(`[TEST] Select winner failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// Xóa bài test
exports.deleteTest = async (req, res) => {
    try {
        const baiTest = await BaiTest.findById(req.params.id);
        if (!baiTest) return res.status(404).json({ error: 'Không tìm thấy bài test.' });

        await KetQuaTest.deleteMany({ BaiTest: baiTest._id });
        await BaiTest.findByIdAndDelete(baiTest._id);
        await DeTai.findByIdAndUpdate(baiTest.DeTai, { CoBaiTest: false });

        res.json({ message: 'Đã xóa bài test.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Kiểm tra SV đã làm test chưa
exports.checkSubmitted = async (req, res) => {
    try {
        const { deTaiId, sinhVienId } = req.params;
        const baiTest = await BaiTest.findOne({ DeTai: deTaiId });
        if (!baiTest) return res.json({ hasTest: false });

        const result = await KetQuaTest.findOne({ BaiTest: baiTest._id, SinhVien: sinhVienId });
        res.json({
            hasTest: true,
            submitted: !!result,
            result: result || null,
            testId: baiTest._id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
