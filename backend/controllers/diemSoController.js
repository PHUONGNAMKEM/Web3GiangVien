const DiemSo = require('../models/DiemSo');
const contractService = require('../services/thesisContractService');
const logger = require('../config/logger');

exports.chamDiem = async (req, res) => {
    try {
        const { baoCaoId, deTaiId, sinhVienId, giangVienId, diem, nhanXet, aiScore, aiFeedback, rubricsResult } = req.body;

        // Kiểm tra xem đã chấm điểm chưa
        const existingGrade = await DiemSo.findOne({ BaoCao: baoCaoId, SinhVien: sinhVienId });
        if (existingGrade) {
            return res.status(400).json({ error: 'Báo cáo này đã được chấm điểm.' });
        }

        // Tương tác SmartContract cấp điểm
        // Ở đây giả định submissionIndex là 0, do mỗi sinh viên nộp 1 lần
        const submissionIndex = 0; 
        const txHash = await contractService.finalizeGradeOnChain(sinhVienId, deTaiId, diem, nhanXet, submissionIndex); 

        // Lưu thông tin bảng điểm trên DB
        const result = new DiemSo({
            BaoCao: baoCaoId,
            GiangVienCam: giangVienId,
            SinhVien: sinhVienId,
            DeTai: deTaiId,
            Diem: diem,
            NhanXet: nhanXet,
            AI_Score: aiScore,
            AI_Feedback: aiFeedback,
            RubricsResult: rubricsResult || [],
            TxHash: txHash
        });

        await result.save();
        logger.info(`[GRADE] Student ${sinhVienId} graded ${diem}/10 for topic ${deTaiId} | AI: ${aiScore || 'N/A'} | txHash: ${txHash}`);
        res.status(201).json({ message: 'Chấm điểm thành công', data: result });
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
            .populate('GiangVienCam', 'HoTen Email');
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Bảng so sánh điểm AI vs GV cho tất cả SV của 1 giảng viên
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
