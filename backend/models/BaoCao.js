const mongoose = require('mongoose');

const baoCaoSchema = new mongoose.Schema({
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien', required: true },
  Nhom: { type: mongoose.Schema.Types.ObjectId, ref: 'Nhom' },
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
  ExtractionWarnings: { type: [String], default: [] },
  // Cache kết quả phân tích AI (PhoBERT + LLM) cho bài CHƯA chấm.
  // textHash để vô hiệu hóa cache nếu nội dung bài thay đổi (nộp lại).
  // Mở lại / reload trang → đọc cache thay vì gọi lại AI (tiết kiệm compute + chi phí Gemini).
  AICache: {
    textHash: { type: String, default: null },
    isRubrics: { type: Boolean, default: false },
    score: { type: Number, default: null },
    feedback: { type: String, default: null },
    issues: { type: [String], default: undefined },
    rubricsResult: { type: mongoose.Schema.Types.Mixed, default: undefined },
    securityFlags: { type: [String], default: undefined },
    repetitionRate: { type: Number, default: null },
    model: { type: String, default: null },
    llmFeedback: { type: String, default: null },
    llmProvider: { type: String, default: null },
    updatedAt: { type: Date, default: null }
  }
}, { timestamps: true });

module.exports = mongoose.model('BaoCao', baoCaoSchema);
