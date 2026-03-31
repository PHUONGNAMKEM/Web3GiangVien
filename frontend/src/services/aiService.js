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

    // SV đăng ký đề tài
    registerTopic: async (topicId, sinhVienId) => {
        const response = await axios.post(`${API_URL}/detai/${topicId}/register`, {
            sinhVienId
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
    getDiemBySinhVien: async (svId) => {
        const response = await axios.get(`${API_URL}/diemso/sinhvien/${svId}`, { headers: getAuthHeaders() });
        return response.data;
    }
};

export default aiApiService;
