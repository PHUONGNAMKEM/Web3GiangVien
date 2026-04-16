const axios = require('axios');
const logger = require('../config/logger');
require('dotenv').config();

const FASTAPI_ENDPOINT = 'http://127.0.0.1:8001/analyze-report';
const RUBRICS_ENDPOINT = 'http://127.0.0.1:8001/analyze-with-rubrics';

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
                    'Content-Type': 'application/json'
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
                    'Content-Type': 'application/json'
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

