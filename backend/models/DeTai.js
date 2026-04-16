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
  // === RUBRICS CHẤM ĐIỂM ===
  Rubrics: [{
    TenTieuChi: { type: String, required: true },          // VD: "Nội dung kỹ thuật"
    MoTa: { type: String, default: '' },                   // VD: "Đánh giá mức độ hiểu biết kỹ thuật"
    TrongSo: { type: Number, required: true, min: 0, max: 100 },  // % trọng số (tổng = 100)
    DiemToiDa: { type: Number, default: 10 },              // Thang điểm tối đa tiêu chí này
    GoiYChoAI: [{ type: String }]                          // Keywords cho AI matching (VD: ["React","API"])
  }],
  SuDungRubrics: { type: Boolean, default: false },        // Có dùng Rubrics không
  HienThiChiTietChoSV: { type: Boolean, default: false },  // GV quyết định SV có xem chi tiết không
  SoLuongSinhVien: { type: Number, default: 1, min: 1 },
  Deadline: { type: Date, required: true },
  GiangVienHuongDan: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  TrangThai: { type: String, enum: ['MoDangKy', 'DaChot', 'HoanThanh'], default: 'MoDangKy' }
}, { timestamps: true });

module.exports = mongoose.model('DeTai', deTaiSchema);
