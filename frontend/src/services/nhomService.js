import axios from 'axios';
import authService from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const nhomService = {
  // Tạo nhóm mới
  createNhom: async (sinhVienId, tenNhom, soLuong) => {
    const response = await axios.post(`${API_URL}/nhom`, { sinhVienId, tenNhom, soLuong }, { headers: getAuthHeaders() });
    return response.data;
  },

  // Lấy nhóm của SV
  getNhomBySinhVien: async (svId) => {
    const response = await axios.get(`${API_URL}/nhom/sinhvien/${svId}`, { headers: getAuthHeaders() });
    return response.data;
  },

  // Chi tiết nhóm
  getNhomById: async (id) => {
    const response = await axios.get(`${API_URL}/nhom/${id}`, { headers: getAuthHeaders() });
    return response.data;
  },

  // Mời thành viên
  inviteMember: async (nhomId, maSV) => {
    const response = await axios.post(`${API_URL}/nhom/${nhomId}/invite`, { maSV }, { headers: getAuthHeaders() });
    return response.data;
  },

  // Trả lời lời mời
  respondToInvite: async (nhomId, sinhVienId, accept) => {
    const response = await axios.post(`${API_URL}/nhom/${nhomId}/respond`, { sinhVienId, accept }, { headers: getAuthHeaders() });
    return response.data;
  },

  // Kick thành viên
  kickMember: async (nhomId, svId) => {
    const response = await axios.delete(`${API_URL}/nhom/${nhomId}/kick/${svId}`, { headers: getAuthHeaders() });
    return response.data;
  },

  // Rời nhóm
  leaveNhom: async (nhomId, sinhVienId) => {
    const response = await axios.post(`${API_URL}/nhom/${nhomId}/leave`, { sinhVienId }, { headers: getAuthHeaders() });
    return response.data;
  },

  // Chuyển quyền trưởng nhóm
  transferLeader: async (nhomId, fromSinhVienId, toSinhVienId) => {
    const response = await axios.post(`${API_URL}/nhom/${nhomId}/transfer-leader`, { fromSinhVienId, toSinhVienId }, { headers: getAuthHeaders() });
    return response.data;
  },

  // Chốt nhóm
  chotNhom: async (nhomId) => {
    const response = await axios.post(`${API_URL}/nhom/${nhomId}/chot`, {}, { headers: getAuthHeaders() });
    return response.data;
  },

  // Xóa nhóm
  deleteNhom: async (nhomId) => {
    const response = await axios.delete(`${API_URL}/nhom/${nhomId}`, { headers: getAuthHeaders() });
    return response.data;
  },

  // Lấy lời mời đang chờ
  getPendingInvites: async (svId) => {
    const response = await axios.get(`${API_URL}/nhom/invites/${svId}`, { headers: getAuthHeaders() });
    return response.data;
  }
};

export default nhomService;
