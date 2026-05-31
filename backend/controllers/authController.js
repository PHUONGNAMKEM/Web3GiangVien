const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');
const SinhVien = require('../models/SinhVien');
const GiangVien = require('../models/GiangVien');
const Admin = require('../models/Admin');
const RoleRequest = require('../models/RoleRequest');
const { web3Utils } = require('../config/web3');

const challenges = new Map();
const qrSessions = new Map();

const generateChallenge = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address' });
    }

    const nonce = uuidv4().substring(0, 8);
    const timestamp = new Date().toISOString();
    const challenge = `Hệ thống Web3 Giảng Viên\n\nThời gian: ${timestamp}\nNonce: ${nonce}\nVí: ${walletAddress}\n\nVui lòng ký thông báo này để xác thực.`;
    const challengeId = uuidv4();

    challenges.set(challengeId, {
      challenge,
      walletAddress: walletAddress.toLowerCase(),
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    res.json({ success: true, challengeId, challenge, message: 'Please sign this message' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate challenge' });
  }
};

const verifySignature = async (req, res) => {
  try {
    const { challengeId, signature } = req.body;
    const challengeData = challenges.get(challengeId);
    
    if (!challengeData || challengeData.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: 'Challenge expired' });
    }

    const { challenge, walletAddress } = challengeData;
    let isValidSignature = false;
    
    try {
      isValidSignature = web3Utils.verifySignature(challenge, signature, walletAddress);
    } catch (e) {
      isValidSignature = false;
    }

    if (!isValidSignature) {
      return res.status(401).json({ success: false, message: 'Invalid signature.' });
    }

    // Identify user role
    let role_id = 'STUDENT_ROLE';
    let userRecord = await Admin.findOne({ WalletAddress: walletAddress.toLowerCase() });

    if (userRecord) {
      role_id = 'ADMIN_ROLE';
    } else {
      userRecord = await GiangVien.findOne({ WalletAddress: walletAddress.toLowerCase() });
      
      if (userRecord) {
        role_id = 'LECTURER_ROLE';
      } else {
        userRecord = await SinhVien.findOne({ WalletAddress: walletAddress.toLowerCase() });
        if (!userRecord) {
          const pendingReq = await RoleRequest.findOne({ walletAddress: walletAddress.toLowerCase(), status: 'pending' });
          if (pendingReq) {
            challenges.delete(challengeId);
            return res.json({
              success: true,
              isPending: true,
              walletAddress: walletAddress.toLowerCase(),
              message: 'Bạn đang có yêu cầu chờ duyệt.'
            });
          }

          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);
          
          const rejectedCountToday = await RoleRequest.countDocuments({
            walletAddress: walletAddress.toLowerCase(),
            status: 'rejected',
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          });

          // Not found anywhere - needs role selection
          challenges.delete(challengeId);
          return res.json({
            success: true,
            needsRoleSelection: true,
            walletAddress: walletAddress.toLowerCase(),
            rejectedCountToday,
            message: 'Vui lòng chọn vai trò để tiếp tục'
          });
        }
      }
    }

    const token = jwt.sign(
      { id: userRecord._id, walletAddress, role_id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    challenges.delete(challengeId);

    res.json({
      success: true,
      token,
      user: {
        id: userRecord._id,
        walletAddress,
        role_id,
        name: userRecord.HoTen
      },
      message: 'Authentication successful'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

const logout = async (req, res) => { res.json({ success: true }); };

const getProfile = async (req, res) => {
  try {
    const { walletAddress, role_id } = req.user;
    let user = role_id === 'LECTURER_ROLE' 
      ? await GiangVien.findOne({WalletAddress: walletAddress})
      : await SinhVien.findOne({WalletAddress: walletAddress});
    
    res.json({ success: true, user: { ...user._doc, role_id } });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', { clockTolerance: 300 }, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
};

const generateQrSession = async (req, res) => {
  try {
    const sessionId = uuidv4();
    const nonce = uuidv4().substring(0, 8);
    const timestamp = new Date().toISOString();
    const challenge = `Hệ thống Web3 Giảng Viên\nXác thực đăng nhập di động\nThời gian: ${timestamp}\nNonce: ${nonce}\n\nVui lòng ký thông báo này để hoàn tất đăng nhập.`;

    qrSessions.set(sessionId, {
      challenge,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      authenticated: false
    });

    res.json({ success: true, sessionId, challenge });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate QR session' });
  }
};

const verifyQrSignature = async (req, res) => {
  try {
    const { sessionId, walletAddress, signature } = req.body;
    if (!sessionId || !walletAddress || !signature) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    const sessionData = qrSessions.get(sessionId);
    if (!sessionData || sessionData.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: 'Session expired or invalid' });
    }

    let isValidSignature = false;
    try {
      isValidSignature = web3Utils.verifySignature(sessionData.challenge, signature, walletAddress);
    } catch (e) {
      isValidSignature = false;
    }

    if (!isValidSignature) {
      return res.status(401).json({ success: false, message: 'Chữ ký không hợp lệ.' });
    }

    // Identify user role
    let role_id = 'STUDENT_ROLE';
    let userRecord = await Admin.findOne({ WalletAddress: walletAddress.toLowerCase() });

    if (userRecord) {
      role_id = 'ADMIN_ROLE';
    } else {
      userRecord = await GiangVien.findOne({ WalletAddress: walletAddress.toLowerCase() });
      
      if (userRecord) {
        role_id = 'LECTURER_ROLE';
      } else {
        userRecord = await SinhVien.findOne({ WalletAddress: walletAddress.toLowerCase() });
        if (!userRecord) {
          const pendingReq = await RoleRequest.findOne({ walletAddress: walletAddress.toLowerCase(), status: 'pending' });
          if (pendingReq) {
            qrSessions.delete(sessionId);
            return res.json({
              success: true,
              isPending: true,
              walletAddress: walletAddress.toLowerCase(),
              message: 'Bạn đang có yêu cầu chờ duyệt.'
            });
          }

          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);

          const rejectedCountToday = await RoleRequest.countDocuments({
            walletAddress: walletAddress.toLowerCase(),
            status: 'rejected',
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          });

          qrSessions.delete(sessionId);
          return res.json({
            success: true,
            needsRoleSelection: true,
            walletAddress: walletAddress.toLowerCase(),
            rejectedCountToday,
            message: 'Vui lòng chọn vai trò để tiếp tục'
          });
        }
      }
    }

    const token = jwt.sign(
      { id: userRecord._id, walletAddress, role_id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Emit real-time login success via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`qr:${sessionId}`).emit('qr:success', {
        token,
        user: {
          id: userRecord._id,
          walletAddress,
          role_id,
          name: userRecord.HoTen
        }
      });
    }

    qrSessions.delete(sessionId);

    res.json({
      success: true,
      message: 'Đăng nhập QR thành công'
    });
  } catch (error) {
    console.error('QR authentication error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

const registerWithRole = async (req, res) => {
  try {
    const { walletAddress, role, hoTen, email, chuyenNganh } = req.body;

    if (!walletAddress || !role) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const lowerWallet = walletAddress.toLowerCase();

    // Check if already registered
    const exists = await SinhVien.findOne({ WalletAddress: lowerWallet }) || 
                   await GiangVien.findOne({ WalletAddress: lowerWallet }) ||
                   await Admin.findOne({ WalletAddress: lowerWallet });
                   
    if (exists) {
      return res.status(400).json({ success: false, message: 'Ví này đã được đăng ký.' });
    }

    if (role === 'STUDENT_ROLE') {
      const newUser = new SinhVien({
        MaSV: `SV${uuidv4().substring(0, 6).toUpperCase()}`,
        HoTen: hoTen || 'Sinh Viên Mới',
        Email: email || `${uuidv4().substring(0, 6)}@huit.edu.vn`,
        ChuyenNganh: chuyenNganh || '',
        WalletAddress: lowerWallet
      });
      await newUser.save();

      const token = jwt.sign(
        { id: newUser._id, walletAddress: lowerWallet, role_id: 'STUDENT_ROLE' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token,
        user: { id: newUser._id, walletAddress: lowerWallet, role_id: 'STUDENT_ROLE', name: newUser.HoTen },
        message: 'Đăng ký Sinh viên thành công'
      });
    } 
    else if (role === 'LECTURER_ROLE') {
      // Check for rate limit: Max 3 rejected requests today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const rejectedCount = await RoleRequest.countDocuments({
        walletAddress: lowerWallet,
        status: 'rejected',
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      if (rejectedCount >= 3) {
        return res.status(429).json({ 
          success: false, 
          message: 'Bạn đã bị từ chối 3 lần hôm nay. Vui lòng thử lại vào ngày mai hoặc tham gia với tư cách Sinh viên.' 
        });
      }

      // Check if already has a pending request
      const pendingReq = await RoleRequest.findOne({ walletAddress: lowerWallet, status: 'pending' });
      if (pendingReq) {
        return res.status(400).json({ success: false, message: 'Bạn đang có yêu cầu chờ duyệt.' });
      }

      // Create new request
      const newRequest = new RoleRequest({
        walletAddress: lowerWallet,
        hoTen,
        email,
        chuyenNganh,
        requestedRole: 'LECTURER_ROLE'
      });
      await newRequest.save();

      // Emit to Admin via Socket
      const io = req.app.get('io');
      if (io) {
        io.to('admin:room').emit('admin:newRequest', newRequest);
      }

      return res.json({
        success: true,
        isPending: true,
        message: 'Yêu cầu của bạn đã được gửi và đang chờ duyệt.'
      });
    }

    return res.status(400).json({ success: false, message: 'Role không hợp lệ.' });

  } catch (error) {
    console.error('Register Role error:', error);
    res.status(500).json({ success: false, message: 'Đăng ký thất bại' });
  }
};

module.exports = { 
  generateChallenge, 
  verifySignature, 
  logout, 
  getProfile, 
  authenticateToken,
  generateQrSession,
  verifyQrSignature,
  registerWithRole
};
