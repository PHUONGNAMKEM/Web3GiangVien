require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Đang kết nối để sửa lỗi...');
    const address = '0x3081F8965F007A78C1502b51DAC0bD54E6f6dBBF'.toLowerCase();
    
    // Xóa record rác bên SinhVien
    const SinhVien = mongoose.connection.collection('sinhviens');
    await SinhVien.deleteMany({ WalletAddress: new RegExp('^' + address + '$', 'i') });

    // Xóa record sai schema bên GiangVien 
    const GiangVien = mongoose.connection.collection('giangviens');
    await GiangVien.deleteMany({ dia_chi_vi: new RegExp('^' + address + '$', 'i') });
    await GiangVien.deleteMany({ WalletAddress: new RegExp('^' + address + '$', 'i') });

    // Thêm lại đúng Schema
    await GiangVien.insertOne({
        MaGV: 'GV001',
        HoTen: 'PGS.TS Admin Hệ Thống',
        Email: 'admin@huit.edu.vn',
        ChuyenNganh: 'Blockchain & AI',
        WalletAddress: address,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    
    console.log('🚀 Đã chèn ĐÚNG Ví MetaMask số 2 vào bảng Giảng Viên!');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Lỗi lỗi:', err);
    process.exit(1);
  });
