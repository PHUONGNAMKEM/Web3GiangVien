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

    // MỚI: Query trực tiếp theo LopHoc, fallback MonHoc cho data cũ
    let deTais = await DeTai.find({ LopHoc: id }).select('_id MaDeTai TenDeTai TrangThai SoLuongSinhVien');
    if (deTais.length === 0) {
      deTais = await DeTai.find({ MonHoc: lopHoc.MonHoc._id }).select('_id MaDeTai TenDeTai TrangThai SoLuongSinhVien');
    }

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

    const existing = await LopHoc.findOne({ MaLopHoc, MonHoc });
    if (existing) {
      return res.status(409).json({ success: false, message: `Lớp '${MaLopHoc}' đã tồn tại cho môn học này` });
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
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Mã lớp học này đã tồn tại trong hệ thống. Vui lòng nhập mã khác.' });
    }
    res.status(500).json({ success: false, message: 'Lỗi tạo lớp học: ' + error.message });
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
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Mã lớp học này đã tồn tại trong hệ thống. Vui lòng nhập mã khác.' });
    }
    res.status(500).json({ success: false, message: 'Lỗi cập nhật lớp học: ' + error.message });
  }
};

// Thêm sinh viên vào lớp
exports.addSinhVien = async (req, res) => {
  try {
    const { id } = req.params;
    let { sinhVienId, maSV } = req.body;

    if (!sinhVienId && !maSV) {
      return res.status(400).json({ success: false, message: 'Thiếu sinhVienId hoặc maSV' });
    }

    // Kiểm tra SV tồn tại
    let sv;
    if (sinhVienId) {
      sv = await SinhVien.findById(sinhVienId);
    } else {
      sv = await SinhVien.findOne({ MaSV: maSV });
    }
    if (!sv) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
    }
    sinhVienId = sv._id;

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
    res.status(500).json({ success: false, message: 'Lỗi thêm sinh viên vào lớp: ' + error.message });
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
    res.status(500).json({ success: false, message: 'Lỗi xóa sinh viên khỏi lớp: ' + error.message });
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
    res.status(500).json({ success: false, message: 'Lỗi xóa lớp học: ' + error.message });
  }
};

// Import batch sinh viên vào lớp
exports.importSinhVien = async (req, res) => {
  try {
    const { id } = req.params;
    const { danhSachMaSV } = req.body;

    if (!danhSachMaSV || !Array.isArray(danhSachMaSV)) {
      return res.status(400).json({ success: false, message: 'Danh sách mã sinh viên không hợp lệ' });
    }

    const lopHoc = await LopHoc.findById(id);
    if (!lopHoc) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    const svList = await SinhVien.find({ MaSV: { $in: danhSachMaSV } });
    
    let addedCount = 0;
    const duplicateSV = [];
    const notFoundMaSV = [...danhSachMaSV];

    svList.forEach(sv => {
      const index = notFoundMaSV.indexOf(sv.MaSV);
      if (index > -1) {
        notFoundMaSV.splice(index, 1);
      }

      const exists = lopHoc.SinhVien.some(svId => svId.equals(sv._id));
      if (!exists) {
        lopHoc.SinhVien.push(sv._id);
        addedCount++;
      } else {
        duplicateSV.push(sv.MaSV);
      }
    });

    if (addedCount > 0) {
      await lopHoc.save();
    }

    res.json({
      success: true,
      message: `Import thành công. Thêm mới: ${addedCount}, trùng lặp: ${duplicateSV.length}, không tìm thấy: ${notFoundMaSV.length}`,
      data: {
        addedCount,
        duplicateSV,
        notFoundMaSV
      }
    });
  } catch (error) {
    logger.error(`[LopHoc] importSinhVien error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi import sinh viên: ' + error.message });
  }
};

// Lấy lớp học của sinh viên
exports.getBySinhVien = async (req, res) => {
  try {
    const { svId } = req.params;
    const lopHocs = await LopHoc.find({ SinhVien: svId })
      .populate('MonHoc', 'MaMonHoc TenMonHoc')
      .populate('GiangVien', 'HoTen MaGV')
      .sort({ createdAt: -1 });

    const result = lopHocs.map(lh => ({
      ...lh.toObject(),
      siSo: lh.SinhVien ? lh.SinhVien.length : 0
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[LopHoc] getBySinhVien error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy lớp học của sinh viên: ' + error.message });
  }
};

// Lấy danh sách sinh viên thuộc các lớp của giảng viên (flat list kèm context lớp/môn/GV)
exports.getSinhVienByGiangVien = async (req, res) => {
  try {
    const { gvId } = req.params;
    const lopHocs = await LopHoc.find({ GiangVien: gvId })
      .populate('SinhVien', 'MaSV HoTen Email GPA ChuyenNganh KyNang WalletAddress DaCapNhatHoSo')
      .populate('MonHoc', 'MaMonHoc TenMonHoc')
      .populate('GiangVien', 'HoTen MaGV');

    // Flatten: mỗi item = { sinhVien, lopHoc info }
    const flatList = [];
    for (const lh of lopHocs) {
      for (const sv of (lh.SinhVien || [])) {
        flatList.push({
          sinhVien: sv,
          lopHoc: {
            _id: lh._id,
            MaLopHoc: lh.MaLopHoc,
            TenLopHoc: lh.TenLopHoc
          },
          monHoc: lh.MonHoc,
          giangVien: lh.GiangVien
        });
      }
    }

    res.json({ success: true, data: flatList });
  } catch (error) {
    logger.error(`[LopHoc] getSinhVienByGiangVien error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách sinh viên theo giảng viên: ' + error.message });
  }
};

