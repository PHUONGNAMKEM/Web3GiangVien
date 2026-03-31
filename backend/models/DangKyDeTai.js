const mongoose = require('mongoose');

const dangKyDeTaiSchema = new mongoose.Schema({
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien', required: true },
  TrangThai: { type: String, enum: ['ChoDuyet', 'DaDuyet', 'TuChoi'], default: 'ChoDuyet' }
}, { timestamps: true });

// Một sinh viên chỉ đăng ký 1 đề tài 1 lần
dangKyDeTaiSchema.index({ DeTai: 1, SinhVien: 1 }, { unique: true });

module.exports = mongoose.model('DangKyDeTai', dangKyDeTaiSchema);
