const mongoose = require('mongoose');

const dangKyDeTaiSchema = new mongoose.Schema({
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien', required: true },
  ThanhVien: [{
    SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien' },
    VaiTro: { type: String, enum: ['TruongNhom', 'ThanhVien'], default: 'ThanhVien' },
    TrangThaiTV: {
      type: String,
      enum: ['DaMoi', 'DaChapNhan', 'TuChoi'],
      default: 'DaChapNhan'
    },
    NgayThamGia: { type: Date, default: Date.now }
  }],
  TrangThai: { type: String, enum: ['ChoDuyet', 'DaDuyet', 'TuChoi'], default: 'ChoDuyet' }
}, { timestamps: true });

// Một sinh viên chỉ đăng ký 1 đề tài 1 lần
dangKyDeTaiSchema.index({ DeTai: 1, SinhVien: 1 }, { unique: true });

module.exports = mongoose.model('DangKyDeTai', dangKyDeTaiSchema);
