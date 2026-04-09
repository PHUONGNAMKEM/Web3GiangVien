const TienDo = require('../models/TienDo');
const DangKyDeTai = require('../models/DangKyDeTai');

// 1. Tạo entry tiến độ mới (SV)
exports.createProgressEntry = async (req, res) => {
    try {
        const { deTaiId, sinhVienId, noiDung, phanTramHoanThanh, loaiCapNhat, fileDinhKem } = req.body;

        // Verify registration
        const dangKy = await DangKyDeTai.findOne({
            DeTai: deTaiId,
            TrangThai: 'DaDuyet',
            $or: [
                { SinhVien: sinhVienId },
                { 'ThanhVien.SinhVien': sinhVienId }
            ]
        });

        if (!dangKy) {
            return res.status(403).json({ error: 'Bạn chưa được duyệt tham gia đề tài này.' });
        }

        const tienDo = new TienDo({
            DeTai: deTaiId,
            SinhVien: sinhVienId,
            NoiDung: noiDung,
            PhanTramHoanThanh: phanTramHoanThanh || 0,
            LoaiCapNhat: loaiCapNhat || 'Khac',
            FileDinhKem: fileDinhKem
        });

        await tienDo.save();
        res.status(201).json({ message: 'Tạo báo cáo tiến độ thành công', data: tienDo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Lấy tiến độ của 1 SV theo Đề tài (SV xem của mình)
exports.getProgressBySV = async (req, res) => {
    try {
        const { svId } = req.params;
        const tienDoList = await TienDo.find({ SinhVien: svId })
            .populate('DeTai', 'TenDeTai MaDeTai')
            .sort({ createdAt: -1 });

        res.json({ data: tienDoList });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Lấy toàn bộ tiến độ của 1 đề tài (GV xem)
exports.getProgressByTopic = async (req, res) => {
    try {
        const { deTaiId } = req.params;
        const tienDoList = await TienDo.find({ DeTai: deTaiId })
            .populate('SinhVien', 'HoTen MaSV Email')
            .sort({ createdAt: -1 });

        res.json({ data: tienDoList });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. GV nhận xét tiến độ
exports.commentProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { nhanXet } = req.body;

        const updated = await TienDo.findByIdAndUpdate(
            id,
            { NhanXetGV: nhanXet },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Không tìm thấy nhật ký tiến độ' });
        }

        res.json({ message: 'Thêm nhận xét thành công', data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};