const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

const LopHoc = require('./models/LopHoc');
const GiangVien = require('./models/GiangVien');
const MonHoc = require('./models/MonHoc');

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const classes = await LopHoc.find().populate('MonHoc').populate('GiangVien');
  console.log('=== ALL CLASSES ===');
  classes.forEach(c => {
    console.log(`- Class: "${c.TenLopHoc}" (${c.MaLopHoc}) | ID: ${c._id}`);
    console.log(`  MonHoc: "${c.MonHoc?.TenMonHoc}" (${c.MonHoc?.MaMonHoc}) | ID: ${c.MonHoc?._id}`);
    console.log(`  GiangVien: "${c.GiangVien?.HoTen}" | ID: ${c.GiangVien?._id}`);
  });

  const lecturers = await GiangVien.find();
  console.log('\n=== ALL LECTURERS ===');
  lecturers.forEach(l => {
    console.log(`- GV: "${l.HoTen}" | ID: ${l._id} | Wallet: ${l.WalletAddress}`);
  });

  await mongoose.disconnect();
}

run();
