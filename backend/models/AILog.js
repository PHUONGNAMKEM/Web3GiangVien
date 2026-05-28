const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
    BaoCao: { type: mongoose.Schema.Types.ObjectId, ref: 'BaoCao' },
    DeTai: { type: mongoose.Schema.Types.ObjectId, ref: 'DeTai' },
    SinhVien: { type: mongoose.Schema.Types.ObjectId, ref: 'SinhVien' },
    TextHash: { type: String },        // SHA-256 of the text scored
    TextLength: { type: Number },
    ScoreResult: { type: mongoose.Schema.Types.Mixed },
    SecurityFlags: { type: [String], default: [] },
    InjectionDetected: { type: Boolean, default: false },
    RepetitionRate: { type: Number },
    ExtractionMethod: { type: String },
    TimeTakenMs: { type: Number },
    CreatedAt: { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.model('AILog', aiLogSchema);
