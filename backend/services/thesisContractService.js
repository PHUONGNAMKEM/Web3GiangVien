const { ethers } = require('ethers');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

// === HELPER: Convert string → bytes32 hash (gas optimization) ===
const toBytes32 = (str) => {
    return ethers.keccak256(ethers.toUtf8Bytes(String(str)));
};

// Đọc ABI — ưu tiên V2, fallback V1
const getContractABI = () => {
    try {
        // Thử V2 trước
        const v2Path = path.join(__dirname, '../artifacts/contracts/ThesisManagementV2.sol/ThesisManagementV2.json');
        if (fs.existsSync(v2Path)) {
            const fileData = fs.readFileSync(v2Path, 'utf8');
            logger.info('[BLOCKCHAIN] Using ThesisManagementV2 ABI');
            return JSON.parse(fileData).abi;
        }
        // Fallback V1
        const v1Path = path.join(__dirname, '../artifacts/contracts/ThesisManagement.sol/ThesisManagement.json');
        const fileData = fs.readFileSync(v1Path, 'utf8');
        logger.info('[BLOCKCHAIN] Using ThesisManagement V1 ABI (fallback)');
        return JSON.parse(fileData).abi;
    } catch (e) {
        logger.error('[BLOCKCHAIN] Không tìm thấy file ABI. Vui lòng compile contract trước: npx hardhat compile');
        return [];
    }
};

