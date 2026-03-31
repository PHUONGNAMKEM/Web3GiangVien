require('dotenv').config();
const mongoose = require('mongoose');

const giangVienSchema = new mongoose.Schema({
  ho_ten: { type: String, required: true },
  dia_chi_vi: { type: String, required: true, unique: true },
  chuyen_nganh: { type: String },
  role_id: { type: String, default: 'LECTURER_ROLE' },
  isActive: { type: Boolean, default: true }
}, { collection: 'giangviens' });

const GiangVien = mongoose.models.GiangVien || mongoose.model('GiangVien', giangVienSchema);

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Đang kết nối MongoDB Cloud...');
    const address = '0x3081F8965F007A78C1502b51DAC0bD54E6f6dBBF';
    
    // Delete any student representation just in case they mistakenly registered it
    try {
      const SinhVien = mongoose.connection.collection('sinhviens');
      await SinhVien.deleteOne({ dia_chi_vi: new RegExp('^' + address + '$', 'i') });
    } catch (e) { }

    let existing = await GiangVien.findOne({ dia_chi_vi: new RegExp(`^${address}$`, 'i') });
    if (existing) {
        console.log('✅ Địa chỉ ví này đã có trong danh sách Giảng Viên rồi!');
    } else {
        await GiangVien.create({
            ho_ten: 'PGS.TS Admin Hệ Thống',
            dia_chi_vi: address,
            role_id: 'LECTURER_ROLE',
            chuyen_nganh: 'Blockchain & AI'
        });
        console.log('🚀 Đã chèn thành công Ví MetaMask số 2 vào bảng Giảng Viên!');
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Lỗi lỗi:', err);
    process.exit(1);
  });
