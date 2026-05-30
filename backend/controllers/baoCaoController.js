const BaoCao = require('../models/BaoCao');
const DeTai = require('../models/DeTai');
const DangKyDeTai = require('../models/DangKyDeTai');
const DiemSo = require('../models/DiemSo');
const ipfsService = require('../services/ipfsService');
const logger = require('../config/logger');
const fs = require('fs');

const cleanupTempFile = (filePath) => {
    if (!filePath) return;
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (ignore) {}
};

const getAcceptedMembers = (dangKy) => {
    const acceptedMembers = (dangKy?.ThanhVien || []).filter(tv =>
        tv?.SinhVien && tv.TrangThaiTV === 'DaChapNhan'
    );

    if (acceptedMembers.length > 0) {
        return acceptedMembers;
    }

    if (!dangKy?.SinhVien) {
        return [];
    }

    return [{
        SinhVien: dangKy.SinhVien,
        VaiTro: 'TruongNhom',
        TrangThaiTV: 'DaChapNhan'
    }];
};

// SV nộp báo cáo
exports.uploadBaoCao = async (req, res) => {
    try {
        const { deTaiId, sinhVienId, tieuDe } = req.body;
        const requesterId = req.user?.id || sinhVienId;

        if (req.user?.id && sinhVienId && req.user.id !== sinhVienId) {
            return res.status(403).json({ error: 'Bạn không có quyền nộp thay sinh viên khác.' });
        }

        const deTai = await DeTai.findById(deTaiId);
        if (!deTai) {
            return res.status(404).json({ error: 'Không tìm thấy đề tài.' });
        }

        // #7: chặn nộp báo cáo sau hạn nộp
        const hanNopBaoCao = deTai.HanNopBaoCao || deTai.Deadline;
        if (hanNopBaoCao && new Date() > new Date(hanNopBaoCao)) {
            return res.status(400).json({ error: 'Đã quá hạn nộp báo cáo cho đề tài này.', code: 'QUA_HAN_NOP_BAO_CAO' });
        }

        const dangKy = await DangKyDeTai.findOne({
            DeTai: deTaiId,
            TrangThai: 'DaDuyet',
            $or: [
                { SinhVien: requesterId },
                { 'ThanhVien.SinhVien': requesterId, 'ThanhVien.TrangThaiTV': 'DaChapNhan' }
            ]
        });

        if (!dangKy) {
            return res.status(400).json({ error: 'Bạn chưa được duyệt cho đề tài này.' });
        }

        const acceptedMembers = getAcceptedMembers(dangKy);
        const acceptedMemberIds = acceptedMembers.map(tv => tv.SinhVien.toString());
        const leaderId = dangKy.SinhVien.toString();
        const isGroupTopic = (deTai.SoLuongSinhVien || 1) > 1;

        if (isGroupTopic && requesterId !== leaderId) {
            return res.status(403).json({ error: 'Chỉ trưởng nhóm mới có quyền nộp báo cáo chung.' });
        }

        const existing = await BaoCao.findOne({
            DeTai: deTaiId,
            SinhVien: { $in: acceptedMemberIds }
        });
        if (existing) {
            return res.status(400).json({
                error: isGroupTopic
                    ? 'Nhóm đã nộp báo cáo cho đề tài này rồi.'
                    : 'Bạn đã nộp báo cáo cho đề tài này rồi.'
            });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Bạn chưa đính kèm file báo cáo.' });
        }

        // Validate magic bytes — chặn file giả mạo MIME
        try {
            const fileBuffer = fs.readFileSync(req.file.path);
            const magicBytes = fileBuffer.slice(0, 4).toString('ascii');
            if (magicBytes !== '%PDF') {
                cleanupTempFile(req.file.path);
                return res.status(400).json({ error: 'File không hợp lệ. Chỉ chấp nhận file PDF thực sự.' });
            }
        } catch (fsErr) {
            logger.error(`[REPORT] Magic bytes check failed: ${fsErr.message}`);
            cleanupTempFile(req.file.path);
            return res.status(400).json({ error: 'Không thể đọc file báo cáo.' });
        }

        // Chặn PDF quá lớn (phòng thủ chiều sâu)
        if (req.file.size > 20 * 1024 * 1024) {
            cleanupTempFile(req.file.path);
            return res.status(400).json({ error: 'File quá lớn. Tối đa 20MB.' });
        }

        // 1. Trích xuất text từ file PDF tạm (gọi trước khi uploadFile vì uploadFile sẽ tự động xóa file tạm)
        let extractionResult = { text: '', page_count: 0, method: 'failed', warnings: [] };
        try {
            const aiService = require('../services/aiService');
            extractionResult = await aiService.extractPdf(req.file.path);
            logger.info(`[REPORT] PDF extracted | method=${extractionResult.method} | pages=${extractionResult.page_count} | textLen=${extractionResult.text ? extractionResult.text.length : 0}`);
            if (extractionResult.warnings && extractionResult.warnings.length > 0) {
                logger.warn(`[REPORT] PDF warnings: ${extractionResult.warnings.join('; ')}`);
            }
        } catch (extractErr) {
            logger.warn(`[REPORT] PDF extraction failed (non-blocking): ${extractErr.message}`);
        }

        // 2. Upload file lên IPFS
        extractionResult.warnings = extractionResult.warnings || [];
        if (extractionResult.method === 'failed' || (extractionResult.text || '').length < 500) {
            extractionResult.warnings.push(
                'Canh bao: Khong doc duoc noi dung PDF hoac noi dung qua ngan. AI co the khong cham diem chinh xac.'
            );
        }

        let ipfsCid;
        try {
            const ipfsResult = await ipfsService.uploadFile(req.file.path, req.file.originalname);
            ipfsCid = ipfsResult.IpfsHash;
        } catch (e) {
            cleanupTempFile(req.file.path);
            logger.error(`[REPORT] IPFS upload failed: ${e.message}`);
            return res.status(500).json({ error: 'Không thể tải file lên IPFS (Pinata). Vui lòng kiểm tra API Key.' });
        }

        const payload = acceptedMembers.map(tv => ({
            DeTai: deTaiId,
            SinhVien: tv.SinhVien,
            Nhom: dangKy.Nhom || undefined,
            TieuDe: tieuDe || 'Báo cáo đồ án',
            IPFS_CID: ipfsCid,
            ExtractedText: extractionResult.text || null,
            ExtractedAt: extractionResult.text ? new Date() : null,
            PageCount: extractionResult.page_count || null,
            ExtractionMethod: extractionResult.method || null,
            ExtractionWarnings: extractionResult.warnings || []
        }));

        const createdReports = await BaoCao.insertMany(payload);
        const myReport = createdReports.find(report => report.SinhVien.toString() === requesterId) || createdReports[0];

        // === GHI SUBMISSION LÊN BLOCKCHAIN (non-blocking) ===
        let submitTxHash = null;
        try {
            const contractService = require('../services/thesisContractService');
            const timestamp = Math.floor(Date.now() / 1000);
            submitTxHash = await contractService.submitReportOnChain(
                requesterId, deTaiId, ipfsCid, timestamp
            );
            // Cập nhật TxHash vào tất cả BaoCao đã tạo
            await BaoCao.updateMany(
                { _id: { $in: createdReports.map(r => r._id) } },
                { SubmitTxHash: submitTxHash }
            );
            logger.info(`[REPORT] Blockchain submit success | txHash=${submitTxHash}`);
        } catch (bcErr) {
            logger.warn(`[REPORT] Blockchain submit failed (non-blocking): ${bcErr.message}`);
        }

        const populated = await BaoCao.findById(myReport._id).populate('DeTai').populate('SinhVien');

        logger.info(`[REPORT] Uploaded by student ${requesterId} | topic=${deTaiId} | CID=${ipfsCid} | members=${acceptedMembers.length}`);
        res.status(201).json({
            message: isGroupTopic ? 'Nộp báo cáo thành công cho cả nhóm' : 'Nộp báo cáo thành công',
            data: populated,
            blockchainStatus: submitTxHash ? 'success' : 'failed',
            txHash: submitTxHash || null
        });
    } catch (err) {
        cleanupTempFile(req.file?.path);
        logger.error(`[REPORT] Upload failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// SV lấy báo cáo của mình
exports.getMyBaoCao = async (req, res) => {
    try {
        const svId = req.params.svId;
        const { deTaiId } = req.query;
        const query = { SinhVien: svId };
        if (deTaiId) {
            query.DeTai = deTaiId;
        }
        const baocao = await BaoCao.findOne(query).populate('DeTai').populate('Nhom');
        res.json({ baocao: baocao || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// SV hủy nộp (xóa báo cáo)
exports.deleteBaoCao = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.user?.id;
        const bc = await BaoCao.findById(id).populate('DeTai');
        if (!bc) return res.status(404).json({ error: 'Không tìm thấy báo cáo' });

        const dangKy = await DangKyDeTai.findOne({
            DeTai: bc.DeTai?._id || bc.DeTai,
            TrangThai: 'DaDuyet',
            $or: [
                { SinhVien: bc.SinhVien },
                { 'ThanhVien.SinhVien': bc.SinhVien, 'ThanhVien.TrangThaiTV': 'DaChapNhan' }
            ]
        });

        const acceptedMembers = getAcceptedMembers(dangKy);
        const acceptedMemberIds = acceptedMembers.map(tv => tv.SinhVien.toString());
        const isGroupTopic = (bc.DeTai?.SoLuongSinhVien || 1) > 1;
        const leaderId = dangKy?.SinhVien?.toString();

        if (requesterId) {
            if (isGroupTopic) {
                if (requesterId !== leaderId) {
                    return res.status(403).json({ error: 'Chỉ trưởng nhóm mới có quyền hủy bài nộp chung.' });
                }
            } else if (bc.SinhVien.toString() !== requesterId) {
                return res.status(403).json({ error: 'Bạn không có quyền hủy báo cáo này.' });
            }
        }

        const reportsToCheck = isGroupTopic
            ? await BaoCao.find({
                DeTai: bc.DeTai?._id || bc.DeTai,
                SinhVien: { $in: acceptedMemberIds }
            }).select('_id')
            : [bc];

        const graded = await DiemSo.findOne({ BaoCao: { $in: reportsToCheck.map(report => report._id) } });
        if (graded) {
            return res.status(400).json({ error: 'Bài báo cáo đã được chấm điểm, không thể hủy nộp.' });
        }

        if (isGroupTopic) {
            await BaoCao.deleteMany({
                DeTai: bc.DeTai?._id || bc.DeTai,
                SinhVien: { $in: acceptedMemberIds }
            });
            return res.json({ message: 'Đã hủy bài nộp chung của cả nhóm' });
        }

        await BaoCao.findByIdAndDelete(id);
        res.json({ message: 'Đã hủy nộp báo cáo' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GV lấy tất cả báo cáo theo đề tài
exports.getBaoCaoByDeTai = async (req, res) => {
    try {
        const list = await BaoCao.find({ DeTai: req.params.deTaiId }).populate('SinhVien').populate('Nhom');
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GV lấy tất cả báo cáo cho các đề tài của mình
exports.getBaoCaoByLecturer = async (req, res) => {
    try {
        const gvId = req.params.gvId;
        const mongoose = require('mongoose');

        let myTopics;
        try {
            const objectId = new mongoose.Types.ObjectId(gvId);
            myTopics = await DeTai.find({
                $or: [
                    { GiangVienHuongDan: objectId },
                    { GiangVienHuongDan: gvId }
                ]
            });
        } catch (e) {
            myTopics = await DeTai.find({ GiangVienHuongDan: gvId });
        }

        const topicIds = myTopics.map(t => t._id);

        const approvedRegs = await DangKyDeTai.find({
            DeTai: { $in: topicIds },
            TrangThai: 'DaDuyet'
        })
        .populate('SinhVien')
        .populate('ThanhVien.SinhVien')
        .populate({
            path: 'DeTai',
            populate: [
                { path: 'GiangVienHuongDan', select: 'HoTen MaGV' },
                { path: 'MonHoc', select: 'MaMonHoc TenMonHoc' },
                { path: 'LopHoc', select: 'MaLopHoc TenLopHoc' }
            ]
        })
        .populate('Nhom');

        const submissions = await BaoCao.find({ DeTai: { $in: topicIds } })
            .select('-ExtractedText -ExtractionWarnings')
            .populate('SinhVien')
            .populate('DeTai')
            .populate('Nhom');

        const diemSoList = await DiemSo.find({ DeTai: { $in: topicIds } });

        const result = approvedRegs.flatMap(reg => {
            const members = getAcceptedMembers(reg);

            return members.map(tv => {
                const studentId = tv.SinhVien?._id?.toString() || tv.SinhVien?.toString();
                const topicId = reg.DeTai?._id?.toString() || reg.DeTai?.toString();
                const sub = submissions.find(s =>
                    s.SinhVien?._id?.toString() === studentId &&
                    s.DeTai?._id?.toString() === topicId
                );
                const grade = sub
                    ? diemSoList.find(d => d.BaoCao?.toString() === sub._id.toString())
                    : null;

                return {
                    _id: `${reg._id}-${studentId}`,
                    student: tv.SinhVien,
                    topic: reg.DeTai,
                    registration: reg,
                    submission: sub || null,
                    grade: grade || null,
                    isLeader: tv.VaiTro === 'TruongNhom',
                    status: grade ? 'DaCham' : (sub ? 'DaNop' : 'ChuaNop')
                };
            });
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GV lay noi dung PDF da trich xuat khi mo chi tiet bao cao
exports.getExtractedText = async (req, res) => {
    try {
        const bc = await BaoCao.findById(req.params.id)
            .select('DeTai ExtractedText ExtractionMethod ExtractionWarnings PageCount ExtractedAt')
            .populate('DeTai', 'GiangVienHuongDan');

        if (!bc) {
            return res.status(404).json({ error: 'Bao cao khong ton tai', code: 'BAOCAO_KHONG_TON_TAI' });
        }

        const giangVienId = req.user?.id;
        if (giangVienId && String(bc.DeTai?.GiangVienHuongDan) !== String(giangVienId)) {
            return res.status(403).json({ error: 'Khong co quyen xem bao cao nay', code: 'KHONG_CO_QUYEN' });
        }

        res.json({
            ExtractedText: bc.ExtractedText,
            ExtractionMethod: bc.ExtractionMethod,
            ExtractionWarnings: bc.ExtractionWarnings,
            PageCount: bc.PageCount,
            ExtractedAt: bc.ExtractedAt
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
