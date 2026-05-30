const GiangVien = require('../models/GiangVien');

// Cache cho getAll - TTL 30 giay
let _gvCache = { data: null, ts: 0 };
const GV_CACHE_TTL = 30 * 1000;

function invalidateGvCache() {
    _gvCache = { data: null, ts: 0 };
}

exports.getAll = async (req, res) => {
    try {
        if (_gvCache.data && Date.now() - _gvCache.ts < GV_CACHE_TTL) {
            return res.json(_gvCache.data);
        }

        const list = await GiangVien.find({});
        _gvCache = { data: list, ts: Date.now() };
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const item = await GiangVien.findById(req.params.id);
        if(!item) return res.status(404).json({ error: 'Not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const newGV = new GiangVien(req.body);
        await newGV.save();
        invalidateGvCache();
        res.status(201).json(newGV);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const updated = await GiangVien.findByIdAndUpdate(req.params.id, req.body, { new: true });
        invalidateGvCache();
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await GiangVien.findByIdAndDelete(req.params.id);
        invalidateGvCache();
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
