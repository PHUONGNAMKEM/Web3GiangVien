# Hoàn Tất Vô Hiệu Hóa Chức Năng Admin Duyệt Role

Theo như yêu cầu, hệ thống đã được sửa đổi để đẩy hoàn toàn rủi ro và trách nhiệm xác thực về phía người dùng, loại bỏ bước trung gian (Admin duyệt) nhằm tăng tốc độ trải nghiệm và phù hợp với đặc thù Web3.

Dưới đây là tổng hợp các thay đổi đã được thực thi trên toàn hệ thống:

## 1. Thay Đổi Ở Backend (Code Node.js/Express)
Quá trình tạo tài khoản mới và đăng nhập đã được tự động hóa hoàn toàn.

````diff:authController.js
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
===
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
          // DISABLED: Admin approval flow
          /*
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
          */

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
          // DISABLED: Admin approval flow
          /*
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
          */

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
      // NEW FLOW: Create GiangVien immediately, bypass Admin approval
      const newUser = new GiangVien({
        MaGV: `GV${uuidv4().substring(0, 6).toUpperCase()}`,
        HoTen: hoTen || 'Giảng Viên Mới',
        Email: email || `${uuidv4().substring(0, 6)}@huit.edu.vn`,
        ChuyenNganh: chuyenNganh || '',
        WalletAddress: lowerWallet
      });
      await newUser.save();

      const token = jwt.sign(
        { id: newUser._id, walletAddress: lowerWallet, role_id: 'LECTURER_ROLE' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token,
        user: { id: newUser._id, walletAddress: lowerWallet, role_id: 'LECTURER_ROLE', name: newUser.HoTen },
        message: 'Đăng ký Giảng viên thành công'
      });

      /* DISABLED: Admin approval flow
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
      */
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
````

**Chi tiết các bước logic mới:**
- Trong `verifySignature` và `verifyQrSignature`: Bỏ qua việc kiểm tra danh sách `RoleRequest`. Điều này giúp giải cứu các tài khoản đang bị kẹt ở trạng thái "Chờ duyệt", đưa họ về trạng thái "Chưa có Role" để họ tự do chọn lại (hoặc là Sinh viên, hoặc là Giảng viên).
- Trong `registerWithRole`: Khi người dùng truyền lên tham số `LECTURER_ROLE`, hệ thống sẽ khởi tạo ngay object `GiangVien` mới (sinh mã GV ngẫu nhiên), cấp JWT Token, và trả về cho Frontend trạng thái đăng nhập thành công. Không còn ghi vào Model `RoleRequest` nữa.

## 2. Thay Đổi Ở Frontend (Giao Diện React)
Giao diện đã được làm sạch, xóa bỏ các yếu tố gây nhầm lẫn về "Chờ duyệt".

````diff:LoginPage.js
import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Button, Paper, Alert,
  CircularProgress, Fade, Grow, Avatar, Chip, Link,
  useTheme, useMediaQuery, Tabs, Tab, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  VerifiedUser as VerifiedUserIcon,
  ChevronRight as ChevronRightIcon,
  Language as LanguageIcon,
  HelpOutline as HelpIcon,
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';
import MetaMaskGuideModal from './MetaMaskGuideModal';
import QrScanner from './QrScanner';
import RoleSelection from './RoleSelection';
import authService from '../services/authService';

// Role constants
const STUDENT_ROLE = 'STUDENT_ROLE';
const LECTURER_ROLE = 'LECTURER_ROLE';
const ADMIN_ROLE = 'ADMIN_ROLE';

