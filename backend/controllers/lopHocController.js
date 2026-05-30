const LopHoc = require('../models/LopHoc');
const SinhVien = require('../models/SinhVien');
const DangKyDeTai = require('../models/DangKyDeTai');
const DeTai = require('../models/DeTai');
const Nhom = require('../models/Nhom');
const logger = require('../config/logger');

const _lopHocCache = new Map();
const LOPHOC_CACHE_TTL = 30 * 1000;

function invalidateLopHocCache(gvId) {
  if (gvId) {
    _lopHocCache.delete(String(gvId));
  } else {
    _lopHocCache.clear();
  }
}

// Lấy danh sách lớp học của giảng viên
exports.getByGiangVien = async (req, res) => {
  try {
    const { gvId } = req.params;
    const cached = _lopHocCache.get(String(gvId));
    if (cached && Date.now() - cached.ts < LOPHOC_CACHE_TTL) {
      return res.json({ success: true, data: cached.data });
    }

    const lopHocs = await LopHoc.find({ GiangVien: gvId })
      .populate('MonHoc', 'MaMonHoc TenMonHoc')
      .populate('GiangVien', 'HoTen MaGV')
      .sort({ createdAt: -1 });

    const result = lopHocs.map(lh => ({
      ...lh.toObject(),
      siSo: lh.SinhVien ? lh.SinhVien.length : 0
    }));

    _lopHocCache.set(String(gvId), { data: result, ts: Date.now() });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[LopHoc] getByGiangVien error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách lớp học' });
  }
};

// Lấy chi tiết lớp học: danh sách SV + nhóm + đề tài đã đăng ký
exports.getDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const lopHoc = await LopHoc.findById(id)
      .populate('MonHoc', 'MaMonHoc TenMonHoc')
      .populate('GiangVien', 'HoTen MaGV')
      .populate('SinhVien', 'MaSV HoTen Email GPA ChuyenNganh KyNang WalletAddress DaCapNhatHoSo');

    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    // Lấy danh sách đề tài thuộc môn học của lớp này
    const deTais = await DeTai.find({ MonHoc: lopHoc.MonHoc._id }).select('_id MaDeTai TenDeTai TrangThai');

    // Lấy danh sách đăng ký đề tài của các SV trong lớp
    const svIds = lopHoc.SinhVien.map(sv => sv._id);
    const dangKys = await DangKyDeTai.find({
      DeTai: { $in: deTais.map(dt => dt._id) }
    })
      .populate('DeTai', 'MaDeTai TenDeTai TrangThai')
      .populate('Nhom')
      .populate('TruongNhom', 'MaSV HoTen')
      .populate('SinhVien', 'MaSV HoTen')
      .populate('ThanhVien.SinhVien', 'MaSV HoTen');

    // Lọc ra chỉ những đăng ký có liên quan đến SV trong lớp
    const filteredDangKys = dangKys.filter(dk => {
      // Kiểm tra trưởng nhóm có thuộc lớp không
      if (dk.TruongNhom && svIds.some(id => id.equals(dk.TruongNhom._id))) return true;
      // Kiểm tra sinh viên đơn lẻ
      if (dk.SinhVien && svIds.some(id => id.equals(dk.SinhVien._id))) return true;
      // Kiểm tra thành viên nhóm
      if (dk.ThanhVien && dk.ThanhVien.some(tv =>
        tv.SinhVien && svIds.some(id => id.equals(tv.SinhVien._id))
      )) return true;
      return false;
    });

    res.json({
      success: true,
      data: {
        lopHoc: lopHoc.toObject(),
        deTais,
        dangKys: filteredDangKys
      }
    });
  } catch (error) {
    logger.error(`[LopHoc] getDetail error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết lớp học' });
  }
};

// Tạo lớp học mới
exports.create = async (req, res) => {
  try {
    const { MaLopHoc, TenLopHoc, MonHoc, GiangVien } = req.body;

    if (!MaLopHoc || !TenLopHoc || !MonHoc || !GiangVien) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    const existing = await LopHoc.findOne({ MaLopHoc });
    if (existing) {
      return res.status(409).json({ success: false, message: `Mã lớp học '${MaLopHoc}' đã tồn tại` });
    }

    const lopHoc = new LopHoc({ MaLopHoc, TenLopHoc, MonHoc, GiangVien, SinhVien: [] });
    await lopHoc.save();

    const populated = await LopHoc.findById(lopHoc._id)
      .populate('MonHoc', 'MaMonHoc TenMonHoc')
      .populate('GiangVien', 'HoTen MaGV');

    logger.info(`[LopHoc] Created: ${MaLopHoc} - ${TenLopHoc}`);
    invalidateLopHocCache(GiangVien);
    res.status(201).json({ success: true, data: { ...populated.toObject(), siSo: 0 } });
  } catch (error) {
    logger.error(`[LopHoc] create error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi tạo lớp học' });
  }
};

