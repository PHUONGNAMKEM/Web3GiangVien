const TienDo = require('../models/TienDo');
const DangKyDeTai = require('../models/DangKyDeTai');
const DeTai = require('../models/DeTai');
const aiService = require('../services/aiService');
const logger = require('../config/logger');

const isNumber = (value) => typeof value === 'number' && !Number.isNaN(value);

const normalizeMinhChung = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
        .map(m => {
            if (typeof m === 'string') {
                return { TenFile: '', Url: m, GhiChu: '' };
            }

            const item = m || {};
            return {
                TenFile: item.TenFile ?? item.tenFile ?? '',
                Url: item.Url ?? item.url ?? '',
                GhiChu: item.GhiChu ?? item.ghiChu ?? ''
            };
        })
        .filter(m => m.Url || m.TenFile);
};

const validateRubricsTuan = (rubricsTuan) => {
    if (!rubricsTuan) {
        return { ok: true };
    }

    if (!Array.isArray(rubricsTuan)) {
        return { ok: false, error: 'Rubrics tuần không hợp lệ', code: 'INVALID_RUBRICS' };
    }

    let totalWeight = 0;
    for (const item of rubricsTuan) {
        if (isNumber(item.TrongSo)) {
            totalWeight += item.TrongSo;
        }

        if (isNumber(item.DiemToiDa) && item.DiemToiDa <= 0) {
            return { ok: false, error: 'Điểm tối đa không hợp lệ', code: 'DIEM_TOIDA_KHONG_HOP_LE' };
        }

        if (isNumber(item.DiemGV) && isNumber(item.DiemToiDa) && item.DiemGV > item.DiemToiDa) {
            return { ok: false, error: 'Điểm vượt tối đa', code: 'DIEM_VUOT_TOIDA' };
        }
    }

    if (rubricsTuan.length > 0 && Math.abs(totalWeight - 100) > 0.01) {
        return { ok: false, error: 'Tổng trọng số rubrics tuần khác 100', code: 'RUBRICS_TONG_TRONGSO_KHAC_100' };
    }

    return { ok: true };
};

const assertGiangVienOwnsDeTai = async (deTaiId, giangVienId) => {
    const deTai = await DeTai.findById(deTaiId);
    if (!deTai) {
        return { ok: false, error: 'Không tìm thấy đề tài', code: 'DETAI_KHONG_TON_TAI' };
    }

    if (String(deTai.GiangVienHuongDan) !== String(giangVienId)) {
        return { ok: false, error: 'Không phải giảng viên hướng dẫn', code: 'KHONG_PHAI_GV_HUONG_DAN' };
    }

    return { ok: true, deTai };
};

const assertSinhVienBelongsToDangKy = async (deTaiId, sinhVienId) => {
    const dangKy = await DangKyDeTai.findOne({
        DeTai: deTaiId,
        TrangThai: 'DaDuyet',
        $or: [
            { SinhVien: sinhVienId },
            { 'ThanhVien.SinhVien': sinhVienId }
        ]
    });

    if (!dangKy) {
        return { ok: false, error: 'Bạn chưa được duyệt tham gia đề tài này.', code: 'KHONG_THUOC_DETAI' };
    }

    return { ok: true, dangKy };
};

const getPreviousEntry = (entries, currentEntry) => {
    if (!Array.isArray(entries) || entries.length === 0) {
        return null;
    }

    if (isNumber(currentEntry.TuanSo)) {
        const filtered = entries
            .filter(entry => isNumber(entry.TuanSo) && entry.TuanSo < currentEntry.TuanSo)
            .sort((a, b) => (b.TuanSo || 0) - (a.TuanSo || 0));
        return filtered[0] || null;
    }

    const sorted = entries
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return sorted[0] || null;
};

