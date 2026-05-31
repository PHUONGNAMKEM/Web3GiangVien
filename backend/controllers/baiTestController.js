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

// SV (trưởng nhóm) bắt đầu làm bài → ChoTest chuyển sang DangLamTest
exports.startTest = async (req, res) => {
    try {
        const sinhVienId = req.user?.id || req.body.sinhVienId;
        const { nhomId } = req.body;

        const baiTest = await BaiTest.findById(req.params.id);
        if (!baiTest) return res.status(404).json({ error: 'Không tìm thấy bài test.' });
        if (baiTest.TrangThai === 'DaDong') return res.status(400).json({ error: 'Bài test đã đóng.' });

        // Tìm đăng ký hợp lệ của nhóm/SV cho đề tài
        let dangKy = null;
        if (nhomId) {
            dangKy = await DangKyDeTai.findOne({
                DeTai: baiTest.DeTai, Nhom: nhomId,
                TrangThai: { $in: ['ChoTest', 'DangLamTest'] }
            });
        }
        if (!dangKy) {
            dangKy = await DangKyDeTai.findOne({
                DeTai: baiTest.DeTai,
                TrangThai: { $in: ['ChoTest', 'DangLamTest'] },
                $or: [
                    { SinhVien: sinhVienId },
                    { TruongNhom: sinhVienId },
                    { 'ThanhVien.SinhVien': sinhVienId }
                ]
            });
        }
        if (!dangKy) {
            return res.status(404).json({ error: 'Không tìm thấy đăng ký hợp lệ để làm bài test.' });
        }

        // #13: chỉ trưởng nhóm được làm/nộp bài test đại diện nhóm
        if (String(dangKy.TruongNhom) !== String(sinhVienId)) {
            return res.status(403).json({ error: 'Chỉ trưởng nhóm được làm bài test đại diện cho nhóm.', code: 'KHONG_PHAI_TRUONG_NHOM' });
        }

        if (dangKy.TrangThai === 'ChoTest') {
            await DangKyDeTai.findByIdAndUpdate(dangKy._id, { TrangThai: 'DangLamTest' });
        }

        logger.info(`[TEST] DangKy ${dangKy._id} started test for topic ${baiTest.DeTai}`);
        res.json({
            message: 'Bắt đầu làm bài test.',
            thoiGianBatDau: new Date(),
            thoiGianLam: baiTest.ThoiGianLam,
            dangKyId: dangKy._id
        });
    } catch (err) {
        logger.error(`[TEST] Start test failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// === HELPER: Xác định nhóm thắng (Hybrid) ===
async function tryClaimWinner(dangKyId, deTaiId, thoiGianSubmit, io) {
    // 1. Đã có nhóm thắng chưa?
    const existingWinner = await DangKyDeTai.findOne({ DeTai: deTaiId, TrangThai: 'DaDuyet' });
    if (existingWinner) {
        await DangKyDeTai.findByIdAndUpdate(dangKyId, { TrangThai: 'Thua' });
        return 'lost';
    }

    // 2. Có nhóm nào submit TRƯỚC mình mà chưa có kết quả không?
    const earlierPending = await DangKyDeTai.findOne({
        DeTai: deTaiId,
        _id: { $ne: dangKyId },
        TrangThai: 'DaSubmit',
        ThoiGianSubmit: { $lt: thoiGianSubmit }
    });

    if (earlierPending) {
        // Có người submit trước mình mà chưa biết pass/fail → chờ
        await DangKyDeTai.findByIdAndUpdate(dangKyId, { TrangThai: 'ChoDoi' });
        logger.info(`[TEST] DangKy ${dangKyId} waiting for earlier submission ${earlierPending._id}`);
        return 'waiting';
    }

    // 3. Không ai trước mình → Claim winner (atomic)
    const winner = await DangKyDeTai.findOneAndUpdate(
        { _id: dangKyId, TrangThai: { $in: ['DaSubmit', 'ChoDoi'] } },
        { TrangThai: 'DaDuyet' },
        { new: true }
    ).populate('Nhom');

    if (!winner) {
        // Ai đó đã claim trước → thua
        return 'lost';
    }

    // THẮNG! → Đánh thua tất cả nhóm khác
    await DangKyDeTai.updateMany(
        { DeTai: deTaiId, _id: { $ne: dangKyId }, TrangThai: { $in: ['ChoTest', 'DangLamTest', 'DaSubmit', 'ChoDoi'] } },
        { TrangThai: 'Thua' }
    );

    // Chốt đề tài + đóng bài test
    await DeTai.findByIdAndUpdate(deTaiId, { TrangThai: 'DaChot' });
    const baiTest = await BaiTest.findOne({ DeTai: deTaiId });
    if (baiTest) await BaiTest.findByIdAndUpdate(baiTest._id, { TrangThai: 'DaDong' });

    // Emit WebSocket
    if (io) {
        io.to(`competition:${deTaiId}`).emit('competition:winner', {
            deTaiId,
            winnerNhomId: winner.Nhom?._id?.toString(),
            winnerName: winner.Nhom?.TenNhom || 'Nhóm thắng cuộc'
        });
    }

    logger.info(`[TEST] 🏆 WINNER: DangKy ${dangKyId} for topic ${deTaiId}`);
    return 'winner';
}

// === HELPER: Giải phóng nhóm đang ChoDoi khi nhóm trước đó có kết quả ===
async function resolveWaitingGroups(deTaiId, io) {
    // Lấy các nhóm đang ChoDoi, sắp xếp theo ThoiGianSubmit sớm nhất
    const waitingGroups = await DangKyDeTai.find({
        DeTai: deTaiId,
        TrangThai: 'ChoDoi'
    }).sort({ ThoiGianSubmit: 1 });

    for (const group of waitingGroups) {
        // Còn ai submit trước group mà chưa có kết quả?
        const earlierPending = await DangKyDeTai.findOne({
            DeTai: deTaiId,
            _id: { $ne: group._id },
            TrangThai: 'DaSubmit',
            ThoiGianSubmit: { $lt: group.ThoiGianSubmit }
        });

        if (!earlierPending) {
            // Không còn ai trước → nhóm này có thể claim winner
            const result = await tryClaimWinner(group._id, deTaiId, group.ThoiGianSubmit, io);
            if (result === 'winner') break; // Đã có winner, dừng
        }
    }
}

// SV nộp bài test → AI chấm tự động → Hybrid competition logic
exports.submitTest = async (req, res) => {
    try {
        const { nhomId, traLoi, thoiGianBatDau } = req.body;
        const sinhVienId = req.user?.id || req.body.sinhVienId;
        const baiTest = await BaiTest.findById(req.params.id);
        if (!baiTest) return res.status(404).json({ error: 'Không tìm thấy bài test.' });
        if (baiTest.TrangThai === 'DaDong') return res.status(400).json({ error: 'Bài test đã đóng.' });

        // Kiểm tra đã nộp chưa
        const existingResult = await KetQuaTest.findOne({ BaiTest: baiTest._id, SinhVien: sinhVienId });
        if (existingResult) return res.status(400).json({ error: 'Bạn đã nộp bài test này rồi.' });

        // === 1. GHI ThoiGianSubmit NGAY LẬP TỨC (trước khi AI chấm) ===
        const thoiGianSubmit = new Date();

        // Tìm đăng ký của nhóm/SV cho đề tài này
        let dangKy = null;
        if (nhomId) {
            dangKy = await DangKyDeTai.findOne({
                DeTai: baiTest.DeTai,
                Nhom: nhomId,
                TrangThai: { $in: ['ChoTest', 'DangLamTest'] }
            });
        }
        if (!dangKy) {
            dangKy = await DangKyDeTai.findOne({
                DeTai: baiTest.DeTai,
                TrangThai: { $in: ['ChoTest', 'DangLamTest'] },
                $or: [
                    { SinhVien: sinhVienId },
                    { TruongNhom: sinhVienId },
                    { 'ThanhVien.SinhVien': sinhVienId }
                ]
            });
        }

        // #13: chỉ trưởng nhóm được nộp bài test đại diện cho cả nhóm
        if (dangKy && String(dangKy.TruongNhom) !== String(sinhVienId)) {
            return res.status(403).json({ error: 'Chỉ trưởng nhóm được nộp bài test đại diện cho nhóm.', code: 'KHONG_PHAI_TRUONG_NHOM' });
        }

        // Cập nhật ThoiGianSubmit + TrangThai = DaSubmit
        if (dangKy) {
            await DangKyDeTai.findByIdAndUpdate(dangKy._id, {
                ThoiGianSubmit: thoiGianSubmit,
                TrangThai: 'DaSubmit'
            });
        }

        // === 2. AI CHẤM ĐIỂM ===
        const ketQuaTraLoi = [];
        let tongDiem = 0;
        let diemToiDa = 0;

        for (let i = 0; i < baiTest.CauHoi.length; i++) {
            const cauHoi = baiTest.CauHoi[i];
            const svAnswer = traLoi?.[i] || '';
            diemToiDa += cauHoi.Diem || 1;

            if (cauHoi.LoaiCauHoi === 'TracNghiem') {
                const isCorrect = svAnswer.toUpperCase().trim() === (cauHoi.DapAnDung || '').toUpperCase().trim();
                const diem = isCorrect ? (cauHoi.Diem || 1) : 0;
                tongDiem += diem;
                ketQuaTraLoi.push({
                    CauHoiIndex: i, LoaiCauHoi: 'TracNghiem',
                    TraLoiText: svAnswer, Diem: diem, DiemToiDa: cauHoi.Diem || 1, DungSai: isCorrect
                });
            } else if (cauHoi.LoaiCauHoi === 'Code') {
                let similarity = 0;
                try {
                    const axios = require('axios');
                    const response = await axios.post('http://127.0.0.1:8001/compare-code', {
                        student_code: svAnswer, answer_code: cauHoi.DapAnMau || ''
                    }, { timeout: 15000 });
                    similarity = response.data.similarity || 0;
                } catch (aiErr) {
                    logger.warn(`[TEST] SBERT compare-code failed: ${aiErr.message}`);
                }
                const diem = Math.round(similarity * (cauHoi.Diem || 1) * 100) / 100;
                tongDiem += diem;
                ketQuaTraLoi.push({
                    CauHoiIndex: i, LoaiCauHoi: 'Code',
                    TraLoiText: svAnswer, Diem: diem, DiemToiDa: cauHoi.Diem || 1,
                    AI_Similarity: Math.round(similarity * 100) / 100
                });
            }
        }

        // === 3. GHI BLOCKCHAIN (non-blocking) ===
        let txHash = null;
        try {
            const contractService = require('../services/thesisContractService');
            const scoreForChain = Math.round((tongDiem / diemToiDa) * 100);
            txHash = await contractService.submitTestResultOnChain(
                baiTest.DeTai.toString(), sinhVienId, scoreForChain / 10
            );
        } catch (bcErr) {
            logger.warn(`[TEST] Blockchain submit failed (non-blocking): ${bcErr.message}`);
        }

        // === 4. LƯU KẾT QUẢ ===
        const ketQua = await KetQuaTest.create({
            BaiTest: baiTest._id,
            DeTai: baiTest.DeTai,
            SinhVien: sinhVienId,
            Nhom: nhomId || dangKy?.Nhom || null,
            DangKyDeTai: dangKy?._id || null,
            TraLoi: ketQuaTraLoi,
            TongDiem: Math.round(tongDiem * 100) / 100,
            DiemToiDa: diemToiDa,
            TxHash: txHash,
            ThoiGianBatDau: thoiGianBatDau ? new Date(thoiGianBatDau) : null,
            ThoiGianNop: thoiGianSubmit
        });

        // === 5. HYBRID COMPETITION LOGIC ===
        const phanTram = diemToiDa > 0 ? Math.round((tongDiem / diemToiDa) * 100) : 0;
        const nguongDat = baiTest.NguongDat || 75;
        const isDat = phanTram >= nguongDat;
        const io = req.app.get('io');
        let competitionResult = 'none';

        if (dangKy) {
            if (!isDat) {
                // Không đạt ngưỡng → TuChoi
                await DangKyDeTai.findByIdAndUpdate(dangKy._id, { TrangThai: 'TuChoi' });
                competitionResult = 'rejected';
                logger.info(`[TEST] REJECTED: ${sinhVienId} scored ${phanTram}% < ${nguongDat}%`);

                // Kiểm tra nhóm ChoDoi có thể claim winner
                await resolveWaitingGroups(baiTest.DeTai, io);

                // Emit status update
                if (io) {
                    io.to(`competition:${baiTest.DeTai}`).emit('competition:status', {
                        deTaiId: baiTest.DeTai.toString(),
                        nhomId: (nhomId || dangKy.Nhom || '').toString(),
                        status: 'TuChoi'
                    });
                }
            } else {
                // Đạt ngưỡng → tryClaimWinner (Hybrid)
                competitionResult = await tryClaimWinner(dangKy._id, baiTest.DeTai, thoiGianSubmit, io);
                logger.info(`[TEST] ${sinhVienId} scored ${phanTram}% >= ${nguongDat}% | competition=${competitionResult}`);
            }
        }

        logger.info(`[TEST] Student ${sinhVienId} submitted test | score=${tongDiem}/${diemToiDa} | txHash=${txHash || 'N/A'}`);

        // === 6. TRẢ KẾT QUẢ ===
        const messageMap = {
            'winner': '🏆 Chúc mừng! Nhóm bạn giành được đề tài!',
            'waiting': '⏳ Đạt ngưỡng! Đang chờ kết quả nhóm submit trước...',
            'lost': '😞 Đạt ngưỡng nhưng đã có nhóm khác thắng trước.',
            'rejected': '❌ Bạn chưa đạt ngưỡng yêu cầu.',
            'none': isDat ? 'Đạt ngưỡng yêu cầu!' : 'Chưa đạt ngưỡng yêu cầu.'
        };

        res.status(201).json({
            message: messageMap[competitionResult] || messageMap.none,
            data: ketQua,
            blockchainStatus: txHash ? 'success' : 'failed',
            autoResult: competitionResult,
            phanTram,
            nguongDat,
            isDat,
            competitionResult
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
            .populate('Nhom', 'TenNhom')
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

        const result = await KetQuaTest.findOne({ BaiTest: baiTest._id, SinhVien: sinhVienId })
            .populate('DangKyDeTai');

        let competitionResult = undefined;
        if (result && result.DangKyDeTai) {
            const status = result.DangKyDeTai.TrangThai;
            if (status === 'DaDuyet') competitionResult = 'winner';
            else if (status === 'ChoDoi') competitionResult = 'waiting';
            else if (status === 'Thua') competitionResult = 'lost';
            else if (status === 'TuChoi') competitionResult = 'rejected';
        }

        res.json({
            hasTest: true,
            submitted: !!result,
            result: result ? {
                ...result.toObject(),
                competitionResult: competitionResult
            } : null,
            testId: baiTest._id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
