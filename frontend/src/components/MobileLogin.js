import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Container, Box, Typography, Button, Paper, Alert, 
  CircularProgress, Avatar, useTheme 
} from '@mui/material';
import { 
  QrCodeScanner as QrIcon, 
  CheckCircleOutline as SuccessIcon, 
  AccountBalanceWallet as WalletIcon 
} from '@mui/icons-material';
import { ethers } from 'ethers';
import apiService from '../services/apiService';

function MobileLogin() {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const challenge = searchParams.get('challenge');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isMetaMaskBrowser, setIsMetaMaskBrowser] = useState(false);

  useEffect(() => {
    // Check if running inside MetaMask mobile browser or standard Web3 browser
    if (window.ethereum) {
      setIsMetaMaskBrowser(true);
    }
  }, []);

  const handleMetaMaskDeepLink = () => {
    const currentUrl = window.location.href;
    // Replace http:// or https:// with dapp://
    const deepLinkUrl = currentUrl.replace(/^https?:\/\//, 'dapp://');
    window.location.href = deepLinkUrl;
  };

  const handleConnectAndSign = async () => {
    if (!window.ethereum) {
      setError('Không tìm thấy ví MetaMask. Vui lòng mở trang này trong ví MetaMask hoặc tải ứng dụng.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('Không có tài khoản nào được kết nối.');
      }

      const walletAddress = accounts[0];
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 2. Sign the challenge
      const signature = await signer.signMessage(challenge);

      // 3. Submit signature to backend
      const result = await apiService.submitQrSignature({
        sessionId,
        walletAddress,
        signature
      });

      if (result.success) {
        setSuccess('Xác thực thành công! Màn hình máy tính của bạn đã được đăng nhập.');
      } else {
        throw new Error(result.message || 'Xác thực thất bại.');
      }
    } catch (err) {
      console.error(err);
      if (err.code === 4001) {
        setError('Bạn đã hủy yêu cầu ký tin nhắn.');
      } else {
        setError(err.message || 'Có lỗi xảy ra trong quá trình xác thực.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!sessionId || !challenge) {
    return (
      <Container maxWidth="xs" style={{ marginTop: '100px' }}>
        <Alert severity="error">
          Thiếu thông tin phiên đăng nhập. Vui lòng quét lại mã QR trên màn hình máy tính.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xs">
      <Box 
        display="flex" 
        flexDirection="column" 
        minHeight="100vh" 
        justifyContent="center" 
        alignItems="center"
        py={4}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', textAlign: 'center', borderRadius: 3 }}>
          <Avatar 
            sx={{ 
              width: 60, 
              height: 60, 
              mx: 'auto', 
              mb: 3, 
              bgcolor: success ? 'success.main' : 'primary.main' 
            }}
          >
            {success ? <SuccessIcon sx={{ fontSize: 36 }} /> : <QrIcon sx={{ fontSize: 36 }} />}
          </Avatar>

          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Xác Thực Đăng Nhập
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Đăng nhập an toàn cho Web3 & AI Competition Platform
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

          {!success && (
            <>
              {isMetaMaskBrowser ? (
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  onClick={handleConnectAndSign}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <WalletIcon />}
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                    background: 'linear-gradient(135deg, #f6851b 0%, #f7931e 100%)',
                    boxShadow: '0 4px 12px rgba(246, 133, 27, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #e6750f 0%, #e8850f 100%)',
                    }
                  }}
                >
                  {loading ? 'Đang xác thực...' : 'Kết Nối Ví & Ký Xác Xác Nhận'}
                </Button>
              ) : (
                <Box>
                  <Typography variant="body1" sx={{ mb: 3, fontWeight: 'medium' }}>
                    Phát hiện bạn đang mở bằng trình duyệt thường.
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleMetaMaskDeepLink}
                    sx={{
                      py: 1.5,
                      mb: 2,
                      fontSize: '1rem',
                      background: 'linear-gradient(135deg, #363636 0%, #1a1a1a 100%)',
                    }}
                  >
                    Mở Trong Ví MetaMask Mobile
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Trình duyệt thường không thể truy cập ví trực tiếp. Vui lòng mở bằng MetaMask app để ký xác nhận.
                  </Typography>
                </Box>
              )}
            </>
          )}

          {success && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Bạn có thể đóng tab trình duyệt này ngay bây giờ.
            </Typography>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default MobileLogin;
