const DeTai = require('../models/DeTai');
const DangKyDeTai = require('../models/DangKyDeTai');
const SinhVien = require('../models/SinhVien');

exports.getAll = async (req, res) => {
    try {
        const list = await DeTai.find({}).populate('GiangVienHuongDan');
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const item = await DeTai.findById(req.params.id).populate('GiangVienHuongDan');
        if(!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newItem = new DeTai(req.body);
        await newItem.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updated = await DeTai.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await DeTai.findByIdAndDelete(req.params.id);
        // Xóa luôn đăng ký liên quan
        await DangKyDeTai.deleteMany({ DeTai: req.params.id });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Sinh viên đăng ký đề tài
exports.registerTopic = async (req, res) => {
    try {
        const { sinhVienId } = req.body;
        const deTaiId = req.params.id;

        // Kiểm tra SV đã đăng ký đề tài nào chưa (mỗi SV chỉ 1 đề tài)
        const existing = await DangKyDeTai.findOne({ SinhVien: sinhVienId, TrangThai: { $ne: 'TuChoi' } });
        if (existing) {
            return res.status(400).json({ error: 'Bạn đã đăng ký một đề tài rồi. Không thể đăng ký thêm.' });
        }

        const dangKy = new DangKyDeTai({ DeTai: deTaiId, SinhVien: sinhVienId, TrangThai: 'ChoDuyet' });
        await dangKy.save();
        res.status(201).json({ message: 'Đăng ký thành công, chờ duyệt!', data: dangKy });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Lấy đăng ký của 1 sinh viên (kiểm tra đã đăng ký đề tài nào chưa)
exports.getMyRegistration = async (req, res) => {
    try {
        const svId = req.params.svId;
        const registration = await DangKyDeTai.findOne({ 
            SinhVien: svId, 
            TrangThai: { $ne: 'TuChoi' } 
        }).populate('DeTai');
        
        res.json({ registration: registration || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Lấy tất cả đăng ký cho đề tài của 1 Giảng viên
exports.getRegistrationsByLecturer = async (req, res) => {
    try {
        const gvId = req.params.gvId;
        
        // Tìm tất cả đề tài của GV (hỗ trợ cả ObjectId và String)
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
        
        // Tìm tất cả đăng ký cho các đề tài đó
        const registrations = await DangKyDeTai.find({ DeTai: { $in: topicIds } })
            .populate('SinhVien')
            .populate('DeTai');
        
        res.json(registrations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Giảng viên duyệt / từ chối đăng ký
exports.approveRegistration = async (req, res) => {
    try {
        const { id } = req.params;
        const { trangThai } = req.body; // 'DaDuyet' hoặc 'TuChoi'
        
        if (!['DaDuyet', 'TuChoi'].includes(trangThai)) {
            return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
        }

        const updated = await DangKyDeTai.findByIdAndUpdate(id, { TrangThai: trangThai }, { new: true })
            .populate('SinhVien')
            .populate('DeTai');
        
        if (!updated) {
            return res.status(404).json({ error: 'Không tìm thấy đăng ký' });
        }

        // Nếu duyệt, cập nhật trạng thái đề tài
        if (trangThai === 'DaDuyet') {
            await DeTai.findByIdAndUpdate(updated.DeTai._id, { TrangThai: 'DaChot' });
        }

        res.json({ message: `Đã ${trangThai === 'DaDuyet' ? 'duyệt' : 'từ chối'} thành công`, data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
