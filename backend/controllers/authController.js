const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');
const SinhVien = require('../models/SinhVien');
const GiangVien = require('../models/GiangVien');
const { web3Utils } = require('../config/web3');

const challenges = new Map();

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
    let userRecord = await GiangVien.findOne({ WalletAddress: walletAddress.toLowerCase() });
    
    if (userRecord) {
      role_id = 'LECTURER_ROLE';
    } else {
      userRecord = await SinhVien.findOne({ WalletAddress: walletAddress.toLowerCase() });
      if (!userRecord) {
        // Auto register as student
        userRecord = new SinhVien({
          MaSV: `SV${uuidv4().substring(0, 6).toUpperCase()}`,
          HoTen: 'Sinh Viên Mới',
          Email: `${uuidv4().substring(0, 6)}@huit.edu.vn`,
          WalletAddress: walletAddress.toLowerCase()
        });
        await userRecord.save();
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

module.exports = { generateChallenge, verifySignature, logout, getProfile, authenticateToken };
