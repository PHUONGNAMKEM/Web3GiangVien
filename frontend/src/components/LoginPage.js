import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Button, Paper, Alert,
  CircularProgress, Fade, Grow, Avatar, Chip, Link,
  useTheme, useMediaQuery, Tabs, Tab, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  VerifiedUser as VerifiedUserIcon,
  ChevronRight as ChevronRightIcon,
  Language as LanguageIcon,
  HelpOutline as HelpIcon,
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';
import MetaMaskGuideModal from './MetaMaskGuideModal';
import QrScanner from './QrScanner';
import RoleSelection from './RoleSelection';
import authService from '../services/authService';

// Role constants
const STUDENT_ROLE = 'STUDENT_ROLE';
const LECTURER_ROLE = 'LECTURER_ROLE';
const ADMIN_ROLE = 'ADMIN_ROLE';

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
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [scanningQr, setScanningQr] = useState(false);

  // Role Selection State
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [tempWallet, setTempWallet] = useState(null);
  const [rejectedCountToday, setRejectedCountToday] = useState(0);

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

  // QR Scan handler — quét QR trên PC, rồi xác thực MetaMask trên PC (giống frontend cũ)
  const handleQrScan = async (qrData) => {
    setScanningQr(true);
    setError('');
    setSuccess('');
    try {
      // Parse QR data — QR chứa JSON với thông tin ví/người dùng
      let qrInfo;
      try {
        qrInfo = JSON.parse(qrData);
      } catch {
        // Nếu QR không phải JSON, coi như là wallet address thuần
        if (qrData.startsWith('0x') && qrData.length === 42) {
          qrInfo = { walletAddress: qrData };
        } else {
          throw new Error('Mã QR không hợp lệ. Vui lòng quét mã QR từ hệ thống Web3 Giảng Viên.');
        }
      }

      // Validate QR data — cần có thông tin đủ để xác thực
      if (!qrInfo.walletAddress && !qrInfo.wallet_address) {
        throw new Error('QR code không chứa thông tin ví. Vui lòng kiểm tra lại mã QR.');
      }

      const qrWallet = (qrInfo.walletAddress || qrInfo.wallet_address).toLowerCase();
      console.log('QR scanned wallet:', qrWallet);

      // Kiểm tra MetaMask
      if (!authService.isMetaMaskInstalled()) {
        setError('Vui lòng cài đặt ví MetaMask để tiếp tục.');
        setGuideModalOpen(true);
        return;
      }

      // Kết nối MetaMask trên PC
      console.log('Connecting MetaMask...');
      await authService.initializeProvider();
      const walletAddress = await authService.getWalletAddress();
      console.log('MetaMask wallet:', walletAddress);
      setConnectedWallet(walletAddress);

      // Kiểm tra ví MetaMask khớp với QR
      if (walletAddress.toLowerCase() !== qrWallet) {
        throw new Error(
          `Ví MetaMask đang kết nối (${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}) ` +
          `không khớp với ví trong QR (${qrWallet.slice(0, 6)}...${qrWallet.slice(-4)}). ` +
          `Vui lòng chuyển sang đúng ví hoặc quét lại mã QR.`
        );
      }

      // Xác thực MetaMask (ký challenge)
      console.log('Authenticating...');
      const result = await authService.authenticate();
      
      /* DISABLED: Admin approval flow
      if (result.isPending) {
        setSuccess('Bạn đang có yêu cầu chờ duyệt. Đang chuyển hướng...');
        setTimeout(() => {
          window.location.href = '/pending-approval';
        }, 1500);
        return;
      }
      */

      if (result.needsRoleSelection) {
        setNeedsRoleSelection(true);
        setTempWallet(result.walletAddress);
        setRejectedCountToday(result.rejectedCountToday || 0);
        setSuccess('Vui lòng chọn vai trò để tiếp tục.');
        return;
      }

      setSuccess('Đăng nhập bằng QR thành công! Đang chuyển hướng...');
      setIsAuthenticated(true);
      setUser(result.user);

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      const message = err.message || 'Có lỗi xảy ra khi quét QR.';
      if (err.code === 4001) {
        setError('Bạn đã từ chối kết nối MetaMask.');
      } else {
        setError(message);
      }
    } finally {
      setScanningQr(false);
      setQrScannerOpen(false);
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
      
      /* DISABLED: Admin approval flow
      if (result.isPending) {
        setSuccess('Bạn đang có yêu cầu chờ duyệt. Đang chuyển hướng...');
        setTimeout(() => {
          window.location.href = '/pending-approval';
        }, 1500);
        return;
      }
      */

      if (result.needsRoleSelection) {
        setNeedsRoleSelection(true);
        setTempWallet(result.walletAddress);
        setRejectedCountToday(result.rejectedCountToday || 0);
        setSuccess('Vui lòng chọn vai trò để tiếp tục.');
        return;
      }

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

  const handleSelectStudent = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.registerWithRole(tempWallet, STUDENT_ROLE);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Lỗi khi đăng ký Sinh viên');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLecturer = async (formData) => {
    setLoading(true);
    setError('');
    try {
      await authService.registerWithRole(tempWallet, LECTURER_ROLE, formData);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Lỗi khi đăng ký Giảng viên');
    } finally {
      setLoading(false);
    }
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
    const isAdmin = user.role_id === ADMIN_ROLE;
    
    const roleDisplayName = isAdmin ? 'Super Admin' : (isLecturer ? 'Giảng viên' : 'Sinh viên');
    
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
                Chào mừng {roleDisplayName}
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
                  label={`Vai trò: ${roleDisplayName}`}
                  variant="outlined"
                  size={styles.chipSize}
                  color="primary"
                />

                {!isLecturer && !isAdmin && user.MaSV && (
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

                {!isLecturer && !isAdmin && typeof user.GPA === 'number' && (
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
    <Container maxWidth={needsRoleSelection ? "md" : "sm"}>
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

        {needsRoleSelection ? (
          <Grow in={true} timeout={1500}>
            <Box width="100%">
              {error && (
                <Alert severity="error" sx={{ mb: 2.5, textAlign: 'left', maxWidth: 800, mx: 'auto' }}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 2.5, textAlign: 'left', maxWidth: 800, mx: 'auto' }}>
                  {success}
                </Alert>
              )}
              <RoleSelection
                walletAddress={tempWallet}
                rejectedCountToday={rejectedCountToday}
                onSelectStudent={handleSelectStudent}
                onSelectLecturer={handleSelectLecturer}
                loading={loading}
              />
            </Box>
          </Grow>
        ) : (
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
                  Đăng nhập bằng QR
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Quét mã QR từ thẻ xác thực Web3 của bạn để đăng nhập nhanh chóng và an toàn.
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={() => setQrScannerOpen(true)}
                  disabled={scanningQr}
                  startIcon={scanningQr ? <CircularProgress size={20} color="inherit" /> : <QrCodeScannerIcon />}
                  sx={{
                    py: 1.5,
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.39)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%)',
                      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  {scanningQr ? 'Đang xử lý...' : 'Quét Mã QR'}
                </Button>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 3, fontSize: '0.85rem' }}
                >
                  Sử dụng camera hoặc ảnh chứa mã QR từ thẻ xác thực blockchain của bạn.
                </Typography>
              </>
            )}
          </Paper>
        </Grow>
        )}

        {/* QR Scanner Dialog */}
        <Dialog
          open={qrScannerOpen}
          onClose={() => setQrScannerOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Quét Mã QR Xác Thực</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <QrScanner
                onScan={handleQrScan}
                onError={(error) => {
                  console.error('QR scan error:', error);
                  setError(error.message || 'Lỗi quét QR');
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" align="center">
              Hướng camera về phía mã QR hoặc upload ảnh chứa mã QR để quét
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setQrScannerOpen(false)}>Đóng</Button>
          </DialogActions>
        </Dialog>

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
