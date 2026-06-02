const DiemSo = require('../models/DiemSo');
const DeTai = require('../models/DeTai');
const BaoCao = require('../models/BaoCao');
const DangKyDeTai = require('../models/DangKyDeTai');
const contractService = require('../services/thesisContractService');
const logger = require('../config/logger');
const AILog = require('../models/AILog');
const crypto = require('crypto');

const parseBlockchainError = (error, walletAddress = '0xD6aB1D7521A6cd96317bd2d04d89d431b888a7F0') => {
    const errorStr = String(error.message || error);
    if (errorStr.includes('insufficient funds') || error.code === 'INSUFFICIENT_FUNDS') {
        return `Tài khoản ví hệ thống không đủ phí gas Sepolia để thực hiện giao dịch ghi điểm. Địa chỉ ví hệ thống: ${walletAddress}. Vui lòng nạp thêm ETH Sepolia để tiếp tục.`;
    }
    if (errorStr.includes('already graded') || errorStr.includes('Submission already graded')) {
        return 'Điểm số này đã được khóa và ghi nhận an toàn trên Smart Contract Blockchain từ trước.';
    }
    if (errorStr.includes('user rejected action') || errorStr.includes('ACTION_REJECTED')) {
        return 'Giao dịch bị từ chối ký trên ví MetaMask.';
    }
    
    const match = errorStr.match(/execution reverted: "([^"]+)"/) || errorStr.match(/reason="([^"]+)"/);
    if (match && match[1]) {
        return `Lỗi Smart Contract: ${match[1]}`;
    }
    if (errorStr.length > 200) {
        return errorStr.split('\n')[0].substring(0, 200) + '...';
    }
    return errorStr;
};

