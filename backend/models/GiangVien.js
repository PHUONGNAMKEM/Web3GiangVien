const mongoose = require('mongoose');

const giangVienSchema = new mongoose.Schema({
  MaGV: { type: String, required: true, unique: true },
  HoTen: { type: String, required: true },
  Email: { type: String, required: true, unique: true },
  ChuyenNganh: { type: String },
  WalletAddress: { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('GiangVien', giangVienSchema);
