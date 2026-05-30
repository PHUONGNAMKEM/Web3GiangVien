const mongoose = require('mongoose');

const RoleRequestSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  hoTen: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  chuyenNganh: {
    type: String,
    required: true
  },
  requestedRole: {
    type: String,
    default: 'LECTURER_ROLE'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectReason: {
    type: String
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewedAt: {
    type: Date
  }
}, { timestamps: true });

// Create an index to help with the 3 requests per day logic
RoleRequestSchema.index({ walletAddress: 1, createdAt: -1 });

module.exports = mongoose.model('RoleRequest', RoleRequestSchema);
