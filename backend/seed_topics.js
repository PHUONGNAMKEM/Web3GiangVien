require('dotenv').config();
const mongoose = require('mongoose');

const deTaiSchema = new mongoose.Schema({
  MaDeTai: { type: String, required: true, unique: true },
  TenDeTai: { type: String, required: true },
  MoTa: { type: String },
  YeuCau: [{ type: String }],
  Deadline: { type: Date, required: true },
  GiangVienHuongDan: { type: mongoose.Schema.Types.ObjectId, ref: 'GiangVien', required: true },
  TrangThai: { type: String, enum: ['MoDangKy', 'DaChot', 'HoanThanh'], default: 'MoDangKy' }
}, { timestamps: true });

const DeTai = mongoose.models.DeTai || mongoose.model('DeTai', deTaiSchema);

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('🔗 Đang kết nối MongoDB...');
    
    // Get a valid Lecturer
    const GiangVien = mongoose.connection.collection('giangviens');
    const gv = await GiangVien.findOne({});
    if (!gv) {
        throw new Error("Không có dữ liệu Giảng Viên trong DB. Vui lòng tạo 1 Giảng viên trước!");
    }

    const sampleTopics = [
        {
            MaDeTai: 'DT_WEB3_01',
            TenDeTai: 'Xây dựng Sàn Giao Dịch Bất Động Sản mã hóa trên nền tảng Ethereum',
            MoTa: 'Ứng dụng Web3 phân quyền (DApp) cho phép mua bán fractional real-estate sử dụng ERC-1155.',
            YeuCau: ['Solidity', 'ReactJS', 'Ethers.js', 'Hardhat'],
            Deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            GiangVienHuongDan: gv._id,
            TrangThai: 'MoDangKy'
        },
        {
            MaDeTai: 'DT_AI_02',
            TenDeTai: 'Nghiên cứu mô hình Language Model trong dự đoán xu hướng giá Token',
            MoTa: 'Thu thập dữ liệu Crypto Twitter và huấn luyện mô hình Transformer (PhoBERT/BERT) để phân tích Sentiment.',
            YeuCau: ['Python', 'PyTorch', 'Transformers', 'Data Science'],
            Deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            GiangVienHuongDan: gv._id,
            TrangThai: 'MoDangKy'
        },
        {
            MaDeTai: 'DT_MOBILE_03',
            TenDeTai: 'Phát triển Ví Tiền Điện Tử Web3 dành cho hệ điều hành di động',
            MoTa: 'Ứng dụng React Native Mobile Wallet hỗ trợ quét mã QR, WalletConnect v2 và hiển thị tài sản ERC-20.',
            YeuCau: ['React Native', 'Web3.js', 'Redux', 'Mobile Development'],
            Deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            GiangVienHuongDan: gv._id,
            TrangThai: 'MoDangKy'
        },
        {
            MaDeTai: 'DT_SYS_04',
            TenDeTai: 'Thiết kế hệ thống định danh phi tập trung (DID) cho Cơ quan nhà nước',
            MoTa: 'Xây dựng giải pháp cấp phát Chứng minh nhân dân số bằng Verifiable Credentials trên Blockchain Hyperledger.',
            YeuCau: ['Hyperledger', 'Go', 'Docker', 'Cryptography'],
            Deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            GiangVienHuongDan: gv._id,
            TrangThai: 'MoDangKy'
        }
    ];

    // Clear corrupted collection and indexes
    try {
        await mongoose.connection.collection('detais').drop();
    } catch(e) {
        console.log("Collection does not exist or already dropped.");
    }
    
    // Insert new topics
    await DeTai.insertMany(sampleTopics);
    
    console.log(`✅ Đã bơm thành công ${sampleTopics.length} bộ Đề tài mẫu chuẩn Schema vào Database!`);
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Lỗi:', err);
    process.exit(1);
  });
