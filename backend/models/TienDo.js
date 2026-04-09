const mongoose = require('mongoose');

const tienDoSchema = new mongoose.Schema({
    DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
    SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien', required: true },
    NoiDung: { type: String, required: true },
    PhanTramHoanThanh: { type: Number, default: 0, min: 0, max: 100 },
    LoaiCapNhat: {
        type: String,
        default: 'Khác'
    },
    FileDinhKem: { type: String },
    NhanXetGV: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('TienDo', tienDoSchema);