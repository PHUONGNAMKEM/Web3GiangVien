const Admin = require('../models/Admin');
const RoleRequest = require('../models/RoleRequest');
const GiangVien = require('../models/GiangVien');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const getPendingRequests = async (req, res) => {
  try {
    const requests = await RoleRequest.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    console.error('getPendingRequests error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách yêu cầu.' });
  }
};

const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const request = await RoleRequest.findById(id);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Yêu cầu không tồn tại hoặc đã được xử lý.' });
    }

    // Update request
    request.status = 'approved';
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    await request.save();

    // Create GiangVien
    const newGiangVien = new GiangVien({
      MaGV: `GV${uuidv4().substring(0, 6).toUpperCase()}`,
      HoTen: request.hoTen,
      Email: request.email,
      ChuyenNganh: request.chuyenNganh,
      WalletAddress: request.walletAddress
    });
    await newGiangVien.save();

    // Generate Token
    const token = jwt.sign(
      { id: newGiangVien._id, walletAddress: newGiangVien.WalletAddress, role_id: 'LECTURER_ROLE' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Emit Socket
    const io = req.app.get('io');
    if (io) {
      console.log(`Emitting approve to room: pending:${request.walletAddress.toLowerCase()}`);
      io.to(`pending:${request.walletAddress.toLowerCase()}`).emit('request_result', {
        success: true,
        status: 'approved',
        token,
        user: {
          id: newGiangVien._id,
          walletAddress: newGiangVien.WalletAddress,
          role_id: 'LECTURER_ROLE',
          name: newGiangVien.HoTen
        }
      });
    }

    res.json({ success: true, message: 'Đã phê duyệt yêu cầu thành công.' });
  } catch (error) {
    console.error('approveRequest error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi phê duyệt yêu cầu.' });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối.' });
    }

    const request = await RoleRequest.findById(id);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Yêu cầu không tồn tại hoặc đã được xử lý.' });
    }

    // Update request
    request.status = 'rejected';
    request.rejectReason = reason;
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    await request.save();

    // Emit Socket
    const io = req.app.get('io');
    if (io) {
      console.log(`Emitting reject to room: pending:${request.walletAddress.toLowerCase()}`);
      io.to(`pending:${request.walletAddress.toLowerCase()}`).emit('request_result', {
        success: false,
        status: 'rejected',
        reason
      });
    }

    res.json({ success: true, message: 'Đã từ chối yêu cầu.' });
  } catch (error) {
    console.error('rejectRequest error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi từ chối yêu cầu.' });
  }
};

const getProcessedRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status; // 'approved' | 'rejected' | undefined (both)
    const search = req.query.search?.trim();
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;

    const filter = { status: { $in: ['approved', 'rejected'] } };
    if (statusFilter && ['approved', 'rejected'].includes(statusFilter)) {
      filter.status = statusFilter;
    }

    // Search by name, email or chuyenNganh
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { hoTen: searchRegex },
        { email: searchRegex },
        { chuyenNganh: searchRegex }
      ];
    }

    // Date range filter on reviewedAt
    if (fromDate || toDate) {
      filter.reviewedAt = {};
      if (fromDate) {
        filter.reviewedAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        // Set to end of day
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        filter.reviewedAt.$lte = endDate;
      }
    }

    const [requests, total] = await Promise.all([
      RoleRequest.find(filter)
        .sort({ reviewedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reviewedBy', 'HoTen')
        .lean(),
      RoleRequest.countDocuments(filter)
    ]);

    res.json({
      success: true,
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('getProcessedRequests error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy lịch sử yêu cầu.' });
  }
};

const getRequestDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await RoleRequest.findById(id)
      .populate('reviewedBy', 'HoTen')
      .lean();

    if (!request) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu.' });
    }

    res.json({ success: true, request });
  } catch (error) {
    console.error('getRequestDetail error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết yêu cầu.' });
  }
};

const getAllLecturers = async (req, res) => {
  try {
    const lecturers = await GiangVien.find().sort({ createdAt: -1 });
    res.json({ success: true, lecturers });
  } catch (error) {
    console.error('getAllLecturers error:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách Giảng viên.' });
  }
};

module.exports = {
  getPendingRequests,
  approveRequest,
  rejectRequest,
  getProcessedRequests,
  getRequestDetail,
  getAllLecturers
};
