const RubricsTemplate = require('../models/RubricsTemplate');
const logger = require('../config/logger');

// Lấy tất cả Rubrics Template của 1 GV
exports.getTemplatesByGV = async (req, res) => {
    try {
        const { gvId } = req.params;
        const templates = await RubricsTemplate.find({ GiangVien: gvId }).sort({ createdAt: -1 });
        res.json(templates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Tạo Rubrics Template mới
exports.createTemplate = async (req, res) => {
    try {
        const { TenMau, MoTaMau, GiangVien, TieuChi, MacDinh } = req.body;

        // Validate tổng trọng số = 100
        if (!TieuChi || TieuChi.length === 0) {
            return res.status(400).json({ error: 'Cần ít nhất 1 tiêu chí trong template.' });
        }

        const tongTrongSo = TieuChi.reduce((sum, tc) => sum + (tc.TrongSo || 0), 0);
        if (tongTrongSo !== 100) {
            return res.status(400).json({ 
                error: `Tổng trọng số phải = 100%. Hiện tại = ${tongTrongSo}%.` 
            });
        }

        // Nếu đặt MacDinh = true → tắt MacDinh của template cũ
        if (MacDinh) {
            await RubricsTemplate.updateMany(
                { GiangVien, MacDinh: true },
                { MacDinh: false }
            );
        }

        const template = new RubricsTemplate({
            TenMau,
            MoTaMau: MoTaMau || '',
            GiangVien,
            TieuChi,
            MacDinh: MacDinh || false
        });

        await template.save();
        logger.info(`[RUBRICS] Template "${template.TenMau}" created by GV ${GiangVien} | criteria=${TieuChi.length}`);
        res.status(201).json(template);
    } catch (err) {
        logger.error(`[RUBRICS] Create template failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// Sửa Rubrics Template (BLOCK nếu DaApDung)
exports.updateTemplate = async (req, res) => {
    try {
        const template = await RubricsTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Không tìm thấy template.' });
        }

        // Guard immutability
        if (template.DaApDung) {
            logger.warn(`[RUBRICS] Blocked edit on applied template ${req.params.id} (DaApDung=true)`);
            return res.status(400).json({
                error: 'Không thể sửa template đã được áp dụng vào đề tài. ' +
                       'Hãy sửa trực tiếp trên Rubrics của Đề tài, hoặc tạo template mới.'
            });
        }

        const { TenMau, MoTaMau, TieuChi, MacDinh } = req.body;

        // Validate tổng trọng số nếu có TieuChi mới
        if (TieuChi && TieuChi.length > 0) {
            const tongTrongSo = TieuChi.reduce((sum, tc) => sum + (tc.TrongSo || 0), 0);
            if (tongTrongSo !== 100) {
                return res.status(400).json({ 
                    error: `Tổng trọng số phải = 100%. Hiện tại = ${tongTrongSo}%.` 
                });
            }
        }

        // Nếu đặt MacDinh = true → tắt MacDinh của template cũ
        if (MacDinh && !template.MacDinh) {
            await RubricsTemplate.updateMany(
                { GiangVien: template.GiangVien, MacDinh: true, _id: { $ne: template._id } },
                { MacDinh: false }
            );
        }

        if (TenMau !== undefined) template.TenMau = TenMau;
        if (MoTaMau !== undefined) template.MoTaMau = MoTaMau;
        if (TieuChi !== undefined) template.TieuChi = TieuChi;
        if (MacDinh !== undefined) template.MacDinh = MacDinh;

        await template.save();
        logger.info(`[RUBRICS] Template "${template.TenMau}" updated (id=${req.params.id})`);
        res.json(template);
    } catch (err) {
        logger.error(`[RUBRICS] Update template failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// Xóa Rubrics Template (BLOCK nếu DaApDung)
exports.deleteTemplate = async (req, res) => {
    try {
        const template = await RubricsTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Không tìm thấy template.' });
        }

        // Guard immutability
        if (template.DaApDung) {
            logger.warn(`[RUBRICS] Blocked delete on applied template ${req.params.id} (DaApDung=true, SoLuotDung=${template.SoLuotDung})`);
            return res.status(400).json({
                error: 'Không thể xóa template đã được áp dụng vào đề tài. ' +
                       'Template này đã được sử dụng cho ' + template.SoLuotDung + ' đề tài.'
            });
        }

        await RubricsTemplate.findByIdAndDelete(req.params.id);
        logger.info(`[RUBRICS] Template "${template.TenMau}" deleted (id=${req.params.id})`);
        res.json({ message: 'Đã xóa template thành công.' });
    } catch (err) {
        logger.error(`[RUBRICS] Delete template failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};

// Đặt template làm mặc định
exports.setDefaultTemplate = async (req, res) => {
    try {
        const template = await RubricsTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Không tìm thấy template.' });
        }

        // Tắt MacDinh tất cả template cùng GV
        await RubricsTemplate.updateMany(
            { GiangVien: template.GiangVien, MacDinh: true },
            { MacDinh: false }
        );

        // Bật MacDinh cho template này
        template.MacDinh = true;
        await template.save();

        res.json({ message: 'Đã đặt template mặc định.', data: template });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Áp dụng template vào đề tài (copy tiêu chí + tăng SoLuotDung)
exports.applyTemplate = async (req, res) => {
    try {
        const DeTai = require('../models/DeTai');
        
        const template = await RubricsTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Không tìm thấy template.' });
        }

        const deTai = await DeTai.findById(req.params.deTaiId);
        if (!deTai) {
            return res.status(404).json({ error: 'Không tìm thấy đề tài.' });
        }

        // Copy tiêu chí từ template vào đề tài (bản copy độc lập)
        deTai.Rubrics = template.TieuChi.map(tc => ({
            TenTieuChi: tc.TenTieuChi,
            MoTa: tc.MoTa,
            TrongSo: tc.TrongSo,
            DiemToiDa: tc.DiemToiDa,
            GoiYChoAI: tc.GoiYChoAI || []
        }));
        deTai.SuDungRubrics = true;
        await deTai.save();

        // Update template tracking
        template.DaApDung = true;
        template.SoLuotDung = (template.SoLuotDung || 0) + 1;
        await template.save();

        logger.info(`[RUBRICS] Template "${template.TenMau}" applied to topic "${deTai.TenDeTai}" | criteria=${template.TieuChi.length}`);
        res.json({ 
            message: `Đã áp dụng template "${template.TenMau}" vào đề tài "${deTai.TenDeTai}".`,
            rubrics: deTai.Rubrics
        });
    } catch (err) {
        logger.error(`[RUBRICS] Apply template failed: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
};