// --- Animated Gradient Text Component ---
function AnimatedGradientText({ children, sx }) {
  return (
    <Typography
      sx={{
        background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.success.main}, ${theme.palette.secondary.light})`,
        backgroundSize: '200% 200%',
        animation: 'gradientAnimation 5s ease infinite',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        '@keyframes gradientAnimation': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

// --- Main LoginPage Component ---
function LoginPage() {
  console.log('LoginPage component rendered');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isVerySmall = useMediaQuery(theme.breakpoints.down(400));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // QR Login State
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [scanningQr, setScanningQr] = useState(false);

  // Role Selection State
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [tempWallet, setTempWallet] = useState(null);
  const [rejectedCountToday, setRejectedCountToday] = useState(0);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();
      setIsAuthenticated(authenticated);
      setUser(currentUser);
      if (currentUser) {
        setConnectedWallet(currentUser.walletAddress);
      }
    };
    checkAuth();

    authService.onAccountChange((account) => {
      if (!account) {
        setIsAuthenticated(false);
        setUser(null);
        setError('Ví đã bị ngắt kết nối. Vui lòng kết nối lại.');
      }
    });

    authService.onChainChange(() => window.location.reload());
  }, []);

  // QR Scan handler — quét QR trên PC, rồi xác thực MetaMask trên PC (giống frontend cũ)
  const handleQrScan = async (qrData) => {
    setScanningQr(true);
    setError('');
    setSuccess('');
    try {
      // Parse QR data — QR chứa JSON với thông tin ví/người dùng
      let qrInfo;
      try {
        qrInfo = JSON.parse(qrData);
      } catch {
        // Nếu QR không phải JSON, coi như là wallet address thuần
        if (qrData.startsWith('0x') && qrData.length === 42) {
          qrInfo = { walletAddress: qrData };
        } else {
          throw new Error('Mã QR không hợp lệ. Vui lòng quét mã QR từ hệ thống Web3 Giảng Viên.');
        }
      }

      // Validate QR data — cần có thông tin đủ để xác thực
      if (!qrInfo.walletAddress && !qrInfo.wallet_address) {
        throw new Error('QR code không chứa thông tin ví. Vui lòng kiểm tra lại mã QR.');
      }

      const qrWallet = (qrInfo.walletAddress || qrInfo.wallet_address).toLowerCase();
      console.log('QR scanned wallet:', qrWallet);

      // Kiểm tra MetaMask
      if (!authService.isMetaMaskInstalled()) {
        setError('Vui lòng cài đặt ví MetaMask để tiếp tục.');
        setGuideModalOpen(true);
        return;
      }

      // Kết nối MetaMask trên PC
      console.log('Connecting MetaMask...');
      await authService.initializeProvider();
      const walletAddress = await authService.getWalletAddress();
      console.log('MetaMask wallet:', walletAddress);
      setConnectedWallet(walletAddress);

      // Kiểm tra ví MetaMask khớp với QR
      if (walletAddress.toLowerCase() !== qrWallet) {
        throw new Error(
          `Ví MetaMask đang kết nối (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}) ` +
          `không khớp với ví trong QR (${qrWallet.slice(0, 6)}...${qrWallet.slice(-4)}). ` +
          `Vui lòng chuyển sang đúng ví hoặc quét lại mã QR.`
        );
      }

      // Xác thực MetaMask (ký challenge)
      console.log('Authenticating...');
      const result = await authService.authenticate();
      
      if (result.isPending) {
        setSuccess('Bạn đang có yêu cầu chờ duyệt. Đang chuyển hướng...');
        setTimeout(() => {
          window.location.href = '/pending-approval';
        }, 1500);
        return;
      }

      if (result.needsRoleSelection) {
        setNeedsRoleSelection(true);
        setTempWallet(result.walletAddress);
        setRejectedCountToday(result.rejectedCountToday || 0);
        setSuccess('Vui lòng chọn vai trò để tiếp tục.');
        return;
      }

      setSuccess('Đăng nhập bằng QR thành công! Đang chuyển hướng...');
      setIsAuthenticated(true);
      setUser(result.user);

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      const message = err.message || 'Có lỗi xảy ra khi quét QR.';
      if (err.code === 4001) {
        setError('Bạn đã từ chối kết nối MetaMask.');
      } else {
        setError(message);
      }
    } finally {
      setScanningQr(false);
      setQrScannerOpen(false);
    }
  };

  const handleConnectWallet = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (!authService.isMetaMaskInstalled()) {
        setError('Vui lòng cài đặt ví MetaMask để tiếp tục.');
        setGuideModalOpen(true);
        return;
      }

      await authService.initializeProvider();
      const walletAddress = await authService.getWalletAddress();
      setConnectedWallet(walletAddress);

      const result = await authService.authenticate();
      
      if (result.isPending) {
        setSuccess('Bạn đang có yêu cầu chờ duyệt. Đang chuyển hướng...');
        setTimeout(() => {
          window.location.href = '/pending-approval';
        }, 1500);
        return;
      }

      if (result.needsRoleSelection) {
        setNeedsRoleSelection(true);
        setTempWallet(result.walletAddress);
        setRejectedCountToday(result.rejectedCountToday || 0);
        setSuccess('Vui lòng chọn vai trò để tiếp tục.');
        return;
      }

      setSuccess('Đăng nhập thành công! Đang chuyển hướng đến dashboard...');
      setIsAuthenticated(true);
      setUser(result.user);

      // Redirect to dashboard after success message
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      const message = err.message || 'Có lỗi xảy ra, vui lòng thử lại.';
      if (message.includes('user rejected')) {
        setError('Bạn đã từ chối yêu cầu kết nối.');
      } else if (message.includes('wallet not registered')) {
        setError('Ví này chưa được đăng ký trong hệ thống. Vui lòng liên hệ Ban quản lý khoa hoặc Giảng viên để được phê duyệt.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const handleSelectStudent = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.registerWithRole(tempWallet, STUDENT_ROLE);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Lỗi khi đăng ký Sinh viên');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLecturer = async (formData) => {
    setLoading(true);
    setError('');
    try {
      await authService.registerWithRole(tempWallet, LECTURER_ROLE, formData);
      window.location.href = '/pending-approval';
    } catch (err) {
      setError(err.message || 'Lỗi khi đăng ký Giảng viên');
    } finally {
      setLoading(false);
    }
  };

  // --- Responsive styles ---
  const getResponsiveStyles = () => {
    if (isVerySmall || isMobile) {
      return {
        containerPadding: 2,
        paperPadding: 2.5,
        avatarSize: 64,
        iconSize: 48,
        titleVariant: "h4",
        subtitleVariant: "body1",
        subtitleFontSize: '0.95rem',
        buttonPadding: 1.5,
        buttonFontSize: '0.95rem',
        chipSize: "small",
        spacing: 2
      };
    } else {
      return {
        containerPadding: 4,
        paperPadding: 3.5,
        avatarSize: 80,
        iconSize: 60,
        titleVariant: "h3",
        subtitleVariant: "h6",
        subtitleFontSize: '1.2rem',
        buttonPadding: 2,
        buttonFontSize: '1.1rem',
        chipSize: "medium",
        spacing: 4
      };
    }
  };

  const styles = getResponsiveStyles();

  // --- Logged In View ---
  if (isAuthenticated && user) {
    const isLecturer = user.role_id === LECTURER_ROLE;
    const isAdmin = user.role_id === ADMIN_ROLE;
    
    const roleDisplayName = isAdmin ? 'Super Admin' : (isLecturer ? 'Giảng viên' : 'Sinh viên');
    
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          minHeight="100vh"
          justifyContent="center"
          alignItems="center"
          py={styles.containerPadding}
        >
          <Grow in={true}>
            <Paper
              elevation={4}
              sx={{
                p: styles.paperPadding,
                textAlign: 'center',
                width: '100%',
                borderRadius: 4,
                maxWidth: '420px'
              }}
            >
              <Avatar
                sx={{
                  width: styles.avatarSize,
                  height: styles.avatarSize,
                  mx: 'auto',
                  mb: styles.spacing,
                  background: (theme) => `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.primary.main})`
                }}
              >
                <VerifiedUserIcon sx={{ fontSize: styles.iconSize * 0.6 }} />
              </Avatar>
              <AnimatedGradientText
                variant={isMobile ? "h5" : "h4"}
                gutterBottom
                sx={{
                  fontWeight: 'bold',
                  mb: 1
                }}
              >
                Chào mừng {roleDisplayName}
              </AnimatedGradientText>
              <Typography
                variant="h5"
                sx={{
                  mb: 1,
                  fontWeight: 'bold'
                }}
              >
                {user.name || user.HoTen || 'Người dùng'}
              </Typography>
              
              {user.Email && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {user.Email}
                </Typography>
              )}

              <Box
                display="flex"
                flexDirection="column"
                gap={1.5}
                mb={styles.spacing}
                sx={{ width: '100%', mt: 2 }}
              >
                <Chip
                  label={`Ví: ${connectedWallet?.slice(0, 6)}...${connectedWallet?.slice(-4)}`}
                  variant="outlined"
                  size={styles.chipSize}
                  sx={{
                    background: 'linear-gradient(135deg, #f6851b 0%, #f7931e 100%)',
                    color: 'white',
                    border: 'none',
                    '& .MuiChip-label': {
                      fontWeight: 'bold'
                    }
                  }}
                />
                
                <Chip
                  label={`Vai trò: ${roleDisplayName}`}
                  variant="outlined"
                  size={styles.chipSize}
                  color="primary"
                />

                {!isLecturer && !isAdmin && user.MaSV && (
                  <Chip
                    label={`Mã SV: ${user.MaSV}`}
                    variant="outlined"
                    size={styles.chipSize}
                  />
                )}

                {isLecturer && user.MaGV && (
                  <Chip
                    label={`Mã GV: ${user.MaGV}`}
                    variant="outlined"
                    size={styles.chipSize}
                  />
                )}

                {user.ChuyenNganh && (
                  <Chip
                    label={`Chuyên ngành: ${user.ChuyenNganh}`}
                    variant="outlined"
                    size={styles.chipSize}
                  />
                )}

                {!isLecturer && !isAdmin && typeof user.GPA === 'number' && (
                  <Chip
                    label={`GPA tích lũy: ${user.GPA.toFixed(2)}`}
                    variant="outlined"
                    size={styles.chipSize}
                    color="success"
                  />
                )}
              </Box>

              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={1}
                mt={3}
                mb={2}
              >
                <CircularProgress size={20} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Đang chuyển hướng vào cổng đào tạo...
                </Typography>
              </Box>

              <Box mt={3} display="flex" justifyContent="center">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    authService.logout();
                    setIsAuthenticated(false);
                    setUser(null);
                    setConnectedWallet(null);
                    setError('');
                    setSuccess('');
                  }}
                  color="error"
                >
                  Đăng xuất
                </Button>
              </Box>
            </Paper>
          </Grow>
        </Box>
      </Container>
    );
  }

  // --- Login View ---
  return (
    <Container maxWidth={needsRoleSelection ? "md" : "sm"}>
      <Box
        display="flex"
        flexDirection="column"
        minHeight="100vh"
        justifyContent="center"
        alignItems="center"
        py={styles.containerPadding}
      >
        <Fade in={true} timeout={1000}>
          <Box
            textAlign="center"
            mb={styles.spacing}
          >
            <Avatar
              sx={{
                width: styles.avatarSize,
                height: styles.avatarSize,
                mx: 'auto',
                mb: styles.spacing,
                background: 'transparent'
              }}
            >
              <LanguageIcon
                color="primary"
                sx={{
                  fontSize: styles.iconSize,
                  filter: `drop-shadow(0 0 10px ${theme.palette.primary.main})`
                }}
              />
            </Avatar>
            <AnimatedGradientText
              variant={styles.titleVariant}
              component="h1"
              sx={{
                fontWeight: 'bold',
                mb: 1
              }}
            >
              Web3 & AI Competition Platform
            </AnimatedGradientText>
            <Typography
              variant={styles.subtitleVariant}
              color="text.secondary"
              sx={{
                fontWeight: 400,
                fontSize: styles.subtitleFontSize,
                maxWidth: '480px',
                mx: 'auto',
                lineHeight: 1.4
              }}
            >
              Hệ thống quản lý khóa luận, chấm điểm tiến độ bằng AI & xác thực bất biến blockchain
            </Typography>
          </Box>
        </Fade>

        {needsRoleSelection ? (
          <Grow in={true} timeout={1500}>
            <Box width="100%">
              {error && (
                <Alert severity="error" sx={{ mb: 2.5, textAlign: 'left', maxWidth: 800, mx: 'auto' }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 2.5, textAlign: 'left', maxWidth: 800, mx: 'auto' }}>
                  {success}
                </Alert>
              )}
              <RoleSelection
                walletAddress={tempWallet}
                rejectedCountToday={rejectedCountToday}
                onSelectStudent={handleSelectStudent}
                onSelectLecturer={handleSelectLecturer}
                loading={loading}
              />
            </Box>
          </Grow>
        ) : (
          <Grow in={true} timeout={1500}>
          <Paper
            elevation={3}
            sx={{
              p: styles.paperPadding,
              width: '100%',
              textAlign: 'center',
              borderRadius: 4,
              maxWidth: '420px'
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
                <Tab label="Ví MetaMask" />
                <Tab label="Quét QR Code" />
              </Tabs>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, textAlign: 'left' }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2.5, textAlign: 'left' }}>
                {success}
              </Alert>
            )}

            {tabValue === 0 && (
              <>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Kết nối ví MetaMask
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Đăng nhập thông qua tiện ích mở rộng ví MetaMask trên trình duyệt của bạn.
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleConnectWallet}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : (
                    <Box
                      component="img"
                      src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                      alt="MetaMask"
                      sx={{ width: 24, height: 24 }}
                    />
                  )}
                  endIcon={<ChevronRightIcon />}
                  sx={{
                    py: 1.5,
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #f6851b 0%, #f7931e 100%)',
                    boxShadow: '0 4px 12px rgba(246, 133, 27, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #e6750f 0%, #e8850f 100%)',
                      boxShadow: '0 6px 16px rgba(246, 133, 27, 0.5)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  {loading ? 'Đang xác thực...' : 'Đăng Nhập Bằng MetaMask'}
                </Button>

                <Box mt={3}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setGuideModalOpen(true)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: 'text.secondary'
                    }}
                  >
                    <HelpIcon fontSize="small" />
                    Chưa cài đặt ví? Xem hướng dẫn
                  </Link>
                </Box>
              </>
            )}

            {tabValue === 1 && (
              <>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Đăng nhập bằng QR
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Quét mã QR từ thẻ xác thực Web3 của bạn để đăng nhập nhanh chóng và an toàn.
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={() => setQrScannerOpen(true)}
                  disabled={scanningQr}
                  startIcon={scanningQr ? <CircularProgress size={20} color="inherit" /> : <QrCodeScannerIcon />}
                  sx={{
                    py: 1.5,
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.39)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%)',
                      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  {scanningQr ? 'Đang xử lý...' : 'Quét Mã QR'}
                </Button>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 3, fontSize: '0.85rem' }}
                >
                  Sử dụng camera hoặc ảnh chứa mã QR từ thẻ xác thực blockchain của bạn.
                </Typography>
              </>
            )}
          </Paper>
        </Grow>
        )}

        {/* QR Scanner Dialog */}
        <Dialog
          open={qrScannerOpen}
          onClose={() => setQrScannerOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Quét Mã QR Xác Thực</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <QrScanner
                onScan={handleQrScan}
                onError={(error) => {
                  console.error('QR scan error:', error);
                  setError(error.message || 'Lỗi quét QR');
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" align="center">
              Hướng camera về phía mã QR hoặc upload ảnh chứa mã QR để quét
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQrScannerOpen(false)}>Đóng</Button>
          </DialogActions>
        </Dialog>

        <Fade in={true} timeout={2000}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: styles.spacing,
              textAlign: 'center',
              fontSize: '0.85rem'
            }}
          >
            © {new Date().getFullYear()} - Nền tảng học tập bất biến Web3 & AI Competition Platform.
          </Typography>
        </Fade>
      </Box>
      <MetaMaskGuideModal open={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
    </Container>
  );
}

export default LoginPage;
===
import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Button, Paper, Alert,
  CircularProgress, Fade, Grow, Avatar, Chip, Link,
  useTheme, useMediaQuery, Tabs, Tab, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  VerifiedUser as VerifiedUserIcon,
  ChevronRight as ChevronRightIcon,
  Language as LanguageIcon,
  HelpOutline as HelpIcon,
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';
import MetaMaskGuideModal from './MetaMaskGuideModal';
import QrScanner from './QrScanner';
import RoleSelection from './RoleSelection';
import authService from '../services/authService';

// Role constants
const STUDENT_ROLE = 'STUDENT_ROLE';
const LECTURER_ROLE = 'LECTURER_ROLE';
const ADMIN_ROLE = 'ADMIN_ROLE';

// --- Animated Gradient Text Component ---
function AnimatedGradientText({ children, sx }) {
  return (
    <Typography
      sx={{
        background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.success.main}, ${theme.palette.secondary.light})`,
        backgroundSize: '200% 200%',
        animation: 'gradientAnimation 5s ease infinite',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        '@keyframes gradientAnimation': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

