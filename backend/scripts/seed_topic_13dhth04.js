require('dotenv').config();
const mongoose = require('mongoose');
const LopHoc = require('../models/LopHoc');
const DeTai = require('../models/DeTai');
const MonHoc = require('../models/MonHoc');
const GiangVien = require('../models/GiangVien');

async function seed() {
  console.log('🔗 Đang kết nối MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Đã kết nối MongoDB thành công!');

  // 1. Tìm lớp học 13DHTH04
  let lopHoc = await LopHoc.findOne({ MaLopHoc: '13DHTH04' });
  
  if (!lopHoc) {
    console.log('📝 Không tìm thấy lớp 13DHTH04, tiến hành tạo mới lớp học...');
    
    // Tìm 1 giảng viên bất kỳ làm chủ nhiệm
    const gv = await GiangVien.findOne({});
    if (!gv) {
      console.error('❌ Không tìm thấy Giảng viên nào trong DB để tạo lớp học!');
      process.exit(1);
    }
    
    // Tìm 1 môn học bất kỳ
    let monHoc = await MonHoc.findOne({});
    if (!monHoc) {
      console.log('📝 Tạo môn học mẫu cho lớp học...');
      monHoc = await MonHoc.create({
        MaMonHoc: 'COMP_WEB3_TEST',
        TenMonHoc: 'Công nghệ Web3 & Blockchain nâng cao',
        MoTa: 'Môn học kiểm thử hệ thống Web3 + AI'
      });
    }

    // Tạo lớp 13DHTH04
    lopHoc = await LopHoc.create({
      MaLopHoc: '13DHTH04',
      TenLopHoc: '13DHTH04 - Công nghệ phần mềm nâng cao',
      MonHoc: monHoc._id,
      GiangVien: gv._id,
      SinhVien: [] // Có thể add sinh viên vào sau
    });
    console.log('✅ Đã tạo mới lớp học thành công:', lopHoc);
  } else {
    console.log('✅ Tìm thấy lớp học 13DHTH04 hiện có trong DB:', lopHoc._id);
  }

  // 2. Tạo 1-2 đề tài cho lớp 13DHTH04
  const topicsToCreate = [
    {
      MaDeTai: 'DT_13DHTH04_01',
      TenDeTai: 'Phát triển dApp bình chọn phi tập trung cho Hội đồng sinh viên',
      MoTa: 'Ứng dụng cơ chế chữ ký mù (blind signature) và mã hóa đồng hình để bảo mật phiếu bầu on-chain.',
      MoTaChiTiet: 'Hệ thống cho phép sinh viên bỏ phiếu bầu các đề xuất của nhà trường mà không làm lộ danh tính phiếu bầu, đồng thời kết quả được tính toán và xác minh công khai bằng Smart Contract.',
      YeuCau: ['Solidity', 'React', 'Ethers.js', 'Cryptography'],
      Deadline: new Date(new Date().setDate(new Date().getDate() + 30)),
      HanDangKy: new Date(new Date().setDate(new Date().getDate() + 7)),
      HanNopBaoCao: new Date(new Date().setDate(new Date().getDate() + 30)),
      GiangVienHuongDan: lopHoc.GiangVien,
      MonHoc: lopHoc.MonHoc,
      LopHoc: [lopHoc._id],
      CoBaiTest: true,
      TrangThai: 'MoDangKy',
      LoaiDeTai: 'MonHoc'
    },
    {
      MaDeTai: 'DT_13DHTH04_02',
      TenDeTai: 'Hệ thống cấp phát chứng chỉ số NFT tự động hóa bằng AI Oracles',
      MoTa: 'Ứng dụng AI phân tích submissions kết quả nghiên cứu và tự động mint SBT (Soulbound Token) chứng nhận cho sinh viên.',
      MoTaChiTiet: 'Nghiên cứu tích hợp FastAPI chấm điểm báo cáo với mạng lưới Blockchain, khi AI trả điểm trên 8.0 sẽ kích hoạt Smart Contract tự động mint SBT chứng chỉ vinh danh.',
      YeuCau: ['React', 'FastAPI', 'Web3.js', 'Hardhat', 'ERC-721'],
      Deadline: new Date(new Date().setDate(new Date().getDate() + 30)),
      HanDangKy: new Date(new Date().setDate(new Date().getDate() + 7)),
      HanNopBaoCao: new Date(new Date().setDate(new Date().getDate() + 30)),
      GiangVienHuongDan: lopHoc.GiangVien,
      MonHoc: lopHoc.MonHoc,
      LopHoc: [lopHoc._id],
      CoBaiTest: true,
      TrangThai: 'MoDangKy',
      LoaiDeTai: 'MonHoc'
    }
  ];

  for (const topicData of topicsToCreate) {
    try {
      // Xóa đề tài cũ trùng mã nếu có để tránh lỗi unique index
      await DeTai.deleteOne({ MaDeTai: topicData.MaDeTai });
      
      const newTopic = await DeTai.create(topicData);
      console.log(`✅ Đã tạo thành công đề tài: ${newTopic.MaDeTai} - ${newTopic.TenDeTai}`);
    } catch (error) {
      console.error(`❌ Lỗi khi tạo đề tài ${topicData.MaDeTai}:`, error);
    }
  }

  console.log('🎉 Quá trình seed đề tài cho lớp 13DHTH04 hoàn tất!');
  await mongoose.disconnect();
}

seed().catch(console.error);
