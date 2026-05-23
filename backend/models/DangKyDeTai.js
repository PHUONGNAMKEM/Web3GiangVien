const mongoose = require('mongoose');

const dangKyDeTaiSchema = new mongoose.Schema({
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  // --- Nhóm mới (Phase 2) ---
  Nhom: { type: mongoose.Schema.Types.ObjectId, ref: 'Nhom' },
  TruongNhom: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien' },
  // --- Backward compat (cũ) ---
  SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien' },
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
  TrangThai: { 
    type: String, 
    enum: ['ChoDuyet', 'ChoTest', 'DangLamTest', 'DaSubmit', 'ChoDoi', 'DaDuyet', 'TuChoi', 'Thua'], 
    default: 'ChoDuyet' 
  },
  ThoiGianSubmit: { type: Date },  // Ghi ngay khi nhận submit (Phase 3)
}, { timestamps: true });

// Một nhóm chỉ đăng ký 1 đề tài 1 lần
dangKyDeTaiSchema.index({ DeTai: 1, Nhom: 1 }, { unique: true, sparse: true });
// Backward compat: SinhVien index
dangKyDeTaiSchema.index({ DeTai: 1, SinhVien: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('DangKyDeTai', dangKyDeTaiSchema);
