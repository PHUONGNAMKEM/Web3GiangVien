import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Button, Paper, Alert,
  CircularProgress, Fade, Grow, Avatar, Chip, Link,
  useTheme, useMediaQuery, Tabs, Tab
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  VerifiedUser as VerifiedUserIcon,
  ChevronRight as ChevronRightIcon,
  Language as LanguageIcon,
  HelpOutline as HelpIcon,
  QrCode as QrCodeIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import QRCode from 'qrcode';
import MetaMaskGuideModal from './MetaMaskGuideModal';
import authService from '../services/authService';
import apiService from '../services/apiService';

// Role constants
const STUDENT_ROLE = 'STUDENT_ROLE';
const LECTURER_ROLE = 'LECTURER_ROLE';

// --- Animated Gradient Text Component ---
function AnimatedGradientText({ children, sx }) {
  return (
    <Typography
      sx={{
        background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.light}, ${theme.palette.success.main}, ${theme.palette.secondary.light})`,
        backgroundSize: '200% 200%',
        animation: 'gradientAnimation 5s ease infinite',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        '@keyframes gradientAnimation': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

// --- Main LoginPage Component ---
function LoginPage() {
  console.log('LoginPage component rendered');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isVerySmall = useMediaQuery(theme.breakpoints.down(400));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // QR Login State
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrSessionId, setQrSessionId] = useState('');

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();
      setIsAuthenticated(authenticated);
      setUser(currentUser);
      if (currentUser) {
        setConnectedWallet(currentUser.walletAddress);
      }
    };
    checkAuth();

    authService.onAccountChange((account) => {
      if (!account) {
        setIsAuthenticated(false);
        setUser(null);
        setError('Ví đã bị ngắt kết nối. Vui lòng kết nối lại.');
      }
    });

    authService.onChainChange(() => window.location.reload());
  }, []);

  // Handle Tab QR loading
  useEffect(() => {
    if (tabValue === 1) {
      loadQrSession();
    } else {
      apiService.disconnectSocket();
    }
    return () => {
      apiService.disconnectSocket();
    };
  }, [tabValue]);

  const loadQrSession = async () => {
    setQrLoading(true);
    setError('');
    setQrCodeUrl('');
    try {
      const session = await apiService.getQrSession();
      setQrSessionId(session.sessionId);

      // Generate the URL pointing to mobile-login route
      const host = window.location.host;
      const protocol = window.location.protocol;
      const mobileLoginUrl = `${protocol}//${host}/mobile-login?sessionId=${session.sessionId}&challenge=${encodeURIComponent(session.challenge)}`;
      
      console.log('Mobile login URL generated:', mobileLoginUrl);

      // Generate QR Code data URL
      const qrDataUrl = await QRCode.toDataURL(mobileLoginUrl, { 
        width: 256, 
        margin: 2,
        color: {
          dark: '#1a1a2e',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataUrl);

      // Register Socket room
      apiService.initSocket('guest-login');
      if (apiService.socket) {
        apiService.socket.emit('qr:register', { sessionId: session.sessionId });

        apiService.socket.on('qr:success', (data) => {
          setSuccess('Đăng nhập QR thành công! Đang chuyển hướng...');
          setIsAuthenticated(true);
          setUser(data.user);
          setConnectedWallet(data.user.walletAddress);
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          apiService.disconnectSocket();

          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);
        });
      }
    } catch (err) {
      console.error(err);
      setError('Không thể tạo phiên đăng nhập QR. Vui lòng thử lại.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (!authService.isMetaMaskInstalled()) {
        setError('Vui lòng cài đặt ví MetaMask để tiếp tục.');
        setGuideModalOpen(true);
        return;
      }

      await authService.initializeProvider();
      const walletAddress = await authService.getWalletAddress();
      setConnectedWallet(walletAddress);

      const result = await authService.authenticate();
      setSuccess('Đăng nhập thành công! Đang chuyển hướng đến dashboard...');
      setIsAuthenticated(true);
      setUser(result.user);

      // Redirect to dashboard after success message
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      const message = err.message || 'Có lỗi xảy ra, vui lòng thử lại.';
      if (message.includes('user rejected')) {
        setError('Bạn đã từ chối yêu cầu kết nối.');
      } else if (message.includes('wallet not registered')) {
        setError('Ví này chưa được đăng ký trong hệ thống. Vui lòng liên hệ Ban quản lý khoa hoặc Giảng viên để được phê duyệt.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  // --- Responsive styles ---
  const getResponsiveStyles = () => {
    if (isVerySmall || isMobile) {
      return {
        containerPadding: 2,
        paperPadding: 2.5,
        avatarSize: 64,
        iconSize: 48,
        titleVariant: "h4",
        subtitleVariant: "body1",
        subtitleFontSize: '0.95rem',
        buttonPadding: 1.5,
        buttonFontSize: '0.95rem',
        chipSize: "small",
        spacing: 2
      };
    } else {
      return {
        containerPadding: 4,
        paperPadding: 3.5,
        avatarSize: 80,
        iconSize: 60,
        titleVariant: "h3",
        subtitleVariant: "h6",
        subtitleFontSize: '1.2rem',
        buttonPadding: 2,
        buttonFontSize: '1.1rem',
        chipSize: "medium",
        spacing: 4
      };
    }
  };

  const styles = getResponsiveStyles();

  // --- Logged In View ---
  if (isAuthenticated && user) {
    const isLecturer = user.role_id === LECTURER_ROLE;
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          minHeight="100vh"
          justifyContent="center"
          alignItems="center"
          py={styles.containerPadding}
        >
          <Grow in={true}>
            <Paper
              elevation={4}
              sx={{
                p: styles.paperPadding,
                textAlign: 'center',
                width: '100%',
                borderRadius: 4,
                maxWidth: '420px'
              }}
            >
              <Avatar
                sx={{
                  width: styles.avatarSize,
                  height: styles.avatarSize,
                  mx: 'auto',
                  mb: styles.spacing,
                  background: (theme) => `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.primary.main})`
                }}
              >
                <VerifiedUserIcon sx={{ fontSize: styles.iconSize * 0.6 }} />
              </Avatar>
              <AnimatedGradientText
                variant={isMobile ? "h5" : "h4"}
                gutterBottom
                sx={{
                  fontWeight: 'bold',
                  mb: 1
                }}
              >
                Chào mừng {isLecturer ? 'Giảng viên' : 'Sinh viên'}
              </AnimatedGradientText>
              <Typography
                variant="h5"
                sx={{
                  mb: 1,
                  fontWeight: 'bold'
                }}
              >
                {user.name || user.HoTen || 'Người dùng'}
              </Typography>
              
              {user.Email && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {user.Email}
                </Typography>
              )}

              <Box
                display="flex"
                flexDirection="column"
                gap={1.5}
                mb={styles.spacing}
                sx={{ width: '100%', mt: 2 }}
              >
                <Chip
                  label={`Ví: ${connectedWallet?.slice(0, 6)}...${connectedWallet?.slice(-4)}`}
                  variant="outlined"
                  size={styles.chipSize}
                  sx={{
                    background: 'linear-gradient(135deg, #f6851b 0%, #f7931e 100%)',
                    color: 'white',
                    border: 'none',
                    '& .MuiChip-label': {
                      fontWeight: 'bold'
                    }
                  }}
                />
                
                <Chip
                  label={`Vai trò: ${isLecturer ? 'Giảng viên' : 'Sinh viên'}`}
                  variant="outlined"
                  size={styles.chipSize}
                  color="primary"
                />

                {!isLecturer && user.MaSV && (
                  <Chip
                    label={`Mã SV: ${user.MaSV}`}
                    variant="outlined"
                    size={styles.chipSize}
                  />
                )}

                {isLecturer && user.MaGV && (
                  <Chip
                    label={`Mã GV: ${user.MaGV}`}
                    variant="outlined"
                    size={styles.chipSize}
                  />
                )}

                {user.ChuyenNganh && (
                  <Chip
                    label={`Chuyên ngành: ${user.ChuyenNganh}`}
                    variant="outlined"
                    size={styles.chipSize}
                  />
                )}

                {!isLecturer && typeof user.GPA === 'number' && (
                  <Chip
                    label={`GPA tích lũy: ${user.GPA.toFixed(2)}`}
                    variant="outlined"
                    size={styles.chipSize}
                    color="success"
                  />
                )}
              </Box>

              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={1}
                mt={3}
                mb={2}
              >
                <CircularProgress size={20} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Đang chuyển hướng vào cổng đào tạo...
                </Typography>
              </Box>

              <Box mt={3} display="flex" justifyContent="center">
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    authService.logout();
                    setIsAuthenticated(false);
                    setUser(null);
                    setConnectedWallet(null);
                    setError('');
                    setSuccess('');
                  }}
                  color="error"
                >
                  Đăng xuất
                </Button>
              </Box>
            </Paper>
          </Grow>
        </Box>
      </Container>
    );
  }

  // --- Login View ---
  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        flexDirection="column"
        minHeight="100vh"
        justifyContent="center"
        alignItems="center"
        py={styles.containerPadding}
      >
        <Fade in={true} timeout={1000}>
          <Box
            textAlign="center"
            mb={styles.spacing}
          >
            <Avatar
              sx={{
                width: styles.avatarSize,
                height: styles.avatarSize,
                mx: 'auto',
                mb: styles.spacing,
                background: 'transparent'
              }}
            >
              <LanguageIcon
                color="primary"
                sx={{
                  fontSize: styles.iconSize,
                  filter: `drop-shadow(0 0 10px ${theme.palette.primary.main})`
                }}
              />
            </Avatar>
            <AnimatedGradientText
              variant={styles.titleVariant}
              component="h1"
              sx={{
                fontWeight: 'bold',
                mb: 1
              }}
            >
              Web3 & AI Competition Platform
            </AnimatedGradientText>
            <Typography
              variant={styles.subtitleVariant}
              color="text.secondary"
              sx={{
                fontWeight: 400,
                fontSize: styles.subtitleFontSize,
                maxWidth: '480px',
                mx: 'auto',
                lineHeight: 1.4
              }}
            >
              Hệ thống quản lý khóa luận, chấm điểm tiến độ bằng AI & xác thực bất biến blockchain
            </Typography>
          </Box>
        </Fade>

        <Grow in={true} timeout={1500}>
          <Paper
            elevation={3}
            sx={{
              p: styles.paperPadding,
              width: '100%',
              textAlign: 'center',
              borderRadius: 4,
              maxWidth: '420px'
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
                <Tab label="Ví MetaMask" />
                <Tab label="Quét QR Code" />
              </Tabs>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2.5, textAlign: 'left' }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2.5, textAlign: 'left' }}>
                {success}
              </Alert>
            )}

            {tabValue === 0 && (
              <>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Kết nối ví MetaMask
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Đăng nhập thông qua tiện ích mở rộng ví MetaMask trên trình duyệt của bạn.
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleConnectWallet}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : (
                    <Box
                      component="img"
                      src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                      alt="MetaMask"
                      sx={{ width: 24, height: 24 }}
                    />
                  )}
                  endIcon={<ChevronRightIcon />}
                  sx={{
                    py: 1.5,
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #f6851b 0%, #f7931e 100%)',
                    boxShadow: '0 4px 12px rgba(246, 133, 27, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #e6750f 0%, #e8850f 100%)',
                      boxShadow: '0 6px 16px rgba(246, 133, 27, 0.5)',
                      transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  {loading ? 'Đang xác thực...' : 'Đăng Nhập Bằng MetaMask'}
                </Button>

                <Box mt={3}>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setGuideModalOpen(true)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: 'text.secondary'
                    }}
                  >
                    <HelpIcon fontSize="small" />
                    Chưa cài đặt ví? Xem hướng dẫn
                  </Link>
                </Box>
              </>
            )}

            {tabValue === 1 && (
              <>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Đăng nhập qua MetaMask Mobile
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Quét mã QR dưới đây bằng điện thoại của bạn để đăng nhập nhanh chóng.
                </Typography>

                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    my: 2,
                    p: 2,
                    bgcolor: '#f8f9fa',
                    borderRadius: 3,
                    minHeight: '230px',
                    position: 'relative'
                  }}
                >
                  {qrLoading ? (
                    <CircularProgress size={40} />
                  ) : qrCodeUrl ? (
                    <Box component="img" src={qrCodeUrl} alt="Login QR Code" sx={{ width: 200, height: 200 }} />
                  ) : (
                    <Typography variant="body2" color="error">Không thể tạo mã QR</Typography>
                  )}
                </Box>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={loadQrSession}
                  disabled={qrLoading}
                  sx={{ mb: 2 }}
                >
                  Làm mới mã QR
                </Button>

                <Typography variant="caption" display="block" color="text.secondary" sx={{ px: 2 }}>
                  Mẹo: Dùng máy ảnh điện thoại quét mã QR. Ổn định nhất khi mở liên kết trong trình duyệt in-app của ví MetaMask.
                </Typography>
              </>
            )}
          </Paper>
        </Grow>

        <Fade in={true} timeout={2000}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: styles.spacing,
              textAlign: 'center',
              fontSize: '0.85rem'
            }}
          >
            © {new Date().getFullYear()} - Nền tảng học tập bất biến Web3 & AI Competition Platform.
          </Typography>
        </Fade>
      </Box>
      <MetaMaskGuideModal open={guideModalOpen} onClose={() => setGuideModalOpen(false)} />
    </Container>
  );
}

export default LoginPage;
