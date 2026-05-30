import apiService from './apiService';

const managementService = {
  // ===== MÔN HỌC =====
  async getMonHocByGV(gvId) {
    const res = await apiService.get(`/monhoc/giangvien/${gvId}`);
    return res.data;
  },

  async createMonHoc(data) {
    const res = await apiService.post('/monhoc', data);
    return res.data;
  },

  async updateMonHoc(id, data) {
    const res = await apiService.put(`/monhoc/${id}`, data);
    return res.data;
  },

  async deleteMonHoc(id) {
    const res = await apiService.delete(`/monhoc/${id}`);
    return res.data;
  },

  // ===== LỚP HỌC =====
  async getLopHocByGV(gvId) {
    const res = await apiService.get(`/lophoc/giangvien/${gvId}`);
    return res.data;
  },

  async getLopHocDetail(id) {
    const res = await apiService.get(`/lophoc/${id}/detail`);
    return res.data;
  },

  async createLopHoc(data) {
    const res = await apiService.post('/lophoc', data);
    return res.data;
  },

  async updateLopHoc(id, data) {
    const res = await apiService.put(`/lophoc/${id}`, data);
    return res.data;
  },

  async addSinhVienToLop(lopId, data) {
    const res = await apiService.post(`/lophoc/${lopId}/sinhvien`, typeof data === 'object' ? data : { sinhVienId: data });
    return res.data;
  },

  async removeSinhVienFromLop(lopId, svId) {
    const res = await apiService.delete(`/lophoc/${lopId}/sinhvien/${svId}`);
    return res.data;
  },

  async deleteLopHoc(id) {
    const res = await apiService.delete(`/lophoc/${id}`);
    return res.data;
  },

  async getLopHocBySinhVien(svId) {
    const res = await apiService.get(`/lophoc/sinhvien/${svId}`);
    return res.data;
  },

  async importSinhVienToLop(lopId, danhSachMaSV) {
    const res = await apiService.post(`/lophoc/${lopId}/import-sinhvien`, { danhSachMaSV });
    return res.data;
  },

  // ===== SINH VIÊN =====
  async getAllSinhVien() {
    const res = await apiService.get('/sinhvien');
    return res.data;
  },

  async getSinhVienByGV(gvId) {
    const res = await apiService.get(`/lophoc/giangvien/${gvId}/sinhvien`);
    return res.data;
  },

  // ===== LỜI MỜI LỚP HỌC =====
  async inviteSinhVienToLop(lopId, sinhVienId) {
    const res = await apiService.post(`/loimoi-lophoc/${lopId}/invite`, { sinhVienId });
    return res.data;
  },

  async inviteBatchToLop(lopId, danhSachMaSV) {
    const res = await apiService.post(`/loimoi-lophoc/${lopId}/invite-batch`, { danhSachMaSV });
    return res.data;
  },

  async getInvitesByLopHoc(lopId) {
    const res = await apiService.get(`/loimoi-lophoc/lophoc/${lopId}`);
    return res.data;
  },

  async getMyClassInvites(svId) {
    const res = await apiService.get(`/loimoi-lophoc/sinhvien/${svId}`);
    return res.data;
  },

  async respondClassInvite(inviteId, accept) {
    const res = await apiService.post(`/loimoi-lophoc/${inviteId}/respond`, { accept });
    return res.data;
  },

  async cancelClassInvite(inviteId) {
    const res = await apiService.delete(`/loimoi-lophoc/${inviteId}`);
    return res.data;
  },
};

export default managementService;

