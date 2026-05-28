// Chạy: node scripts/backfill-pdf-extraction.js
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const connectDB = require('../config/db');
const BaoCao = require('../models/BaoCao');
const aiService = require('../services/aiService');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

async function run() {
    await connectDB();
    const unprocessed = await BaoCao.find({ ExtractedText: null }).lean();
    logger.info(`[BACKFILL] Found ${unprocessed.length} reports without extracted text`);
    
    // Đảm bảo thư mục upload tạm tồn tại
    const tempDir = path.join(__dirname, '../uploads/reports');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    for (const bc of unprocessed) {
        try {
            // Tải từ IPFS về temp file
            const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${bc.IPFS_CID}`;
            logger.info(`[BACKFILL] Downloading from IPFS: ${bc.IPFS_CID}`);
            const response = await axios.get(ipfsUrl, { responseType: 'arraybuffer', timeout: 30000 });
            
            const tmpPath = path.join(tempDir, `backfill-${bc._id}.pdf`);
            fs.writeFileSync(tmpPath, Buffer.from(response.data));
            
            const result = await aiService.extractPdf(tmpPath);
            if (fs.existsSync(tmpPath)) {
                fs.unlinkSync(tmpPath);
            }
            
            await BaoCao.findByIdAndUpdate(bc._id, {
                ExtractedText: result.text || null,
                ExtractedAt: result.text ? new Date() : null,
                PageCount: result.page_count || null,
                ExtractionMethod: result.method,
                ExtractionWarnings: result.warnings
            });
            logger.info(`[BACKFILL] OK ${bc._id} | method=${result.method} | pages=${result.page_count}`);
        } catch (err) {
            logger.error(`[BACKFILL] FAILED ${bc._id}: ${err.message}`);
        }
    }
    
    await mongoose.disconnect();
    logger.info('[BACKFILL] Done');
}

run();
