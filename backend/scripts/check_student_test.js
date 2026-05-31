require('dotenv').config();
const mongoose = require('mongoose');
const DeTai = require('../models/DeTai');
const GiangVien = require('../models/GiangVien');
const DangKyDeTai = require('../models/DangKyDeTai');
const BaiTest = require('../models/BaiTest');
const SinhVien = require('../models/SinhVien');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. List all thesis topics
  const topics = await DeTai.find({ LoaiDeTai: 'KhoaLuan' }).populate('GiangVienHuongDan');
  console.log('\n--- ALL THESIS TOPICS ---');
  for (const deTai of topics) {
    const test = await BaiTest.findOne({ DeTai: deTai._id });
    console.log({
      _id: deTai._id,
      MaDeTai: deTai.MaDeTai,
      TenDeTai: deTai.TenDeTai,
      GiangVienHuongDan: deTai.GiangVienHuongDan ? deTai.GiangVienHuongDan.HoTen : 'N/A',
      CoBaiTest: deTai.CoBaiTest,
      HasTestRecord: !!test,
      TestTitle: test ? test.TieuDe : 'N/A'
    });
  }

  // 2. Find Tran Minh Anh
  const sv = await SinhVien.findOne({ HoTen: /Trần Minh Anh/i });
  console.log('\n--- SINH VIEN DETAILS ---');
  if (sv) {
    console.log({
      _id: sv._id,
      HoTen: sv.HoTen
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
