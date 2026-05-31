require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('🔗 Đang kết nối MongoDB...');
  
  const DeTai = mongoose.connection.collection('detais');
  const list = await DeTai.find({ LoaiDeTai: 'KhoaLuan' }).toArray();

  console.log('=== DANH SÁCH ĐỀ TÀI KHÓA LUẬN TRONG DB ===');
  list.forEach(t => {
    console.log(`- ID: ${t._id}`);
    console.log(`  Mã đề tài: ${t.MaDeTai}`);
    console.log(`  Tên đề tài: ${t.TenDeTai}`);
    console.log(`  Giảng viên hướng dẫn (ID): ${t.GiangVienHuongDan}`);
    console.log(`  LoaiDeTai: ${t.LoaiDeTai}`);
  });

  await mongoose.disconnect();
}

check().catch(console.error);
