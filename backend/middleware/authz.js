// Phân quyền theo vai trò. Phải chạy SAU authController.authenticateToken (đã set req.user).
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !req.user.role_id) {
    return res.status(401).json({ error: 'Chưa đăng nhập', code: 'CHUA_DANG_NHAP' });
  }
  if (!roles.includes(req.user.role_id)) {
    return res.status(403).json({ error: 'Không đủ quyền truy cập', code: 'KHONG_DU_QUYEN' });
  }
  next();
};

module.exports = { requireRole };
