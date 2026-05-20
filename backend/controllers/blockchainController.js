const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const BaoCao = require('../models/BaoCao');
const DiemSo = require('../models/DiemSo');
require('../models/DeTai');
require('../models/SinhVien');

const readABI = (version) => {
    const artifactPath = version === 'v2'
        ? '../artifacts/contracts/ThesisManagementV2.sol/ThesisManagementV2.json'
        : '../artifacts/contracts/ThesisManagement.sol/ThesisManagement.json';
    const fileData = fs.readFileSync(path.join(__dirname, artifactPath), 'utf8');
    return JSON.parse(fileData).abi;
};

const toBytes32 = (value) => ethers.keccak256(ethers.toUtf8Bytes(String(value)));

const getProvider = () => {
    const rpcUrl = process.env.SEPOLIA_RPC_URL || `https://sepolia.infura.io/v3/${process.env.INFURA || ''}`;
    return new ethers.JsonRpcProvider(rpcUrl);
};

const getThesisContract = async () => {
    const provider = getProvider();
    const address = process.env.THESIS_CONTRACT_ADDRESS;
    if (!address) {
        throw new Error('THESIS_CONTRACT_ADDRESS chua duoc cau hinh');
    }

    const configuredVersion = (process.env.THESIS_CONTRACT_VERSION || '').toLowerCase();
    if (configuredVersion === 'v1' || configuredVersion === 'v2') {
        return {
            provider,
            address,
            version: configuredVersion,
            contract: new ethers.Contract(address, readABI(configuredVersion), provider)
        };
    }

    try {
        const v2Contract = new ethers.Contract(address, readABI('v2'), provider);
        await v2Contract.owner();
        return { provider, address, version: 'v2', contract: v2Contract };
    } catch (error) {
        return {
            provider,
            address,
            version: 'v1',
            contract: new ethers.Contract(address, readABI('v1'), provider)
        };
    }
};

const normalizeTopic = (topic, version) => ({
    title: topic.title,
    advisorDID: version === 'v2' ? topic.advisorDID : topic.advisorDID,
    deadline: Number(topic.deadline || 0),
    requirements: topic.requirements || [],
    exists: Boolean(topic.exists)
});

const normalizeSubmission = (item) => ({
    studentDID: item.studentDID,
    topicId: item.topicId,
    ipfsCID: item.ipfsCID,
    timestamp: Number(item.timestamp || 0),
    rawGrade: Number(item.grade || 0),
    grade: Number(item.grade || 0) / 10,
    feedback: item.feedback,
    graded: Boolean(item.graded)
});

const getErrorMessage = (error) => error.shortMessage || error.reason || error.message || String(error);

const readOnChainHistory = async (contract, version, studentId, topicId) => {
    const studentKey = version === 'v2' ? toBytes32(studentId) : studentId;
    const topicKey = version === 'v2' ? toBytes32(topicId) : topicId;
    const submissions = await contract.getSubmissionHistory(studentKey, topicKey);
    return submissions.map(normalizeSubmission);
};

exports.getContracts = async (req, res) => {
    try {
        const { provider, address, version } = await getThesisContract();
        const network = await provider.getNetwork();
        const code = await provider.getCode(address);

        res.json({
            network: {
                name: network.name,
                chainId: Number(network.chainId)
            },
            contracts: {
                thesis: {
                    address,
                    version,
                    hasCode: code !== '0x'
                },
                hrPayroll: {
                    address: process.env.HR_PAYROLL_ADDRESS || null
                },
                token: {
                    address: process.env.TOKEN_ADDRESS || null
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: getErrorMessage(error) });
    }
};

exports.getThesisTopic = async (req, res) => {
    try {
        const { contract, address, version } = await getThesisContract();
        const topicKey = version === 'v2' ? toBytes32(req.params.topicId) : req.params.topicId;
        const topic = await contract.topics(topicKey);

        res.json({
            contract: { address, version },
            topicId: req.params.topicId,
            data: normalizeTopic(topic, version)
        });
    } catch (error) {
        res.status(500).json({ error: getErrorMessage(error) });
    }
};

exports.getThesisSubmissions = async (req, res) => {
    try {
        const { studentId, topicId } = req.query;
        if (!studentId || !topicId) {
            return res.status(400).json({
                error: 'Vui long truyen studentId va topicId',
                example: '/api/blockchain/thesis/submissions?studentId=...&topicId=...'
            });
        }

        const { contract, address, version } = await getThesisContract();
        const submissions = await readOnChainHistory(contract, version, studentId, topicId);

        res.json({
            contract: { address, version },
            studentId,
            topicId,
            count: submissions.length,
            data: submissions
        });
    } catch (error) {
        res.status(500).json({ error: getErrorMessage(error) });
    }
};

exports.getThesisDbRecords = async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit || 30), 100);
        const { contract, address, version } = await getThesisContract();

        const reports = await BaoCao.find({})
            .populate('SinhVien', 'HoTen MaSV WalletAddress')
            .populate('DeTai', 'TenDeTai MaDeTai')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const gradeMap = new Map();
        const grades = await DiemSo.find({
            BaoCao: { $in: reports.map(report => report._id) }
        })
            .populate('SinhVien', 'HoTen MaSV WalletAddress')
            .populate('DeTai', 'TenDeTai MaDeTai')
            .lean();

        grades.forEach(grade => {
            gradeMap.set(String(grade.BaoCao), grade);
        });

        const records = [];
        for (const report of reports) {
            const grade = gradeMap.get(String(report._id)) || null;
            const studentId = String(report.SinhVien?._id || report.SinhVien);
            const topicId = String(report.DeTai?._id || report.DeTai);
            let chain = { status: 'not_checked', count: 0, data: [], error: null };

            try {
                const history = await readOnChainHistory(contract, version, studentId, topicId);
                const matchedByCid = history.find(item => item.ipfsCID === report.IPFS_CID) || null;
                chain = {
                    status: history.length > 0 ? 'found' : 'empty',
                    count: history.length,
                    matchedByCid: Boolean(matchedByCid),
                    data: history,
                    error: null
                };
            } catch (error) {
                chain = {
                    status: 'error',
                    count: 0,
                    matchedByCid: false,
                    data: [],
                    error: getErrorMessage(error)
                };
            }

            records.push({
                report: {
                    id: String(report._id),
                    title: report.TieuDe,
                    ipfsCID: report.IPFS_CID,
                    submitTxHash: report.SubmitTxHash || null,
                    submittedAt: report.NgayNop || report.createdAt
                },
                student: {
                    id: studentId,
                    name: report.SinhVien?.HoTen || '',
                    code: report.SinhVien?.MaSV || '',
                    walletAddress: report.SinhVien?.WalletAddress || ''
                },
                topic: {
                    id: topicId,
                    code: report.DeTai?.MaDeTai || '',
                    title: report.DeTai?.TenDeTai || ''
                },
                grade: grade ? {
                    id: String(grade._id),
                    score: grade.Diem,
                    aiScore: grade.AI_Score,
                    feedback: grade.NhanXet || '',
                    txHash: grade.TxHash || null,
                    blockchainStatus: grade.TrangThaiBlockchain,
                    submissionIndex: grade.SubmissionIndex || 0,
                    error: grade.LoiBlockchain || null
                } : null,
                chain
            });
        }

        res.json({
            contract: { address, version },
            count: records.length,
            records
        });
    } catch (error) {
        res.status(500).json({ error: getErrorMessage(error) });
    }
};
