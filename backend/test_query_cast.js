const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const Nhom = require('./models/Nhom');

async function run() {
  await mongoose.connect(MONGODB_URI);
  
  const id = new mongoose.Types.ObjectId('6a1a78544b60708f9e9814bb'); // Group 2
  const lopHoc = new mongoose.Types.ObjectId('6a1a75fe4b60708f9e981221');
  const sinhVienIdString = '6a1851454c11e020c2403164'; // String ID of Diễm My

  // Query with String ID
  const queryWithString = {
    _id: { $ne: id },
    'ThanhVien.SinhVien': sinhVienIdString,
    'ThanhVien.TrangThai': 'DaChapNhan',
    LopHoc: lopHoc
  };

  const resultString = await Nhom.findOne(queryWithString);
  console.log('Result with String ID:', resultString ? resultString._id : 'null');

  // Query with ObjectId ID
  const queryWithObjectId = {
    _id: { $ne: id },
    'ThanhVien.SinhVien': new mongoose.Types.ObjectId(sinhVienIdString),
    'ThanhVien.TrangThai': 'DaChapNhan',
    LopHoc: lopHoc
  };

  const resultObjectId = await Nhom.findOne(queryWithObjectId);
  console.log('Result with ObjectId:', resultObjectId ? resultObjectId._id : 'null');

  await mongoose.disconnect();
}

run();
