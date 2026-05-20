const { ethers } = require('ethers');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

const toBytes32 = (str) => ethers.keccak256(ethers.toUtf8Bytes(String(str)));

const readContractABI = (version) => {
    try {
        const artifactPath = version === 'v2'
            ? '../artifacts/contracts/ThesisManagementV2.sol/ThesisManagementV2.json'
            : '../artifacts/contracts/ThesisManagement.sol/ThesisManagement.json';
        const fileData = fs.readFileSync(path.join(__dirname, artifactPath), 'utf8');
        return JSON.parse(fileData).abi;
    } catch (error) {
        logger.error(`[BLOCKCHAIN] Cannot read ThesisManagement ${version.toUpperCase()} ABI. Run: npx hardhat compile`);
        return [];
    }
};

const getProviderAndSigner = () => {
    const rpcUrl = process.env.SEPOLIA_RPC_URL || `https://sepolia.infura.io/v3/${process.env.INFURA || ''}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) throw new Error('Chua cau hinh PRIVATE_KEY trong .env');
    const signer = new ethers.Wallet(privateKey, provider);
    return { provider, signer };
};

const detectContractVersion = async (contractAddress, signer) => {
    const configuredVersion = (process.env.THESIS_CONTRACT_VERSION || '').toLowerCase();
    if (configuredVersion === 'v1' || configuredVersion === 'v2') {
        return configuredVersion;
    }

    const v2Abi = readContractABI('v2');
    if (v2Abi.length > 0) {
        try {
            const v2Contract = new ethers.Contract(contractAddress, v2Abi, signer);
            await v2Contract.owner();
            return 'v2';
        } catch (error) {
            logger.warn('[BLOCKCHAIN] Deployed contract does not expose V2 owner(); using V1 ABI');
        }
    }

    return 'v1';
};

const getContractInstance = async () => {
    const { signer } = getProviderAndSigner();
    const contractAddress = process.env.THESIS_CONTRACT_ADDRESS;
    if (!contractAddress) throw new Error('Chua cau hinh THESIS_CONTRACT_ADDRESS trong .env');

    const version = await detectContractVersion(contractAddress, signer);
    const abi = readContractABI(version);
    logger.info(`[BLOCKCHAIN] Using ThesisManagement ${version.toUpperCase()} ABI`);

    return {
        contract: new ethers.Contract(contractAddress, abi, signer),
        version
    };
};

exports.registerTopicOnChain = async (topicId, title, advisorDID, deadline, requirements) => {
    try {
        logger.info(`[BLOCKCHAIN] registerTopic | topic=${topicId} | title="${title}" | advisor=${advisorDID}`);
        const { contract, version } = await getContractInstance();

        if (version === 'v2') {
            const topicHash = toBytes32(topicId);
            const advisorHash = toBytes32(advisorDID);
            const tx = await contract.registerTopic(topicHash, title, advisorHash, deadline, requirements);
            const receipt = await tx.wait();
            const txHash = receipt.hash || receipt.transactionHash;
            logger.info(`[BLOCKCHAIN] registerTopic V2 success | txHash=${txHash}`);
            return txHash;
        }

        const tx = await contract.registerTopic(topicId, title, advisorDID, deadline, requirements);
        const receipt = await tx.wait();
        const txHash = receipt.hash || receipt.transactionHash;
        logger.info(`[BLOCKCHAIN] registerTopic V1 success | txHash=${txHash}`);
        return txHash;
    } catch (error) {
        logger.error(`[BLOCKCHAIN] registerTopic failed: ${error.message}`);
        throw error;
    }
};

exports.submitReportOnChain = async (studentDID, topicId, ipfsCID, timestamp) => {
    try {
        logger.info(`[BLOCKCHAIN] submitReport | student=${studentDID} | topic=${topicId} | cid=${ipfsCID}`);
        const { contract, version } = await getContractInstance();

        if (version === 'v2') {
            const studentHash = toBytes32(studentDID);
            const topicHash = toBytes32(topicId);
            const tx = await contract.submitReport(studentHash, topicHash, ipfsCID, timestamp);
            const receipt = await tx.wait();
            const txHash = receipt.hash || receipt.transactionHash;
            logger.info(`[BLOCKCHAIN] submitReport V2 success | txHash=${txHash}`);
            return txHash;
        }

        const tx = await contract.submitReport(studentDID, topicId, ipfsCID, timestamp);
        const receipt = await tx.wait();
        const txHash = receipt.hash || receipt.transactionHash;
        logger.info(`[BLOCKCHAIN] submitReport V1 success | txHash=${txHash}`);
        return txHash;
    } catch (error) {
        logger.error(`[BLOCKCHAIN] submitReport failed: ${error.message}`);
        throw error;
    }
};

exports.finalizeGradeOnChain = async (studentDID, topicId, grade, feedback, idx) => {
    try {
        logger.info(`[BLOCKCHAIN] finalizeGrade | student=${studentDID} | topic=${topicId} | grade=${grade} | idx=${idx}`);
        const { contract, version } = await getContractInstance();
        const gradeInt = Math.round(parseFloat(grade) * 10);

        if (version === 'v2') {
            const studentHash = toBytes32(studentDID);
            const topicHash = toBytes32(topicId);

            const topicOnChain = await contract.topics(topicHash);
            if (!topicOnChain.exists) {
                logger.info('[BLOCKCHAIN] Topic not on-chain, auto-registering...');
                const DeTai = require('../models/DeTai');
                const dt = await DeTai.findById(topicId);
                if (dt) {
                    const deadlineUnix = Math.floor(new Date(dt.Deadline).getTime() / 1000) || 0;
                    const reqs = dt.YeuCau && dt.YeuCau.length > 0 ? dt.YeuCau : ['N/A'];
                    const advisorHash = toBytes32(dt.GiangVienHuongDan.toString());
                    const txReg = await contract.registerTopic(topicHash, dt.TenDeTai || 'Untitled', advisorHash, deadlineUnix, reqs);
                    await txReg.wait();
                    logger.info('[BLOCKCHAIN] Topic auto-registered on-chain');
                }
            }

            const history = await contract.getSubmissionHistory(studentHash, topicHash);
            if (history.length <= idx) {
                logger.info('[BLOCKCHAIN] Submission not on-chain, auto-submitting...');
                const BaoCao = require('../models/BaoCao');
                const bc = await BaoCao.findOne({ DeTai: topicId, SinhVien: studentDID });
                if (bc) {
                    const ts = Math.floor(new Date(bc.NgayNop).getTime() / 1000) || Math.floor(Date.now() / 1000);
                    const txSub = await contract.submitReport(studentHash, topicHash, bc.IPFS_CID || 'Qm...', ts);
                    await txSub.wait();
                    logger.info('[BLOCKCHAIN] Report auto-submitted on-chain');
                }
            }

            const tx = await contract.finalizeGrade(studentHash, topicHash, gradeInt, feedback, idx);
            const receipt = await tx.wait();
            const txHash = receipt.hash || receipt.transactionHash;
            logger.info(`[BLOCKCHAIN] finalizeGrade V2 success | txHash=${txHash}`);
            return txHash;
        }

        const topicOnChain = await contract.topics(topicId);
        if (!topicOnChain.exists) {
            const DeTai = require('../models/DeTai');
            const dt = await DeTai.findById(topicId);
            if (dt) {
                const deadlineUnix = Math.floor(new Date(dt.Deadline).getTime() / 1000) || 0;
                const reqs = dt.YeuCau && dt.YeuCau.length > 0 ? dt.YeuCau : ['N/A'];
                const txReg = await contract.registerTopic(topicId, dt.TenDeTai || 'Untitled', dt.GiangVienHuongDan.toString(), deadlineUnix, reqs);
                await txReg.wait();
            }
        }

        const history = await contract.getSubmissionHistory(studentDID, topicId);
        if (history.length <= idx) {
            const BaoCao = require('../models/BaoCao');
            const bc = await BaoCao.findOne({ DeTai: topicId, SinhVien: studentDID });
            if (bc) {
                const ts = Math.floor(new Date(bc.NgayNop).getTime() / 1000) || Math.floor(Date.now() / 1000);
                const txSub = await contract.submitReport(studentDID, topicId, bc.IPFS_CID || 'Qm...', ts);
                await txSub.wait();
            }
        }

        const tx = await contract.finalizeGrade(studentDID, topicId, gradeInt, feedback, idx);
        const receipt = await tx.wait();
        const txHash = receipt.hash || receipt.transactionHash;
        logger.info(`[BLOCKCHAIN] finalizeGrade V1 success | txHash=${txHash}`);
        return txHash;
    } catch (error) {
        logger.error(`[BLOCKCHAIN] finalizeGrade failed: ${error.message}`);
        throw error;
    }
};

exports.submitTestResultOnChain = async (topicId, studentDID, score) => {
    try {
        logger.info(`[BLOCKCHAIN] submitTestResult | topic=${topicId} | student=${studentDID} | score=${score}`);
        const { contract, version } = await getContractInstance();
        if (version !== 'v2') {
            throw new Error('Contract V1 khong ho tro submitTestResult');
        }

        const topicHash = toBytes32(topicId);
        const studentHash = toBytes32(studentDID);
        const scoreInt = Math.round(parseFloat(score) * 10);

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

exports.toBytes32 = toBytes32;