// --- Main LoginPage Component ---
function LoginPage() {
  console.log('LoginPage component rendered');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isVerySmall = useMediaQuery(theme.breakpoints.down(400));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // QR Login State
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [scanningQr, setScanningQr] = useState(false);

  // Role Selection State
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [tempWallet, setTempWallet] = useState(null);
  const [rejectedCountToday, setRejectedCountToday] = useState(0);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();
      setIsAuthenticated(authenticated);
      setUser(currentUser);
      if (currentUser) {
        setConnectedWallet(currentUser.walletAddress);
      }
    };
    checkAuth();

    authService.onAccountChange((account) => {
      if (!account) {
        setIsAuthenticated(false);
        setUser(null);
        setError('Ví đã bị ngắt kết nối. Vui lòng kết nối lại.');
      }
    });

    authService.onChainChange(() => window.location.reload());
  }, []);

  // QR Scan handler — quét QR trên PC, rồi xác thực MetaMask trên PC (giống frontend cũ)
  const handleQrScan = async (qrData) => {
    setScanningQr(true);
    setError('');
    setSuccess('');
    try {
      // Parse QR data — QR chứa JSON với thông tin ví/người dùng
      let qrInfo;
      try {
        qrInfo = JSON.parse(qrData);
      } catch {
        // Nếu QR không phải JSON, coi như là wallet address thuần
        if (qrData.startsWith('0x') && qrData.length === 42) {
          qrInfo = { walletAddress: qrData };
        } else {
          throw new Error('Mã QR không hợp lệ. Vui lòng quét mã QR từ hệ thống Web3 Giảng Viên.');
        }
      }

      // Validate QR data — cần có thông tin đủ để xác thực
      if (!qrInfo.walletAddress && !qrInfo.wallet_address) {
        throw new Error('QR code không chứa thông tin ví. Vui lòng kiểm tra lại mã QR.');
      }

      const qrWallet = (qrInfo.walletAddress || qrInfo.wallet_address).toLowerCase();
      console.log('QR scanned wallet:', qrWallet);

      // Kiểm tra MetaMask
      if (!authService.isMetaMaskInstalled()) {
        setError('Vui lòng cài đặt ví MetaMask để tiếp tục.');
        setGuideModalOpen(true);
        return;
      }

      // Kết nối MetaMask trên PC
      console.log('Connecting MetaMask...');
      await authService.initializeProvider();
      const walletAddress = await authService.getWalletAddress();
      console.log('MetaMask wallet:', walletAddress);
      setConnectedWallet(walletAddress);

      // Kiểm tra ví MetaMask khớp với QR
      if (walletAddress.toLowerCase() !== qrWallet) {
        throw new Error(
          `Ví MetaMask đang kết nối (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}) ` +
          `không khớp với ví trong QR (${qrWallet.slice(0, 6)}...${qrWallet.slice(-4)}). ` +
          `Vui lòng chuyển sang đúng ví hoặc quét lại mã QR.`
        );
      }

      // Xác thực MetaMask (ký challenge)
      console.log('Authenticating...');
      const result = await authService.authenticate();
      
      /* DISABLED: Admin approval flow
      if (result.isPending) {
        setSuccess('Bạn đang có yêu cầu chờ duyệt. Đang chuyển hướng...');
        setTimeout(() => {
          window.location.href = '/pending-approval';
        }, 1500);
        return;
      }
      */

      if (result.needsRoleSelection) {
        setNeedsRoleSelection(true);
        setTempWallet(result.walletAddress);
        setRejectedCountToday(result.rejectedCountToday || 0);
        setSuccess('Vui lòng chọn vai trò để tiếp tục.');
        return;
      }

      setSuccess('Đăng nhập bằng QR thành công! Đang chuyển hướng...');
      setIsAuthenticated(true);
      setUser(result.user);

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      const message = err.message || 'Có lỗi xảy ra khi quét QR.';
      if (err.code === 4001) {
        setError('Bạn đã từ chối kết nối MetaMask.');
      } else {
        setError(message);
      }
    } finally {
      setScanningQr(false);
      setQrScannerOpen(false);
    }
  };

  const handleConnectWallet = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (!authService.isMetaMaskInstalled()) {
        setError('Vui lòng cài đặt ví MetaMask để tiếp tục.');
        setGuideModalOpen(true);
        return;
      }

      await authService.initializeProvider();
      const walletAddress = await authService.getWalletAddress();
      setConnectedWallet(walletAddress);

      const result = await authService.authenticate();
      
      /* DISABLED: Admin approval flow
      if (result.isPending) {
        setSuccess('Bạn đang có yêu cầu chờ duyệt. Đang chuyển hướng...');
        setTimeout(() => {
          window.location.href = '/pending-approval';
        }, 1500);
        return;
      }
      */

      if (result.needsRoleSelection) {
        setNeedsRoleSelection(true);
        setTempWallet(result.walletAddress);
        setRejectedCountToday(result.rejectedCountToday || 0);
        setSuccess('Vui lòng chọn vai trò để tiếp tục.');
        return;
      }

      setSuccess('Đăng nhập thành công! Đang chuyển hướng đến dashboard...');
      setIsAuthenticated(true);
      setUser(result.user);

      // Redirect to dashboard after success message
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      const message = err.message || 'Có lỗi xảy ra, vui lòng thử lại.';
      if (message.includes('user rejected')) {
        setError('Bạn đã từ chối yêu cầu kết nối.');
      } else if (message.includes('wallet not registered')) {
        setError('Ví này chưa được đăng ký trong hệ thống. Vui lòng liên hệ Ban quản lý khoa hoặc Giảng viên để được phê duyệt.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const handleSelectStudent = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.registerWithRole(tempWallet, STUDENT_ROLE);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Lỗi khi đăng ký Sinh viên');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLecturer = async (formData) => {
    setLoading(true);
    setError('');
    try {
      await authService.registerWithRole(tempWallet, LECTURER_ROLE, formData);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Lỗi khi đăng ký Giảng viên');
    } finally {
      setLoading(false);
    }
  };

  // --- Responsive styles ---
  const getResponsiveStyles = () => {
    if (isVerySmall || isMobile) {
      return {
        containerPadding: 2,
        paperPadding: 2.5,
        avatarSize: 64,
        iconSize: 48,
        titleVariant: "h4",
        subtitleVariant: "body1",
        subtitleFontSize: '0.95rem',
        buttonPadding: 1.5,
        buttonFontSize: '0.95rem',
        chipSize: "small",
        spacing: 2
      };
    } else {
      return {
        containerPadding: 4,
        paperPadding: 3.5,
        avatarSize: 80,
        iconSize: 60,
        titleVariant: "h3",
        subtitleVariant: "h6",
        subtitleFontSize: '1.2rem',
        buttonPadding: 2,
        buttonFontSize: '1.1rem',
        chipSize: "medium",
        spacing: 4
      };
    }
  };

  const styles = getResponsiveStyles();

  // --- Logged In View ---
  if (isAuthenticated && user) {
    const isLecturer = user.role_id === LECTURER_ROLE;
    const isAdmin = user.role_id === ADMIN_ROLE;
    
    const roleDisplayName = isAdmin ? 'Super Admin' : (isLecturer ? 'Giảng viên' : 'Sinh viên');
    
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          minHeight="100vh"
          justifyContent="center"
          alignItems="center"
          py={styles.containerPadding}
        >
          <Grow in={true}>
            <Paper
              elevation={4}
              sx={{
                p: styles.paperPadding,
                textAlign: 'center',
                width: '100%',
                borderRadius: 4,
                maxWidth: '420px'
              }}
            >
              <Avatar
                sx={{
                  width: styles.avatarSize,
                  height: styles.avatarSize,
                  mx: 'auto',
                  mb: styles.spacing,
                  background: (theme) => `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.primary.main})`
                }}
              >
                <VerifiedUserIcon sx={{ fontSize: styles.iconSize * 0.6 }} />
              </Avatar>
              <AnimatedGradientText
                variant={isMobile ? "h5" : "h4"}
                gutterBottom
                sx={{
                  fontWeight: 'bold',
                  mb: 1
                }}
              >
                Chào mừng {roleDisplayName}
              </AnimatedGradientText>
              <Typography
                variant="h5"
                sx={{
                  mb: 1,
                  fontWeight: 'bold'
                }}
              >
                {user.name || user.HoTen || 'Người dùng'}
              </Typography>
              
              {user.Email && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {user.Email}
                </Typography>
              )}

              <Box
                display="flex"
                flexDirection="column"
                gap={1.5}
                mb={styles.spacing}
                sx={{ width: '100%', mt: 2 }}
              >
                <Chip
                  label={`Ví: ${connectedWallet?.slice(0, 6)}...${connectedWallet?.slice(-4)}`}
                  variant="outlined"
                  size={styles.chipSize}
                  sx={{
                    background: 'linear-gradient(135deg, #f6851b 0%, #f7931e 100%)',
                    color: 'white',
                    border: 'none',
                    '& .MuiChip-label': {
                      fontWeight: 'bold'
                    }
                  }}
                />
                
                <Chip
                  label={`Vai trò: ${roleDisplayName}`}
                  variant="outlined"
                  size={styles.chipSize}
                  color="primary"
                />

                {!isLecturer && !isAdmin && user.MaSV && (
                  <Chip
                    label={`Mã SV: ${user.MaSV}`}
                    variant="outlined"
                    size={styles.chipSize}
                  />
                )}

                {isLecturer && user.MaGV && (
                  <Chip
                    label={`Mã GV: ${user.MaGV}`}
                    variant="outlined"
                    size={styles.chipSize}
                  />
                )}

                {user.ChuyenNganh && (
                  <Chip
                    label={`Chuyên ngành: ${user.ChuyenNganh}`}
                    variant="outlined"
                    size={styles.chipSize}
                  />
                )}

                {!isLecturer && !isAdmin && typeof user.GPA === 'number' && (
                  <Chip
                    label={`GPA tích lũy: ${user.GPA.toFixed(2)}`}
                    variant="outlined"
                    size={styles.chipSize}
                    color="success"
                  />
                )}
              </Box>

              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={1}
                mt={3}
                mb={2}
              >
                <CircularProgress size={20} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Đang chuyển hướng vào cổng đào tạo...
                </Typography>
              </Box>

              <Box mt={3} display="flex" justifyContent="center">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    authService.logout();
                    setIsAuthenticated(false);
                    setUser(null);
                    setConnectedWallet(null);
                    setError('');
                    setSuccess('');
                  }}
                  color="error"
                >
                  Đăng xuất
                </Button>
              </Box>
            </Paper>
          </Grow>
        </Box>
      </Container>
    );
  }

  // --- Login View ---
  return (
    <Container maxWidth={needsRoleSelection ? "md" : "sm"}>
      <Box
        display="flex"
        flexDirection="column"
        minHeight="100vh"
        justifyContent="center"
        alignItems="center"
        py={styles.containerPadding}
      >
        <Fade in={true} timeout={1000}>
          <Box
            textAlign="center"
            mb={styles.spacing}
          >
            <Avatar
              sx={{
                width: styles.avatarSize,
                height: styles.avatarSize,
                mx: 'auto',
                mb: styles.spacing,
                background: 'transparent'
              }}
            >
              <LanguageIcon
                color="primary"
                sx={{
                  fontSize: styles.iconSize,
                  filter: `drop-shadow(0 0 10px ${theme.palette.primary.main})`
                }}
              />
            </Avatar>
            <AnimatedGradientText
              variant={styles.titleVariant}
              component="h1"
              sx={{
                fontWeight: 'bold',
                mb: 1
              }}
            >
              Web3 & AI Competition Platform
            </AnimatedGradientText>
            <Typography
              variant={styles.subtitleVariant}
              color="text.secondary"
              sx={{
                fontWeight: 400,
                fontSize: styles.subtitleFontSize,
                maxWidth: '480px',
                mx: 'auto',
                lineHeight: 1.4
              }}
            >
              Hệ thống quản lý khóa luận, chấm điểm tiến độ bằng AI & xác thực bất biến blockchain
            </Typography>
          </Box>
        </Fade>

        {needsRoleSelection ? (
          <Grow in={true} timeout={1500}>
            <Box width="100%">
              {error && (
                <Alert severity="error" sx={{ mb: 2.5, textAlign: 'left', maxWidth: 800, mx: 'auto' }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 2.5, textAlign: 'left', maxWidth: 800, mx: 'auto' }}>
                  {success}
                </Alert>
              )}
              <RoleSelection
                walletAddress={tempWallet}
                rejectedCountToday={rejectedCountToday}
                onSelectStudent={handleSelectStudent}
                onSelectLecturer={handleSelectLecturer}
                loading={loading}
              />
            </Box>
          </Grow>
        ) : (
          <Grow in={true} timeout={1500}>
          <Paper
            elevation={3}
            sx={{
              p: styles.paperPadding,
              width: '100%',
              textAlign: 'center',
              borderRadius: 4,
              maxWidth: '420px'
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
                <Tab label="Ví MetaMask" />
                <Tab label="Quét QR Code" />
              </Tabs>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, textAlign: 'left' }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2.5, textAlign: 'left' }}>
                {success}
              </Alert>
            )}

            {tabValue === 0 && (
              <>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Kết nối ví MetaMask
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Đăng nhập thông qua tiện ích mở rộng ví MetaMask trên trình duyệt của bạn.
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleConnectWallet}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : (
                    <Box
                      component="img"
                      src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                      alt="MetaMask"
                      sx={{ width: 24, height: 24 }}
                    />
                  )}
                  endIcon={<ChevronRightIcon />}
                  sx={{
                    py: 1.5,
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #f6851b 0%, #f7931e 100%)',
                    boxShadow: '0 4px 12px rgba(246, 133, 27, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #e6750f 0%, #e8850f 100%)',
                      boxShadow: '0 6px 16px rgba(246, 133, 27, 0.5)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  {loading ? 'Đang xác thực...' : 'Đăng Nhập Bằng MetaMask'}
                </Button>

                <Box mt={3}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setGuideModalOpen(true)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: 'text.secondary'
                    }}
                  >
                    <HelpIcon fontSize="small" />
                    Chưa cài đặt ví? Xem hướng dẫn
                  </Link>
                </Box>
              </>
            )}

            {tabValue === 1 && (
              <>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Đăng nhập bằng QR
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Quét mã QR từ thẻ xác thực Web3 của bạn để đăng nhập nhanh chóng và an toàn.
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={() => setQrScannerOpen(true)}
                  disabled={scanningQr}
                  startIcon={scanningQr ? <CircularProgress size={20} color="inherit" /> : <QrCodeScannerIcon />}
                  sx={{
                    py: 1.5,
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.39)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%)',
                      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  {scanningQr ? 'Đang xử lý...' : 'Quét Mã QR'}
                </Button>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 3, fontSize: '0.85rem' }}
                >
                  Sử dụng camera hoặc ảnh chứa mã QR từ thẻ xác thực blockchain của bạn.
                </Typography>
              </>
            )}
          </Paper>
        </Grow>
        )}

        {/* QR Scanner Dialog */}
        <Dialog
          open={qrScannerOpen}
          onClose={() => setQrScannerOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Quét Mã QR Xác Thực</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <QrScanner
                onScan={handleQrScan}
                onError={(error) => {
                  console.error('QR scan error:', error);
                  setError(error.message || 'Lỗi quét QR');
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" align="center">
              Hướng camera về phía mã QR hoặc upload ảnh chứa mã QR để quét
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQrScannerOpen(false)}>Đóng</Button>
          </DialogActions>
        </Dialog>

        <Fade in={true} timeout={2000}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: styles.spacing,
              textAlign: 'center',
              fontSize: '0.85rem'
            }}
          >
            © {new Date().getFullYear()} - Nền tảng học tập bất biến Web3 & AI Competition Platform.
          </Typography>
        </Fade>
      </Box>
      <MetaMaskGuideModal open={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
    </Container>
  );
}

