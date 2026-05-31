const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// Require models to register in Mongoose
const SinhVien = require('../models/SinhVien');
const GiangVien = require('../models/GiangVien');
const MonHoc = require('../models/MonHoc');
const LopHoc = require('../models/LopHoc');
const Nhom = require('../models/Nhom');
const DeTai = require('../models/DeTai');
const DangKyDeTai = require('../models/DangKyDeTai');
const BaiTest = require('../models/BaiTest');
const KetQuaTest = require('../models/KetQuaTest');
const BaoCao = require('../models/BaoCao');
const DiemSo = require('../models/DiemSo');
const TienDo = require('../models/TienDo');

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const svCodes = ['SVEDA301', 'SV4C2231', 'SV0A9E53'];
  const students = await SinhVien.find({ MaSV: { $in: svCodes } });
  const svIds = students.map(s => s._id);

  console.log('\n--- 1. Deleting Groups containing test students ---');
  // Find all groups containing these students
  const nhoms = await Nhom.find({
    $or: [
      { TruongNhom: { $in: svIds } },
      { 'ThanhVien.SinhVien': { $in: svIds } }
    ]
  });
  const nhomIds = nhoms.map(n => n._id);

  const deleteNhomResult = await Nhom.deleteMany({ _id: { $in: nhomIds } });
  console.log(`Deleted ${deleteNhomResult.deletedCount} Nhom records.`);

  console.log('\n--- 2. Deleting Topic Registrations (DangKyDeTai) ---');
  const deleteRegResult = await DangKyDeTai.deleteMany({
    $or: [
      { SinhVien: { $in: svIds } },
      { TruongNhom: { $in: svIds } },
      { 'ThanhVien.SinhVien': { $in: svIds } },
      { Nhom: { $in: nhomIds } }
    ]
  });
  console.log(`Deleted ${deleteRegResult.deletedCount} DangKyDeTai records.`);

  console.log('\n--- 3. Deleting Test Results (KetQuaTest) ---');
  const deleteKetQuaResult = await KetQuaTest.deleteMany({
    $or: [
      { Nhom: { $in: nhomIds } },
      { SinhVien: { $in: svIds } },
      { 'ThanhVien.SinhVien': { $in: svIds } }
    ]
  });
  console.log(`Deleted ${deleteKetQuaResult.deletedCount} KetQuaTest records.`);

  console.log('\n--- 4. Deleting Submissions (BaoCao) ---');
  const deleteBaoCaoResult = await BaoCao.deleteMany({
    $or: [
      { SinhVien: { $in: svIds } },
      { Nhom: { $in: nhomIds } }
    ]
  });
  console.log(`Deleted ${deleteBaoCaoResult.deletedCount} BaoCao records.`);

  console.log('\n--- 5. Deleting Grades (DiemSo) ---');
  const deleteDiemResult = await DiemSo.deleteMany({
    $or: [
      { SinhVien: { $in: svIds } },
      { Nhom: { $in: nhomIds } }
    ]
  });
  console.log(`Deleted ${deleteDiemResult.deletedCount} DiemSo records.`);

  console.log('\n--- 6. Deleting Progress logs (TienDo) ---');
  const deleteTienDoResult = await TienDo.deleteMany({
    $or: [
      { SinhVien: { $in: svIds } },
      { Nhom: { $in: nhomIds } }
    ]
  });
  console.log(`Deleted ${deleteTienDoResult.deletedCount} TienDo records.`);

  console.log('\n--- 7. Resetting existing topic statuses to "MoDangKy" ---');
  const resetTopicsResult = await DeTai.updateMany(
    {},
    { $set: { TrangThai: 'MoDangKy' } }
  );
  console.log(`Reset status for ${resetTopicsResult.modifiedCount} existing DeTai records.`);

  console.log('\n--- 7.1. Resetting existing competitive test statuses to "MoNop" ---');
  const resetTestsResult = await BaiTest.updateMany(
    {},
    { $set: { TrangThai: 'MoNop' } }
  );
  console.log(`Reset status for ${resetTestsResult.modifiedCount} existing BaiTest records.`);

  console.log('\n--- 8. Seeding a new Blockchain topic for class 13DHTH02 ---');
  const lopHoc02Id = '6a1a63d81d64e4b395b48ad0';
  const monHoc02Id = '6a1a63d01d64e4b395b48abf';
  const gvId = '69e335fac15c496105bc2a2f'; // PGS.TS Phong

  // Verify class exists
  const class02 = await LopHoc.findById(lopHoc02Id);
  if (!class02) {
    console.error(`ERROR: Class 13DHTH02 (ID: ${lopHoc02Id}) not found in the database. Seeding aborted!`);
  } else {
    // Delete any existing topic with the code DT_BLOCKCHAIN_01 to avoid duplicates
    await DeTai.deleteOne({ MaDeTai: 'DT_BLOCKCHAIN_01' });

    const newTopic = new DeTai({
      MaDeTai: 'DT_BLOCKCHAIN_01',
      TenDeTai: 'Xây dựng Hệ Thống Bình Chọn Phi Tập Trung (Decentralized Voting) sử dụng Smart Contract',
      MoTa: 'Nghiên cứu ứng dụng Blockchain Ethereum và Smart Contract để giải quyết bài toán bỏ phiếu bầu cử công bằng, minh bạch, chống gian lận. Sinh viên xây dựng DApp tích hợp ví MetaMask và hiển thị biểu đồ kết quả thời gian thực.',
      YeuCau: ['ReactJS', 'Solidity', 'Ethers.js', 'MetaMask'],
      Deadline: new Date(new Date().setDate(new Date().getDate() + 30)),
      HanDangKy: new Date(new Date().setDate(new Date().getDate() + 15)),
      HanNopBaoCao: new Date(new Date().setDate(new Date().getDate() + 30)),
      GiangVienHuongDan: gvId,
      MonHoc: monHoc02Id,
      LopHoc: [lopHoc02Id],
      SoLuongSinhVien: 2,
      CoBaiTest: true,
      SuDungRubrics: true,
      Rubrics: [
        {
          TenTieuChi: 'Kiến trúc hệ thống & Smart Contract',
          MoTa: 'Thiết kế smart contract tối ưu gas, an toàn bảo mật, chống reentrancy.',
          TrongSo: 40,
          DiemToiDa: 10,
          GoiYChoAI: ['solidity', 'smart contract', 'security', 'gas optimization']
        },
        {
          TenTieuChi: 'Giao diện người dùng & Trải nghiệm Web3',
          MoTa: 'Kết nối MetaMask mượt mà, đồng bộ state giao dịch, hiển thị kết quả trực quan.',
          TrongSo: 30,
          DiemToiDa: 10,
          GoiYChoAI: ['react', 'metamask', 'ethers', 'web3', 'dapp']
        },
        {
          TenTieuChi: 'Báo cáo phân tích & Đánh giá',
          MoTa: 'Phân tích lý thuyết, cấu trúc blockchain áp dụng và biểu diễn dữ liệu thực nghiệm.',
          TrongSo: 30,
          DiemToiDa: 10,
          GoiYChoAI: ['voting', 'decentralized', 'blockchain', 'report']
        }
      ],
      TrangThai: 'MoDangKy'
    });

    await newTopic.save();
    console.log('Seeded new Blockchain Topic DT_BLOCKCHAIN_01 for class 13DHTH02 successfully!');

    // Seed competitive test for this new topic if needed so they can compete!
    await BaiTest.deleteOne({ DeTai: newTopic._id });
    const newTest = new BaiTest({
      DeTai: newTopic._id,
      TieuDe: 'Bài Test Trắc Nghiệm Công Nghệ Blockchain Cạnh Tranh',
      MoTa: 'Bài test trắc nghiệm 10 câu hỏi về mật mã học, cơ chế đồng thuận, smart contract để đánh giá khả năng nhận đề tài.',
      ThoiGianLam: 15, // 15 mins
      NguongDat: 75,
      CauHoi: [
        {
          LoaiCauHoi: 'TracNghiem',
          NoiDung: 'Cơ chế đồng thuận Proof of Work (PoW) giải quyết bài toán nào sau đây?',
          LuaChon: [
            'A. Double Spending (Chi tiêu kép) & Byzantine Generals',
            'B. Tốc độ giao dịch siêu nhanh',
            'C. Lưu trữ dữ liệu tập trung',
            'D. Giảm thiểu lượng tiêu thụ điện năng'
          ],
          DapAnDung: 'A',
          Diem: 3
        },
        {
          LoaiCauHoi: 'TracNghiem',
          NoiDung: 'Ngôn ngữ lập trình phổ biến nhất để phát triển Smart Contract trên Ethereum là gì?',
          LuaChon: ['A. Python', 'B. Solidity', 'C. Go', 'D. Rust'],
          DapAnDung: 'B',
          Diem: 3
        },
        {
          LoaiCauHoi: 'TracNghiem',
          NoiDung: 'Hàm nào trong Solidity được dùng để nhận Ether mà không kèm theo dữ liệu gọi hàm?',
          LuaChon: ['A. receive()', 'B. fallback()', 'C. pay()', 'D. deposit()'],
          DapAnDung: 'A',
          Diem: 4
        }
      ],
      TrangThai: 'MoNop'
    });
    await newTest.save();
    console.log('Seeded competitive test for new topic DT_BLOCKCHAIN_01 successfully!');
  }

  await mongoose.disconnect();
  console.log('\n--- MongoDB Reset and Seed Completed! ---');
}

run().catch(console.error);
