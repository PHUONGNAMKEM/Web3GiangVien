import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Button, Avatar, theme, Dropdown, Badge, message } from 'antd';
import { BookOpen, LogOut, FileText, User as UserIcon, Monitor, CheckCircle, Award, ClipboardList, BarChart2, School, Users, GraduationCap, Bell, ShieldCheck } from 'lucide-react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import authService from '../../services/authService';
import axios from 'axios';
import io from 'socket.io-client';
import { useIsMobile } from '../../hooks/useResponsive';
import ClassSelector from '../common/ClassSelector';
import { useQueryClient } from '@tanstack/react-query';

const { Header, Content, Sider } = Layout;

const MainLayout = () => {
  const isMobile = useIsMobile();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(isMobile);
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const fetchPendingRequestsCount = useCallback(async () => {
    try {
      const token = authService.getToken();
      if (!token) return;
      const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/admin/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPendingRequestsCount(res.data.requests.length);
      }
    } catch (e) {
      console.error('Failed to fetch pending requests count', e);
    }
  }, []);

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

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
  const isAdmin = currentUser?.role_id === 'ADMIN_ROLE';
  const isStudent = currentUser?.role_id === 'STUDENT_ROLE';
  const queryClient = useQueryClient();

  // Realtime: Lecturer / Student socket connections
  useEffect(() => {
    if (!currentUser?.id || isAdmin) return;

    const SOCKET_URL = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '')
      : 'http://localhost:5000';
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      if (isLecturer) {
        socket.emit('lecturer:join', currentUser.id);
      } else if (isStudent) {
        socket.emit('student:join', currentUser.id);
      }
    });

    // === Lecturer events ===
    if (isLecturer) {
      socket.on('submission:new', (data) => {
        message.info(`📄 ${data.tenSinhVien || 'Sinh viên'} đã nộp báo cáo: ${data.tenDeTai || ''}`);
        queryClient.invalidateQueries({ queryKey: ['submission-review'] });
        queryClient.invalidateQueries({ queryKey: ['lecturer-dashboard'] });
      });

      socket.on('progress:new', (data) => {
        message.info(`📊 Tiến độ mới từ sinh viên — ${data.tenDeTai || ''} (Tuần ${data.tuanSo || '?'})`);
        queryClient.invalidateQueries({ queryKey: ['submission-review'] });
        queryClient.invalidateQueries({ queryKey: ['lecturer-dashboard'] });
      });
    }

    // === Student events ===
    if (isStudent) {
      socket.on('grade:new', (data) => {
        message.success(`🎓 Giảng viên đã chấm điểm: ${data.tenDeTai || ''} — ${data.diem}/10`);
        queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['progress-tracking'] });
        queryClient.invalidateQueries({ queryKey: ['report-upload'] });
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [currentUser?.id, isLecturer, isStudent, isAdmin, queryClient]);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingRequestsCount();

      const socket = io(process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000');
      socket.on('connect', () => socket.emit('admin:join'));
      socket.on('admin:newRequest', () => {
        setPendingRequestsCount(prev => prev + 1);
      });

      const handleRefresh = () => fetchPendingRequestsCount();
      window.addEventListener('admin:refreshBadge', handleRefresh);

      return () => {
        socket.disconnect();
        window.removeEventListener('admin:refreshBadge', handleRefresh);
      };
    }
  }, [isAdmin, fetchPendingRequestsCount]);

  const studentMenuItems = [
    { key: '/student', icon: <Monitor size={18} />, label: 'Dashboard' },
    { key: '/student/group', icon: <BookOpen size={18} />, label: 'Nhóm' },
    { key: '/student/register', icon: <Award size={18} />, label: 'Đăng Ký Đề Tài' },
    { key: '/student/upload', icon: <FileText size={18} />, label: 'Nộp Báo Cáo' },
    { key: '/student/progress-log', icon: <CheckCircle size={18} />, label: 'Nhật Ký Tiến Độ' },
    { key: '/student/progress', icon: <UserIcon size={18} />, label: 'Kết Quả & Điểm' }
  ];

  const lecturerMenuItems = [
    { key: '/lecturer', icon: <Monitor size={18} />, label: 'Dashboard' },
    { key: '/lecturer/topics', icon: <Award size={18} />, label: 'Đề Tài' },
    { key: '/lecturer/courses', icon: <BookOpen size={18} />, label: 'Môn Học' },
    { key: '/lecturer/classes', icon: <School size={18} />, label: 'Lớp Học' },
    { key: '/lecturer/students', icon: <Users size={18} />, label: 'Sinh Viên' },
    { key: '/lecturer/rubrics', icon: <ClipboardList size={18} />, label: 'Rubrics' },
    { key: '/lecturer/review', icon: <FileText size={18} />, label: 'Chấm Điểm (AI)' },
    { key: '/lecturer/comparison', icon: <BarChart2 size={18} />, label: 'So Sánh AI - GV' },
    { key: '/lecturer/blockchain', icon: <ShieldCheck size={18} />, label: 'Blockchain' }
  ];

  const adminMenuItems = [
    { key: '/admin', icon: <Monitor size={18} />, label: 'Dashboard Admin' },
    {
      key: '/admin/requests',
      icon: <Bell size={18} />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Yêu cầu</span>
          <Badge count={pendingRequestsCount} size="small" />
        </div>
      )
    }
  ];

  const menuItems = isAdmin ? adminMenuItems : (isLecturer ? lecturerMenuItems : studentMenuItems);

  const headerMenu = (
    <Menu items={[
      { key: 'wallet', label: `Ví: ${currentUser?.walletAddress?.substring(0, 6)}...${currentUser?.walletAddress?.substring(currentUser?.walletAddress.length - 4)}` },
      { type: 'divider' },
      { key: 'logout', danger: true, icon: <LogOut size={16} />, label: 'Đăng xuất', onClick: handleLogout }
    ]} />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)} 
        theme="light"
        style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 }}
      >
        <div style={{ 
          height: 136, 
          padding: '16px 8px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderInlineEnd: '1px solid rgba(5, 5, 5, 0.06)'
        }}>
          <img
            src="/LOGOWeb3GiangVien.png"
            alt="Web3 Giảng Viên Logo"
            style={{
              height: collapsed ? '32px' : '100%',
              width: '100%',
              objectFit: 'contain',
              transition: 'all 0.2s ease-in-out'
            }}
          />
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={(e) => navigate(e.key)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s ease' }}>
        <Header style={{ position: 'sticky', top: 0, zIndex: 99, padding: isMobile ? '0 12px' : '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {!isAdmin && <ClassSelector />}
          </div>
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
        <Content style={{ margin: isMobile ? '12px 8px' : '24px 16px', padding: isMobile ? 12 : 24, minHeight: 280, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          {/* Output nested routes here */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
