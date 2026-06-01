const axios = require('axios');
const logger = require('../config/logger');
require('dotenv').config();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001';
const FASTAPI_ENDPOINT = `${ML_SERVICE_URL}/analyze-report`;
const RUBRICS_ENDPOINT = `${ML_SERVICE_URL}/analyze-with-rubrics`;

// Gọi sang local FastAPI ML Service (chạy PhoBERT)
exports.analyzeReport = async (text, topicRequirements) => {
    try {
        logger.info(`[AI] Calling FastAPI /analyze-report | textLength=${text.length}`);
        const startTime = Date.now();
        
        const response = await axios.post(
            FASTAPI_ENDPOINT,
            { 
                text: text,
                topic_requirements: topicRequirements || []
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Token': process.env.INTERNAL_TOKEN || ''
                }
            }
        );

        const elapsed = Date.now() - startTime;
        // Result trả về từ FastAPI
        const data = response.data;
        logger.info(`[AI] Response received | score=${data.score} | time=${elapsed}ms`);
        return {
            score: data.score,
            feedback: data.feedback,
            issues: data.issues || [],
            security_flags: data.security_flags || [],
            repetition_rate: data.repetition_rate ?? null,
            trigram_repetition_rate: data.trigram_repetition_rate ?? null,
            aiProvider: 'local-fastapi',
            model: 'vinai/phobert-base'
        };
    } catch (error) {
        logger.error(`[AI] Service error: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
        throw error;
    }
};

// Gọi PhoBERT phân tích theo Rubrics (có chunking)
exports.analyzeWithRubrics = async (text, rubrics) => {
    try {
        logger.info(`[AI] Calling FastAPI /analyze-with-rubrics | criteria=${rubrics.length} | textLength=${text.length}`);
        const startTime = Date.now();

        const response = await axios.post(
            RUBRICS_ENDPOINT,
            { text, rubrics },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Token': process.env.INTERNAL_TOKEN || ''
                },
                timeout: 60000  // 60s timeout cho phân tích nhiều chunks
            }
        );

        const elapsed = Date.now() - startTime;
        logger.info(`[AI] Rubrics response received | criteria=${rubrics.length} | score=${response.data.score} | time=${elapsed}ms`);
        return response.data;
    } catch (error) {
        logger.error(`[AI] Rubrics analysis error: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
        throw error;
    }
};

const FormData = require('form-data');
const fs = require('fs');

const EXTRACT_PDF_ENDPOINT = `${ML_SERVICE_URL}/extract-pdf`;

exports.extractPdf = async (filePath) => {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath), {
            filename: 'report.pdf',
            contentType: 'application/pdf'
        });
        
        const response = await axios.post(EXTRACT_PDF_ENDPOINT, form, {
            headers: {
                ...form.getHeaders(),
                'X-Internal-Token': process.env.INTERNAL_TOKEN || ''
            },
            timeout: 120000 // 2 phút cho OCR
        });
        
        return response.data; // { text, page_count, method, warnings }
    } catch (error) {
        logger.warn(`[AI] PDF extraction failed: ${error.message}`);
        return { text: '', page_count: 0, method: 'failed', warnings: [error.message] };
    }
};

