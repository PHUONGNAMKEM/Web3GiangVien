const SinhVien = require('../models/SinhVien');

exports.getAll = async (req, res) => {
    try {
        const list = await SinhVien.find({});
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const item = await SinhVien.findById(req.params.id);
        if(!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newSV = new SinhVien(req.body);
        await newSV.save();
        res.status(201).json(newSV);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updated = await SinhVien.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await SinhVien.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Sinh viên cập nhật hồ sơ cá nhân (bắt buộc lần đầu)
exports.updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { HoTen, MaSV, Email, GPA, ChuyenNganh, KyNang } = req.body;

        // Validate fields cơ bản
        if (!HoTen || !MaSV || !Email) {
            return res.status(400).json({ error: 'Họ tên, Mã SV và Email là bắt buộc.' });
        }

        if (GPA === undefined || GPA === null || GPA === '') {
            return res.status(400).json({ error: 'Vui lòng nhập GPA để hệ thống AI có thể gợi ý đề tài chính xác.' });
        }
        
        if (!KyNang || !Array.isArray(KyNang) || KyNang.length === 0) {
            return res.status(400).json({ error: 'Vui lòng chọn hoặc nhập ít nhất 1 kỹ năng để SBERT có dữ liệu phân tích.' });
        }

        // Kiểm tra trùng MaSV với SV khác
        const duplicateMaSV = await SinhVien.findOne({ MaSV, _id: { $ne: id } });
        if (duplicateMaSV) {
            return res.status(400).json({ error: 'Mã SV đã tồn tại trong hệ thống.' });
        }

        // Kiểm tra trùng Email với SV khác
        const duplicateEmail = await SinhVien.findOne({ Email, _id: { $ne: id } });
        if (duplicateEmail) {
            return res.status(400).json({ error: 'Email đã tồn tại trong hệ thống.' });
        }

        const updated = await SinhVien.findByIdAndUpdate(id, {
            HoTen,
            MaSV,
            Email,
            GPA: GPA || 0,
            ChuyenNganh: ChuyenNganh || '',
            KyNang: KyNang || [],
            DaCapNhatHoSo: true
        }, { new: true });

        if (!updated) return res.status(404).json({ error: 'Không tìm thấy sinh viên.' });

        res.json({ message: 'Cập nhật hồ sơ thành công!', data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Tìm sinh viên theo MaSV (dùng cho chức năng mời vào nhóm)
exports.findByMaSV = async (req, res) => {
    try {
        const { maSV } = req.params;
        const sv = await SinhVien.findOne({ MaSV: maSV });
        if (!sv) return res.status(404).json({ error: 'Không tìm thấy sinh viên với mã này.' });
        // Chỉ trả về thông tin cần thiết (không trả wallet)
        res.json({
            _id: sv._id,
            MaSV: sv.MaSV,
            HoTen: sv.HoTen,
            Email: sv.Email,
            GPA: sv.GPA,
            ChuyenNganh: sv.ChuyenNganh,
            KyNang: sv.KyNang
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

