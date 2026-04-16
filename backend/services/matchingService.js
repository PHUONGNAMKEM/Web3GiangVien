const axios = require('axios');
const logger = require('../config/logger');
require('dotenv').config();

const FASTAPI_ENDPOINT = 'http://127.0.0.1:8001/match-student';

// Sử dụng Sentence Transformers trên FastAPI (SBERT) để tính vector similarity
exports.matchStudentToTopics = async (studentProfile, topics) => {
    try {
        logger.info(`[AI] Calling FastAPI /match-student | topics=${topics.length}`);
        
        // FastAPI expects: { student: { gpa, major_scores }, topics: [{ topic_id, requirements: [] }] }
        // Build major_scores from KyNang array (each skill gets score 8.0 to indicate proficiency)
        const kyNang = studentProfile.ky_nang || studentProfile.KyNang || [];
        const majorScores = {};
        kyNang.forEach(skill => { majorScores[skill] = 8.0; });
        
        // Nếu có chuyên ngành, thêm vào major_scores
        const chuyenNganh = studentProfile.chuyen_nganh || studentProfile.ChuyenNganh || '';
        if (chuyenNganh) { majorScores[chuyenNganh] = 9.0; }

        const studentPayload = {
            gpa: studentProfile.gpa || studentProfile.GPA || 3.0,
            major_scores: Object.keys(majorScores).length > 0 ? majorScores : { "Lập trình": 7.0 }
        };

        const topicPayloads = topics.map(t => { 
            let reqs = [];
            if (t.YeuCau && Array.isArray(t.YeuCau) && t.YeuCau.length > 0) {
                reqs = t.YeuCau;
            } else if (t.MoTa) {
                reqs = [t.MoTa];
            } else {
                reqs = ['Unknown'];
            }
            return {
                topic_id: t._id.toString(),
                requirements: reqs
            } 
        });

        const response = await axios.post(
            FASTAPI_ENDPOINT,
            {
                student: studentPayload,
                topics: topicPayloads
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        // Kết quả từ FastAPI
        const recommendations = response.data.recommendations || [];
        
        // Map ngược kết quả FastAPI (chứa topic_id và match_score) gắn vào topics ban đầu
        const finalRecommendations = recommendations.map(rec => {
            const originalTopic = topics.find(t => t._id.toString() === rec.topic_id);
            return {
                topicId: rec.topic_id,
                title: originalTopic ? originalTopic.TenDeTai : "Unknown",
                matchScore: rec.match_score || 0
            };
        });

        return {
            status: "success",
            recommendations: finalRecommendations
        };

    } catch (error) {
        logger.error(`[AI] Matching service error: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`);
        throw error;
    }
};
