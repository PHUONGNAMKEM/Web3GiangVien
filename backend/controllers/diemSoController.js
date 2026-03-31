const DiemSo = require('../models/DiemSo');
const contractService = require('../services/thesisContractService');

exports.chamDiem = async (req, res) => {
    try {
        const { baoCaoId, deTaiId, sinhVienId, giangVienId, diem, nhanXet, aiScore, aiFeedback } = req.body;

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
            TxHash: txHash
        });

        await result.save();
        res.status(201).json({ message: 'Chấm điểm thành công', data: result });
    } catch (err) {
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
