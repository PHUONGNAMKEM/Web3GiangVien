import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Row, Col, Statistic, Spin } from 'antd';
import { BookOpen, Users } from 'lucide-react';
import authService from '../../services/authService';
import aiApiService from '../../services/aiService';
import { useIsMobile } from '../../hooks/useResponsive';
import QrAuthentication from '../QrAuthentication';

const { Title } = Typography;

const LecturerDashboard = () => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ topics: 0, students: 0 });
  const fetchData = useCallback(async () => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;
    try {
      setLoading(true);
      const data = await aiApiService.getSubmissionsByLecturer(currentUser.id);
      if (data && Array.isArray(data)) {
        const uniqueTopics = new Set(data.map(item => item.topic?._id));
        const uniqueStudents = new Set(data.map(item => item.student?._id));
        setStats({
          topics: uniqueTopics.size,
          students: uniqueStudents.size
        });
      }
    } catch (e) {
      console.error('Lỗi lấy thống kê giảng viên:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <Title level={2}>Dashboard Giảng Viên</Title>
      <Row gutter={[{ xs: 8, sm: 16 }, { xs: 8, sm: 16 }]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false}>
            <Statistic
              title="Tổng Đề Tài Quản Lý"
              value={stats.topics}
              prefix={<BookOpen size={20} style={{ marginRight: 8, color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card bordered={false}>
            <Statistic
              title="Sinh Viên Đã Hướng Dẫn"
              value={stats.students}
              prefix={<Users size={20} style={{ marginRight: 8, color: '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <div style={{ marginTop: 16 }}>
            <QrAuthentication user={authService.getCurrentUser()} />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default LecturerDashboard;
