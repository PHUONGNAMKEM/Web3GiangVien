const axios = require('axios');
const logger = require('../config/logger');
require('dotenv').config();

// Google Gemini (free tier). Model cấu hình qua .env, mặc định gemini-2.5-flash (GA, free, ổn định).
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = (model) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/**
 * Kiểm tra LLM có khả dụng không (đã cấu hình API key chưa).
 */
exports.isEnabled = () => Boolean(GEMINI_API_KEY);

/**
 * Sinh nhận xét tự nhiên bằng Gemini dựa trên KẾT QUẢ CHẤM của PhoBERT.
 * LLM KHÔNG chấm điểm — chỉ diễn giải điểm + kết quả tiêu chí thành nhận xét giảng viên.
 *
 * @param {Object} p
 * @param {number} p.score            Điểm tổng (thang 10) do PhoBERT tính
 * @param {boolean} p.isRubrics       Có dùng rubrics hay không
 * @param {Array}  p.rubricsResult    [{ TenTieuChi, AI_DiemTieuChi, DiemToiDa, AI_NhanXetTieuChi }]
 * @param {Array}  p.issues           Vấn đề PhoBERT phát hiện (dùng cho luồng không rubrics)
 * @param {string} p.topicName        Tên đề tài (ngữ cảnh)
 * @param {string} p.phobertFeedback  Nhận xét hard-code (dùng làm fallback nếu LLM lỗi)
 * @returns {Promise<{feedback:string, usedLLM:boolean, provider:string, model:string}>}
 */
exports.generateFeedback = async ({ score, isRubrics, rubricsResult = [], issues = [], topicName = '', phobertFeedback = '' }) => {
    // Không có key → trả thẳng nhận xét hard-code, không gọi API
    if (!GEMINI_API_KEY) {
        return { feedback: phobertFeedback, usedLLM: false, provider: 'fallback-phobert', model: 'none' };
    }

    const prompt = buildPrompt({ score, isRubrics, rubricsResult, issues, topicName });

    try {
        const startTime = Date.now();
        const response = await axios.post(
            GEMINI_URL(GEMINI_MODEL),
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.6,
                    maxOutputTokens: 800,
                    topP: 0.9,
                    // Tắt "thinking" của Gemini 2.5+ để token dành hết cho nhận xét (tránh bị cụt)
                    thinkingConfig: { thinkingBudget: 0 },
                },
            },
            {
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
                timeout: 20000,
            }
        );

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        const elapsed = Date.now() - startTime;

        if (!text) {
            logger.warn('[LLM] Gemini trả về rỗng — dùng fallback PhoBERT feedback');
            return { feedback: phobertFeedback, usedLLM: false, provider: 'fallback-phobert', model: GEMINI_MODEL };
        }

        logger.info(`[LLM] Gemini feedback OK | model=${GEMINI_MODEL} | score=${score} | time=${elapsed}ms`);
        return { feedback: text, usedLLM: true, provider: 'google-gemini', model: GEMINI_MODEL };
    } catch (error) {
        const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        logger.error(`[LLM] Gemini lỗi: ${detail} — dùng fallback PhoBERT feedback`);
        return { feedback: phobertFeedback, usedLLM: false, provider: 'fallback-phobert', model: GEMINI_MODEL };
    }
};

function buildPrompt({ score, isRubrics, rubricsResult, issues, topicName }) {
    const lines = [];
    lines.push('Bạn là một giảng viên đại học đang viết nhận xét cho báo cáo đồ án của sinh viên.');
    lines.push('Hệ thống AI (PhoBERT) đã chấm điểm và phân tích sẵn. Nhiệm vụ của bạn là DIỄN GIẢI kết quả đó thành một đoạn nhận xét tự nhiên, mang tính xây dựng.');
    lines.push('');
    lines.push('QUY TẮC BẮT BUỘC:');
    lines.push('- KHÔNG được tự bịa nội dung không có trong dữ liệu bên dưới.');
    lines.push('- KHÔNG được thay đổi hay đề xuất điểm số khác.');
    lines.push('- Viết bằng tiếng Việt, văn phong giảng viên, 3–5 câu, súc tích.');
    lines.push('- Nêu rõ điểm mạnh và điểm cần cải thiện dựa trên kết quả các tiêu chí.');
    lines.push('- Trả về DUY NHẤT đoạn văn nhận xét, không markdown, không tiêu đề, không gạch đầu dòng.');
    lines.push('');
    if (topicName) lines.push(`Đề tài: ${topicName}`);
    lines.push(`Điểm tổng (thang 10): ${score}`);
    lines.push(`Chế độ chấm: ${isRubrics ? 'theo rubrics (tiêu chí)' : 'không rubrics (theo yêu cầu đề tài)'}`);

    if (isRubrics && Array.isArray(rubricsResult) && rubricsResult.length > 0) {
        lines.push('');
        lines.push('Kết quả từng tiêu chí:');
        for (const r of rubricsResult) {
            const diem = r.AI_DiemTieuChi ?? r.GV_DiemTieuChi ?? '?';
            const max = r.DiemToiDa ?? 10;
            const nx = r.AI_NhanXetTieuChi || '';
            lines.push(`- ${r.TenTieuChi}: ${diem}/${max}${nx ? ` (${nx})` : ''}`);
        }
    } else if (!isRubrics && Array.isArray(issues) && issues.length > 0) {
        // Luồng không rubrics: dùng các vấn đề PhoBERT phát hiện làm ngữ cảnh
        lines.push('');
        lines.push('Các vấn đề hệ thống phát hiện:');
        for (const it of issues) {
            if (it) lines.push(`- ${it}`);
        }
    }
    lines.push('');
    lines.push('Nhận xét của giảng viên:');
    return lines.join('\n');
}
