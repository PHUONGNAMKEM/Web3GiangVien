const mongoose = require('mongoose');

const deTaiSchema = new mongoose.Schema({
  MaDeTai: { type: String, required: true, unique: true },
  TenDeTai: { type: String, required: true },
  MoTa: { type: String },
  MoTaChiTiet: { type: String, default: '' },
  YeuCau: [{ type: String }],
  ChiTietBoSung: [{
    TieuDe: { type: String, default: '' },
    NoiDung: { type: String, default: '' }
  }],
  // === RUBRICS CHẤM ĐIỂM ===
  Rubrics: [{
    TenTieuChi: { type: String, required: true },          // VD: "Nội dung kỹ thuật"
    MoTa: { type: String, default: '' },                   // VD: "Đánh giá mức độ hiểu biết kỹ thuật"
    TrongSo: { type: Number, required: true, min: 0, max: 100 },  // % trọng số (tổng = 100)
    DiemToiDa: { type: Number, default: 10 },              // Thang điểm tối đa tiêu chí này
    GoiYChoAI: [{ type: String }]                          // Keywords cho AI matching (VD: ["React","API"])
  }],
  SuDungRubrics: { type: Boolean, default: false },        // Có dùng Rubrics không
  HienThiChiTietChoSV: { type: Boolean, default: false },  // GV quyết định SV có xem chi tiết không
  SoLuongSinhVien: { type: Number, default: 1, min: 1 },
  Deadline: { type: Date, required: true },           // (giữ tương thích) hạn tổng quát
  HanDangKy: { type: Date },                           // Hạn chót đăng ký đề tài (sau hạn này không cho đăng ký)
  HanNopBaoCao: { type: Date },                        // Hạn chót nộp báo cáo (mặc định lấy theo Deadline nếu trống)
  HanCapNhatTienDo: { type: Date },                    // Hạn chót cập nhật nhật ký tiến độ (mặc định lấy theo HanNopBaoCao || Deadline)
  GiangVienHuongDan: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  MonHoc: { type: mongoose.Schema.Types.ObjectId, ref: 'MonHoc' },
  LopHoc: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LopHoc' }],
  CoBaiTest: { type: Boolean, default: false },       // Có yêu cầu bài test cạnh tranh không
  TrangThai: { type: String, enum: ['MoDangKy', 'DaChot', 'HoanThanh'], default: 'MoDangKy' },
  LoaiDeTai: { type: String, enum: ['MonHoc', 'KhoaLuan'], default: 'MonHoc' }
}, { timestamps: true });

module.exports = mongoose.model('DeTai', deTaiSchema);
