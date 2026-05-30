const mongoose = require('mongoose');

const nhomSchema = new mongoose.Schema({
  TenNhom: { type: String, default: '' },
  LopHoc: { type: mongoose.Schema.Types.ObjectId, ref: 'LopHoc' },
  TruongNhom: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien', required: true },
  ThanhVien: [{
    SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien' },
    VaiTro: { type: String, enum: ['TruongNhom', 'ThanhVien'], default: 'ThanhVien' },
    TrangThai: { type: String, enum: ['DaMoi', 'DaChapNhan', 'TuChoi'], default: 'DaMoi' },
    NgayThamGia: { type: Date, default: Date.now }
  }],
  SoLuong: { type: Number, required: true, min: 1 },   // Số thành viên tối đa
  DaChot: { type: Boolean, default: false },             // Đã chốt nhóm chưa
}, { timestamps: true });

module.exports = mongoose.model('Nhom', nhomSchema);
