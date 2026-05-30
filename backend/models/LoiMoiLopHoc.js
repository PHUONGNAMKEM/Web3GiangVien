const mongoose = require('mongoose');

const loiMoiLopHocSchema = new mongoose.Schema({
  LopHoc: { type: mongoose.Schema.Types.ObjectId, ref: 'LopHoc', required: true },
  SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien', required: true },
  GiangVien: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  TrangThai: {
    type: String,
    enum: ['ChoChapNhan', 'DaChapNhan', 'TuChoi'],
    default: 'ChoChapNhan'
  },
}, { timestamps: true });

// Mỗi SV chỉ có 1 lời mời active cho 1 lớp
loiMoiLopHocSchema.index({ LopHoc: 1, SinhVien: 1 }, { unique: true });

module.exports = mongoose.model('LoiMoiLopHoc', loiMoiLopHocSchema);
