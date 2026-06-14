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

        // Chuan hoa thong tin co ban cho moi bao cao (gom san studentId/topicId de tra cuu)
        const baseRecords = reports.map((report) => ({
            report,
            grade: gradeMap.get(String(report._id)) || null,
            studentId: String(report.SinhVien?._id || report.SinhVien),
            topicId: String(report.DeTai?._id || report.DeTai)
        }));

        // Bao cao nhom: tat ca thanh vien co cung de tai + cung file (IPFS_CID),
        // nhung on-chain chi ghi MOT lan duoi ID nguoi nop -> dung khoa nay de chia se bang chung.
        const groupKeyOf = (item) => `${item.topicId}::${item.report.IPFS_CID || ''}`;

        // Bug 2: gom cac cap (studentId, topicId) duy nhat -> moi cap chi goi on-chain 1 lan
        const uniquePairs = new Map();
        for (const item of baseRecords) {
            const pairKey = `${item.studentId}::${item.topicId}`;
            if (!uniquePairs.has(pairKey)) {
                uniquePairs.set(pairKey, { studentId: item.studentId, topicId: item.topicId });
            }
        }

        // Bug 2: goi on-chain theo lo gioi han so luong song song (tranh 429 rate-limit cua Infura)
        const CONCURRENCY = 5;
        const historyByKey = new Map();
        const pairList = Array.from(uniquePairs.entries());
        for (let i = 0; i < pairList.length; i += CONCURRENCY) {
            const batch = pairList.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(async ([pairKey, { studentId, topicId }]) => {
                try {
                    const history = await readOnChainHistory(contract, version, studentId, topicId);
                    historyByKey.set(pairKey, { data: history, error: null });
                } catch (error) {
                    historyByKey.set(pairKey, { data: null, error: getErrorMessage(error) });
                }
            }));
        }

        const buildChain = (result, via, ipfsCID) => {
            if (!result || result.error) {
                return { status: 'error', count: 0, matchedByCid: false, matchedVia: via, data: [], error: result?.error || 'not_checked' };
            }
            const history = result.data || [];
            return {
                status: history.length > 0 ? 'found' : 'empty',
                count: history.length,
                matchedByCid: history.some((sub) => sub.ipfsCID === ipfsCID),
                matchedVia: via,
                data: history,
                error: null
            };
        };

        const records = baseRecords.map(({ report, grade, studentId, topicId }) => {
            const selfKey = `${studentId}::${topicId}`;
            let chain = buildChain(historyByKey.get(selfKey), 'self', report.IPFS_CID);

            // Bug 1: neu ID cua chinh minh khong khop -> tim bang chung tu thanh vien cung nhom (nguoi da nop on-chain)
            if (!chain.matchedByCid && report.IPFS_CID) {
                for (const other of baseRecords) {
                    if (other.studentId === studentId || groupKeyOf(other) !== groupKeyOf({ report, topicId })) continue;
                    const otherResult = historyByKey.get(`${other.studentId}::${other.topicId}`);
                    if (otherResult && !otherResult.error && (otherResult.data || []).some((sub) => sub.ipfsCID === report.IPFS_CID)) {
                        chain = buildChain(otherResult, 'group', report.IPFS_CID);
                        break;
                    }
                }
            }

            // Bao cao nhom: chi nguoi dai dien co ban ghi diem (DiemSo) -> muon diem chung cua nhom cho cac thanh vien con lai
            let effectiveGrade = grade;
            let gradeFromGroup = false;
            if (!effectiveGrade) {
                const sibling = baseRecords.find((other) =>
                    other.grade &&
                    other.studentId !== studentId &&
                    groupKeyOf(other) === groupKeyOf({ report, topicId })
                );
                if (sibling) {
                    effectiveGrade = sibling.grade;
                    gradeFromGroup = true;
                }
            }

            return {
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
                grade: effectiveGrade ? {
                    id: String(effectiveGrade._id),
                    score: effectiveGrade.Diem,
                    aiScore: effectiveGrade.AI_Score,
                    feedback: effectiveGrade.NhanXet || '',
                    txHash: effectiveGrade.TxHash || null,
                    blockchainStatus: effectiveGrade.TrangThaiBlockchain,
                    submissionIndex: effectiveGrade.SubmissionIndex || 0,
                    error: effectiveGrade.LoiBlockchain || null,
                    fromGroup: gradeFromGroup
                } : null,
                chain
            };
        });

        res.json({
            contract: { address, version },
            count: records.length,
            records
        });
    } catch (error) {
        res.status(500).json({ error: getErrorMessage(error) });
    }
};

