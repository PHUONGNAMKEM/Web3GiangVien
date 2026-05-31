require('dotenv').config();
const mongoose = require('mongoose');
const GiangVien = require('../models/GiangVien');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('🔗 Đã kết nối MongoDB.');

  const listers = await GiangVien.find({});
  console.log('=== DANH SÁCH GIẢNG VIÊN TRONG DB ===');
  listers.forEach(gv => {
    console.log(`- ID: ${gv._id} | HoTen: ${gv.HoTen} | Email: ${gv.Email} | MaGV: ${gv.MaGV}`);
  });

  await mongoose.disconnect();
}

check().catch(console.error);