// Cập nhật lớp học
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenLopHoc, MonHoc } = req.body;

    const updateData = {};
    if (TenLopHoc) updateData.TenLopHoc = TenLopHoc;
    if (MonHoc) updateData.MonHoc = MonHoc;

    const lopHoc = await LopHoc.findByIdAndUpdate(id, updateData, { new: true })
      .populate('MonHoc', 'MaMonHoc TenMonHoc');

    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    logger.info(`[LopHoc] Updated: ${lopHoc.MaLopHoc}`);
    invalidateLopHocCache();
    res.json({ success: true, data: lopHoc });
  } catch (error) {
    logger.error(`[LopHoc] update error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật lớp học' });
  }
};

// Thêm sinh viên vào lớp
exports.addSinhVien = async (req, res) => {
  try {
    const { id } = req.params;
    const { sinhVienId } = req.body;

    if (!sinhVienId) {
      return res.status(400).json({ success: false, message: 'Thiếu sinhVienId' });
    }

    // Kiểm tra SV tồn tại
    const sv = await SinhVien.findById(sinhVienId);
    if (!sv) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    }

    const lopHoc = await LopHoc.findById(id);
    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    // Kiểm tra SV đã có trong lớp chưa
    if (lopHoc.SinhVien.some(svId => svId.equals(sinhVienId))) {
      return res.status(409).json({ success: false, message: 'Sinh viên đã có trong lớp này' });
    }

    lopHoc.SinhVien.push(sinhVienId);
    await lopHoc.save();

    const updated = await LopHoc.findById(id)
      .populate('SinhVien', 'MaSV HoTen Email GPA ChuyenNganh');

    logger.info(`[LopHoc] Added SV ${sv.MaSV} to class ${lopHoc.MaLopHoc}`);
    invalidateLopHocCache();
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error(`[LopHoc] addSinhVien error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi thêm sinh viên vào lớp' });
  }
};

// Xóa sinh viên khỏi lớp
exports.removeSinhVien = async (req, res) => {
  try {
    const { id, svId } = req.params;

    const lopHoc = await LopHoc.findById(id);
    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    lopHoc.SinhVien = lopHoc.SinhVien.filter(s => !s.equals(svId));
    await lopHoc.save();

    logger.info(`[LopHoc] Removed SV ${svId} from class ${lopHoc.MaLopHoc}`);
    invalidateLopHocCache();
    res.json({ success: true, message: 'Đã xóa sinh viên khỏi lớp' });
  } catch (error) {
    logger.error(`[LopHoc] removeSinhVien error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi xóa sinh viên khỏi lớp' });
  }
};

// Xóa lớp học
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const lopHoc = await LopHoc.findByIdAndDelete(id);
    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    logger.info(`[LopHoc] Deleted: ${lopHoc.MaLopHoc}`);
    invalidateLopHocCache();
    res.json({ success: true, message: 'Đã xóa lớp học' });
  } catch (error) {
    logger.error(`[LopHoc] delete error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi xóa lớp học' });
  }
};
