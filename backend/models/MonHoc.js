const mongoose = require('mongoose');

const monHocSchema = new mongoose.Schema({
  MaMonHoc: { type: String, required: true, unique: true },
  TenMonHoc: { type: String, required: true },
  MoTa: { type: String, default: '' },
  GiangVien: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true }
}, { timestamps: true });

// Index cho query getByGiangVien: filter theo GiangVien + sort theo createdAt
monHocSchema.index({ GiangVien: 1, createdAt: -1 });

module.exports = mongoose.model('MonHoc', monHocSchema);