const getProviderAndSigner = () => {
    const rpcUrl = process.env.SEPOLIA_RPC_URL || `https://sepolia.infura.io/v3/${process.env.INFURA || ''}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error("Chưa cấu hình PRIVATE_KEY trong .env");
    const signer = new ethers.Wallet(privateKey, provider);
    return { provider, signer };
};

const getContractInstance = () => {
    const { signer } = getProviderAndSigner();
    const contractAddress = process.env.THESIS_CONTRACT_ADDRESS;
    if (!contractAddress) throw new Error("Chưa cấu hình THESIS_CONTRACT_ADDRESS trong .env");
    const abi = getContractABI();
    return new ethers.Contract(contractAddress, abi, signer);
};

// === Detect V2 (bytes32) vs V1 (string) ===
const isV2Contract = () => {
    const v2Path = path.join(__dirname, '../artifacts/contracts/ThesisManagementV2.sol/ThesisManagementV2.json');
    return fs.existsSync(v2Path);
};

// 1. Giảng viên đăng ký đề tài
exports.registerTopicOnChain = async (topicId, title, advisorDID, deadline, requirements) => {
    try {
        logger.info(`[BLOCKCHAIN] registerTopic | topic=${topicId} | title="${title}" | advisor=${advisorDID}`);
        const contract = getContractInstance();

        if (isV2Contract()) {
            const topicHash = toBytes32(topicId);
            const advisorHash = toBytes32(advisorDID);
            const tx = await contract.registerTopic(topicHash, title, advisorHash, deadline, requirements);
            const receipt = await tx.wait();
            const txHash = receipt.hash || receipt.transactionHash;
            logger.info(`[BLOCKCHAIN] registerTopic V2 success | txHash=${txHash}`);
            return txHash;
        } else {
            const tx = await contract.registerTopic(topicId, title, advisorDID, deadline, requirements);
            const receipt = await tx.wait();
            const txHash = receipt.hash || receipt.transactionHash;
            logger.info(`[BLOCKCHAIN] registerTopic V1 success | txHash=${txHash}`);
            return txHash;
        }
    } catch (error) {
        logger.error(`[BLOCKCHAIN] registerTopic failed: ${error.message}`);
        throw error;
    }
};

// 2. Sinh viên nộp báo cáo
exports.submitReportOnChain = async (studentDID, topicId, ipfsCID, timestamp) => {
    try {
        logger.info(`[BLOCKCHAIN] submitReport | student=${studentDID} | topic=${topicId} | cid=${ipfsCID}`);
        const contract = getContractInstance();

        if (isV2Contract()) {
            const studentHash = toBytes32(studentDID);
            const topicHash = toBytes32(topicId);
            const tx = await contract.submitReport(studentHash, topicHash, ipfsCID, timestamp);
            const receipt = await tx.wait();
            const txHash = receipt.hash || receipt.transactionHash;
            logger.info(`[BLOCKCHAIN] submitReport V2 success | txHash=${txHash}`);
            return txHash;
        } else {
            const tx = await contract.submitReport(studentDID, topicId, ipfsCID, timestamp);
            const receipt = await tx.wait();
            const txHash = receipt.hash || receipt.transactionHash;
            logger.info(`[BLOCKCHAIN] submitReport V1 success | txHash=${txHash}`);
            return txHash;
        }
    } catch (error) {
        logger.error(`[BLOCKCHAIN] submitReport failed: ${error.message}`);
        throw error;
    }
};

// 3. Giảng viên chốt điểm
exports.finalizeGradeOnChain = async (studentDID, topicId, grade, feedback, idx) => {
    try {
        logger.info(`[BLOCKCHAIN] finalizeGrade | student=${studentDID} | topic=${topicId} | grade=${grade} | idx=${idx}`);
        const contract = getContractInstance();
        const gradeInt = Math.round(parseFloat(grade) * 10);

        if (isV2Contract()) {
            const studentHash = toBytes32(studentDID);
            const topicHash = toBytes32(topicId);

            // Auto-register topic nếu chưa có trên chain
            const topicOnChain = await contract.topics(topicHash);
            if (!topicOnChain.exists) {
                logger.info(`[BLOCKCHAIN] Topic not on-chain, auto-registering...`);
                const DeTai = require('../models/DeTai');
                const dt = await DeTai.findById(topicId);
                if (dt) {
                    const deadlineUnix = Math.floor(new Date(dt.Deadline).getTime() / 1000) || 0;
                    const reqs = dt.YeuCau && dt.YeuCau.length > 0 ? dt.YeuCau : ["N/A"];
                    const advisorHash = toBytes32(dt.GiangVienHuongDan.toString());
                    const txReg = await contract.registerTopic(topicHash, dt.TenDeTai || "Untitled", advisorHash, deadlineUnix, reqs);
                    await txReg.wait();
                    logger.info(`[BLOCKCHAIN] Topic auto-registered on-chain`);
                }
            }

            // Auto-submit report nếu chưa có
            const history = await contract.getSubmissionHistory(studentHash, topicHash);
            if (history.length <= idx) {
                logger.info(`[BLOCKCHAIN] Submission not on-chain, auto-submitting...`);
                const BaoCao = require('../models/BaoCao');
                const bc = await BaoCao.findOne({ DeTai: topicId, SinhVien: studentDID });
                if (bc) {
                    const ts = Math.floor(new Date(bc.NgayNop).getTime() / 1000) || Math.floor(Date.now() / 1000);
                    const txSub = await contract.submitReport(studentHash, topicHash, bc.IPFS_CID || "Qm...", ts);
                    await txSub.wait();
                    logger.info(`[BLOCKCHAIN] Report auto-submitted on-chain`);
                }
            }

            const tx = await contract.finalizeGrade(studentHash, topicHash, gradeInt, feedback, idx);
            const receipt = await tx.wait();
            const txHash = receipt.hash || receipt.transactionHash;
            logger.info(`[BLOCKCHAIN] finalizeGrade V2 success | txHash=${txHash}`);
            return txHash;
        } else {
            // V1 fallback (string keys)
            const topicOnChain = await contract.topics(topicId);
            if (!topicOnChain.exists) {
                const DeTai = require('../models/DeTai');
                const dt = await DeTai.findById(topicId);
                if (dt) {
                    const deadlineUnix = Math.floor(new Date(dt.Deadline).getTime() / 1000) || 0;
                    const reqs = dt.YeuCau && dt.YeuCau.length > 0 ? dt.YeuCau : ["N/A"];
                    const txReg = await contract.registerTopic(topicId, dt.TenDeTai || "Untitled", dt.GiangVienHuongDan.toString(), deadlineUnix, reqs);
                    await txReg.wait();
                }
            }

            const history = await contract.getSubmissionHistory(studentDID, topicId);
            if (history.length <= idx) {
                const BaoCao = require('../models/BaoCao');
                const bc = await BaoCao.findOne({ DeTai: topicId, SinhVien: studentDID });
                if (bc) {
                    const ts = Math.floor(new Date(bc.NgayNop).getTime() / 1000) || Math.floor(Date.now() / 1000);
                    const txSub = await contract.submitReport(studentDID, topicId, bc.IPFS_CID || "Qm...", ts);
                    await txSub.wait();
                }
            }

            const tx = await contract.finalizeGrade(studentDID, topicId, gradeInt, feedback, idx);
            const receipt = await tx.wait();
            const txHash = receipt.hash || receipt.transactionHash;
            logger.info(`[BLOCKCHAIN] finalizeGrade V1 success | txHash=${txHash}`);
            return txHash;
        }
    } catch (error) {
        logger.error(`[BLOCKCHAIN] finalizeGrade failed: ${error.message}`);
        throw error;
    }
};

// 4. Ghi kết quả bài test cạnh tranh lên blockchain (V2 only)
exports.submitTestResultOnChain = async (topicId, studentDID, score) => {
    try {
        logger.info(`[BLOCKCHAIN] submitTestResult | topic=${topicId} | student=${studentDID} | score=${score}`);
        const contract = getContractInstance();
        const topicHash = toBytes32(topicId);
        const studentHash = toBytes32(studentDID);
        const scoreInt = Math.round(parseFloat(score) * 10); // 8.5 → 85

        const tx = await contract.submitTestResult(topicHash, studentHash, scoreInt);
        const receipt = await tx.wait();
        const txHash = receipt.hash || receipt.transactionHash;
        logger.info(`[BLOCKCHAIN] submitTestResult success | txHash=${txHash}`);
        return txHash;
    } catch (error) {
        logger.error(`[BLOCKCHAIN] submitTestResult failed: ${error.message}`);
        throw error;
    }
};

// Export helper cho external use
exports.toBytes32 = toBytes32;
