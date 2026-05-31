require('dotenv').config();
const mongoose = require('mongoose');
const DeTai = require('../backend/models/DeTai');
const DangKyDeTai = require('../backend/models/DangKyDeTai');
const BaiTest = require('../backend/models/BaiTest');
const SinhVien = require('../backend/models/SinhVien');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const topicId = '6a1c285c48308ecc07b554fd';
  
  // 1. Check DeTai
  const deTai = await DeTai.findById(topicId).populate('GiangVienHuongDan');
  console.log('\n--- DE TAI DETAILS ---');
  if (deTai) {
    console.log({
      _id: deTai._id,
      MaDeTai: deTai.MaDeTai,
      TenDeTai: deTai.TenDeTai,
      LoaiDeTai: deTai.LoaiDeTai,
      CoBaiTest: deTai.CoBaiTest,
      GiangVienHuongDan: deTai.GiangVienHuongDan ? deTai.GiangVienHuongDan.HoTen : 'N/A'
    });
  } else {
    console.log('No topic found with ID:', topicId);
  }

  // 2. Check BaiTest for this topic
  const test = await BaiTest.findOne({ DeTai: topicId });
  console.log('\n--- BAI TEST DETAILS ---');
  if (test) {
    console.log({
      _id: test._id,
      TieuDe: test.TieuDe,
      CauHoiCount: test.CauHoi.length
    });
  } else {
    console.log('No BaiTest found for DeTai:', topicId);
  }

  // 3. Find Tran Minh Anh
  const sv = await SinhVien.findOne({ HoTen: /Trần Minh Anh/i });
  console.log('\n--- SINH VIEN DETAILS ---');
  if (sv) {
    console.log({
      _id: sv._id,
      HoTen: sv.HoTen,
      MaSinhVien: sv.MaSinhVien
    });

    // 4. Find Registrations for this student
    const regs = await DangKyDeTai.find({ SinhVien: sv._id }).populate({
      path: 'DeTai',
      populate: { path: 'GiangVienHuongDan' }
    });
    console.log('\n--- REGISTRATIONS FOR STUDENT ---');
    regs.forEach(r => {
      console.log({
        regId: r._id,
        deTaiId: r.DeTai ? r.DeTai._id : 'N/A',
        MaDeTai: r.DeTai ? r.DeTai.MaDeTai : 'N/A',
        TenDeTai: r.DeTai ? r.DeTai.TenDeTai : 'N/A',
        TrangThai: r.TrangThai,
        GiangVien: r.DeTai && r.DeTai.GiangVienHuongDan ? r.DeTai.GiangVienHuongDan.HoTen : 'N/A'
      });
    });
  } else {
    console.log('No student found named Trần Minh Anh');
  }

  await mongoose.disconnect();
}

check().catch(console.error);