const detectAnomalies = (currentEntry, previousEntries) => {
    const warnings = [];
    const blockers = [];
    const entries = Array.isArray(previousEntries) ? previousEntries : [];

    if (currentEntry && isNumber(currentEntry.TuanSo)) {
        const duplicate = entries.some(entry =>
            isNumber(entry.TuanSo) && entry.TuanSo === currentEntry.TuanSo &&
            (entry.LanNopLai || 0) === (currentEntry.LanNopLai || 0) &&
            entry.TrangThaiDanhGia !== 'KhongDat'
        );

        if (duplicate) {
            blockers.push('TRUNG_TUAN');
        }
    }

    const previous = getPreviousEntry(entries, currentEntry || {});
    if (previous && isNumber(previous.PhanTramHoanThanh) && isNumber(currentEntry.PhanTramHoanThanh)) {
        if (currentEntry.PhanTramHoanThanh < previous.PhanTramHoanThanh) {
            blockers.push('GIAM_PHAN_TRAM');
        }

        const increase = currentEntry.PhanTramHoanThanh - previous.PhanTramHoanThanh;
        const minhChungEmpty = !Array.isArray(currentEntry.MinhChung) || currentEntry.MinhChung.length === 0;
        const noiDungLength = (currentEntry.NoiDungDaLam || '').length;

        if (increase > 40 && (minhChungEmpty || noiDungLength < 80)) {
            warnings.push('TANG_BAT_THUONG');
        }
    }

    if (isNumber(currentEntry.PhanTramHoanThanh) && currentEntry.PhanTramHoanThanh >= 70) {
        const minhChungEmpty = !Array.isArray(currentEntry.MinhChung) || currentEntry.MinhChung.length === 0;
        if (minhChungEmpty) {
            warnings.push('KHONG_MINH_CHUNG_NHUNG_CAO');
        }
    }

    if ((currentEntry.NoiDungDaLam || '').length < 30) {
        warnings.push('NOI_DUNG_NGAN');
    }

    const now = new Date(currentEntry.createdAt || Date.now());
    const recentCount = entries.filter(entry => {
        const createdAt = new Date(entry.createdAt || 0);
        return now - createdAt <= 30 * 60 * 1000;
    }).length;

    if (recentCount >= 3) {
        warnings.push('NOP_DON');
    }

    if (!(currentEntry.KeHoachTuanSau || '').trim() && currentEntry.TuanSo !== 30) {
        warnings.push('THIEU_KE_HOACH');
    }

    return { warnings, blockers };
};

const defaultRubricsTuan = [
    { MaTieuChi: 'DUNG_HAN', TenTieuChi: 'Đúng hạn và đầy đủ', TrongSo: 15, DiemToiDa: 10 },
    { MaTieuChi: 'HOAN_THANH', TenTieuChi: 'Mức độ hoàn thành mục tiêu tuần', TrongSo: 30, DiemToiDa: 10 },
    { MaTieuChi: 'CHAT_LUONG', TenTieuChi: 'Chất lượng nội dung và minh chứng', TrongSo: 25, DiemToiDa: 10 },
    { MaTieuChi: 'KHO_KHAN', TenTieuChi: 'Xử lý khó khăn và tư duy phản hồi', TrongSo: 15, DiemToiDa: 10 },
    { MaTieuChi: 'KE_HOACH', TenTieuChi: 'Kế hoạch tuần sau', TrongSo: 15, DiemToiDa: 10 }
];

