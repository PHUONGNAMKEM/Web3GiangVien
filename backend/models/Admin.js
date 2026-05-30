const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  WalletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  HoTen: {
    type: String,
    required: true,
    default: 'Super Admin'
  }
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);
