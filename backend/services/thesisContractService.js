const { ethers } = require('ethers');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Đọc ABI từ thư mục artifacts sau khi biên dịch bằng Hardhat (nếu có)
const getContractABI = () => {
    try {
        const abiPath = path.join(__dirname, '../artifacts/contracts/ThesisManagement.sol/ThesisManagement.json');
        const fileData = fs.readFileSync(abiPath, 'utf8');
        return JSON.parse(fileData).abi;
    } catch (e) {
        console.error('Không tìm thấy file ABI cho ThesisManagement. Vui lòng compile contract trước.');
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
        console.log("Calling contract registerTopic...", { topicId, title, advisorDID });
        const contract = getContractInstance();
        // Giả sử: contract.registerTopic(topicId, title, advisorDID, deadline, requirements)
        // Lưu ý: requirements phải là mảng string
        const tx = await contract.registerTopic(topicId, title, advisorDID, deadline, requirements);
        const receipt = await tx.wait();
        return receipt.hash || receipt.transactionHash;
    } catch (error) {
        console.error("Lỗi registerTopicOnChain:", error.message);
        throw error;
    }
};

exports.submitReportOnChain = async (studentDID, topicId, ipfsCID, timestamp) => {
    try {
        console.log("Calling contract submitReport...", { studentDID, topicId, ipfsCID });
        const contract = getContractInstance();
        const tx = await contract.submitReport(studentDID, topicId, ipfsCID, timestamp);
        const receipt = await tx.wait();
        return receipt.hash || receipt.transactionHash;
    } catch (error) {
        console.error("Lỗi submitReportOnChain:", error.message);
        throw error;
    }
};

exports.finalizeGradeOnChain = async (studentDID, topicId, grade, feedback, idx) => {
    try {
        console.log("Calling contract finalizeGrade...", { studentDID, topicId, grade, feedback, idx });
        const contract = getContractInstance();

        // 1. Ensure Topic exists
        const topicOnChain = await contract.topics(topicId);
        if (!topicOnChain.exists) {
            console.log("Topic does not exist on-chain, registering now...");
            const DeTai = require('../models/DeTai');
            const dt = await DeTai.findById(topicId);
            if (dt) {
                const deadlineUnix = Math.floor(new Date(dt.Deadline).getTime() / 1000) || 0;
                const reqs = dt.YeuCau && dt.YeuCau.length > 0 ? dt.YeuCau : ["N/A"];
                const txReg = await contract.registerTopic(topicId, dt.TenDeTai || "Untitled", dt.GiangVienHuongDan.toString(), deadlineUnix, reqs);
                await txReg.wait();
                console.log("Topic registered on-chain.");
            }
        }

        // 2. Ensure Submission exists
        const history = await contract.getSubmissionHistory(studentDID, topicId);
        if (history.length <= idx) {
            console.log("Submission does not exist on-chain, submitting now...");
            const BaoCao = require('../models/BaoCao');
            const bc = await BaoCao.findOne({ DeTai: topicId, SinhVien: studentDID });
            if (bc) {
                const timestamp = Math.floor(new Date(bc.NgayNop).getTime() / 1000) || Math.floor(Date.now() / 1000);
                const txSub = await contract.submitReport(studentDID, topicId, bc.IPFS_CID || "Qm...", timestamp);
                await txSub.wait();
                console.log("Report submitted on-chain.");
            } else {
                console.log("Warning: No BaoCao found in DB to submit on-chain.");
            }
        }

        // Bắt buộc ép kiểu grade về int nếu SmartContract yêu cầu uint8 (điểm có thể được nhân hệ số 10 để tránh số thập phân nếu cần, tạm thời truyền thẳng string hoặc int)
        const gradeInt = Math.round(parseFloat(grade) * 10); // Ví dụ đổi 8.5 thành 85 để lưu On-chain nếu dùng số nguyên
        const tx = await contract.finalizeGrade(studentDID, topicId, gradeInt, feedback, idx);
        const receipt = await tx.wait();
        return receipt.hash || receipt.transactionHash;
    } catch (error) {
        console.error("Lỗi finalizeGradeOnChain:", error.message);
        throw error;
    }
};
