const LoiMoiLopHoc = require('../models/LoiMoiLopHoc');
const LopHoc = require('../models/LopHoc');
const SinhVien = require('../models/SinhVien');
const logger = require('../config/logger');

// Giảng viên mời 1 sinh viên vào lớp
exports.inviteSinhVien = async (req, res) => {
  try {
    const { lopId } = req.params;
    const { sinhVienId, maSV } = req.body;

    if (!sinhVienId && !maSV) {
      return res.status(400).json({ success: false, message: 'Thiếu sinhVienId hoặc maSV' });
    }

    // Tìm SV
    let sv;
    if (sinhVienId) {
      sv = await SinhVien.findById(sinhVienId);
    } else {
      sv = await SinhVien.findOne({ MaSV: maSV });
    }
    if (!sv) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    }

    // Tìm lớp học
    const lopHoc = await LopHoc.findById(lopId);
    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    // Kiểm tra SV đã có trong lớp chưa
    if (lopHoc.SinhVien.some(svId => svId.equals(sv._id))) {
      return res.status(409).json({ success: false, message: 'Sinh viên đã có trong lớp này' });
    }

    // Kiểm tra đã có lời mời pending chưa
    const existing = await LoiMoiLopHoc.findOne({ LopHoc: lopId, SinhVien: sv._id });
    if (existing) {
      if (existing.TrangThai === 'ChoChapNhan') {
        return res.status(409).json({ success: false, message: 'Đã gửi lời mời cho sinh viên này rồi' });
      }
      // Nếu đã từ chối trước đó → cho phép mời lại
      if (existing.TrangThai === 'TuChoi' || existing.TrangThai === 'DaChapNhan') {
        existing.TrangThai = 'ChoChapNhan';
        await existing.save();
        logger.info(`[LoiMoiLopHoc] Re-invited SV ${sv.MaSV} to class ${lopHoc.MaLopHoc}`);
        return res.json({ success: true, message: 'Đã gửi lại lời mời cho sinh viên', data: existing });
      }
    }

    const loiMoi = new LoiMoiLopHoc({
      LopHoc: lopId,
      SinhVien: sv._id,
      GiangVien: lopHoc.GiangVien,
      TrangThai: 'ChoChapNhan'
    });
    await loiMoi.save();

    logger.info(`[LoiMoiLopHoc] Invited SV ${sv.MaSV} to class ${lopHoc.MaLopHoc}`);
    res.status(201).json({ success: true, message: 'Đã gửi lời mời. Chờ sinh viên chấp nhận.', data: loiMoi });
  } catch (error) {
    logger.error(`[LoiMoiLopHoc] inviteSinhVien error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi gửi lời mời' });
  }
};

// Giảng viên mời batch sinh viên vào lớp
exports.inviteBatch = async (req, res) => {
  try {
    const { lopId } = req.params;
    const { danhSachMaSV } = req.body;

    if (!danhSachMaSV || !Array.isArray(danhSachMaSV)) {
      return res.status(400).json({ success: false, message: 'Danh sách mã sinh viên không hợp lệ' });
    }

    const lopHoc = await LopHoc.findById(lopId);
    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    const svList = await SinhVien.find({ MaSV: { $in: danhSachMaSV } });
    const currentSvIds = lopHoc.SinhVien.map(id => id.toString());

    let invitedCount = 0;
    const duplicateSV = [];
    const alreadyInClass = [];
    const notFoundMaSV = [...danhSachMaSV];

    for (const sv of svList) {
      const idx = notFoundMaSV.indexOf(sv.MaSV);
      if (idx > -1) notFoundMaSV.splice(idx, 1);

      // Đã có trong lớp → bỏ qua
      if (currentSvIds.includes(sv._id.toString())) {
        alreadyInClass.push(sv.MaSV);
        continue;
      }

      // Kiểm tra lời mời đã tồn tại
      const existing = await LoiMoiLopHoc.findOne({ LopHoc: lopId, SinhVien: sv._id });
      if (existing) {
        if (existing.TrangThai === 'ChoChapNhan') {
          duplicateSV.push(sv.MaSV);
          continue;
        }
        // Re-invite nếu đã từ chối / đã chấp nhận trước đó
        existing.TrangThai = 'ChoChapNhan';
        await existing.save();
        invitedCount++;
        continue;
      }

      await LoiMoiLopHoc.create({
        LopHoc: lopId,
        SinhVien: sv._id,
        GiangVien: lopHoc.GiangVien,
        TrangThai: 'ChoChapNhan'
      });
      invitedCount++;
    }

    logger.info(`[LoiMoiLopHoc] Batch invite to ${lopHoc.MaLopHoc}: invited=${invitedCount}, duplicate=${duplicateSV.length}, inClass=${alreadyInClass.length}, notFound=${notFoundMaSV.length}`);

    res.json({
      success: true,
      message: `Đã gửi lời mời: ${invitedCount}, đã mời trước: ${duplicateSV.length}, đã trong lớp: ${alreadyInClass.length}, không tìm thấy: ${notFoundMaSV.length}`,
      data: {
        invitedCount,
        duplicateSV,
        alreadyInClass,
        notFoundMaSV
      }
    });
  } catch (error) {
    logger.error(`[LoiMoiLopHoc] inviteBatch error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi import lời mời' });
  }
};

