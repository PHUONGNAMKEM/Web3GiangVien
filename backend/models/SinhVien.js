const mongoose = require('mongoose');

const sinhVienSchema = new mongoose.Schema({
  MaSV: { type: String, required: true, unique: true },
  HoTen: { type: String, required: true },
  Email: { type: String, required: true, unique: true },
  GPA: { type: Number, default: 0 },
  ChuyenNganh: { type: String, default: '' },
  KyNang: [{ type: String }],
  BangDiemKyNang: [{
    TenKyNang: { type: String, required: true },
    Diem: { type: Number, required: true, default: 8.0 }
  }],
  WalletAddress: { type: String, required: true, unique: true },
  DaCapNhatHoSo: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('SinhVien', sinhVienSchema);
