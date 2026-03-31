const axios = require('axios');
require('dotenv').config();

const FASTAPI_ENDPOINT = 'http://127.0.0.1:8001/analyze-report';

// Gọi sang local FastAPI ML Service (chạy PhoBERT)
exports.analyzeReport = async (text, topicRequirements) => {
    try {
        console.log("Calling Local FastAPI Inference for Report Analysis...");
        
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

        // Result trả về từ FastAPI
        const data = response.data;
        return {
            score: data.score,
            feedback: data.feedback,
            issues: data.issues || [],
            aiProvider: 'local-fastapi',
            model: 'vinai/phobert-base'
        };
    } catch (error) {
        console.error("AI Service Error:", error.response?.data || error.message);
        throw error;
    }
};
