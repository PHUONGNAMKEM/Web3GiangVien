// Test nhanh: gọi thẳng llmFeedbackService, không qua route/JWT.
// Chạy: node scripts/test-gemini-feedback.js
const llm = require('../services/llmFeedbackService');

(async () => {
    console.log('GEMINI enabled:', llm.isEnabled());
    console.log('Model:', process.env.GEMINI_MODEL || 'gemini-2.5-flash');
    console.log('---');

    const result = await llm.generateFeedback({
        score: 7.8,
        isRubrics: true,
        topicName: 'Ứng dụng Smart Contract cho sàn giao dịch phi tập trung (DEX)',
        phobertFeedback: 'Báo cáo khá tốt (7.8/10), đáp ứng phần lớn tiêu chí.',
        rubricsResult: [
            { TenTieuChi: 'Cơ sở lý thuyết Blockchain', AI_DiemTieuChi: 8.2, DiemToiDa: 10, AI_NhanXetTieuChi: "Tốt: 'Chương 1' thể hiện rõ nội dung 'Cơ sở lý thuyết Blockchain'" },
            { TenTieuChi: 'Phân tích Smart Contract', AI_DiemTieuChi: 7.5, DiemToiDa: 10, AI_NhanXetTieuChi: "Khá: Có đề cập 'Phân tích Smart Contract' tại 'Chương 2' nhưng chưa sâu" },
            { TenTieuChi: 'Ứng dụng sàn DEX tại VN', AI_DiemTieuChi: 4.0, DiemToiDa: 10, AI_NhanXetTieuChi: "Yếu: Thiếu nội dung liên quan đến 'Ứng dụng sàn DEX tại VN'" },
        ],
    });

    console.log('usedLLM :', result.usedLLM);
    console.log('provider:', result.provider);
    console.log('model   :', result.model);
    console.log('--- FEEDBACK ---');
    console.log(result.feedback);
})();
