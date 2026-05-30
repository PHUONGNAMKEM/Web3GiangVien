const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'role_model'
  },
  wallet_address: {
    type: String,
    required: true,
    lowercase: true
  },
  role: {
    type: String,
    enum: ['LECTURER_ROLE', 'STUDENT_ROLE'],
    required: true
  },
  role_model: {
    type: String,
    required: true,
    enum: ['GiangVien', 'SinhVien']
  },
  qr_hash: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Chú ý: Đảm bảo wallet_address luôn lưu dạng lowercase để dễ so sánh
qrCodeSchema.pre('save', function(next) {
  if (this.wallet_address) {
    this.wallet_address = this.wallet_address.toLowerCase();
  }
  next();
});

module.exports = mongoose.model('QrCode', qrCodeSchema);
