const mongoose = require('mongoose');

const monHocSchema = new mongoose.Schema({
  MaMonHoc: { type: String, required: true, unique: true },
  TenMonHoc: { type: String, required: true },
  MoTa: { type: String, default: '' },
  GiangVien: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true }
}, { timestamps: true });

module.exports = mongoose.model('MonHoc', monHocSchema);
