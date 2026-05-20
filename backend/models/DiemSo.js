const mongoose = require('mongoose');

const diemSoSchema = new mongoose.Schema({
  BaoCao: { type: mongoose.Schema.Types.ObjectId, ref: 'BaoCao', required: true },
  GiangVienCam: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  GiangVienCham: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien' },
  SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien', required: true },
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  Diem: { type: Number, required: true, min: 0, max: 10 },
  NhanXet: { type: String },
  AI_Score: { type: Number },      // Điểm đánh giá dự kiến từ AI
  AI_Feedback: { type: String },   // Feedback từ mô hình AI
  RubricsResult: [{
    TenTieuChi: { type: String },
    TrongSo: { type: Number },
    DiemToiDa: { type: Number },
    AI_DiemTieuChi: { type: Number },          // Điểm AI gợi ý cho tiêu chí này
    GV_DiemTieuChi: {
      type: Number,
      validate: {
        validator: function (value) {
          if (value === null || value === undefined) {
            return true;
          }
          return value <= this.DiemToiDa;
        },
        message: 'GV_DiemTieuChi vượt quá DiemToiDa'
      }
    },          // Điểm GV chấm thực tế
    AI_NhanXetTieuChi: { type: String },       // Feedback AI riêng cho tiêu chí này
    MatchedChunk: {                             // Chunk nào AI đã match
      index: { type: Number },
      heading: { type: String }
    }
  }],
  TxHash: { type: String },         // Mã giao dịch lưu trên Blockchain
  TrangThaiBlockchain: {
    type: String,
    enum: ['ChuaGhi', 'Pending', 'DaGhi', 'LoiGhi'],
    default: 'ChuaGhi'
  },
  SubmissionIndex: { type: Number, default: 0 },
  LoiBlockchain: { type: String }
}, { timestamps: true });

diemSoSchema.index({ BaoCao: 1 }, { unique: true });
diemSoSchema.index({ DeTai: 1, SinhVien: 1 });

module.exports = mongoose.model('DiemSo', diemSoSchema);
