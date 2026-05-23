import axios from 'axios';
import authService from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
    const token = authService.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const aiApiService = {
    // Lấy danh sách đề tài từ MongoDB
    getTopics: async () => {
        const response = await axios.get(`${API_URL}/detai`, { headers: getAuthHeaders() });
        return response.data;
    },

    // Gọi SBERT matching
    matchTopicsAI: async (studentProfile, topics) => {
        const response = await axios.post(`${API_URL}/ai/match-student`, {
            studentProfile,
            topics
        }, { headers: getAuthHeaders() });
        return response.data;
    },

    // Gọi PhoBERT analyze
    analyzeReportAI: async (text, topicRequirements) => {
        const response = await axios.post(`${API_URL}/ai/analyze-report`, {
            text,
            topicRequirements
        }, { headers: getAuthHeaders() });
        return response.data;
    },

    // Lấy thông tin sinh viên
    getStudentProfile: async (svId) => {
        const response = await axios.get(`${API_URL}/sinhvien/${svId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    // Kiểm tra SV đã đăng ký đề tài nào chưa
    getMyRegistration: async (svId) => {
        const response = await axios.get(`${API_URL}/dangky/sinhvien/${svId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    cancelRegistration: async (registrationId) => {
        const response = await axios.delete(`${API_URL}/dangky/${registrationId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    // SV đăng ký đề tài (theo nhóm)
    registerTopic: async (topicId, sinhVienId, nhomId) => {
        const response = await axios.post(`${API_URL}/detai/${topicId}/register`, {
            sinhVienId,
            nhomId
        }, { headers: getAuthHeaders() });
        return response.data;
    },

    // GV lấy danh sách đăng ký
    getRegistrationsByLecturer: async (gvId) => {
        const response = await axios.get(`${API_URL}/dangky/giangvien/${gvId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    // GV duyệt/từ chối đăng ký
    approveRegistration: async (registrationId, trangThai) => {
        const response = await axios.put(`${API_URL}/dangky/${registrationId}/approve`, {
            trangThai
        }, { headers: getAuthHeaders() });
        return response.data;
    },

    // GV tạo đề tài mới
    createTopic: async (topicData) => {
        const response = await axios.post(`${API_URL}/detai`, topicData, { headers: getAuthHeaders() });
        return response.data;
    },

    updateTopic: async (id, topicData) => {
        const response = await axios.put(`${API_URL}/detai/${id}`, topicData, { headers: getAuthHeaders() });
        return response.data;
    },

    // GV xóa đề tài
    deleteTopic: async (topicId) => {
        const response = await axios.delete(`${API_URL}/detai/${topicId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    // === BÁO CÁO / SUBMISSION ===

    // SV nộp báo cáo (với FormData)
    uploadBaoCao: async (formData) => {
        const response = await axios.post(`${API_URL}/baocao/upload`, formData, {
            headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // SV lấy báo cáo đã nộp
    getMyBaoCao: async (svId) => {
        const response = await axios.get(`${API_URL}/baocao/sinhvien/${svId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    // SV hủy nộp
    deleteBaoCao: async (baocaoId) => {
        const response = await axios.delete(`${API_URL}/baocao/${baocaoId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    // GV lấy tất cả submissions cho đề tài của mình
    getSubmissionsByLecturer: async (gvId) => {
        const response = await axios.get(`${API_URL}/baocao/giangvien/${gvId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    // GV chấm điểm
    chamDiem: async (diemData) => {
        const response = await axios.post(`${API_URL}/diemso`, diemData, { headers: getAuthHeaders() });
        return response.data;
    },

    // SV xem điểm
    retryGradeBlockchain: async (gradeId, giangVienId) => {
        const response = await axios.put(`${API_URL}/diemso/${gradeId}/retry-blockchain`, {
            giangVienId
        }, { headers: getAuthHeaders() });
        return response.data;
    },

    getDiemBySinhVien: async (svId) => {
        const response = await axios.get(`${API_URL}/diemso/sinhvien/${svId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    // === HỒ SƠ SINH VIÊN ===

    // SV cập nhật hồ sơ cá nhân
    updateStudentProfile: async (svId, profileData) => {
        const response = await axios.put(`${API_URL}/sinhvien/${svId}/profile`, profileData, { headers: getAuthHeaders() });
        return response.data;
    },

    // Tìm SV theo MaSV (cho chức năng mời vào nhóm)
    // Nhóm Sinh Viên
    inviteMember: async (deTaiId, maSV) => {
        const response = await axios.post(`${API_URL}/detai/${deTaiId}/invite`, { maSV }, { headers: getAuthHeaders() });
        return response.data;
    },
    respondToInvitation: async (deTaiId, accept) => {
        const response = await axios.post(`${API_URL}/detai/invitation/${deTaiId}/respond`, { accept }, { headers: getAuthHeaders() });
        return response.data;
    },
    getMyInvitations: async (svId) => {
        const response = await axios.get(`${API_URL}/detai/invitations/${svId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    // Nhật ký Tiến độ
    createProgressEntry: async (data) => {
        const response = await axios.post(`${API_URL}/tiendo`, data, { headers: getAuthHeaders() });
        return response.data;
    },
    getProgressBySV: async (svId) => {
        const response = await axios.get(`${API_URL}/tiendo/${svId}`, { headers: getAuthHeaders() });
        return response.data;
    },
    getProgressByTopic: async (deTaiId) => {
        const response = await axios.get(`${API_URL}/tiendo/detai/${deTaiId}`, { headers: getAuthHeaders() });
        return response.data;
    },
    getProgressBySinhVien: async (svId, deTaiId) => {
        const query = deTaiId ? `?deTaiId=${deTaiId}` : '';
        const response = await axios.get(`${API_URL}/tiendo/sinhvien/${svId}${query}`, { headers: getAuthHeaders() });
        return response.data;
    },
    getProgressDetail: async (tienDoId) => {
        const response = await axios.get(`${API_URL}/tiendo/detail/${tienDoId}`, { headers: getAuthHeaders() });
        return response.data;
    },
    updateProgressEntry: async (tienDoId, data) => {
        const response = await axios.put(`${API_URL}/tiendo/${tienDoId}`, data, { headers: getAuthHeaders() });
        return response.data;
    },
    evaluateProgress: async (tienDoId, data) => {
        const response = await axios.put(`${API_URL}/tiendo/${tienDoId}/danhgia`, data, { headers: getAuthHeaders() });
        return response.data;
    },
    commentProgress: async (tienDoId, nhanXet) => {
        const response = await axios.put(`${API_URL}/tiendo/${tienDoId}/nhanxet`, { nhanXet }, { headers: getAuthHeaders() });
        return response.data;
    },
    // GV: AI (PhoBERT) gợi ý điểm tiến độ tuần — chỉ tham khảo
    aiSuggestProgress: async (tienDoId) => {
        const response = await axios.get(`${API_URL}/tiendo/${tienDoId}/ai-suggest`, { headers: getAuthHeaders() });
        return response.data;
    },

    // === RUBRICS TEMPLATE ===

    getRubricsTemplates: async (gvId) => {
        const response = await axios.get(`${API_URL}/rubrics/giangvien/${gvId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    createRubricsTemplate: async (data) => {
        const response = await axios.post(`${API_URL}/rubrics`, data, { headers: getAuthHeaders() });
        return response.data;
    },

    updateRubricsTemplate: async (id, data) => {
        const response = await axios.put(`${API_URL}/rubrics/${id}`, data, { headers: getAuthHeaders() });
        return response.data;
    },

    deleteRubricsTemplate: async (id) => {
        const response = await axios.delete(`${API_URL}/rubrics/${id}`, { headers: getAuthHeaders() });
        return response.data;
    },

    setDefaultRubricsTemplate: async (id) => {
        const response = await axios.put(`${API_URL}/rubrics/${id}/default`, {}, { headers: getAuthHeaders() });
        return response.data;
    },

    applyTemplate: async (templateId, deTaiId) => {
        const response = await axios.post(`${API_URL}/rubrics/${templateId}/apply/${deTaiId}`, {}, { headers: getAuthHeaders() });
        return response.data;
    },

    // === AI ANALYZE WITH RUBRICS ===

    analyzeReportWithRubrics: async (text, rubrics) => {
        const response = await axios.post(`${API_URL}/ai/analyze-rubrics`, { text, rubrics }, { headers: getAuthHeaders() });
        return response.data;
    },

    // === SO SÁNH ĐIỂM AI vs GV ===

    getScoreComparison: async (gvId) => {
        const response = await axios.get(`${API_URL}/diemso/comparison/${gvId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    // === BÀI TEST CẠNH TRANH ===

    createBaiTest: async (data) => {
        const response = await axios.post(`${API_URL}/baitest`, data, { headers: getAuthHeaders() });
        return response.data;
    },

    getBaiTestByTopic: async (deTaiId) => {
        const response = await axios.get(`${API_URL}/baitest/detai/${deTaiId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    getBaiTestForStudent: async (deTaiId) => {
        const response = await axios.get(`${API_URL}/baitest/detai/${deTaiId}/student`, { headers: getAuthHeaders() });
        return response.data;
    },

    // SV (trưởng nhóm) bắt đầu làm bài → chuyển ChoTest sang DangLamTest
    startBaiTest: async (testId, nhomId) => {
        const response = await axios.post(`${API_URL}/baitest/${testId}/start`, { nhomId }, { headers: getAuthHeaders() });
        return response.data;
    },

    submitBaiTest: async (testId, data) => {
        const response = await axios.post(`${API_URL}/baitest/${testId}/submit`, data, { headers: getAuthHeaders() });
        return response.data;
    },

    getTestResults: async (testId) => {
        const response = await axios.get(`${API_URL}/baitest/${testId}/results`, { headers: getAuthHeaders() });
        return response.data;
    },

    selectTestWinner: async (testId, dangKyId) => {
        const response = await axios.post(`${API_URL}/baitest/${testId}/select-winner`, { dangKyId }, { headers: getAuthHeaders() });
        return response.data;
    },

    deleteBaiTest: async (testId) => {
        const response = await axios.delete(`${API_URL}/baitest/${testId}`, { headers: getAuthHeaders() });
        return response.data;
    },

    checkTestSubmitted: async (deTaiId, sinhVienId) => {
        const response = await axios.get(`${API_URL}/baitest/check/${deTaiId}/${sinhVienId}`, { headers: getAuthHeaders() });
        return response.data;
    }
};

export default aiApiService;
