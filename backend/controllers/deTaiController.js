const DeTai = require('../models/DeTai');
const DangKyDeTai = require('../models/DangKyDeTai');
const SinhVien = require('../models/SinhVien');
const logger = require('../config/logger');

exports.getAll = async (req, res) => {
    try {
        const list = await DeTai.find({}).populate('GiangVienHuongDan');
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const item = await DeTai.findById(req.params.id).populate('GiangVienHuongDan');
        if (!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const body = req.body;

        // Validate Rubrics nếu SuDungRubrics = true
        if (body.SuDungRubrics) {
            if (!body.Rubrics || body.Rubrics.length === 0) {
                return res.status(400).json({ error: 'Khi bật Rubrics, cần ít nhất 1 tiêu chí.' });
            }

            const tongTrongSo = body.Rubrics.reduce((sum, tc) => sum + (tc.TrongSo || 0), 0);
            if (tongTrongSo !== 100) {
                return res.status(400).json({ 
                    error: `Tổng trọng số Rubrics phải = 100%. Hiện tại = ${tongTrongSo}%.` 
                });
            }

            // Kiểm tra mỗi tiêu chí hợp lệ
            for (const tc of body.Rubrics) {
                if (!tc.TenTieuChi || tc.TrongSo <= 0) {
                    return res.status(400).json({ error: 'Mỗi tiêu chí phải có Tên và Trọng số > 0.' });
                }
            }
        }

        // Nếu chọn từ template → update template tracking
        if (body._templateId) {
            const RubricsTemplate = require('../models/RubricsTemplate');
            const template = await RubricsTemplate.findById(body._templateId);
            if (template) {
                template.DaApDung = true;
                template.SoLuotDung = (template.SoLuotDung || 0) + 1;
                await template.save();
            }
            delete body._templateId; // Không lưu vào DeTai
        }

        const newItem = new DeTai(body);
        await newItem.save();
        logger.info(`[TOPIC] Created "${body.TenDeTai}" by GV ${body.GiangVienHuongDan} | Rubrics: ${body.SuDungRubrics || false}`);
        res.status(201).json(newItem);
    } catch (err) {
        logger.error(`[TOPIC] Create failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updated = await DeTai.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await DeTai.findByIdAndDelete(req.params.id);
        // Xóa luôn đăng ký liên quan
        await DangKyDeTai.deleteMany({ DeTai: req.params.id });
        logger.info(`[TOPIC] Deleted topic ${req.params.id}`);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        logger.error(`[TOPIC] Delete failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// Sinh viên đăng ký đề tài
exports.registerTopic = async (req, res) => {
    try {
        const { sinhVienId } = req.body;
        const deTaiId = req.params.id;

        // Kiểm tra SV đã đăng ký đề tài nào chưa (kể cả với tư cách thành viên)
        const existing = await DangKyDeTai.findOne({ 
            TrangThai: { $ne: 'TuChoi' },
            $or: [
                { SinhVien: sinhVienId },
                { 'ThanhVien.SinhVien': sinhVienId, 'ThanhVien.TrangThaiTV': { $in: ['DaMoi', 'DaChapNhan'] } }
            ]
        });

        if (existing) {
            return res.status(400).json({ error: 'Bạn đã đăng ký hoặc đang trong nhóm của một đề tài. Không thể đăng ký thêm.' });
        }

        const dangKy = new DangKyDeTai({ 
            DeTai: deTaiId, 
            SinhVien: sinhVienId, 
            ThanhVien: [{
                SinhVien: sinhVienId,
                VaiTro: 'TruongNhom',
                TrangThaiTV: 'DaChapNhan'
            }],
            TrangThai: 'ChoDuyet' 
        });

        await dangKy.save();
        logger.info(`[TOPIC] Student ${sinhVienId} registered for topic ${deTaiId}`);
        res.status(201).json({ message: 'Đăng ký đề tài thành công (Trưởng nhóm)!', data: dangKy });
    } catch (err) {
        logger.error(`[TOPIC] Registration failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// Lấy đăng ký của 1 sinh viên (kiểm tra đã đăng ký đề tài nào chưa)
exports.getMyRegistration = async (req, res) => {
    try {
        const svId = req.params.svId;
        const registration = await DangKyDeTai.findOne({
            TrangThai: { $ne: 'TuChoi' },
            $or: [
                { SinhVien: svId },
                { 'ThanhVien.SinhVien': svId, 'ThanhVien.TrangThaiTV': 'DaChapNhan' }
            ]
        }).populate('DeTai').populate('ThanhVien.SinhVien');

        res.json({ registration: registration || null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Lấy tất cả đăng ký cho đề tài của 1 Giảng viên
exports.getRegistrationsByLecturer = async (req, res) => {
    try {
        const gvId = req.params.gvId;

        // Tìm tất cả đề tài của GV (hỗ trợ cả ObjectId và String)
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

        // Tìm tất cả đăng ký cho các đề tài đó
        const registrations = await DangKyDeTai.find({ DeTai: { $in: topicIds } })
            .populate('SinhVien')
            .populate('ThanhVien.SinhVien')
            .populate('DeTai');

        res.json(registrations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Sinh viên hủy đăng ký
exports.cancelRegistration = async (req, res) => {
    try {
        const { id } = req.params;
        const dangKy = await DangKyDeTai.findById(id);

        if (!dangKy) {
            return res.status(404).json({ error: 'Không tìm thấy lượt đăng ký' });
        }

        // (Tuỳ chọn) Chỉ cho hủy khi đang chờ duyệt
        if (dangKy.TrangThai !== 'ChoDuyet') {
            return res.status(400).json({ error: 'Chỉ có thể hủy đăng ký khi trạng thái là Chờ duyệt' });
        }

        await DangKyDeTai.findByIdAndDelete(id);
        res.json({ message: 'Hủy đăng ký đề tài thành công!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Giảng viên duyệt / từ chối đăng ký
exports.approveRegistration = async (req, res) => {
    try {
        const { id } = req.params;
        const { trangThai } = req.body; // 'DaDuyet' hoặc 'TuChoi'

        if (!['DaDuyet', 'TuChoi'].includes(trangThai)) {
            return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
        }

        const updated = await DangKyDeTai.findByIdAndUpdate(id, { TrangThai: trangThai }, { new: true })
            .populate('SinhVien')
            .populate('DeTai');

        if (!updated) {
            return res.status(404).json({ error: 'Không tìm thấy đăng ký' });
        }

        // Nếu duyệt, cập nhật trạng thái đề tài + TỰ ĐỘNG từ chối các nhóm khác
        if (trangThai === 'DaDuyet') {
            await DeTai.findByIdAndUpdate(updated.DeTai._id, { TrangThai: 'DaChot' });

            // Từ chối tất cả đăng ký KHÁC cho cùng đề tài (tránh 2 nhóm cùng được duyệt)
            await DangKyDeTai.updateMany(
                { 
                    DeTai: updated.DeTai._id, 
                    _id: { $ne: id }, 
                    TrangThai: 'ChoDuyet' 
                },
                { TrangThai: 'TuChoi' }
            );
        }

        logger.info(`[TOPIC] Registration ${id} ${trangThai === 'DaDuyet' ? 'approved' : 'rejected'} | topic=${updated.DeTai?._id}`);
        res.json({ message: `Đã ${trangThai === 'DaDuyet' ? 'duyệt' : 'từ chối'} thành công`, data: updated });
    } catch (err) {
        logger.error(`[TOPIC] Approve/Reject failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// --- MỜI NHÓM VÀ QUẢN LÝ NHÓM ---

// Mời sinh viên vào nhóm (Trưởng nhóm thao tác)
exports.inviteMember = async (req, res) => {
    try {
        const { id } = req.params; // deTaiId
        const { maSV } = req.body;
        const jwtPayloadId = req.user.id; // Lấy từ token (nếu có user object)

        // B1: Tìm Sinh viên được mời qua mã SV
        const svMoi = await SinhVien.findOne({ MaSV: maSV });
        if (!svMoi) return res.status(404).json({ error: 'Không tìm thấy sinh viên với Mã SV này.' });

        // B2: Kiểm tra sinh viên được mời đã đăng ký đề tài nào chưa
        const existingReg = await DangKyDeTai.findOne({
            TrangThai: { $ne: 'TuChoi' },
            $or: [
                { SinhVien: svMoi._id },
                { 'ThanhVien.SinhVien': svMoi._id, 'ThanhVien.TrangThaiTV': { $in: ['DaMoi', 'DaChapNhan'] } }
            ]
        });

        if (existingReg) {
            return res.status(400).json({ error: 'Sinh viên này đã ứng tuyển hoặc thao tác với 1 đề tài khác.' });
        }

        // B3: Tìm phiếu đăng ký hiện tại của trưởng nhóm
        const dangKy = await DangKyDeTai.findOne({ DeTai: id, SinhVien: jwtPayloadId, TrangThai: { $ne: 'TuChoi' } });
        if (!dangKy) {
            return res.status(404).json({ error: 'Bạn chưa đăng ký đề tài này (Chỉ Trưởng nhóm mới có quyền mời).' });
        }

        // B4: Kiểm tra giới hạn thành viên
        const deTaiObj = await DeTai.findById(id);
        if (dangKy.ThanhVien.length >= deTaiObj.SoLuongSinhVien) {
             return res.status(400).json({ error: `Nhóm đã đủ số lượng, tối đa ${deTaiObj.SoLuongSinhVien} sinh viên.` });
        }

        // B5: Thêm vào nhóm (trạng thái DaMoi)
        dangKy.ThanhVien.push({
            SinhVien: svMoi._id,
            VaiTro: 'ThanhVien',
            TrangThaiTV: 'DaMoi'
        });
        await dangKy.save();

        logger.info(`[TOPIC] Student ${svMoi.MaSV} invited to topic ${id} by leader ${jwtPayloadId}`);
        res.json({ message: 'Đã gửi lời mời thành công!' });
    } catch (err) {
        logger.error(`[TOPIC] Invite member failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// Lấy danh sách lời mời của 1 sinh viên
exports.getMyInvitations = async (req, res) => {
    try {
        const { svId } = req.params;
        const invitations = await DangKyDeTai.find({
            'ThanhVien': { 
                $elemMatch: { SinhVien: svId, TrangThaiTV: 'DaMoi' } 
            },
            TrangThai: { $ne: 'TuChoi' }
        }).populate('DeTai').populate('SinhVien'); // populate Trưởng nhóm

        res.json(invitations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// SV Trả lời lời mời (Đồng ý / Từ chối)
exports.respondToInvitation = async (req, res) => {
    try {
        const { id } = req.params; // DangKyDeTai ID (invitationId)
        const { accept } = req.body; // true / false
        const jwtPayloadId = req.user.id;

        const dangKy = await DangKyDeTai.findById(id);
        if (!dangKy) return res.status(404).json({ error: 'Không tìm thấy lời mời.' });

        const thanhVienIndex = dangKy.ThanhVien.findIndex(tv => 
            tv.SinhVien.toString() === jwtPayloadId && tv.TrangThaiTV === 'DaMoi'
        );

        if (thanhVienIndex === -1) {
            return res.status(400).json({ error: 'Không tìm thấy lời mời hợp lệ cho sinh viên này.' });
        }

        if (accept) {
            // Kiểm tra tổng quát lần nữa tránh tham gia song song 2 nhóm
            const existingReg = await DangKyDeTai.findOne({
                _id: { $ne: id },
                TrangThai: { $ne: 'TuChoi' },
                $or: [
                    { SinhVien: jwtPayloadId },
                    { 'ThanhVien.SinhVien': jwtPayloadId, 'ThanhVien.TrangThaiTV': 'DaChapNhan' }
                ]
            });

            if (existingReg) {
                return res.status(400).json({ error: 'Bạn đã ở nhóm khác nên không thể chấp nhận.' });
            }

            dangKy.ThanhVien[thanhVienIndex].TrangThaiTV = 'DaChapNhan';
            await dangKy.save();
            res.json({ message: 'Đã chấp nhận gia nhập nhóm.' });
        } else {
            // Từ chối -> Xóa element ra khỏi array
            dangKy.ThanhVien.splice(thanhVienIndex, 1);
            await dangKy.save();
            res.json({ message: 'Đã từ chối lời mời.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
