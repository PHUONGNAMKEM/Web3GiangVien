const Nhom = require('../models/Nhom');
const SinhVien = require('../models/SinhVien');
const DangKyDeTai = require('../models/DangKyDeTai');
const logger = require('../config/logger');

// Tạo nhóm mới (SV tự động làm trưởng nhóm)
exports.createNhom = async (req, res) => {
  try {
    const { tenNhom, soLuong } = req.body;
    const sinhVienId = req.user?.id || req.body.sinhVienId;

    if (!sinhVienId || !soLuong) {
      return res.status(400).json({ error: 'Thiếu thông tin sinhVienId hoặc soLuong.' });
    }

    // Check SV đã có nhóm chưa
    const existingNhom = await Nhom.findOne({
      $or: [
        { TruongNhom: sinhVienId },
        { 'ThanhVien.SinhVien': sinhVienId, 'ThanhVien.TrangThai': { $in: ['DaMoi', 'DaChapNhan'] } }
      ]
    });

    if (existingNhom) {
      return res.status(400).json({ error: 'Bạn đã có nhóm. Không thể tạo nhóm mới.' });
    }

    const nhom = new Nhom({
      TenNhom: tenNhom || '',
      TruongNhom: sinhVienId,
      ThanhVien: [{
        SinhVien: sinhVienId,
        VaiTro: 'TruongNhom',
        TrangThai: 'DaChapNhan'
      }],
      SoLuong: soLuong
    });

    await nhom.save();
    const populated = await Nhom.findById(nhom._id)
      .populate('TruongNhom')
      .populate('ThanhVien.SinhVien');

    logger.info(`[NHOM] Created group "${tenNhom || nhom._id}" by SV ${sinhVienId}, max=${soLuong}`);
    res.status(201).json({ message: 'Tạo nhóm thành công!', data: populated });
  } catch (err) {
    logger.error(`[NHOM] Create failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// Lấy nhóm của 1 SV
exports.getNhomBySinhVien = async (req, res) => {
  try {
    const { svId } = req.params;
    const nhom = await Nhom.findOne({
      'ThanhVien.SinhVien': svId,
      'ThanhVien.TrangThai': { $in: ['DaMoi', 'DaChapNhan'] }
    })
      .populate('TruongNhom')
      .populate('ThanhVien.SinhVien');

    res.json({ nhom: nhom || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Chi tiết nhóm
exports.getNhomById = async (req, res) => {
  try {
    const nhom = await Nhom.findById(req.params.id)
      .populate('TruongNhom')
      .populate('ThanhVien.SinhVien');

    if (!nhom) return res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    res.json(nhom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Trưởng nhóm mời thành viên (qua MaSV)
exports.inviteMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { maSV } = req.body;

    const nhom = await Nhom.findById(id);
    if (!nhom) return res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    if (req.user?.id && nhom.TruongNhom.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Chỉ trưởng nhóm mới có quyền mời thành viên.' });
    }
    if (nhom.DaChot) return res.status(400).json({ error: 'Nhóm đã chốt, không thể mời thêm.' });

    // Kiểm tra số lượng
    const activeMembers = nhom.ThanhVien.filter(tv => tv.TrangThai !== 'TuChoi');
    if (activeMembers.length >= nhom.SoLuong) {
      return res.status(400).json({ error: `Nhóm đã đủ ${nhom.SoLuong} thành viên.` });
    }

    // Tìm SV được mời
    const svMoi = await SinhVien.findOne({ MaSV: maSV });
    if (!svMoi) return res.status(404).json({ error: 'Không tìm thấy sinh viên với Mã SV này.' });

    // Check SV đã ở nhóm khác chưa
    const existingNhom = await Nhom.findOne({
      _id: { $ne: id },
      'ThanhVien.SinhVien': svMoi._id,
      'ThanhVien.TrangThai': { $in: ['DaMoi', 'DaChapNhan'] }
    });
    if (existingNhom) {
      return res.status(400).json({ error: 'Sinh viên này đã ở trong nhóm khác.' });
    }

    // Check SV đã được mời vào nhóm này chưa
    const alreadyInGroup = nhom.ThanhVien.find(
      tv => tv.SinhVien.toString() === svMoi._id.toString() && tv.TrangThai !== 'TuChoi'
    );
    if (alreadyInGroup) {
      return res.status(400).json({ error: 'Sinh viên này đã có trong nhóm.' });
    }

    nhom.ThanhVien.push({
      SinhVien: svMoi._id,
      VaiTro: 'ThanhVien',
      TrangThai: 'DaMoi'
    });
    await nhom.save();

    logger.info(`[NHOM] Invited ${maSV} to group ${id}`);
    res.json({ message: `Đã gửi lời mời đến ${svMoi.HoTen || maSV}!` });
  } catch (err) {
    logger.error(`[NHOM] Invite failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// Thành viên chấp nhận / từ chối lời mời
exports.respondToInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const { accept } = req.body;
    const sinhVienId = req.user?.id || req.body.sinhVienId;

    const nhom = await Nhom.findById(id);
    if (!nhom) return res.status(404).json({ error: 'Không tìm thấy nhóm.' });

    const tvIndex = nhom.ThanhVien.findIndex(
      tv => tv.SinhVien.toString() === sinhVienId && tv.TrangThai === 'DaMoi'
    );
    if (tvIndex === -1) {
      return res.status(400).json({ error: 'Không tìm thấy lời mời hợp lệ.' });
    }

    if (accept) {
      // Check SV chưa ở nhóm khác (double-check)
      const existingNhom = await Nhom.findOne({
        _id: { $ne: id },
        'ThanhVien.SinhVien': sinhVienId,
        'ThanhVien.TrangThai': 'DaChapNhan'
      });
      if (existingNhom) {
        return res.status(400).json({ error: 'Bạn đã ở trong nhóm khác.' });
      }

      nhom.ThanhVien[tvIndex].TrangThai = 'DaChapNhan';
      await nhom.save();
      logger.info(`[NHOM] SV ${sinhVienId} accepted invite to group ${id}`);
      res.json({ message: 'Đã chấp nhận gia nhập nhóm!' });
    } else {
      nhom.ThanhVien.splice(tvIndex, 1);
      await nhom.save();
      logger.info(`[NHOM] SV ${sinhVienId} rejected invite to group ${id}`);
      res.json({ message: 'Đã từ chối lời mời.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Trưởng nhóm kick thành viên
exports.kickMember = async (req, res) => {
  try {
    const { id, svId } = req.params;

    const nhom = await Nhom.findById(id);
    if (!nhom) return res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    if (req.user?.id && nhom.TruongNhom.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Chỉ trưởng nhóm mới có quyền xóa thành viên.' });
    }
    if (nhom.DaChot) return res.status(400).json({ error: 'Nhóm đã chốt, không thể xóa thành viên.' });

    // Không cho kick trưởng nhóm
    if (nhom.TruongNhom.toString() === svId) {
      return res.status(400).json({ error: 'Không thể xóa trưởng nhóm.' });
    }

    const tvIndex = nhom.ThanhVien.findIndex(tv => tv.SinhVien.toString() === svId);
    if (tvIndex === -1) {
      return res.status(400).json({ error: 'Không tìm thấy thành viên này.' });
    }

    nhom.ThanhVien.splice(tvIndex, 1);
    await nhom.save();

    logger.info(`[NHOM] Kicked SV ${svId} from group ${id}`);
    res.json({ message: 'Đã xóa thành viên khỏi nhóm.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Thành viên rời nhóm
exports.leaveNhom = async (req, res) => {
  try {
    const { id } = req.params;
    const sinhVienId = req.user?.id || req.body.sinhVienId;

    const nhom = await Nhom.findById(id);
    if (!nhom) return res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    if (nhom.DaChot) return res.status(400).json({ error: 'Nhóm đã chốt, không thể rời nhóm.' });

    // Trưởng nhóm không rời được (phải chuyển quyền hoặc xóa nhóm)
    if (nhom.TruongNhom.toString() === sinhVienId) {
      return res.status(400).json({ error: 'Trưởng nhóm không thể rời nhóm. Hãy chuyển quyền trước hoặc xóa nhóm.' });
    }

    const tvIndex = nhom.ThanhVien.findIndex(
      tv => tv.SinhVien.toString() === sinhVienId && tv.TrangThai === 'DaChapNhan'
    );
    if (tvIndex === -1) {
      return res.status(400).json({ error: 'Bạn không phải thành viên của nhóm này.' });
    }

    nhom.ThanhVien.splice(tvIndex, 1);
    await nhom.save();

    logger.info(`[NHOM] SV ${sinhVienId} left group ${id}`);
    res.json({ message: 'Đã rời nhóm thành công.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Chuyển quyền trưởng nhóm
exports.transferLeader = async (req, res) => {
  try {
    const { id } = req.params;
    const { toSinhVienId } = req.body;
    const fromSinhVienId = req.user?.id || req.body.fromSinhVienId;

    const nhom = await Nhom.findById(id);
    if (!nhom) return res.status(404).json({ error: 'Không tìm thấy nhóm.' });

    // #10: Nhóm đã chốt → không cho chuyển quyền (trưởng nhóm phải chịu trách nhiệm xuyên suốt)
    if (nhom.DaChot) {
      return res.status(400).json({ error: 'Nhóm đã chốt, không thể chuyển quyền trưởng nhóm.' });
    }

    if (nhom.TruongNhom.toString() !== fromSinhVienId) {
      return res.status(403).json({ error: 'Chỉ trưởng nhóm mới có quyền chuyển.' });
    }

    // Check người nhận là thành viên đã chấp nhận
    const newLeader = nhom.ThanhVien.find(
      tv => tv.SinhVien.toString() === toSinhVienId && tv.TrangThai === 'DaChapNhan'
    );
    if (!newLeader) {
      return res.status(400).json({ error: 'Người được chuyển quyền phải là thành viên đã chấp nhận.' });
    }

    // Đổi vai trò
    nhom.TruongNhom = toSinhVienId;
    nhom.ThanhVien.forEach(tv => {
      if (tv.SinhVien.toString() === toSinhVienId) tv.VaiTro = 'TruongNhom';
      if (tv.SinhVien.toString() === fromSinhVienId) tv.VaiTro = 'ThanhVien';
    });
    await nhom.save();

    logger.info(`[NHOM] Leader transferred from ${fromSinhVienId} to ${toSinhVienId} in group ${id}`);
    res.json({ message: 'Đã chuyển quyền trưởng nhóm thành công!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Chốt nhóm
exports.chotNhom = async (req, res) => {
  try {
    const { id } = req.params;

    const nhom = await Nhom.findById(id);
    if (!nhom) return res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    if (req.user?.id && nhom.TruongNhom.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Chỉ trưởng nhóm mới có quyền chốt nhóm.' });
    }
    if (nhom.DaChot) return res.status(400).json({ error: 'Nhóm đã được chốt rồi.' });

    // Kiểm tra số thành viên đã chấp nhận
    const accepted = nhom.ThanhVien.filter(tv => tv.TrangThai === 'DaChapNhan');
    if (accepted.length < nhom.SoLuong) {
      return res.status(400).json({ 
        error: `Nhóm cần đủ ${nhom.SoLuong} thành viên đã chấp nhận. Hiện tại: ${accepted.length}.` 
      });
    }

    // Xóa các lời mời chưa chấp nhận
    nhom.ThanhVien = nhom.ThanhVien.filter(tv => tv.TrangThai === 'DaChapNhan');
    nhom.DaChot = true;
    await nhom.save();

    logger.info(`[NHOM] Group ${id} finalized with ${accepted.length} members`);
    res.json({ message: 'Đã chốt nhóm thành công!', data: nhom });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Xoá nhóm (chỉ khi chưa đăng ký đề tài)
exports.deleteNhom = async (req, res) => {
  try {
    const { id } = req.params;

    const nhom = await Nhom.findById(id);
    if (!nhom) return res.status(404).json({ error: 'Không tìm thấy nhóm.' });
    if (req.user?.id && nhom.TruongNhom.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Chỉ trưởng nhóm mới có quyền xóa nhóm.' });
    }

    // Check nhóm đã đăng ký đề tài nào chưa
    const hasReg = await DangKyDeTai.findOne({ Nhom: id });
    if (hasReg) {
      return res.status(400).json({ error: 'Nhóm đã đăng ký đề tài. Không thể xóa.' });
    }

    await Nhom.findByIdAndDelete(id);
    logger.info(`[NHOM] Deleted group ${id}`);
    res.json({ message: 'Đã xóa nhóm thành công.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy lời mời đang chờ của 1 SV
exports.getPendingInvites = async (req, res) => {
  try {
    const { svId } = req.params;
    const nhoms = await Nhom.find({
      'ThanhVien': {
        $elemMatch: { SinhVien: svId, TrangThai: 'DaMoi' }
      }
    })
      .populate('TruongNhom')
      .populate('ThanhVien.SinhVien');

    res.json(nhoms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
