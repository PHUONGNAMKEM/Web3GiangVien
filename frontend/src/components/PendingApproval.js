import React, { useEffect, useState } from 'react';
import { Box, Typography, Container, Paper, CircularProgress, Button, Alert } from '@mui/material';
import { HourglassEmpty as HourglassIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import authService from '../services/authService';

const SOCKET_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000';

const PendingApproval = () => {
  const [status, setStatus] = useState('pending'); // 'pending', 'approved', 'rejected'
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // We assume tempWallet is stored somewhere or the user is partially authenticated.
    // In this flow, we will check localstorage for auth status or prompt to reconnect.
    const connectWalletAndListen = async () => {
      try {
        await authService.initializeProvider();
        const address = await authService.getWalletAddress();
        setWallet(address);

        const socket = io(SOCKET_URL);
        
        socket.on('connect', () => {
          socket.emit('pending:join', address);
        });

        socket.on('request_result', async (data) => {
          if (data.status === 'approved') {
            setStatus('approved');
            // Save token and navigate
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            authService.user = data.user;
            
            setTimeout(() => {
              navigate('/lecturer');
            }, 2000);
          } else if (data.status === 'rejected') {
            setStatus('rejected');
            setRejectReason(data.reason || 'Không rõ lý do');
          }
        });

        return () => {
          socket.disconnect();
        };
      } catch (err) {
        console.error('Wallet error:', err);
      }
    };

    connectWalletAndListen();
  }, [navigate]);

  const handleRetry = () => {
    navigate('/');
  };

  const handleJoinAsStudent = async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      await authService.registerWithRole(wallet, 'STUDENT_ROLE');
      navigate('/student');
    } catch (err) {
      console.error('Lỗi khi vào bằng Sinh viên:', err);
      alert('Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box display="flex" minHeight="100vh" alignItems="center" justifyContent="center">
        <Paper elevation={4} sx={{ p: 4, textAlign: 'center', borderRadius: 4, width: '100%' }}>
          
          {status === 'pending' && (
            <>
              <HourglassIcon color="primary" sx={{ fontSize: 80, mb: 2 }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>Đang chờ phê duyệt</Typography>
              <Typography variant="body1" color="text.secondary" mb={4}>
                Yêu cầu cấp quyền Giảng viên của bạn đã được gửi. Vui lòng chờ Admin hệ thống xác nhận. Màn hình này sẽ tự động cập nhật khi có kết quả.
              </Typography>
              <CircularProgress />
            </>
          )}

          {status === 'approved' && (
            <>
              <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom color="success.main">Phê duyệt thành công!</Typography>
              <Typography variant="body1" color="text.secondary" mb={4}>
                Chào mừng Giảng viên. Đang chuyển hướng vào hệ thống...
              </Typography>
              <CircularProgress color="success" />
            </>
          )}

          {status === 'rejected' && (
            <>
              <ErrorIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom color="error.main">Yêu cầu bị từ chối</Typography>
              <Alert severity="error" sx={{ mb: 4, textAlign: 'left' }}>
                <strong>Lý do từ chối:</strong> {rejectReason}
              </Alert>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Button variant="outlined" color="primary" fullWidth onClick={handleRetry} disabled={loading}>
                  Thử lại (Làm lại đơn)
                </Button>
                <Button variant="contained" color="primary" fullWidth onClick={handleJoinAsStudent} disabled={loading}>
                  {loading ? <CircularProgress size={24} /> : 'Vào hệ thống với tư cách Sinh viên'}
                </Button>
              </Box>
            </>
          )}
          
        </Paper>
      </Box>
    </Container>
  );
};

export default PendingApproval;