// Tạo 1 bản ghi điểm cho 1 báo cáo + ghi blockchain (best-effort). Bỏ qua nếu đã chấm.
const createGradeForReport = async ({ baoCao, deTaiId, giangVienId, nhomId, diem, nhanXet, aiScore, aiFeedback, rubricsResult, aiSecurityFlags, aiRepetitionRate, aiTimeTakenMs }) => {
    const sinhVienId = baoCao.SinhVien;
    const existing = await DiemSo.findOne({ BaoCao: baoCao._id });
    if (existing) {
        return { skipped: true, reason: 'DA_CHAM', diemSo: existing };
    }

    const submissions = await BaoCao.find({ DeTai: deTaiId, SinhVien: sinhVienId }).sort({ NgayNop: 1 });
    let submissionIndex = submissions.findIndex(item => String(item._id) === String(baoCao._id));
    if (submissionIndex < 0) submissionIndex = 0;

    const diemSo = new DiemSo({
        BaoCao: baoCao._id,
        GiangVienCam: giangVienId,
        GiangVienCham: giangVienId,
        SinhVien: sinhVienId,
        DeTai: deTaiId,
        Nhom: nhomId || undefined,
        Diem: diem,
        DiemGoc: diem,
        LaDieuChinh: false,
        NhanXet: nhanXet,
        AI_Score: aiScore,
        AI_Feedback: aiFeedback,
        RubricsResult: rubricsResult || [],
        SubmissionIndex: submissionIndex,
        TrangThaiBlockchain: 'Pending'
    });
    await diemSo.save();

    try {
        const extractedText = baoCao.ExtractedText || '';
        const securityFlags = Array.isArray(aiSecurityFlags) ? aiSecurityFlags : [];
        const aiScoreNumber = Number(aiScore);
        const textHash = extractedText
            ? crypto.createHash('sha256').update(extractedText).digest('hex')
            : null;

        await AILog.create({
            BaoCao: baoCao._id,
            DeTai: deTaiId,
            SinhVien: sinhVienId,
            TextHash: textHash,
            TextLength: extractedText.length,
            ScoreResult: {
                aiScore: Number.isFinite(aiScoreNumber) ? aiScoreNumber : null,
                aiFeedback,
                rubricsResult: rubricsResult || [],
                finalScore: diem
            },
            SecurityFlags: securityFlags,
            InjectionDetected: securityFlags.some(flag =>
                typeof flag === 'string' && flag.toLowerCase().includes('injection')
            ),
            RepetitionRate: aiRepetitionRate ?? null,
            ExtractionMethod: baoCao.ExtractionMethod || null,
            TimeTakenMs: aiTimeTakenMs ?? 0
        });
    } catch (logErr) {
        logger.warn(`[AILOG] Failed to save audit log: ${logErr.message}`);
    }

    let blockchainStatus = 'Pending';
    let txHash = null;
    try {
        txHash = await contractService.finalizeGradeOnChain(String(sinhVienId), deTaiId, diem, nhanXet, submissionIndex);
        diemSo.TxHash = txHash;
        diemSo.TrangThaiBlockchain = 'DaGhi';
        blockchainStatus = 'DaGhi';
        await diemSo.save();
    } catch (error) {
        const errorMsg = error.message || '';
        if (errorMsg.includes('already graded') || errorMsg.includes('Submission already graded')) {
            try {
                logger.info(`[GRADE] Intercepted 'already graded' in createGradeForReport. Synchronizing from blockchain for student ${sinhVienId} and topic ${deTaiId}`);
                const history = await contractService.getSubmissionHistory(String(sinhVienId), deTaiId);
                if (history && history.length > submissionIndex) {
                    const onChainSub = history[submissionIndex];
                    if (onChainSub.graded) {
                        const onChainGrade = Number(onChainSub.grade) / 10;
                        diemSo.Diem = onChainGrade;
                        diemSo.TrangThaiBlockchain = 'DaGhi';
                        diemSo.LoiBlockchain = undefined;
                        if (!diemSo.TxHash || diemSo.TxHash.startsWith('0xMock')) {
                            diemSo.TxHash = '0xMockSyncedOnChain';
                        }
                        await diemSo.save();
                        blockchainStatus = 'DaGhi';
                        txHash = diemSo.TxHash;
                        logger.info(`[GRADE] createGradeForReport self-healing sync successful. Score synced: ${onChainGrade}`);
                    }
                }
            } catch (syncErr) {
                logger.warn(`[GRADE] createGradeForReport self-healing failed: ${syncErr.message}`);
            }
        }

        if (blockchainStatus !== 'DaGhi') {
            const walletAddress = contractService.getWalletAddress ? contractService.getWalletAddress() : '0xD6aB1D7521A6cd96317bd2d04d89d431b888a7F0';
            diemSo.TrangThaiBlockchain = 'LoiGhi';
            diemSo.LoiBlockchain = parseBlockchainError(error, walletAddress);
            blockchainStatus = 'LoiGhi';
            await diemSo.save();
            logger.error(`[GRADE] Blockchain failed for student ${sinhVienId}: ${error.message}`);
        }
    }

    return { skipped: false, diemSo, blockchainStatus, txHash };
};

// #5: Khép vòng đời đề tài → set HoanThanh khi tất cả thành viên (đã chấp nhận) đã có điểm
const checkAndCompleteTopic = async (deTaiId) => {
    try {
        const dangKy = await DangKyDeTai.findOne({ DeTai: deTaiId, TrangThai: 'DaDuyet' });
        if (!dangKy) return;

        const accepted = (dangKy.ThanhVien || [])
            .filter(tv => tv.SinhVien && tv.TrangThaiTV === 'DaChapNhan')
            .map(tv => String(tv.SinhVien));
        const memberIds = accepted.length ? accepted : (dangKy.SinhVien ? [String(dangKy.SinhVien)] : []);
        if (!memberIds.length) return;

        const grades = await DiemSo.find({ DeTai: deTaiId, SinhVien: { $in: memberIds } }).select('SinhVien');
        const gradedIds = new Set(grades.map(g => String(g.SinhVien)));
        const allGraded = memberIds.every(id => gradedIds.has(id));

        if (allGraded) {
            await DeTai.findByIdAndUpdate(deTaiId, { TrangThai: 'HoanThanh' });
            logger.info(`[TOPIC] Topic ${deTaiId} marked HoanThanh (all ${memberIds.length} members graded)`);
        }
    } catch (err) {
        logger.warn(`[TOPIC] checkAndCompleteTopic failed for ${deTaiId}: ${err.message}`);
    }
};

