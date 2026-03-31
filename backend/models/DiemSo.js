const mongoose = require('mongoose');

const diemSoSchema = new mongoose.Schema({
  BaoCao: { type: mongoose.Schema.Types.ObjectId, ref: 'BaoCao', required: true },
  GiangVienCam: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien', required: true },
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  Diem: { type: Number, required: true },
  NhanXet: { type: String },
  AI_Score: { type: Number },      // Điểm đánh giá dự kiến từ AI
  AI_Feedback: { type: String },   // Feedback từ mô hình AI
  TxHash: { type: String }         // Mã giao dịch lưu trên Blockchain
}, { timestamps: true });

module.exports = mongoose.model('DiemSo', diemSoSchema);
