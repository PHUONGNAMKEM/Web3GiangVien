require('dotenv').config();
const mongoose = require('mongoose');
const GiangVien = require('../models/GiangVien');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('🔗 Đã kết nối MongoDB.');

  // In ra collections hiện tại trong DB
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('=== COLLECTIONS TRONG DB ===');
  collections.forEach(c => console.log(`- ${c.name}`));

  // In ra một số tài khoản users nếu có
  try {
    const User = mongoose.connection.collection('users');
    const users = await User.find({}).toArray();
    console.log('=== DANH SÁCH USERS (TÀI KHOẢN ĐĂNG NHẬP) ===');
    users.forEach(u => {
      console.log(`- ID: ${u._id} | Username: ${u.username} | Email: ${u.email} | Role: ${u.role_id} | Wallet: ${u.walletAddress}`);
    });
  } catch (e) {
    console.log('Không có collection users hoặc lỗi:', e.message);
  }

  // In ra danh sách GiangVien
  const gvs = await GiangVien.find({});
  console.log('=== DANH SÁCH GIẢNG VIÊN (GIANGVIEN) ===');
  gvs.forEach(g => {
    console.log(`- ID: ${g._id} | HoTen: ${g.HoTen} | Email: ${g.Email} | Wallet: ${g.WalletAddress}`);
  });

  await mongoose.disconnect();
}

check().catch(console.error);
