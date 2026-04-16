const { ethers } = require('ethers');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

// Đọc ABI từ thư mục artifacts sau khi biên dịch bằng Hardhat (nếu có)
const getContractABI = () => {
    try {
        const abiPath = path.join(__dirname, '../artifacts/contracts/ThesisManagement.sol/ThesisManagement.json');
        const fileData = fs.readFileSync(abiPath, 'utf8');
        return JSON.parse(fileData).abi;
    } catch (e) {
        logger.error('[BLOCKCHAIN] Không tìm thấy file ABI cho ThesisManagement. Vui lòng compile contract trước.');
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

exports.registerTopicOnChain = async (topicId, title, advisorDID, deadline, requirements) => {
    try {
        logger.info(`[BLOCKCHAIN] registerTopic | topic=${topicId} | title="${title}" | advisor=${advisorDID}`);
        const contract = getContractInstance();
        // Giả sử: contract.registerTopic(topicId, title, advisorDID, deadline, requirements)
        // Lưu ý: requirements phải là mảng string
        const tx = await contract.registerTopic(topicId, title, advisorDID, deadline, requirements);
        const receipt = await tx.wait();
        const txHash = receipt.hash || receipt.transactionHash;
        logger.info(`[BLOCKCHAIN] registerTopic success | txHash=${txHash}`);
        return txHash;
    } catch (error) {
        logger.error(`[BLOCKCHAIN] registerTopic failed: ${error.message}`);
        throw error;
    }
};

exports.submitReportOnChain = async (studentDID, topicId, ipfsCID, timestamp) => {
    try {
        logger.info(`[BLOCKCHAIN] submitReport | student=${studentDID} | topic=${topicId} | cid=${ipfsCID}`);
        const contract = getContractInstance();
        const tx = await contract.submitReport(studentDID, topicId, ipfsCID, timestamp);
        const receipt = await tx.wait();
        const txHash = receipt.hash || receipt.transactionHash;
        logger.info(`[BLOCKCHAIN] submitReport success | txHash=${txHash}`);
        return txHash;
    } catch (error) {
        logger.error(`[BLOCKCHAIN] submitReport failed: ${error.message}`);
        throw error;
    }
};

exports.finalizeGradeOnChain = async (studentDID, topicId, grade, feedback, idx) => {
    try {
        logger.info(`[BLOCKCHAIN] finalizeGrade | student=${studentDID} | topic=${topicId} | grade=${grade} | idx=${idx}`);
        const contract = getContractInstance();

        // 1. Ensure Topic exists
        const topicOnChain = await contract.topics(topicId);
        if (!topicOnChain.exists) {
            logger.info(`[BLOCKCHAIN] Topic ${topicId} not on-chain, auto-registering...`);
            const DeTai = require('../models/DeTai');
            const dt = await DeTai.findById(topicId);
            if (dt) {
                const deadlineUnix = Math.floor(new Date(dt.Deadline).getTime() / 1000) || 0;
                const reqs = dt.YeuCau && dt.YeuCau.length > 0 ? dt.YeuCau : ["N/A"];
                const txReg = await contract.registerTopic(topicId, dt.TenDeTai || "Untitled", dt.GiangVienHuongDan.toString(), deadlineUnix, reqs);
                await txReg.wait();
                logger.info(`[BLOCKCHAIN] Topic ${topicId} auto-registered on-chain`);
            }
        }

        // 2. Ensure Submission exists
        const history = await contract.getSubmissionHistory(studentDID, topicId);
        if (history.length <= idx) {
            logger.info(`[BLOCKCHAIN] Submission not on-chain for student=${studentDID}, auto-submitting...`);
            const BaoCao = require('../models/BaoCao');
            const bc = await BaoCao.findOne({ DeTai: topicId, SinhVien: studentDID });
            if (bc) {
                const timestamp = Math.floor(new Date(bc.NgayNop).getTime() / 1000) || Math.floor(Date.now() / 1000);
                const txSub = await contract.submitReport(studentDID, topicId, bc.IPFS_CID || "Qm...", timestamp);
                await txSub.wait();
                logger.info(`[BLOCKCHAIN] Report auto-submitted on-chain | cid=${bc.IPFS_CID}`);
            } else {
                logger.warn(`[BLOCKCHAIN] No BaoCao found in DB for student=${studentDID} topic=${topicId}`);
            }
        }

        // Bắt buộc ép kiểu grade về int nếu SmartContract yêu cầu uint8 (điểm có thể được nhân hệ số 10 để tránh số thập phân nếu cần, tạm thời truyền thẳng string hoặc int)
        const gradeInt = Math.round(parseFloat(grade) * 10); // Ví dụ đổi 8.5 thành 85 để lưu On-chain nếu dùng số nguyên
        const tx = await contract.finalizeGrade(studentDID, topicId, gradeInt, feedback, idx);
        const receipt = await tx.wait();
        const txHash = receipt.hash || receipt.transactionHash;
        logger.info(`[BLOCKCHAIN] finalizeGrade success | student=${studentDID} | grade=${grade} | txHash=${txHash}`);
        return txHash;
    } catch (error) {
        logger.error(`[BLOCKCHAIN] finalizeGrade failed: ${error.message}`);
        throw error;
    }
};
