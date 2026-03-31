const aiService = require('../services/aiService');
const matchingService = require('../services/matchingService');

exports.analyzeReport = async (req, res) => {
    try {
        const { text, topicRequirements } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: "No text provided for analysis" });
        }

        const result = await aiService.analyzeReport(text, topicRequirements);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message || "Error analyzing report via AI" });
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