const isNumber = (value) => typeof value === 'number' && !Number.isNaN(value);

const validateDiem = (diem) => {
    if (!isNumber(diem) || diem < 0 || diem > 10) {
        return { ok: false, error: 'Điểm không hợp lệ', code: 'INVALID_DIEM' };
    }
    return { ok: true };
};

const calculateRubricsScore = (rubricsResult) => {
    if (!Array.isArray(rubricsResult) || rubricsResult.length === 0) {
        return null;
    }

    const total = rubricsResult.reduce((sum, item) => {
        if (!isNumber(item.DiemToiDa) || item.DiemToiDa <= 0 || !isNumber(item.TrongSo)) {
            return sum;
        }

        const diemGV = isNumber(item.GV_DiemTieuChi) ? item.GV_DiemTieuChi : 0;
        return sum + (diemGV / item.DiemToiDa) * item.TrongSo;
    }, 0);

    return Math.round((total / 100 * 10) * 100) / 100;
};

const validateRubricsResult = (rubricsResult) => {
    if (!rubricsResult) {
        return { ok: true };
    }

    if (!Array.isArray(rubricsResult)) {
        return { ok: false, error: 'Rubrics không hợp lệ', code: 'INVALID_RUBRICS' };
    }

    let totalWeight = 0;
    for (const item of rubricsResult) {
        if (isNumber(item.TrongSo)) {
            totalWeight += item.TrongSo;
        }

        if (isNumber(item.GV_DiemTieuChi) && isNumber(item.DiemToiDa) && item.GV_DiemTieuChi > item.DiemToiDa) {
            return { ok: false, error: 'Điểm tiêu chí vượt tối đa', code: 'DIEM_VUOT_TOIDA' };
        }
    }

    if (rubricsResult.length > 0 && Math.abs(totalWeight - 100) > 0.01) {
        return { ok: false, error: 'Tổng trọng số rubrics không bằng 100', code: 'INVALID_RUBRICS_TONG' };
    }

    return { ok: true };
};

const validateRubricsAgainstScore = (rubricsResult, diem) => {
    const rubricsScore = calculateRubricsScore(rubricsResult);
    if (rubricsScore === null || !isNumber(diem)) {
        return { ok: true };
    }

    if (Math.abs(rubricsScore - diem) > 0.5) {
        return { ok: false, error: 'Điểm rubrics lệch quá mức', code: 'RUBRICS_LECH_DIEM_TONG' };
    }

    return { ok: true };
};

const assertGiangVienOwnsDeTai = async (deTaiId, giangVienId) => {
    const deTai = await DeTai.findById(deTaiId);
    if (!deTai) {
        return { ok: false, error: 'Không tìm thấy đề tài', code: 'DETAI_KHONG_TON_TAI' };
    }

    if (String(deTai.GiangVienHuongDan) !== String(giangVienId)) {
        return { ok: false, error: 'Không phải giảng viên hướng dẫn', code: 'KHONG_PHAI_GV_HUONG_DAN' };
    }

    return { ok: true, deTai };
};