// Sinh viên respond lời mời (chấp nhận / từ chối)
exports.respondToInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const { accept } = req.body;

    const loiMoi = await LoiMoiLopHoc.findById(id)
      .populate('LopHoc', 'MaLopHoc TenLopHoc')
      .populate('SinhVien', 'MaSV HoTen');

    if (!loiMoi) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời' });
    }

    if (loiMoi.TrangThai !== 'ChoChapNhan') {
      return res.status(400).json({ success: false, message: 'Lời mời đã được xử lý trước đó' });
    }

    // Xác thực: SV phải là chủ lời mời
    const requesterId = req.user?.id || req.user?._id;
    if (requesterId && !loiMoi.SinhVien._id.equals(requesterId)) {
      return res.status(403).json({ success: false, message: 'Bạn không phải người được mời' });
    }

    if (accept) {
      loiMoi.TrangThai = 'DaChapNhan';
      await loiMoi.save();

      // Push SV vào LopHoc.SinhVien[]
      const lopHoc = await LopHoc.findById(loiMoi.LopHoc._id);
      if (lopHoc && !lopHoc.SinhVien.some(svId => svId.equals(loiMoi.SinhVien._id))) {
        lopHoc.SinhVien.push(loiMoi.SinhVien._id);
        await lopHoc.save();
      }

      logger.info(`[LoiMoiLopHoc] SV ${loiMoi.SinhVien.MaSV} accepted invite to class ${loiMoi.LopHoc.MaLopHoc}`);
      res.json({ success: true, message: 'Đã chấp nhận lời mời. Bạn đã được thêm vào lớp.' });
    } else {
      loiMoi.TrangThai = 'TuChoi';
      await loiMoi.save();

      logger.info(`[LoiMoiLopHoc] SV ${loiMoi.SinhVien.MaSV} rejected invite to class ${loiMoi.LopHoc.MaLopHoc}`);
      res.json({ success: true, message: 'Đã từ chối lời mời.' });
    }
  } catch (error) {
    logger.error(`[LoiMoiLopHoc] respondToInvite error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi xử lý lời mời' });
  }
};

// Lấy danh sách lời mời của 1 lớp (cho giảng viên)
exports.getInvitesByLopHoc = async (req, res) => {
  try {
    const { lopId } = req.params;
    const invites = await LoiMoiLopHoc.find({ LopHoc: lopId })
      .populate('SinhVien', 'MaSV HoTen Email GPA ChuyenNganh')
      .populate('GiangVien', 'HoTen MaGV')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: invites });
  } catch (error) {
    logger.error(`[LoiMoiLopHoc] getInvitesByLopHoc error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách lời mời' });
  }
};

// Lấy danh sách lời mời lớp học của sinh viên (pending)
exports.getMyClassInvites = async (req, res) => {
  try {
    const { svId } = req.params;
    const invites = await LoiMoiLopHoc.find({
      SinhVien: svId,
      TrangThai: 'ChoChapNhan'
    })
      .populate({
        path: 'LopHoc',
        select: 'MaLopHoc TenLopHoc',
        populate: { path: 'MonHoc', select: 'MaMonHoc TenMonHoc' }
      })
      .populate('GiangVien', 'HoTen MaGV')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: invites });
  } catch (error) {
    logger.error(`[LoiMoiLopHoc] getMyClassInvites error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy lời mời lớp học' });
  }
};

// Giảng viên hủy lời mời đang pending
exports.cancelInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const loiMoi = await LoiMoiLopHoc.findById(id);

    if (!loiMoi) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời' });
    }

    if (loiMoi.TrangThai !== 'ChoChapNhan') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể hủy lời mời đang chờ' });
    }

    await LoiMoiLopHoc.findByIdAndDelete(id);

    logger.info(`[LoiMoiLopHoc] Cancelled invite ${id}`);
    res.json({ success: true, message: 'Đã hủy lời mời' });
  } catch (error) {
    logger.error(`[LoiMoiLopHoc] cancelInvite error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi hủy lời mời' });
  }
};
