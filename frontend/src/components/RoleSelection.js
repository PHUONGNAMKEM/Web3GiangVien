import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress
} from '@mui/material';
import { School as SchoolIcon, AccountBox as TeacherIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

const RoleSelection = ({ walletAddress, onSelectStudent, onSelectLecturer, loading, rejectedCountToday = 0 }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ hoTen: '', email: '', chuyenNganh: '' });

  const handleLecturerSubmit = () => {
    if (!formData.hoTen || !formData.email || !formData.chuyenNganh) return;
    onSelectLecturer(formData);
  };

  return (
    <Box mt={4} width="100%" maxWidth={800} mx="auto">
      <Typography variant="h5" align="center" fontWeight="bold" gutterBottom>
        Vui lòng chọn vai trò của bạn
      </Typography>
      <Typography variant="body1" align="center" color="text.secondary" mb={4}>
        Ví <strong>{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</strong> chưa được liên kết với tài khoản nào.
      </Typography>

      <Grid container spacing={4}>
        {/* Sinh Viên Card */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={4}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-5px)' }
            }}
          >
            <SchoolIcon color="primary" sx={{ fontSize: 60, mx: 'auto', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>Sinh Viên</Typography>
            <Box textAlign="left" mb={4} flexGrow={1} color="text.secondary">
              <Typography variant="body2" sx={{ mb: 1 }}>• Đăng ký tham gia đề tài thi đấu</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Nộp báo cáo và cập nhật tiến độ</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Nhận gợi ý đề tài bằng AI</Typography>
            </Box>
            <Button
              variant="outlined"
              size="large"
              color="primary"
              endIcon={loading ? <CircularProgress size={20} /> : <ArrowForwardIcon />}
              onClick={onSelectStudent}
              disabled={loading}
              sx={{ borderRadius: 8 }}
            >
              Vào với tư cách Sinh Viên
            </Button>
          </Paper>
        </Grid>

        {/* Giảng Viên Card */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={4}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-5px)' }
            }}
          >
            <TeacherIcon color="success" sx={{ fontSize: 60, mx: 'auto', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>Giảng Viên</Typography>
            <Box textAlign="left" mb={4} flexGrow={1} color="text.secondary">
              <Typography variant="body2" sx={{ mb: 1 }}>• Quản lý và tạo đề tài thi đấu</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Chấm điểm AI và thủ công</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>• Ghi kết quả lên Blockchain</Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              color="success"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setModalOpen(true)}
              disabled={loading || rejectedCountToday >= 3}
              sx={{ borderRadius: 8 }}
            >
              Yêu cầu cấp quyền Giảng Viên
            </Button>
            {rejectedCountToday > 0 && (
              <Typography variant="caption" color={rejectedCountToday >= 3 ? "error" : "text.secondary"} mt={2} display="block">
                Đã bị từ chối {rejectedCountToday}/3 lần hôm nay
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Modal Nhập thông tin Giảng viên */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Thông tin Giảng Viên</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Vui lòng cung cấp thông tin để Admin xét duyệt quyền Giảng viên cho ví của bạn.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Họ và Tên"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.hoTen}
            onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            variant="outlined"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Chuyên Ngành"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.chuyenNganh}
            onChange={(e) => setFormData({ ...formData, chuyenNganh: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalOpen(false)} color="inherit">Hủy</Button>
          <Button
            onClick={handleLecturerSubmit}
            variant="contained"
            color="success"
            disabled={!formData.hoTen || !formData.email || !formData.chuyenNganh || loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            Gửi yêu cầu phê duyệt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoleSelection;
