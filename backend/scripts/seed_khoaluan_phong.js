require('dotenv').config();
const mongoose = require('mongoose');
const DeTai = require('../models/DeTai');
const GiangVien = require('../models/GiangVien');

async function seed() {
  console.log('🔗 Đang kết nối MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Đã kết nối MongoDB thành công!');

  // 1. Tìm Giáo Sư Phong (GV73F5CF)
  const gvGS = await GiangVien.findOne({ HoTen: /Giáo Sư Phong/i });
  // 2. Tìm PGS.TS Phong (GV003)
  const gvPGS = await GiangVien.findOne({ HoTen: /PGS.TS Phong/i });

  if (!gvGS && !gvPGS) {
    console.error('❌ Không tìm thấy Giảng viên Phong nào trong DB!');
    process.exit(1);
  }

  // 3. Tạo đề tài khóa luận cho Giáo Sư Phong
  if (gvGS) {
    console.log(`✅ Tạo đề tài khóa luận cho Giáo Sư Phong (ID: ${gvGS._id})`);
    const topicGS = {
      MaDeTai: 'DT_KL_GSPHONG_01',
      TenDeTai: 'Nghiên cứu kiến trúc Blockchain Sharding và tối ưu TPS trong thanh toán Web3 toàn cầu',
      MoTa: 'Đề tài khóa luận tốt nghiệp tập trung nghiên cứu giải thuật Sharding tối ưu cho blockchain phi tập trung.',
      MoTaChiTiet: 'Xây dựng môi trường mạng blockchain giả lập 4 shards, áp dụng đồng thuận Proof-of-Stake và viết Smart Contract để kiểm thử hiệu năng.',
      YeuCau: ['Solidity', 'Go', 'Blockchain architecture', 'Performance testing'],
      Deadline: new Date(new Date().setDate(new Date().getDate() + 90)),
      HanDangKy: new Date(new Date().setDate(new Date().getDate() + 15)),
      HanNopBaoCao: new Date(new Date().setDate(new Date().getDate() + 90)),
      GiangVienHuongDan: gvGS._id,
      MonHoc: null,
      LopHoc: [],
      CoBaiTest: true,
      TrangThai: 'MoDangKy',
      LoaiDeTai: 'KhoaLuan'
    };
    await DeTai.deleteOne({ MaDeTai: topicGS.MaDeTai });
    await DeTai.create(topicGS);
    console.log('✅ Đã tạo thành công đề tài khóa luận cho Giáo Sư Phong!');
  }

  // 4. Tạo đề tài khóa luận cho PGS.TS Phong
  if (gvPGS) {
    console.log(`✅ Tạo đề tài khóa luận cho PGS.TS Phong (ID: ${gvPGS._id})`);
    const topicPGS = {
      MaDeTai: 'DT_KL_PGSPHONG_01',
      TenDeTai: 'Ứng dụng AI và Smart Contract trong tự động hóa cấp NFT chứng nhận nghiên cứu khoa học',
      MoTa: 'Đề tài khóa luận tốt nghiệp ứng dụng AI gợi ý chấm điểm báo cáo và tự động hóa mint Soulbound Token (SBT).',
      MoTaChiTiet: 'Xây dựng hệ thống backend FastAPI tích hợp Oracles và Smart Contract ERC-721 cấp NFT chứng chỉ học thuật phi tập trung.',
      YeuCau: ['React', 'FastAPI', 'Solidity', 'Web3.js'],
      Deadline: new Date(new Date().setDate(new Date().getDate() + 90)),
      HanDangKy: new Date(new Date().setDate(new Date().getDate() + 15)),
      HanNopBaoCao: new Date(new Date().setDate(new Date().getDate() + 90)),
      GiangVienHuongDan: gvPGS._id,
      MonHoc: null,
      LopHoc: [],
      CoBaiTest: true,
      TrangThai: 'MoDangKy',
      LoaiDeTai: 'KhoaLuan'
    };
    await DeTai.deleteOne({ MaDeTai: topicPGS.MaDeTai });
    await DeTai.create(topicPGS);
    console.log('✅ Đã tạo thành công đề tài khóa luận cho PGS.TS Phong!');
  }

  console.log('🎉 Quá trình seed đề tài khóa luận cho cả hai giảng viên Phong hoàn tất!');
  await mongoose.disconnect();
}

seed().catch(console.error);
