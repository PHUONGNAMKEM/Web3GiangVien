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
    TuanSo: { type: Number, min: 1, max: 30 },
    NgayBatDauTuan: { type: Date },
    NgayKetThucTuan: { type: Date },
    MucTieuTuan: { type: String, default: '' },
    NoiDungDaLam: { type: String, default: '' },
    KhoKhan: { type: String, default: '' },
    KeHoachTuanSau: { type: String, default: '' },
    MinhChung: [{
        TenFile: { type: String },
        Url: { type: String },
        GhiChu: { type: String, default: '' }
    }],
    TrangThaiDanhGia: {
        type: String,
        enum: ['ChoDanhGia', 'Dat', 'CanBoSung', 'KhongDat'],
        default: 'ChoDanhGia'
    },
    DiemTienDo: { type: Number, min: 0, max: 10 },
    RubricsTuan: [{
        MaTieuChi: { type: String },
        TenTieuChi: { type: String },
        TrongSo: { type: Number, min: 0, max: 100 },
        DiemToiDa: { type: Number, default: 10 },
        DiemGV: { type: Number, min: 0 },
        NhanXetTieuChi: { type: String, default: '' }
    }],
    GiangVienDanhGia: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien' },
    NgayDanhGia: { type: Date },
    LanNopLai: { type: Number, default: 0 },
    CanhBaoTienDo: [{ type: String }],
    // #18: lưu vết đánh giá tiến độ trên blockchain (bật khi PROGRESS_ONCHAIN_ENABLED=true + contract đã hỗ trợ)
    TxHash: { type: String },
    TrangThaiBlockchain: {
        type: String,
        enum: ['ChuaGhi', 'Pending', 'DaGhi', 'LoiGhi'],
        default: 'ChuaGhi'
    },
    LoiBlockchain: { type: String }
}, { timestamps: true });

tienDoSchema.index(
    { DeTai: 1, SinhVien: 1, TuanSo: 1, LanNopLai: 1 },
    { unique: true, partialFilterExpression: { TuanSo: { $type: 'number' } } }
);
tienDoSchema.index({ DeTai: 1, SinhVien: 1, createdAt: -1 });

module.exports = mongoose.model('TienDo', tienDoSchema);