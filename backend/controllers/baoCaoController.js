const BaoCao = require('../models/BaoCao');
const DeTai = require('../models/DeTai');
const DangKyDeTai = require('../models/DangKyDeTai');
const ipfsService = require('../services/ipfsService');

// SV nộp báo cáo
exports.uploadBaoCao = async (req, res) => {
    try {
        const { deTaiId, sinhVienId, tieuDe } = req.body;
        
        // Kiểm tra đã nộp chưa
        const existing = await BaoCao.findOne({ DeTai: deTaiId, SinhVien: sinhVienId });
        if (existing) {
            return res.status(400).json({ error: 'Bạn đã nộp báo cáo cho đề tài này rồi.' });
        }
        let ipfsCid;
        if (req.file) {
            try {
                const ipfsResult = await ipfsService.uploadFile(req.file.path, req.file.originalname);
                ipfsCid = ipfsResult.IpfsHash;
            } catch (e) {
                console.error('Lỗi khi tải lên IPFS:', e.message);
                return res.status(500).json({ error: 'Không thể tải file lên IPFS (Pinata). Vui lòng kiểm tra API Key.' });
            }
        } else {
            return res.status(400).json({ error: 'Bạn chưa đính kèm file báo cáo.' });
        }
        
        const baoCao = new BaoCao({
            DeTai: deTaiId,
            SinhVien: sinhVienId,
            TieuDe: tieuDe || 'Báo cáo đồ án',
            IPFS_CID: ipfsCid
        });

        await baoCao.save();
        const populated = await BaoCao.findById(baoCao._id).populate('DeTai').populate('SinhVien');
        res.status(201).json({ message: 'Nộp báo cáo thành công', data: populated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// SV lấy báo cáo của mình
exports.getMyBaoCao = async (req, res) => {
    try {
        const svId = req.params.svId;
        const baocao = await BaoCao.findOne({ SinhVien: svId }).populate('DeTai');
        res.json({ baocao: baocao || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// SV hủy nộp (xóa báo cáo)
exports.deleteBaoCao = async (req, res) => {
    try {
        const { id } = req.params;
        const bc = await BaoCao.findById(id);
        if (!bc) return res.status(404).json({ error: 'Không tìm thấy báo cáo' });
        await BaoCao.findByIdAndDelete(id);
        res.json({ message: 'Đã hủy nộp báo cáo' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GV lấy tất cả báo cáo theo đề tài
exports.getBaoCaoByDeTai = async (req, res) => {
    try {
        const list = await BaoCao.find({ DeTai: req.params.deTaiId }).populate('SinhVien');
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GV lấy tất cả báo cáo cho các đề tài của mình
exports.getBaoCaoByLecturer = async (req, res) => {
    try {
        const gvId = req.params.gvId;
        const mongoose = require('mongoose');

        let myTopics;
        try {
            const objectId = new mongoose.Types.ObjectId(gvId);
            myTopics = await DeTai.find({
                $or: [
                    { GiangVienHuongDan: objectId },
                    { GiangVienHuongDan: gvId }
                ]
            });
        } catch (e) {
            myTopics = await DeTai.find({ GiangVienHuongDan: gvId });
        }
        
        const topicIds = myTopics.map(t => t._id);
        
        // Cũng lấy đăng ký đã duyệt cho các đề tài
        const approvedRegs = await DangKyDeTai.find({ 
            DeTai: { $in: topicIds },
            TrangThai: 'DaDuyet' 
        }).populate('SinhVien').populate('DeTai');

        const submissions = await BaoCao.find({ DeTai: { $in: topicIds } })
            .populate('SinhVien')
            .populate('DeTai');

        // Lấy danh sách điểm số đã chấm cho các báo cáo này
        const DiemSo = require('../models/DiemSo');
        const diemSoList = await DiemSo.find({ DeTai: { $in: topicIds } });

        // Merge: mỗi registration đã duyệt = 1 row, kèm submission nếu có
        const result = approvedRegs.map(reg => {
            const sub = submissions.find(s => 
                s.SinhVien?._id.toString() === reg.SinhVien?._id.toString() &&
                s.DeTai?._id.toString() === reg.DeTai?._id.toString()
            );
            
            let grade = null;
            if (sub) {
                grade = diemSoList.find(d => d.BaoCao?.toString() === sub._id.toString());
            }

            return {
                _id: reg._id,
                student: reg.SinhVien,
                topic: reg.DeTai,
                registration: reg,
                submission: sub || null, // null nếu chưa nộp
                grade: grade || null,
                status: grade ? 'DaCham' : (sub ? 'DaNop' : 'ChuaNop')
            };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
