const mongoose = require('mongoose');

const baoCaoSchema = new mongoose.Schema({
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien', required: true },
  TieuDe: { type: String, required: true },
  IPFS_CID: { type: String, required: true }, // Nơi lưu trữ hash của file PDF trên mạng IPFS
  NgayNop: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('BaoCao', baoCaoSchema);