// 1. Tạo entry tiến độ mới (SV)
exports.createProgressEntry = async (req, res) => {
    try {
        const {
            deTaiId,
            noiDung,
            phanTramHoanThanh,
            loaiCapNhat,
            fileDinhKem,
            tuanSo,
            ngayBatDauTuan,
            ngayKetThucTuan,
            mucTieuTuan,
            noiDungDaLam,
            khoKhan,
            keHoachTuanSau,
            minhChung,
            confirmGiam
        } = req.body;
        const sinhVienId = req.user?.id || req.body.sinhVienId;

        const registrationCheck = await assertSinhVienBelongsToDangKy(deTaiId, sinhVienId);
        if (!registrationCheck.ok) {
            return res.status(403).json({ error: registrationCheck.error, code: registrationCheck.code });
        }

        const existingEntries = await TienDo.find({ DeTai: deTaiId, SinhVien: sinhVienId })
            .sort({ createdAt: -1 });

        // Tinh LanNopLai cho bao cao tuan: cho phep nop lai sau khi bi KhongDat
        let lanNopLai = 0;
        if (isNumber(tuanSo)) {
            const sameWeek = existingEntries.filter(e => isNumber(e.TuanSo) && e.TuanSo === tuanSo);
            if (sameWeek.length > 0) {
                const allKhongDat = sameWeek.every(e => e.TrangThaiDanhGia === 'KhongDat');
                if (!allKhongDat) {
                    return res.status(409).json({ error: 'Trùng tuần đã tồn tại', code: 'TRUNG_TUAN_DA_TON_TAI' });
                }
                lanNopLai = Math.max(...sameWeek.map(e => e.LanNopLai || 0)) + 1;
            }
        }

        const draftEntry = {
            DeTai: deTaiId,
            SinhVien: sinhVienId,
            NoiDung: noiDung || noiDungDaLam || 'Cap nhat tien do',
            PhanTramHoanThanh: phanTramHoanThanh || 0,
            LoaiCapNhat: loaiCapNhat || 'Khác',
            FileDinhKem: fileDinhKem,
            TuanSo: tuanSo,
            NgayBatDauTuan: ngayBatDauTuan,
            NgayKetThucTuan: ngayKetThucTuan,
            MucTieuTuan: mucTieuTuan || '',
            NoiDungDaLam: noiDungDaLam || '',
            KhoKhan: khoKhan || '',
            KeHoachTuanSau: keHoachTuanSau || '',
            MinhChung: normalizeMinhChung(minhChung),
            LanNopLai: lanNopLai
        };

        const anomalies = detectAnomalies(draftEntry, existingEntries);
        let blockers = anomalies.blockers || [];
        const warnings = anomalies.warnings || [];

        if (!isNumber(tuanSo)) {
            blockers = blockers.filter(code => code !== 'GIAM_PHAN_TRAM' && code !== 'TRUNG_TUAN');
        }

        if (blockers.includes('TRUNG_TUAN')) {
            return res.status(409).json({ error: 'Trùng tuần đã tồn tại', code: 'TRUNG_TUAN_DA_TON_TAI' });
        }

        if (blockers.includes('GIAM_PHAN_TRAM') && !confirmGiam) {
            return res.status(400).json({ error: 'Giảm % tiến độ chưa xác nhận', code: 'GIAM_PHAN_TRAM_KHONG_XAC_NHAN' });
        }

        const tienDo = new TienDo({
            ...draftEntry,
            CanhBaoTienDo: warnings
        });

        try {
            await tienDo.save();
        } catch (saveErr) {
            if (saveErr && saveErr.code === 11000) {
                return res.status(409).json({ error: 'Trùng tuần đã tồn tại', code: 'TRUNG_TUAN_DA_TON_TAI' });
            }
            throw saveErr;
        }
        res.status(201).json({ message: 'Tạo báo cáo tiến độ thành công', data: tienDo, canhBao: warnings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Lấy tiến độ của 1 SV theo Đề tài (SV xem của mình)
exports.getProgressBySinhVien = async (req, res) => {
    try {
        const { svId } = req.params;
        const { deTaiId } = req.query;
        const filter = { SinhVien: svId };

        if (deTaiId) {
            filter.DeTai = deTaiId;
        }

        const tienDoList = await TienDo.find(filter)
            .populate('DeTai', 'TenDeTai MaDeTai')
            .sort({ TuanSo: 1, createdAt: -1 });

        res.json({ data: tienDoList });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Legacy route giữ nguyên behavior
exports.getProgressBySV = async (req, res) => {
    return exports.getProgressBySinhVien(req, res);
};

// 3. Lấy toàn bộ tiến độ của 1 đề tài (GV xem)
exports.getProgressByTopic = async (req, res) => {
    try {
        const { deTaiId } = req.params;
        const { tuanSo } = req.query;
        const filter = { DeTai: deTaiId };

        if (tuanSo) {
            filter.TuanSo = Number(tuanSo);
        }

        const tienDoList = await TienDo.find(filter)
            .populate('SinhVien', 'HoTen MaSV Email')
            .sort({ TuanSo: 1, SinhVien: 1, LanNopLai: -1, createdAt: -1 });

        res.json({ data: tienDoList });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3.1. Lấy chi tiết tiến độ theo ID (GV/SV)
exports.getProgressDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const progress = await TienDo.findById(id)
            .populate('DeTai', 'TenDeTai MaDeTai GiangVienHuongDan')
            .populate('SinhVien', 'HoTen MaSV Email');

        if (!progress) {
            return res.status(404).json({ error: 'Không tìm thấy nhật ký tiến độ' });
        }

        const requesterId = req.user?.id || req.user?._id || req.query.sinhVienId || req.query.giangVienId;
        if (requesterId && String(progress.SinhVien) !== String(requesterId)) {
            const ownerCheck = await assertGiangVienOwnsDeTai(progress.DeTai._id || progress.DeTai, requesterId);
            if (!ownerCheck.ok) {
                return res.status(403).json({ error: ownerCheck.error, code: ownerCheck.code });
            }
        }

        const lichSu = isNumber(progress.TuanSo)
            ? await TienDo.find({
                DeTai: progress.DeTai._id || progress.DeTai,
                SinhVien: progress.SinhVien,
                TuanSo: progress.TuanSo
            }).sort({ LanNopLai: -1, createdAt: -1 })
            : [];

        const tuanTruoc = isNumber(progress.TuanSo)
            ? await TienDo.findOne({
                DeTai: progress.DeTai._id || progress.DeTai,
                SinhVien: progress.SinhVien,
                TuanSo: { $lt: progress.TuanSo }
            }).sort({ TuanSo: -1 })
            : null;

        const previousEntries = await TienDo.find({
            DeTai: progress.DeTai._id || progress.DeTai,
            SinhVien: progress.SinhVien,
            _id: { $ne: progress._id }
        }).sort({ createdAt: -1 });

        const anomalies = detectAnomalies(progress, previousEntries);
        const warnings = anomalies.warnings || [];

        res.json({ data: progress, lichSu, tuanTruoc, canhBao: warnings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3.2. SV cập nhật tiến độ khi được phép
exports.updateProgressEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            noiDung,
            phanTramHoanThanh,
            loaiCapNhat,
            fileDinhKem,
            tuanSo,
            ngayBatDauTuan,
            ngayKetThucTuan,
            mucTieuTuan,
            noiDungDaLam,
            khoKhan,
            keHoachTuanSau,
            minhChung,
            confirmGiam,
            sinhVienId
        } = req.body;

        const progress = await TienDo.findById(id);
        if (!progress) {
            return res.status(404).json({ error: 'Không tìm thấy nhật ký tiến độ' });
        }

        const requesterId = req.user?.id || req.user?._id || sinhVienId;
        if (requesterId && String(progress.SinhVien) !== String(requesterId)) {
            return res.status(403).json({ error: 'Không có quyền cập nhật', code: 'KHONG_CO_QUYEN' });
        }

        if (progress.TrangThaiDanhGia === 'Dat') {
            return res.status(403).json({ error: 'Không được sửa đã đạt', code: 'KHONG_DUOC_SUA_DA_DAT' });
        }

        if (progress.TrangThaiDanhGia === 'KhongDat') {
            return res.status(403).json({ error: 'Không được sửa không đạt', code: 'KHONG_DUOC_SUA_KHONG_DAT' });
        }

        if (progress.TrangThaiDanhGia === 'CanBoSung') {
            progress.LanNopLai = (progress.LanNopLai || 0) + 1;
            progress.TrangThaiDanhGia = 'ChoDanhGia';
        }

        if (noiDung !== undefined || noiDungDaLam !== undefined) {
            progress.NoiDung = noiDung || noiDungDaLam || progress.NoiDung || 'Cap nhat tien do';
        }
        if (phanTramHoanThanh !== undefined) {
            progress.PhanTramHoanThanh = phanTramHoanThanh;
        }
        if (loaiCapNhat !== undefined) {
            progress.LoaiCapNhat = loaiCapNhat;
        }
        if (fileDinhKem !== undefined) {
            progress.FileDinhKem = fileDinhKem;
        }
        if (tuanSo !== undefined) {
            progress.TuanSo = tuanSo;
        }
        if (ngayBatDauTuan !== undefined) {
            progress.NgayBatDauTuan = ngayBatDauTuan;
        }
        if (ngayKetThucTuan !== undefined) {
            progress.NgayKetThucTuan = ngayKetThucTuan;
        }
        if (mucTieuTuan !== undefined) {
            progress.MucTieuTuan = mucTieuTuan;
        }
        if (noiDungDaLam !== undefined) {
            progress.NoiDungDaLam = noiDungDaLam;
        }
        if (khoKhan !== undefined) {
            progress.KhoKhan = khoKhan;
        }
        if (keHoachTuanSau !== undefined) {
            progress.KeHoachTuanSau = keHoachTuanSau;
        }
        if (minhChung !== undefined) {
            progress.MinhChung = normalizeMinhChung(minhChung);
        }

        const previousEntries = await TienDo.find({
            DeTai: progress.DeTai,
            SinhVien: progress.SinhVien,
            _id: { $ne: progress._id }
        }).sort({ createdAt: -1 });

        const anomalies = detectAnomalies(progress, previousEntries);
        let blockers = anomalies.blockers || [];
        const warnings = anomalies.warnings || [];

        if (!isNumber(progress.TuanSo)) {
            blockers = blockers.filter(code => code !== 'GIAM_PHAN_TRAM' && code !== 'TRUNG_TUAN');
        }

        if (blockers.includes('TRUNG_TUAN')) {
            return res.status(409).json({ error: 'Trùng tuần đã tồn tại', code: 'TRUNG_TUAN_DA_TON_TAI' });
        }

        if (blockers.includes('GIAM_PHAN_TRAM') && !confirmGiam) {
            return res.status(400).json({ error: 'Giảm % tiến độ chưa xác nhận', code: 'GIAM_PHAN_TRAM_KHONG_XAC_NHAN' });
        }

        progress.CanhBaoTienDo = warnings;

        await progress.save();
        res.json({ message: 'Cập nhật báo cáo tiến độ thành công', data: progress, canhBao: warnings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3.3. GV đánh giá tiến độ tuần
exports.evaluateProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { trangThaiDanhGia, nhanXetGV, rubricsTuan } = req.body;
        const giangVienId = req.user?.id || req.body.giangVienId;

        const progress = await TienDo.findById(id);
        if (!progress) {
            return res.status(404).json({ error: 'Không tìm thấy nhật ký tiến độ' });
        }

        const ownerCheck = await assertGiangVienOwnsDeTai(progress.DeTai, giangVienId);
        if (!ownerCheck.ok) {
            const status = ownerCheck.code === 'DETAI_KHONG_TON_TAI' ? 404 : 403;
            return res.status(status).json({ error: ownerCheck.error, code: ownerCheck.code });
        }

        if (Array.isArray(rubricsTuan) && rubricsTuan.length > 0) {
            const rubricsValidation = validateRubricsTuan(rubricsTuan);
            if (!rubricsValidation.ok) {
                return res.status(400).json({ error: rubricsValidation.error, code: rubricsValidation.code });
            }

            if (!['Dat', 'CanBoSung', 'KhongDat'].includes(trangThaiDanhGia)) {
                return res.status(400).json({ error: 'Trạng thái đánh giá không hợp lệ', code: 'TRANG_THAI_KHONG_HOP_LE' });
            }

            const total = rubricsTuan.reduce((sum, item) => {
                if (!isNumber(item.DiemToiDa) || item.DiemToiDa <= 0 || !isNumber(item.TrongSo)) {
                    return sum;
                }

                const diemGV = isNumber(item.DiemGV) ? item.DiemGV : 0;
                return sum + (diemGV / item.DiemToiDa) * item.TrongSo;
            }, 0);

            progress.DiemTienDo = Math.round((total / 100 * 10) * 100) / 100;
            progress.RubricsTuan = rubricsTuan;
        } else if (!progress.RubricsTuan || progress.RubricsTuan.length === 0) {
            progress.RubricsTuan = defaultRubricsTuan;
        }

        if (trangThaiDanhGia !== undefined) {
            progress.TrangThaiDanhGia = trangThaiDanhGia;
        }
        if (nhanXetGV !== undefined) {
            progress.NhanXetGV = nhanXetGV;
        }

        progress.GiangVienDanhGia = giangVienId;
        progress.NgayDanhGia = new Date();

        // #18: ghi vết đánh giá tiến độ lên blockchain (chỉ khi bật flag + đánh giá Đạt) — non-blocking
        if (process.env.PROGRESS_ONCHAIN_ENABLED === 'true' && progress.TrangThaiDanhGia === 'Dat') {
            progress.TrangThaiBlockchain = 'Pending';
            try {
                const contractService = require('../services/thesisContractService');
                const txHash = await contractService.submitProgressOnChain(
                    String(progress.DeTai), String(progress.SinhVien),
                    progress.TuanSo || 0, progress.DiemTienDo || 0
                );
                progress.TxHash = txHash;
                progress.TrangThaiBlockchain = 'DaGhi';
                progress.LoiBlockchain = undefined;
            } catch (bcErr) {
                progress.TrangThaiBlockchain = 'LoiGhi';
                progress.LoiBlockchain = bcErr.message;
                logger.warn(`[TIENDO] Blockchain progress write failed (non-blocking): ${bcErr.message}`);
            }
        }

        await progress.save();
        res.json({ message: 'Đánh giá tiến độ thành công', data: progress });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. GV nhận xét tiến độ
exports.commentProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const { nhanXet } = req.body;

        const updated = await TienDo.findById(id);
        if (!updated) {
            return res.status(404).json({ error: 'Không tìm thấy nhật ký tiến độ' });
        }

        const requesterId = req.user?.id || req.user?._id;
        if (requesterId) {
            const ownerCheck = await assertGiangVienOwnsDeTai(updated.DeTai, requesterId);
            if (!ownerCheck.ok) {
                return res.status(403).json({ error: ownerCheck.error, code: ownerCheck.code });
            }
        }

        updated.NhanXetGV = nhanXet;
        await updated.save();

        res.json({ message: 'Thêm nhận xét thành công', data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// #16. AI gợi ý điểm tiến độ tuần (PhoBERT) — GV tham khảo, KHÔNG tự lưu
exports.aiSuggestProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const giangVienId = req.user?.id || req.body.giangVienId || req.query.giangVienId;

        const progress = await TienDo.findById(id);
        if (!progress) {
            return res.status(404).json({ error: 'Không tìm thấy nhật ký tiến độ' });
        }

        const ownerCheck = await assertGiangVienOwnsDeTai(progress.DeTai, giangVienId);
        if (!ownerCheck.ok) {
            const status = ownerCheck.code === 'DETAI_KHONG_TON_TAI' ? 404 : 403;
            return res.status(status).json({ error: ownerCheck.error, code: ownerCheck.code });
        }

        // Ghép nội dung tuần để AI phân tích
        const text = [
            progress.MucTieuTuan ? `Mục tiêu tuần: ${progress.MucTieuTuan}` : '',
            progress.NoiDungDaLam ? `Nội dung đã làm: ${progress.NoiDungDaLam}` : '',
            progress.KhoKhan ? `Khó khăn: ${progress.KhoKhan}` : '',
            progress.KeHoachTuanSau ? `Kế hoạch tuần sau: ${progress.KeHoachTuanSau}` : ''
        ].filter(Boolean).join('\n\n');

        if (!text.trim()) {
            return res.status(400).json({ error: 'Tiến độ chưa có nội dung để AI phân tích', code: 'THIEU_NOI_DUNG' });
        }

        // Dùng RubricsTuan của entry, fallback rubrics mặc định
        const baseRubrics = (Array.isArray(progress.RubricsTuan) && progress.RubricsTuan.length > 0)
            ? progress.RubricsTuan
            : defaultRubricsTuan;

        const rubrics = baseRubrics.map(tc => ({
            TenTieuChi: tc.TenTieuChi || tc.MaTieuChi || 'Tiêu chí',
            MoTa: tc.MoTa || progress.MucTieuTuan || '',
            TrongSo: isNumber(tc.TrongSo) ? tc.TrongSo : 0,
            DiemToiDa: isNumber(tc.DiemToiDa) ? tc.DiemToiDa : 10,
            GoiYChoAI: Array.isArray(tc.GoiYChoAI) ? tc.GoiYChoAI : []
        }));

        const aiResult = await aiService.analyzeWithRubrics(text, rubrics);

        res.json({
            message: 'AI đã gợi ý điểm tiến độ (chỉ tham khảo)',
            aiScore: aiResult.score,
            aiRubrics: aiResult.rubrics_result || [],
            aiFeedback: aiResult.feedback || '',
            model: aiResult.model || 'vinai/phobert-base'
        });
    } catch (err) {
        logger.error(`[TIENDO] AI suggest failed: ${err.message}`);
        res.status(500).json({ error: err.message || 'Lỗi khi gọi AI gợi ý điểm tiến độ' });
    }
};
