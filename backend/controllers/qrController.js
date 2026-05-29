const crypto = require('crypto');
const QrCode = require('../models/QrCode');

const qrController = {
  // Lấy mã QR hiện tại của user
  getQrCode: async (req, res) => {
    try {
      const { id: userId, walletAddress, role_id } = req.user;

      let qrCode = await QrCode.findOne({
        user_id: userId,
        status: 'active'
      });

      if (!qrCode) {
        // Nếu chưa có, tự động tạo một cái mới
        const newHash = crypto.randomBytes(32).toString('hex');
        
        // Xác định role model dựa trên role_id
        const roleModel = role_id === 'LECTURER_ROLE' ? 'GiangVien' : 'SinhVien';

        qrCode = new QrCode({
          user_id: userId,
          wallet_address: walletAddress.toLowerCase(),
          role: role_id,
          role_model: roleModel,
          qr_hash: newHash,
          status: 'active'
        });
        await qrCode.save();
      }

      res.status(200).json({
        success: true,
        data: qrCode
      });
    } catch (error) {
      console.error('[QR Controller] Error in getQrCode:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi lấy mã QR' });
    }
  },

  // Tạo mã QR mới (vô hiệu hóa mã cũ)
  generateQrCode: async (req, res) => {
    try {
      const { id: userId, walletAddress, role_id } = req.user;

      // Vô hiệu hóa mã cũ
      await QrCode.updateMany(
        { user_id: userId },
        { $set: { status: 'inactive' } }
      );

      const newHash = crypto.randomBytes(32).toString('hex');
      const roleModel = role_id === 'LECTURER_ROLE' ? 'GiangVien' : 'SinhVien';

      const newQrCode = new QrCode({
        user_id: userId,
        wallet_address: walletAddress.toLowerCase(),
        role: role_id,
        role_model: roleModel,
        qr_hash: newHash,
        status: 'active'
      });
      await newQrCode.save();

      res.status(200).json({
        success: true,
        message: 'Tạo mã QR mới thành công',
        data: newQrCode
      });
    } catch (error) {
      console.error('[QR Controller] Error in generateQrCode:', error);
      res.status(500).json({ success: false, message: 'Lỗi server khi tạo mã QR mới' });
    }
  }
};

module.exports = qrController;