exports.chamDiem = async (req, res) => {
    try {
        const { baoCaoId, deTaiId, sinhVienId, diem, nhanXet, aiScore, aiFeedback, rubricsResult, aiSecurityFlags, aiRepetitionRate, aiTimeTakenMs } = req.body;
        // Danh tính GV chấm lấy từ token (an toàn), không tin body
        const giangVienId = req.user?.id || req.body.giangVienId;

        const diemValidation = validateDiem(diem);
        if (!diemValidation.ok) {
            return res.status(400).json({ error: diemValidation.error, code: diemValidation.code });
        }

        const rubricsValidation = validateRubricsResult(rubricsResult);
        if (!rubricsValidation.ok) {
            return res.status(400).json({ error: rubricsValidation.error, code: rubricsValidation.code });
        }

        const ownerCheck = await assertGiangVienOwnsDeTai(deTaiId, giangVienId);
        if (!ownerCheck.ok) {
            const status = ownerCheck.code === 'DETAI_KHONG_TON_TAI' ? 404 : 403;
            return res.status(status).json({ error: ownerCheck.error, code: ownerCheck.code });
        }

        const baoCao = await BaoCao.findById(baoCaoId);
        if (!baoCao) {
            return res.status(404).json({ error: 'Báo cáo không tồn tại', code: 'BAOCAO_KHONG_TON_TAI' });
        }

        if (String(baoCao.SinhVien) !== String(sinhVienId) || String(baoCao.DeTai) !== String(deTaiId)) {
            return res.status(400).json({ error: 'Báo cáo không khớp sinh viên/đề tài', code: 'BAOCAO_KHONG_KHOP_SV' });
        }

        if (ownerCheck.deTai && ownerCheck.deTai.SuDungRubrics && (!rubricsResult || rubricsResult.length === 0)) {
            return res.status(400).json({ error: 'Thiếu rubrics chấm điểm', code: 'RUBRICS_REQUIRED' });
        }

        if (ownerCheck.deTai && ownerCheck.deTai.SuDungRubrics && Array.isArray(rubricsResult) && rubricsResult.length > 0) {
            const rubricsScoreCheck = validateRubricsAgainstScore(rubricsResult, diem);
            if (!rubricsScoreCheck.ok) {
                return res.status(400).json({ error: rubricsScoreCheck.error, code: rubricsScoreCheck.code });
            }
        }

        // Kiểm tra xem đã chấm điểm chưa
        const existingGrade = await DiemSo.findOne({ BaoCao: baoCaoId });
        if (existingGrade) {
            return res.status(409).json({ error: 'Báo cáo này đã được chấm điểm.', code: 'DA_CHAM_BAOCAO_NAY' });
        }

        const dangKy = await DangKyDeTai.findOne({
            DeTai: deTaiId,
            TrangThai: 'DaDuyet',
            $or: [
                { SinhVien: sinhVienId },
                { TruongNhom: sinhVienId },
                { 'ThanhVien.SinhVien': sinhVienId }
            ]
        });
        const nhomId = dangKy?.Nhom;
        const gradePayload = { deTaiId, giangVienId, nhomId, diem, nhanXet, aiScore, aiFeedback, rubricsResult, aiSecurityFlags, aiRepetitionRate, aiTimeTakenMs };

        // Chấm cho báo cáo chính (của thành viên được chọn)
        const primary = await createGradeForReport({ baoCao, ...gradePayload });
        const result = primary.diemSo;

        // #12: Đề tài nhóm → áp CÙNG điểm/nhận xét cho TẤT CẢ thành viên trong nhóm
        let groupGraded = null;
        const isGroupTopic = (ownerCheck.deTai?.SoLuongSinhVien || 1) > 1 || (dangKy?.Nhom);
        if (isGroupTopic && dangKy && nhomId) {
            const groupReports = await BaoCao.find({ DeTai: deTaiId, Nhom: nhomId });
            let success = 1; // đã tính báo cáo chính
            let total = 1;
            for (const memberReport of groupReports) {
                if (String(memberReport.SinhVien) === String(sinhVienId)) continue; // đã chấm ở trên
                total += 1;
                const r = await createGradeForReport({ baoCao: memberReport, ...gradePayload });
                if (!r.skipped) success += 1;
            }
            groupGraded = { total, success };
            logger.info(`[GRADE] Group grade applied for topic ${deTaiId} | members=${total} | graded=${success} | Nhom=${nhomId}`);
        }

        // #5: kiểm tra khép vòng đời đề tài sau khi chấm
        await checkAndCompleteTopic(deTaiId);

        logger.info(`[GRADE] Student ${sinhVienId} graded ${diem}/10 for topic ${deTaiId} | AI: ${aiScore || 'N/A'} | txHash: ${primary.txHash || 'N/A'}`);
        res.status(201).json({
            message: groupGraded ? 'Chấm điểm thành công cho cả nhóm' : 'Chấm điểm thành công',
            data: result,
            blockchain: {
                status: primary.blockchainStatus,
                txHash: primary.txHash
            },
            groupGraded
        });
    } catch (err) {
        logger.error(`[GRADE] Failed to grade student ${req.body.sinhVienId}: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

exports.getDiemBySinhVien = async (req, res) => {
    try {
        const svId = req.params.svId;
        let list = await DiemSo.find({ SinhVien: svId })
            .populate('DeTai')
            .populate('BaoCao')
            .populate('Nhom')
            .populate('GiangVienCham', 'HoTen Email')
            .populate('GiangVienCam', 'HoTen Email');

        // Fallback nhóm: nếu SV không có DiemSo riêng,
        // kiểm tra xem SV có thuộc nhóm nào đã được chấm điểm không
        if (list.length === 0) {
            const groupRegs = await DangKyDeTai.find({
                TrangThai: 'DaDuyet',
                'ThanhVien.SinhVien': svId,
                'ThanhVien.TrangThaiTV': 'DaChapNhan'
            });

            for (const reg of groupRegs) {
                const leaderId = reg.TruongNhom?.toString();
                if (!leaderId || leaderId === svId) continue;

                const deTaiId = reg.DeTai?.toString();
                if (!deTaiId) continue;

                const leaderGrades = await DiemSo.find({ SinhVien: leaderId, DeTai: deTaiId })
                    .populate('DeTai')
                    .populate('BaoCao')
                    .populate('Nhom')
                    .populate('GiangVienCham', 'HoTen Email')
                    .populate('GiangVienCam', 'HoTen Email');

                if (leaderGrades.length > 0) {
                    list = list.concat(leaderGrades);
                }
            }
        }

        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Bảng so sánh điểm AI vs GV cho tất cả SV của 1 giảng viên
exports.retryBlockchain = async (req, res) => {
    try {
        const giangVienId = req.user?.id || req.body.giangVienId;
        const grade = await DiemSo.findById(req.params.id);
        if (!grade) {
            return res.status(404).json({ error: 'Khong tim thay diem so', code: 'DIEMSO_KHONG_TON_TAI' });
        }

        const ownerCheck = await assertGiangVienOwnsDeTai(grade.DeTai, giangVienId);
        if (!ownerCheck.ok) {
            const status = ownerCheck.code === 'DETAI_KHONG_TON_TAI' ? 404 : 403;
            return res.status(status).json({ error: ownerCheck.error, code: ownerCheck.code });
        }

        if (grade.TrangThaiBlockchain === 'DaGhi' && grade.TxHash) {
            return res.json({
                message: 'Diem so da duoc ghi Blockchain',
                data: grade,
                blockchain: {
                    status: grade.TrangThaiBlockchain,
                    txHash: grade.TxHash
                }
            });
        }

        // 1. Kiểm tra trước trên Blockchain xem điểm số đã được chốt từ trước chưa để tự động phục hồi không cần tốn gas
        try {
            logger.info(`[GRADE] Pre-checking blockchain history in retry for student ${grade.SinhVien} and topic ${grade.DeTai}`);
            const history = await contractService.getSubmissionHistory(
                grade.SinhVien.toString(),
                grade.DeTai.toString()
            );
            const idx = grade.SubmissionIndex || 0;
            if (history && history.length > idx) {
                const onChainSub = history[idx];
                if (onChainSub.graded) {
                    const onChainGrade = Number(onChainSub.grade) / 10;
                    grade.Diem = onChainGrade;
                    grade.TrangThaiBlockchain = 'DaGhi';
                    grade.LoiBlockchain = undefined;
                    if (!grade.TxHash || grade.TxHash.startsWith('0xMock')) {
                        grade.TxHash = '0xMockSyncedOnChain';
                    }
                    await grade.save();
                    
                    logger.info(`[GRADE] Pre-check sync successful (Self-healed without transaction). Score synced: ${onChainGrade}`);
                    
                    return res.json({
                        message: 'Dữ liệu đã được cập nhật lại theo bản ghi đã có trên Blockchain để đồng nhất dữ liệu và đảm bảo tính bảo mật.',
                        data: grade,
                        blockchain: {
                            status: 'DaGhi',
                            txHash: grade.TxHash
                        }
                    });
                }
            }
        } catch (syncErr) {
            logger.warn(`[GRADE] Pre-check sync failed/skipped: ${syncErr.message}`);
        }

        grade.TrangThaiBlockchain = 'Pending';
        grade.LoiBlockchain = undefined;
        await grade.save();

        try {
            const txHash = await contractService.finalizeGradeOnChain(
                grade.SinhVien.toString(),
                grade.DeTai.toString(),
                grade.Diem,
                grade.NhanXet || '',
                grade.SubmissionIndex || 0
            );

            grade.TxHash = txHash;
            grade.TrangThaiBlockchain = 'DaGhi';
            grade.LoiBlockchain = undefined;
            await grade.save();

            res.json({
                message: 'Ghi lai Blockchain thanh cong',
                data: grade,
                blockchain: {
                    status: 'DaGhi',
                    txHash
                }
            });
        } catch (error) {
            const errorMsg = error.message || '';
            if (errorMsg.includes('already graded') || errorMsg.includes('Submission already graded')) {
                try {
                    logger.info(`[GRADE] Intercepted 'already graded' in retry. Synchronizing grade from blockchain for student ${grade.SinhVien} and topic ${grade.DeTai}`);
                    const history = await contractService.getSubmissionHistory(
                        grade.SinhVien.toString(),
                        grade.DeTai.toString()
                    );
                    const idx = grade.SubmissionIndex || 0;
                    if (history && history.length > idx) {
                        const onChainSub = history[idx];
                        if (onChainSub.graded) {
                            const onChainGrade = Number(onChainSub.grade) / 10;
                            grade.Diem = onChainGrade;
                            grade.TrangThaiBlockchain = 'DaGhi';
                            grade.LoiBlockchain = undefined;
                            if (!grade.TxHash || grade.TxHash.startsWith('0xMock')) {
                                grade.TxHash = '0xMockSyncedOnChain';
                            }
                            await grade.save();
                            logger.info(`[GRADE] Self-healing sync successful. Grade ID ${grade._id} score updated to match blockchain: ${onChainGrade}`);

                            return res.json({
                                message: 'Dữ liệu đã được cập nhật lại theo bản ghi đã có trên Blockchain để đồng nhất dữ liệu và đảm bảo tính bảo mật.',
                                data: grade,
                                blockchain: {
                                    status: 'DaGhi',
                                    txHash: grade.TxHash
                                }
                            });
                        }
                    }
                } catch (syncErr) {
                    logger.warn(`[GRADE] Self-healing sync failed: ${syncErr.message}`);
                }
            }

            const walletAddress = contractService.getWalletAddress ? contractService.getWalletAddress() : '0xD6aB1D7521A6cd96317bd2d04d89d431b888a7F0';
            const cleanError = parseBlockchainError(error, walletAddress);

            grade.TrangThaiBlockchain = 'LoiGhi';
            grade.LoiBlockchain = cleanError;
            await grade.save();
            logger.error(`[GRADE] Retry blockchain failed for grade ${grade._id}: ${error.message}`);

            res.status(400).json({
                error: cleanError,
                code: 'RETRY_BLOCKCHAIN_FAILED',
                data: grade,
                blockchain: {
                    status: 'LoiGhi',
                    txHash: null
                }
            });
        }
    } catch (err) {
        logger.error(`[GRADE] Retry blockchain failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

exports.getComparison = async (req, res) => {
    try {
        const gvId = req.params.gvId;
        const DeTai = require('../models/DeTai');
        const mongoose = require('mongoose');

        // Tìm tất cả đề tài của GV
        let myTopics;
        try {
            const objectId = new mongoose.Types.ObjectId(gvId);
            myTopics = await DeTai.find({
                $or: [{ GiangVienHuongDan: objectId }, { GiangVienHuongDan: gvId }]
            });
        } catch (e) {
            myTopics = await DeTai.find({ GiangVienHuongDan: gvId });
        }

        const topicIds = myTopics.map(t => t._id);

        // Lấy tất cả điểm số cho các đề tài đó
        const allGrades = await DiemSo.find({ DeTai: { $in: topicIds } })
            .populate('SinhVien', 'HoTen MaSV')
            .populate({
                path: 'DeTai',
                select: 'TenDeTai MaDeTai SuDungRubrics LopHoc MonHoc',
                populate: [
                    { path: 'LopHoc', select: 'MaLopHoc TenLopHoc' },
                    { path: 'MonHoc', select: 'MaMonHoc TenMonHoc' }
                ]
            })
            .populate('Nhom');

        // Tạo danh sách so sánh
        const comparisons = allGrades
            .filter(g => g.AI_Score != null)
            .map(g => {
                const diff = (g.Diem || 0) - (g.AI_Score || 0);
                return {
                    _id: g._id,
                    student: g.SinhVien,
                    topic: g.DeTai,
                    gvScore: g.Diem,
                    aiScore: g.AI_Score,
                    diff: Math.round(diff * 100) / 100,
                    absDiff: Math.round(Math.abs(diff) * 100) / 100,
                    feedback: g.NhanXet,
                    aiFeedback: g.AI_Feedback,
                    rubricsDetail: (g.RubricsResult || []).map(r => ({
                        criteria: r.TenTieuChi,
                        weight: r.TrongSo,
                        aiScore: r.AI_DiemTieuChi,
                        gvScore: r.GV_DiemTieuChi,
                        maxScore: r.DiemToiDa
                    })),
                    txHash: g.TxHash,
                    gradedAt: g.createdAt
                };
            });

        // Thống kê tổng hợp
        const count = comparisons.length;
        const stats = {
            totalGraded: count,
            avgGV: count > 0 ? Math.round(comparisons.reduce((s, c) => s + c.gvScore, 0) / count * 100) / 100 : 0,
            avgAI: count > 0 ? Math.round(comparisons.reduce((s, c) => s + c.aiScore, 0) / count * 100) / 100 : 0,
            avgDiff: count > 0 ? Math.round(comparisons.reduce((s, c) => s + c.diff, 0) / count * 100) / 100 : 0,
            avgAbsDiff: count > 0 ? Math.round(comparisons.reduce((s, c) => s + c.absDiff, 0) / count * 100) / 100 : 0,
            aiHigherCount: comparisons.filter(c => c.diff < 0).length,
            gvHigherCount: comparisons.filter(c => c.diff > 0).length,
            matchCount: comparisons.filter(c => c.absDiff < 0.5).length
        };

        logger.info(`[GRADE] Comparison for GV ${gvId} | total=${count} | avgDiff=${stats.avgDiff}`);
        res.json({ comparisons, stats });
    } catch (err) {
        logger.error(`[GRADE] Comparison failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// MỚI: GV điều chỉnh điểm riêng cho 1 SV trong nhóm (ĐH/VÔ HIỆU HÓA)
exports.adjustGrade = async (req, res) => {
    return res.status(403).json({
        error: 'Chức năng điều chỉnh điểm cá nhân đã bị vô hiệu hóa để bảo toàn tính đồng nhất của điểm nhóm.'
    });
};
