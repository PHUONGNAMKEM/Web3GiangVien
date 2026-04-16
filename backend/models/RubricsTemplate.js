const mongoose = require('mongoose');

const rubricsTemplateSchema = new mongoose.Schema({
  TenMau: { type: String, required: true },             // VD: "Rubrics Đồ án CNTT"
  MoTaMau: { type: String, default: '' },               // Mô tả ngắn
  GiangVien: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  TieuChi: [{
    TenTieuChi: { type: String, required: true },
    MoTa: { type: String, default: '' },
    TrongSo: { type: Number, required: true, min: 0, max: 100 },
    DiemToiDa: { type: Number, default: 10 },
    GoiYChoAI: [{ type: String }]                       // Keywords cho AI matching
  }],
  MacDinh: { type: Boolean, default: false },            // GV đánh dấu đây là mẫu mặc định

  // === IMMUTABILITY TRACKING ===
  DaApDung: { type: Boolean, default: false },           // Đã áp dụng vào ≥1 đề tài chưa
  SoLuotDung: { type: Number, default: 0 }              // Số đề tài đã dùng template này
}, { timestamps: true });

// Index cho truy vấn theo GV
rubricsTemplateSchema.index({ GiangVien: 1, MacDinh: 1 });

module.exports = mongoose.model('RubricsTemplate', rubricsTemplateSchema);
