const mongoose = require('mongoose');

const lopHocSchema = new mongoose.Schema({
  MaLopHoc: { type: String, required: true },
  TenLopHoc: { type: String, required: true },
  MonHoc: { type: mongoose.Schema.Types.ObjectId, ref: 'MonHoc', required: true },
  GiangVien: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  SinhVien: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien' }]
}, { timestamps: true });

// Compound unique: cùng mã lớp + cùng môn học → không được trùng
lopHocSchema.index({ MaLopHoc: 1, MonHoc: 1 }, { unique: true });

module.exports = mongoose.model('LopHoc', lopHocSchema);
