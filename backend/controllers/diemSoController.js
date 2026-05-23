const DiemSo = require('../models/DiemSo');
const DeTai = require('../models/DeTai');
const BaoCao = require('../models/BaoCao');
const contractService = require('../services/thesisContractService');
const logger = require('../config/logger');

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
        const { baoCaoId, deTaiId, sinhVienId, giangVienId, diem, nhanXet, aiScore, aiFeedback, rubricsResult } = req.body;

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

        const submissions = await BaoCao.find({ DeTai: deTaiId, SinhVien: sinhVienId })
            .sort({ NgayNop: 1 });
        let submissionIndex = submissions.findIndex(item => String(item._id) === String(baoCaoId));
        if (submissionIndex < 0) {
            submissionIndex = 0;
        }

        // Lưu thông tin bảng điểm trên DB
        const result = new DiemSo({
            BaoCao: baoCaoId,
            GiangVienCam: giangVienId,
            GiangVienCham: giangVienId,
            SinhVien: sinhVienId,
            DeTai: deTaiId,
            Diem: diem,
            NhanXet: nhanXet,
            AI_Score: aiScore,
            AI_Feedback: aiFeedback,
            RubricsResult: rubricsResult || [],
            SubmissionIndex: submissionIndex,
            TrangThaiBlockchain: 'Pending'
        });

        await result.save();

        let blockchainStatus = 'Pending';
        let txHash = null;
        try {
            txHash = await contractService.finalizeGradeOnChain(sinhVienId, deTaiId, diem, nhanXet, submissionIndex);
            result.TxHash = txHash;
            result.TrangThaiBlockchain = 'DaGhi';
            blockchainStatus = 'DaGhi';
            await result.save();
        } catch (error) {
            result.TrangThaiBlockchain = 'LoiGhi';
            result.LoiBlockchain = error.message;
            blockchainStatus = 'LoiGhi';
            await result.save();
            logger.error(`[GRADE] Blockchain failed for student ${sinhVienId}: ${error.message}`);
        }

        logger.info(`[GRADE] Student ${sinhVienId} graded ${diem}/10 for topic ${deTaiId} | AI: ${aiScore || 'N/A'} | txHash: ${txHash || 'N/A'}`);
        res.status(201).json({
            message: 'Chấm điểm thành công',
            data: result,
            blockchain: {
                status: blockchainStatus,
                txHash: txHash
            }
        });
    } catch (err) {
        logger.error(`[GRADE] Failed to grade student ${req.body.sinhVienId}: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

exports.getDiemBySinhVien = async (req, res) => {
    try {
        const list = await DiemSo.find({ SinhVien: req.params.svId })
            .populate('DeTai')
            .populate('BaoCao')
            .populate('GiangVienCham', 'HoTen Email')
            .populate('GiangVienCam', 'HoTen Email');
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Bảng so sánh điểm AI vs GV cho tất cả SV của 1 giảng viên
exports.retryBlockchain = async (req, res) => {
    try {
        const { giangVienId } = req.body;
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
            grade.TrangThaiBlockchain = 'LoiGhi';
            grade.LoiBlockchain = error.message;
            await grade.save();
            logger.error(`[GRADE] Retry blockchain failed for grade ${grade._id}: ${error.message}`);

            res.status(500).json({
                error: error.message,
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
            .populate('DeTai', 'TenDeTai MaDeTai SuDungRubrics');

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
