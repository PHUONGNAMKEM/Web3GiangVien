const mongoose = require('mongoose');

const lopHocSchema = new mongoose.Schema({
  MaLopHoc: { type: String, required: true, unique: true },
  TenLopHoc: { type: String, required: true },
  MonHoc: { type: mongoose.Schema.Types.ObjectId, ref: 'MonHoc', required: true },
  GiangVien: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  SinhVien: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien' }]
}, { timestamps: true });

// Index cho query getByGiangVien: filter theo GiangVien + sort theo createdAt
lopHocSchema.index({ GiangVien: 1, createdAt: -1 });

module.exports = mongoose.model('LopHoc', lopHocSchema);
