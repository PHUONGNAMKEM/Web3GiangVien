import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, theme, Dropdown } from 'antd';
import { BookOpen, LogOut, FileText, User as UserIcon, Monitor, CheckCircle, Award } from 'lucide-react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import authService from '../../services/authService';

const { Header, Content, Sider } = Layout;

const MainLayout = () => {
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate('/');
    } else {
      setCurrentUser(user);
    }
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const isLecturer = currentUser?.role_id === 'LECTURER_ROLE';

  const studentMenuItems = [
    { key: '/student', icon: <Monitor size={18} />, label: 'Dashboard Sinh Viên' },
    { key: '/student/register', icon: <BookOpen size={18} />, label: 'Đăng Ký Đề Tài' },
    { key: '/student/upload', icon: <FileText size={18} />, label: 'Nộp Báo Cáo' },
    { key: '/student/progress-log', icon: <CheckCircle size={18} />, label: 'Nhật Ký Tiến Độ' },
    { key: '/student/progress', icon: <Award size={18} />, label: 'Kết Quả & Điểm' }
  ];

  const lecturerMenuItems = [
    { key: '/lecturer', icon: <Monitor size={18} />, label: 'Dashboard Giảng Viên' },
    { key: '/lecturer/topics', icon: <Award size={18} />, label: 'Quản Lý Đề Tài' },
    { key: '/lecturer/review', icon: <FileText size={18} />, label: 'Chấm Điểm (AI)' }
  ];

  const menuItems = isLecturer ? lecturerMenuItems : studentMenuItems;

  const headerMenu = (
    <Menu items={[
      { key: 'wallet', label: `Ví: ${currentUser?.walletAddress?.substring(0, 6)}...${currentUser?.walletAddress?.substring(currentUser?.walletAddress.length - 4)}` },
      { type: 'divider' },
      { key: 'logout', danger: true, icon: <LogOut size={16} />, label: 'Đăng xuất', onClick: handleLogout }
    ]} />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} theme="light">
        <div style={{ height: 64, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: collapsed ? 12 : 18, color: '#1677ff' }}>
          {collapsed ? 'W3GV' : 'Web3 Giảng Viên'}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={(e) => navigate(e.key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Dropdown menu={{
            items: [
              { key: 'wallet', label: `Ví: ${currentUser?.walletAddress?.substring(0, 6)}...` },
              { type: 'divider' },
              { key: 'profile', icon: <UserIcon size={16} />, label: 'Hồ sơ cá nhân', onClick: () => navigate(isLecturer ? '/lecturer' : '/student') },
              { type: 'divider' },
              { key: 'logout', danger: true, icon: <LogOut size={16} />, label: 'Đăng xuất', onClick: handleLogout }
            ]
          }} placement="bottomRight">
            <Button type="text" style={{ height: 48, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserIcon size={18} />} style={{ backgroundColor: '#1677ff' }} />
              {!collapsed && <span>{currentUser?.name || 'Tài khoản'}</span>}
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          {/* Output nested routes here */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
