const mongoose = require('mongoose');

const baoCaoSchema = new mongoose.Schema({
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien', required: true },
  TieuDe: { type: String, required: true },
  IPFS_CID: { type: String, required: true }, // Nơi lưu trữ hash của file PDF trên mạng IPFS
  SubmitTxHash: { type: String, default: null }, // Mã giao dịch khi SV nộp bài lên Blockchain
  NgayNop: { type: Date, default: Date.now },
  ExtractedText: { type: String, default: null },
  ExtractedAt: { type: Date, default: null },
  PageCount: { type: Number, default: null },
  ExtractionMethod: { 
      type: String, 
      enum: ['native', 'ocr', 'failed', null], 
      default: null 
  },
  ExtractionWarnings: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('BaoCao', baoCaoSchema);
