const mongoose = require('mongoose');

const baiTestSchema = new mongoose.Schema({
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  TieuDe: { type: String, required: true },
  MoTa: { type: String, default: '' },
  CauHoi: [{
    LoaiCauHoi: { type: String, enum: ['TracNghiem', 'Code'], required: true },
    NoiDung: { type: String, required: true },       // Đề bài
    // === Trắc nghiệm ===
    LuaChon: [{ type: String }],                     // ['A. ...', 'B. ...', 'C. ...', 'D. ...']
    DapAnDung: { type: String },                     // 'A', 'B', 'C', 'D'
    // === Code ===
    NgonNgu: { type: String },                       // 'python', 'javascript', 'java', 'cpp'
    DapAnMau: { type: String },                      // Code mẫu GV nhập trước (SBERT so sánh)
    // === Chung ===
    Diem: { type: Number, default: 1 }               // Điểm tối đa câu này
  }],
  ThoiGianLam: { type: Number, default: 30 },       // Phút
  TrangThai: { type: String, enum: ['MoNop', 'DaDong'], default: 'MoNop' }
}, { timestamps: true });

module.exports = mongoose.model('BaiTest', baiTestSchema);
