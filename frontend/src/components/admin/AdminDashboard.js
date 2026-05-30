import React, { useState, useEffect } from 'react';
import { 
  Table, Tag, Space, Spin, Alert, Typography, Row, Col, Card, Statistic 
} from 'antd';
const { Title, Text } = Typography;
import { TeamOutlined, UserAddOutlined } from '@ant-design/icons';
import axios from 'axios';
import io from 'socket.io-client';
import authService from '../../services/authService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000';

const AdminDashboard = () => {
  const [requestsCount, setRequestsCount] = useState(0);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();

    const socket = io(SOCKET_URL);
    socket.on('connect', () => {
      socket.emit('admin:join');
    });

    socket.on('admin:newRequest', () => {
      setRequestsCount(prev => prev + 1);
    });

    const handleRefresh = () => fetchData();
    window.addEventListener('admin:refreshBadge', handleRefresh);

    return () => {
      socket.disconnect();
      window.removeEventListener('admin:refreshBadge', handleRefresh);
    };
  }, []);

  const fetchData = async () => {
    try {
      const token = authService.getToken();
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [reqRes, lecRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/requests`, config),
        axios.get(`${API_BASE_URL}/admin/lecturers`, config)
      ]);

      if (reqRes.data.success) setRequestsCount(reqRes.data.requests.length);
      if (lecRes.data.success) setLecturers(lecRes.data.lecturers);
    } catch (err) {
      console.error('Fetch data error:', err);
      setError('Lỗi khi tải dữ liệu. Vui lòng tải lại trang.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}><Spin size="large" /></div>;
  }

  const lecturerColumns = [
    {
      title: 'Mã GV',
      dataIndex: 'MaGV',
      key: 'MaGV',
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Họ và Tên',
      dataIndex: 'HoTen',
      key: 'HoTen',
    },
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'Email',
    },
    {
      title: 'Ví MetaMask',
      dataIndex: 'WalletAddress',
      key: 'WalletAddress',
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>Quản trị hệ thống</Title>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Tổng số Giảng viên"
              value={lecturers.length}
              prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Statistic
              title="Yêu cầu đang chờ duyệt"
              value={requestsCount}
              prefix={<UserAddOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Title level={5} style={{ marginBottom: 16 }}>
          Danh sách Giảng viên đã duyệt ({lecturers.length})
        </Title>
        {lecturers.length === 0 ? (
          <Text type="secondary">Chưa có Giảng viên nào.</Text>
        ) : (
          <Table 
            columns={lecturerColumns} 
            dataSource={lecturers.map(l => ({ ...l, key: l._id }))} 
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
            size="small"
          />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