// Truy hoi ma tx THAT cho cac ban ghi cu (TxHash null / 0xMock) tu event log cua contract, roi cap nhat DB.
// GradeFinalized / ReportSubmitted deu indexed theo student + topic nen loc duoc dung giao dich.
exports.backfillTxHashes = async (req, res) => {
    try {
        const { contract, address, version } = await getThesisContract();
        const fromBlock = Number(process.env.THESIS_DEPLOY_BLOCK || 0);
        const keyOf = (value) => (version === 'v2' ? toBytes32(value) : value);

        // 1) Backfill Grade tx
        const grades = await DiemSo.find({
            $or: [{ TxHash: { $exists: false } }, { TxHash: null }, { TxHash: { $regex: '^0xMock' } }]
        });

        let gradeUpdated = 0;
        let gradeFailed = 0;
        for (const grade of grades) {
            const studentKey = keyOf(String(grade.SinhVien));
            const topicKey = keyOf(String(grade.DeTai));
            try {
                const events = await contract.queryFilter(
                    contract.filters.GradeFinalized(studentKey, topicKey), fromBlock, 'latest'
                );
                if (!events.length) { gradeFailed++; continue; }

                const idx = grade.SubmissionIndex || 0;
                const gradeInt = Math.round(Number(grade.Diem || 0) * 10);
                // Uu tien khop dung gia tri diem, roi toi vi tri submission index
                const match = events.find((e) => Number(e.args?.grade) === gradeInt)
                    || events[idx]
                    || events[events.length - 1];

                if (match?.transactionHash) {
                    grade.TxHash = match.transactionHash;
                    grade.TrangThaiBlockchain = 'DaGhi';
                    grade.LoiBlockchain = undefined;
                    await grade.save();
                    gradeUpdated++;
                } else {
                    gradeFailed++;
                }
            } catch (error) {
                gradeFailed++;
            }
        }

        // 2) Backfill Submit tx (chi nguoi nop that su moi co event tren chain)
        const reports = await BaoCao.find({
            $or: [{ SubmitTxHash: { $exists: false } }, { SubmitTxHash: null }, { SubmitTxHash: { $regex: '^0xMock' } }]
        });

        let reportUpdated = 0;
        let reportFailed = 0;
        for (const report of reports) {
            const studentKey = keyOf(String(report.SinhVien));
            const topicKey = keyOf(String(report.DeTai));
            try {
                const events = await contract.queryFilter(
                    contract.filters.ReportSubmitted(studentKey, topicKey), fromBlock, 'latest'
                );
                const match = events.find((e) => e.args?.ipfsCID === report.IPFS_CID) || events[0];
                if (match?.transactionHash) {
                    report.SubmitTxHash = match.transactionHash;
                    await report.save();
                    reportUpdated++;
                } else {
                    reportFailed++;
                }
            } catch (error) {
                reportFailed++;
            }
        }

        res.json({
            contract: { address, version },
            fromBlock,
            grade: { scanned: grades.length, updated: gradeUpdated, failed: gradeFailed },
            report: { scanned: reports.length, updated: reportUpdated, failed: reportFailed }
        });
    } catch (error) {
        res.status(500).json({ error: getErrorMessage(error) });
    }
};

