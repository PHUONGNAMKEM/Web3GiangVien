const mongoose = require('mongoose');

const ketQuaTestSchema = new mongoose.Schema({
  BaiTest: { type: mongoose.Schema.Types.ObjectId, ref: 'BaiTest', required: true },
  DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai', required: true },
  SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien', required: true },
  DangKyDeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DangKyDeTai' },
  Nhom: { type: mongoose.Schema.Types.ObjectId, ref: 'Nhom' },
  TraLoi: [{
    CauHoiIndex: { type: Number, required: true },
    LoaiCauHoi: { type: String, enum: ['TracNghiem', 'Code'] },
    TraLoiText: { type: String, default: '' },       // Đáp án SV chọn hoặc code viết
    Diem: { type: Number, default: 0 },              // Điểm đạt được
    DiemToiDa: { type: Number, default: 1 },
    DungSai: { type: Boolean },                      // Đúng/Sai (trắc nghiệm)
    AI_Similarity: { type: Number }                  // SBERT similarity score (code)
  }],
  TongDiem: { type: Number, default: 0 },
  DiemToiDa: { type: Number, default: 0 },
  TxHash: { type: String },                          // Blockchain transaction
  ThoiGianBatDau: { type: Date },
  ThoiGianNop: { type: Date },
  SoLanNop: { type: Number, default: 1 }             // Số lần đã nộp (tối đa 3)
}, { timestamps: true });

// Một SV chỉ nộp 1 lần cho 1 bài test
ketQuaTestSchema.index({ BaiTest: 1, SinhVien: 1 }, { unique: true });

module.exports = mongoose.model('KetQuaTest', ketQuaTestSchema);