export default LoginPage;
````

````diff:RoleSelection.js
import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress
} from '@mui/material';
import { School as SchoolIcon, AccountBox as TeacherIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

const RoleSelection = ({ walletAddress, onSelectStudent, onSelectLecturer, loading, rejectedCountToday = 0 }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ hoTen: '', email: '', chuyenNganh: '' });

  const handleLecturerSubmit = () => {
    if (!formData.hoTen || !formData.email || !formData.chuyenNganh) return;
    onSelectLecturer(formData);
  };

  return (
    <Box mt={4} width="100%" maxWidth={800} mx="auto">
      <Typography variant="h5" align="center" fontWeight="bold" gutterBottom>
        Vui lòng chọn vai trò của bạn
      </Typography>
      <Typography variant="body1" align="center" color="text.secondary" mb={4}>
        Ví <strong>{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</strong> chưa được liên kết với tài khoản nào.
      </Typography>

      <Grid container spacing={4}>
        {/* Sinh Viên Card */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={4}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-5px)' }
            }}
          >
            <SchoolIcon color="primary" sx={{ fontSize: 60, mx: 'auto', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>Sinh Viên</Typography>
            <Box textAlign="left" mb={4} flexGrow={1} color="text.secondary">
              <Typography variant="body2" sx={{ mb: 1 }}>• Đăng ký tham gia đề tài thi đấu</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Nộp báo cáo và cập nhật tiến độ</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Nhận gợi ý đề tài bằng AI</Typography>
            </Box>
            <Button
              variant="outlined"
              size="large"
              color="primary"
              endIcon={loading ? <CircularProgress size={20} /> : <ArrowForwardIcon />}
              onClick={onSelectStudent}
              disabled={loading}
              sx={{ borderRadius: 8 }}
            >
              Vào với tư cách Sinh Viên
            </Button>
          </Paper>
        </Grid>

        {/* Giảng Viên Card */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={4}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-5px)' }
            }}
          >
            <TeacherIcon color="success" sx={{ fontSize: 60, mx: 'auto', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>Giảng Viên</Typography>
            <Box textAlign="left" mb={4} flexGrow={1} color="text.secondary">
              <Typography variant="body2" sx={{ mb: 1 }}>• Quản lý và tạo đề tài thi đấu</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Chấm điểm AI và thủ công</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Ghi kết quả lên Blockchain</Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              color="success"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setModalOpen(true)}
              disabled={loading || rejectedCountToday >= 3}
              sx={{ borderRadius: 8 }}
            >
              Yêu cầu cấp quyền Giảng Viên
            </Button>
            {rejectedCountToday > 0 && (
              <Typography variant="caption" color={rejectedCountToday >= 3 ? "error" : "text.secondary"} mt={2} display="block">
                Đã bị từ chối {rejectedCountToday}/3 lần hôm nay
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Modal Nhập thông tin Giảng viên */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Thông tin Giảng Viên</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Vui lòng cung cấp thông tin để Admin xét duyệt quyền Giảng viên cho ví của bạn.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Họ và Tên"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.hoTen}
            onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Chuyên Ngành"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.chuyenNganh}
            onChange={(e) => setFormData({ ...formData, chuyenNganh: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalOpen(false)} color="inherit">Hủy</Button>
          <Button
            onClick={handleLecturerSubmit}
            variant="contained"
            color="success"
            disabled={!formData.hoTen || !formData.email || !formData.chuyenNganh || loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Gửi yêu cầu phê duyệt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoleSelection;
===
import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress
} from '@mui/material';
import { School as SchoolIcon, AccountBox as TeacherIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

const RoleSelection = ({ walletAddress, onSelectStudent, onSelectLecturer, loading, rejectedCountToday = 0 }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ hoTen: '', email: '', chuyenNganh: '' });

  const handleLecturerSubmit = () => {
    if (!formData.hoTen || !formData.email || !formData.chuyenNganh) return;
    onSelectLecturer(formData);
  };

  return (
    <Box mt={4} width="100%" maxWidth={800} mx="auto">
      <Typography variant="h5" align="center" fontWeight="bold" gutterBottom>
        Vui lòng chọn vai trò của bạn
      </Typography>
      <Typography variant="body1" align="center" color="text.secondary" mb={4}>
        Ví <strong>{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</strong> chưa được liên kết với tài khoản nào.
      </Typography>

      <Grid container spacing={4}>
        {/* Sinh Viên Card */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={4}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-5px)' }
            }}
          >
            <SchoolIcon color="primary" sx={{ fontSize: 60, mx: 'auto', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>Sinh Viên</Typography>
            <Box textAlign="left" mb={4} flexGrow={1} color="text.secondary">
              <Typography variant="body2" sx={{ mb: 1 }}>• Đăng ký tham gia đề tài thi đấu</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Nộp báo cáo và cập nhật tiến độ</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Nhận gợi ý đề tài bằng AI</Typography>
            </Box>
            <Button
              variant="outlined"
              size="large"
              color="primary"
              endIcon={loading ? <CircularProgress size={20} /> : <ArrowForwardIcon />}
              onClick={onSelectStudent}
              disabled={loading}
              sx={{ borderRadius: 8 }}
            >
              Vào với tư cách Sinh Viên
            </Button>
          </Paper>
        </Grid>

        {/* Giảng Viên Card */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={4}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-5px)' }
            }}
          >
            <TeacherIcon color="success" sx={{ fontSize: 60, mx: 'auto', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>Giảng Viên</Typography>
            <Box textAlign="left" mb={4} flexGrow={1} color="text.secondary">
              <Typography variant="body2" sx={{ mb: 1 }}>• Quản lý và tạo đề tài thi đấu</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Chấm điểm AI và thủ công</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Ghi kết quả lên Blockchain</Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              color="success"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setModalOpen(true)}
              disabled={loading}
              sx={{ borderRadius: 8 }}
            >
              Vào với tư cách Giảng Viên
            </Button>
            {/* DISABLED: Admin approval flow
            {rejectedCountToday > 0 && (
              <Typography variant="caption" color={rejectedCountToday >= 3 ? "error" : "text.secondary"} mt={2} display="block">
                Đã bị từ chối {rejectedCountToday}/3 lần hôm nay
              </Typography>
            )}
            */}
          </Paper>
        </Grid>
      </Grid>

      {/* Modal Nhập thông tin Giảng viên */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Thông tin Giảng Viên</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Vui lòng cung cấp thông tin để hoàn tất đăng ký Giảng viên.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Họ và Tên"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.hoTen}
            onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Chuyên Ngành"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.chuyenNganh}
            onChange={(e) => setFormData({ ...formData, chuyenNganh: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalOpen(false)} color="inherit">Hủy</Button>
          <Button
            onClick={handleLecturerSubmit}
            variant="contained"
            color="success"
            disabled={!formData.hoTen || !formData.email || !formData.chuyenNganh || loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Đăng ký Giảng Viên
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoleSelection;
````

**Các sửa đổi UX/UI cụ thể:**
- **LoginPage.js**: Đã gỡ bỏ logic `if (result.isPending)` tự động đẩy người dùng về trang `/pending-approval`. Từ giờ mọi phản hồi thành công sẽ dẫn thẳng vào `/dashboard`.
- **RoleSelection.js**:
  - Đổi tên nút thành **"Vào với tư cách Giảng Viên"** và **"Đăng ký Giảng Viên"**.
  - Bỏ đi logic vô hiệu hóa (disable) nút bấm nếu bị từ chối 3 lần trong ngày (vì Admin không còn từ chối nữa).
  - Cập nhật các câu chữ hướng dẫn để người dùng hiểu rằng đây là bước đăng ký cuối cùng, không phải bước nộp đơn xin duyệt.

## Kết Luận
Toàn bộ yêu cầu của bạn đã được thực thi đầy đủ trên cả Frontend và Backend. Từ lúc này, mọi người dùng đều có thể tự do trải nghiệm nền tảng ở bất kỳ Role nào họ chọn.

> [!TIP]
> Bạn có thể kiểm tra thực tế bằng cách đăng xuất, dùng một ví MetaMask mới hoàn toàn, và tự đăng ký bằng tài khoản Giảng viên. Nếu hệ thống cho bạn vào thẳng Dashboard Giảng viên là đã thành công mỹ mãn!
