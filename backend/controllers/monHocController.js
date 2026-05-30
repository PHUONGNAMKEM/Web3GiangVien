const MonHoc = require('../models/MonHoc');
const DeTai = require('../models/DeTai');
const LopHoc = require('../models/LopHoc');
const logger = require('../config/logger');

const _monHocCache = new Map();
const MONHOC_CACHE_TTL = 30 * 1000;

function invalidateMonHocCache(gvId) {
  if (gvId) {
    _monHocCache.delete(String(gvId));
  } else {
    _monHocCache.clear();
  }
}

// Lấy danh sách môn học của giảng viên
exports.getByGiangVien = async (req, res) => {
  try {
    const { gvId } = req.params;
    const cached = _monHocCache.get(String(gvId));
    if (cached && Date.now() - cached.ts < MONHOC_CACHE_TTL) {
      return res.json({ success: true, data: cached.data });
    }

    const monHocs = await MonHoc.find({ GiangVien: gvId })
      .populate('GiangVien', 'HoTen MaGV')
      .sort({ createdAt: -1 })
      .lean();

    if (monHocs.length === 0) {
      _monHocCache.set(String(gvId), { data: [], ts: Date.now() });
      return res.json({ success: true, data: [] });
    }

    const monHocIds = monHocs.map(mh => mh._id);

    const [deTaiCounts, lopHocCounts] = await Promise.all([
      DeTai.aggregate([
        { $match: { MonHoc: { $in: monHocIds } } },
        { $group: { _id: '$MonHoc', count: { $sum: 1 } } }
      ]),
      LopHoc.aggregate([
        { $match: { MonHoc: { $in: monHocIds } } },
        { $group: { _id: '$MonHoc', count: { $sum: 1 } } }
      ])
    ]);

    const deTaiMap = Object.fromEntries(deTaiCounts.map(r => [r._id.toString(), r.count]));
    const lopHocMap = Object.fromEntries(lopHocCounts.map(r => [r._id.toString(), r.count]));

    const result = monHocs.map(mh => ({
      ...mh,
      soDeTai: deTaiMap[mh._id.toString()] || 0,
      soLopHoc: lopHocMap[mh._id.toString()] || 0
    }));

    _monHocCache.set(String(gvId), { data: result, ts: Date.now() });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[MonHoc] getByGiangVien error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách môn học' });
  }
};

// Tạo môn học mới
exports.create = async (req, res) => {
  try {
    const { MaMonHoc, TenMonHoc, MoTa, GiangVien } = req.body;

    if (!MaMonHoc || !TenMonHoc || !GiangVien) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc (MaMonHoc, TenMonHoc, GiangVien)' });
    }

    const existing = await MonHoc.findOne({ MaMonHoc });
    if (existing) {
      return res.status(409).json({ success: false, message: `Mã môn học '${MaMonHoc}' đã tồn tại` });
    }

    const monHoc = new MonHoc({ MaMonHoc, TenMonHoc, MoTa: MoTa || '', GiangVien });
    await monHoc.save();

    logger.info(`[MonHoc] Created: ${MaMonHoc} - ${TenMonHoc}`);
    invalidateMonHocCache(GiangVien);
    res.status(201).json({ success: true, data: monHoc });
  } catch (error) {
    logger.error(`[MonHoc] create error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi tạo môn học' });
  }
};

// Cập nhật môn học
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenMonHoc, MoTa } = req.body;

    const currentMonHoc = await MonHoc.findById(id).select('GiangVien');
    const monHoc = await MonHoc.findByIdAndUpdate(id, { TenMonHoc, MoTa }, { new: true });
    if (!monHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    }

    logger.info(`[MonHoc] Updated: ${monHoc.MaMonHoc}`);
    if (currentMonHoc?.GiangVien) {
      invalidateMonHocCache(currentMonHoc.GiangVien);
    } else {
      invalidateMonHocCache();
    }
    res.json({ success: true, data: monHoc });
  } catch (error) {
    logger.error(`[MonHoc] update error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật môn học' });
  }
};

// Xóa môn học (chặn nếu còn đề tài hoặc lớp học ràng buộc)
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const deTaiCount = await DeTai.countDocuments({ MonHoc: id });
    if (deTaiCount > 0) {
      return res.status(400).json({ success: false, message: `Không thể xóa: Còn ${deTaiCount} đề tài thuộc môn này` });
    }

    const lopHocCount = await LopHoc.countDocuments({ MonHoc: id });
    if (lopHocCount > 0) {
      return res.status(400).json({ success: false, message: `Không thể xóa: Còn ${lopHocCount} lớp học thuộc môn này` });
    }

    const monHoc = await MonHoc.findByIdAndDelete(id);
    if (!monHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    }

    logger.info(`[MonHoc] Deleted: ${monHoc.MaMonHoc}`);
    invalidateMonHocCache();
    res.json({ success: true, message: 'Đã xóa môn học' });
  } catch (error) {
    logger.error(`[MonHoc] delete error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi xóa môn học' });
  }
};
