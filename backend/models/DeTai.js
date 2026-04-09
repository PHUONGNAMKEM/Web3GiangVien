const mongoose = require('mongoose');

const deTaiSchema = new mongoose.Schema({
  MaDeTai: { type: String, required: true, unique: true },
  TenDeTai: { type: String, required: true },
  MoTa: { type: String },
  MoTaChiTiet: { type: String, default: '' },
  YeuCau: [{ type: String }],
  ChiTietBoSung: [{
    TieuDe: { type: String, default: '' },
    NoiDung: { type: String, default: '' }
  }],
  SoLuongSinhVien: { type: Number, default: 1, min: 1 },
  Deadline: { type: Date, required: true },
  GiangVienHuongDan: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  TrangThai: { type: String, enum: ['MoDangKy', 'DaChot', 'HoanThanh'], default: 'MoDangKy' }
}, { timestamps: true });

module.exports = mongoose.model('DeTai', deTaiSchema);
