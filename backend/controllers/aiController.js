const aiService = require('../services/aiService');
const matchingService = require('../services/matchingService');
const llmFeedbackService = require('../services/llmFeedbackService');
const logger = require('../config/logger');

exports.analyzeReport = async (req, res) => {
    try {
        const { text, topicRequirements, jobId } = req.body;

        if (!text) {
            return res.status(400).json({ error: "No text provided for analysis" });
        }

        logger.info(`[AI] Report analysis requested | textLength=${text.length}`);
        const result = await aiService.analyzeReport(text, topicRequirements, jobId);
        logger.info(`[AI] Report analysis completed | score=${result.score}`);
        res.json(result);
    } catch (err) {
        logger.error(`[AI] Report analysis failed: ${err.message}`);
        res.status(500).json({ error: err.message || "Error analyzing report via AI" });
    }
};

exports.analyzeReportWithRubrics = async (req, res) => {
    try {
        const { text, rubrics, jobId } = req.body;
        if (!text || !rubrics || !rubrics.length) {
            return res.status(400).json({ error: "Cần text và rubrics để phân tích" });
        }
        logger.info(`[AI] Rubrics analysis requested | criteria=${rubrics.length} | textLength=${text.length}`);
        const result = await aiService.analyzeWithRubrics(text, rubrics, jobId);
        logger.info(`[AI] Rubrics analysis completed | criteria=${rubrics.length} | score=${result.score}`);
        res.json(result);
    } catch (err) {
        logger.error(`[AI] Rubrics analysis failed: ${err.message}`);
        res.status(500).json({ error: err.message || "Error analyzing report with Rubrics" });
    }
};

// Sinh nhận xét bằng LLM (Gemini) từ kết quả chấm PhoBERT. Toggle bật/tắt nằm ở frontend.
// Có fallback về nhận xét hard-code nếu chưa cấu hình API key hoặc LLM lỗi.
exports.llmFeedback = async (req, res) => {
    try {
        const { score, isRubrics, rubricsResult, issues, topicName, phobertFeedback } = req.body;

        if (score === undefined || score === null) {
            return res.status(400).json({ error: "Thiếu 'score' để sinh nhận xét" });
        }

        const result = await llmFeedbackService.generateFeedback({
            score,
            isRubrics: Boolean(isRubrics),
            rubricsResult: rubricsResult || [],
            issues: issues || [],
            topicName: topicName || '',
            phobertFeedback: phobertFeedback || '',
        });

        logger.info(`[LLM] Feedback request | score=${score} | usedLLM=${result.usedLLM} | provider=${result.provider}`);
        res.json(result);
    } catch (err) {
        logger.error(`[LLM] Feedback failed: ${err.message}`);
        res.status(500).json({ error: err.message || "Lỗi khi sinh nhận xét bằng LLM" });
    }
};

// Tiến độ phân tích PhoBERT theo jobId (frontend poll để vẽ thanh %). Không rate-limit.
exports.analyzeProgress = async (req, res) => {
    try {
        const progress = await aiService.getAnalyzeProgress(req.params.jobId);
        res.json(progress);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.matchStudent = async (req, res) => {
    try {
        const { studentProfile, topics } = req.body;
        
        if (!studentProfile || !topics || !Array.isArray(topics)) {
            return res.status(400).json({ error: "Invalid student profile or topics data" });
        }

        const result = await matchingService.matchStudentToTopics(studentProfile, topics);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message || "Error matching student via AI" });
    }
};