// SV xem lich su blockchain CUA CHINH MINH (lay studentId tu JWT, khong tu query -> bao mat).
// Tai dung logic doi chieu cua getThesisDbRecords nhung GIOI HAN o bao cao cua SV (+ ban ghi cung nhom de doi chieu).
exports.getMyThesisRecords = async (req, res) => {
    try {
        const studentId = req.user?.id;
        if (!studentId) {
            return res.status(401).json({ error: 'Chua dang nhap', code: 'CHUA_DANG_NHAP' });
        }

        const { provider, contract, address, version } = await getThesisContract();
        // Thong tin mang KHONG bat buoc -> loi RPC khong duoc lam hong toan bo API
        let network = null;
        try {
            const net = await provider.getNetwork();
            network = { name: net.name, chainId: Number(net.chainId) };
        } catch (netErr) { /* bo qua */ }

        // 1) Bao cao cua chinh sinh vien
        const myReports = await BaoCao.find({ SinhVien: studentId })
            .populate('SinhVien', 'HoTen MaSV WalletAddress')
            .populate('DeTai', 'TenDeTai MaDeTai')
            .sort({ createdAt: -1 })
            .lean();

        if (myReports.length === 0) {
            return res.json({
                contract: { address, version },
                network,
                count: 0,
                records: []
            });
        }

        // 2) Bao cao cung nhom (cung de tai + cung file IPFS) -> co bang chung on-chain/diem theo nhom
        const topicIds = [...new Set(myReports.map((r) => String(r.DeTai?._id || r.DeTai)))];
        const cids = [...new Set(myReports.map((r) => r.IPFS_CID).filter(Boolean))];
        const siblingReports = cids.length > 0 ? await BaoCao.find({
            DeTai: { $in: topicIds },
            IPFS_CID: { $in: cids },
            SinhVien: { $ne: studentId }
        })
            .populate('SinhVien', 'HoTen MaSV WalletAddress')
            .populate('DeTai', 'TenDeTai MaDeTai')
            .lean() : [];

        const allReports = [...myReports, ...siblingReports];

        // 3) Diem cua cac bao cao nay
        const grades = await DiemSo.find({ BaoCao: { $in: allReports.map((r) => r._id) } })
            .populate('DeTai', 'TenDeTai MaDeTai')
            .lean();
        const gradeMap = new Map();
        grades.forEach((grade) => gradeMap.set(String(grade.BaoCao), grade));

        const baseRecords = allReports.map((report) => ({
            report,
            grade: gradeMap.get(String(report._id)) || null,
            studentId: String(report.SinhVien?._id || report.SinhVien),
            topicId: String(report.DeTai?._id || report.DeTai)
        }));

        const groupKeyOf = (item) => `${item.topicId}::${item.report.IPFS_CID || ''}`;

        // Goi on-chain theo cap (studentId, topicId) duy nhat, gioi han song song chong rate-limit
        const uniquePairs = new Map();
        for (const item of baseRecords) {
            const pairKey = `${item.studentId}::${item.topicId}`;
            if (!uniquePairs.has(pairKey)) {
                uniquePairs.set(pairKey, { studentId: item.studentId, topicId: item.topicId });
            }
        }
        const CONCURRENCY = 5;
        const historyByKey = new Map();
        const pairList = Array.from(uniquePairs.entries());
        for (let i = 0; i < pairList.length; i += CONCURRENCY) {
            const batch = pairList.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(async ([pairKey, { studentId: sId, topicId: tId }]) => {
                try {
                    const history = await readOnChainHistory(contract, version, sId, tId);
                    historyByKey.set(pairKey, { data: history, error: null });
                } catch (error) {
                    historyByKey.set(pairKey, { data: null, error: getErrorMessage(error) });
                }
            }));
        }

        const buildChain = (result, via, ipfsCID) => {
            if (!result || result.error) {
                return { status: 'error', count: 0, matchedByCid: false, matchedVia: via, data: [], error: result?.error || 'not_checked' };
            }
            const history = result.data || [];
            return {
                status: history.length > 0 ? 'found' : 'empty',
                count: history.length,
                matchedByCid: history.some((sub) => sub.ipfsCID === ipfsCID),
                matchedVia: via,
                data: history,
                error: null
            };
        };

        const myReportIds = new Set(myReports.map((r) => String(r._id)));
        const records = baseRecords
            .filter(({ report }) => myReportIds.has(String(report._id)))
            .map(({ report, grade, studentId: sId, topicId }) => {
                const selfKey = `${sId}::${topicId}`;
                let chain = buildChain(historyByKey.get(selfKey), 'self', report.IPFS_CID);

                // Neu ID cua minh khong khop -> tim bang chung tu thanh vien cung nhom (nguoi da nop on-chain)
                if (!chain.matchedByCid && report.IPFS_CID) {
                    for (const other of baseRecords) {
                        if (other.studentId === sId || groupKeyOf(other) !== groupKeyOf({ report, topicId })) continue;
                        const otherResult = historyByKey.get(`${other.studentId}::${other.topicId}`);
                        if (otherResult && !otherResult.error && (otherResult.data || []).some((sub) => sub.ipfsCID === report.IPFS_CID)) {
                            chain = buildChain(otherResult, 'group', report.IPFS_CID);
                            break;
                        }
                    }
                }

                // Bao cao nhom: chi nguoi dai dien co DiemSo -> muon diem chung cho thanh vien con lai
                let effectiveGrade = grade;
                let gradeFromGroup = false;
                if (!effectiveGrade) {
                    const sibling = baseRecords.find((other) =>
                        other.grade &&
                        other.studentId !== sId &&
                        groupKeyOf(other) === groupKeyOf({ report, topicId })
                    );
                    if (sibling) {
                        effectiveGrade = sibling.grade;
                        gradeFromGroup = true;
                    }
                }

                return {
                    report: {
                        id: String(report._id),
                        title: report.TieuDe,
                        ipfsCID: report.IPFS_CID,
                        submitTxHash: report.SubmitTxHash || null,
                        submittedAt: report.NgayNop || report.createdAt
                    },
                    student: {
                        id: sId,
                        name: report.SinhVien?.HoTen || '',
                        code: report.SinhVien?.MaSV || '',
                        walletAddress: report.SinhVien?.WalletAddress || ''
                    },
                    topic: {
                        id: topicId,
                        code: report.DeTai?.MaDeTai || '',
                        title: report.DeTai?.TenDeTai || ''
                    },
                    grade: effectiveGrade ? {
                        id: String(effectiveGrade._id),
                        score: effectiveGrade.Diem,
                        aiScore: effectiveGrade.AI_Score,
                        feedback: effectiveGrade.NhanXet || '',
                        txHash: effectiveGrade.TxHash || null,
                        blockchainStatus: effectiveGrade.TrangThaiBlockchain,
                        submissionIndex: effectiveGrade.SubmissionIndex || 0,
                        error: effectiveGrade.LoiBlockchain || null,
                        fromGroup: gradeFromGroup
                    } : null,
                    chain
                };
            });

        res.json({
            contract: { address, version },
            network,
            count: records.length,
            records
        });
    } catch (error) {
        res.status(500).json({ error: getErrorMessage(error) });
    }
};
