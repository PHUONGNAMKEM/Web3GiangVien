import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Row, Col, Statistic, Alert, Spin, Tag, Tooltip, Divider } from 'antd';
import { Target, Award, BookOpen, ShieldCheck, BrainCircuit, ExternalLink } from 'lucide-react';
import authService from '../../services/authService';
import aiApiService from '../../services/aiService';

const { Title, Paragraph, Text } = Typography;

const StudentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState(null);
  const [grade, setGrade] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const user = authService.getCurrentUser();

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // Lấy thông tin hồ sơ sinh viên (GPA thật)
      try {
        const profile = await aiApiService.getStudentProfile(user.id);
        setStudentProfile(profile);
      } catch (e) {
        console.warn('Không lấy được hồ sơ SV:', e);
      }

      const regData = await aiApiService.getMyRegistration(user.id);
      if (regData && regData.length > 0) {
          const activeReg = regData[0];
          setRegistration(activeReg);
          
          if (activeReg.TrangThai === 'DaDuyet') {
              const gradeData = await aiApiService.getDiemBySinhVien(user.id);
              if (gradeData && gradeData.length > 0) {
                  const topicGrade = gradeData.find(g => g.DeTai?._id === activeReg.DeTai?._id);
                  setGrade(topicGrade);
              }
          }
      }
    } catch (e) {
      console.error('Lỗi lấy data dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
      return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  const gpaValue = studentProfile?.GPA || 0;

  return (
    <div>
      <Title level={2}>Dashboard Sinh Viên</Title>
      
      <Alert
        message="Hệ Thống Đã Sẵn Sàng"
        description="Chào mừng bạn đến với mạng Web3 Hỗ trợ Đồ Án. Dữ liệu của bạn được đồng bộ trực tiếp với Blockchain Sepolia."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Row gutter={16}>
        <Col span={8}>
          <Card 
            title={<span><BookOpen size={18} style={{ marginRight: 8, color: '#1677ff' }} />Trạng Thái Đồ Án</span>}
            bordered={false}
          >
            <Statistic 
                title="Đề Tài Hiện Tại" 
                value={registration ? (registration.TrangThai === 'DaDuyet' ? 'Đã Nhận Đề Tài' : 'Chờ Duyệt') : "Chưa Đăng Ký Đề Tài"} 
                valueStyle={{ color: registration?.TrangThai === 'DaDuyet' ? '#52c41a' : '#faad14', fontSize: 18, fontWeight: 'bold' }} 
            />
            {registration && registration.DeTai && (
                <Paragraph style={{ marginTop: 12 }} ellipsis={{ rows: 2, tooltip: true }}>
                  <Text type="secondary">{registration.DeTai.TenDeTai}</Text>
                </Paragraph>
            )}
          </Card>
        </Col>

        <Col span={8}>
          <Card 
            title={<span><Award size={18} style={{ marginRight: 8, color: '#eb2f96' }} />Tiến Độ & Điểm</span>}
            bordered={false}
          >
            {grade ? (
                <div>
                   <Statistic title="Điểm Giảng Viên (On-chain)" value={grade.Diem} precision={1} suffix="/ 10" valueStyle={{ color: '#eb2f96', fontWeight: 'bold' }} />
                   
                   {grade.AI_Score != null && (
                     <div style={{ marginTop: 8 }}>
                       <Text type="secondary"><BrainCircuit size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Điểm AI gợi ý: </Text>
                       <Text strong style={{ color: '#1677ff' }}>{grade.AI_Score}/10</Text>
                     </div>
                   )}

                   {grade.NhanXet && (
                     <div style={{ marginTop: 8, padding: 8, background: '#f6ffed', borderRadius: 6, borderLeft: '3px solid #52c41a' }}>
                       <Text type="secondary" style={{ fontSize: 12 }}>Nhận xét GV: </Text>
                       <Text style={{ fontSize: 12 }}>{grade.NhanXet}</Text>
                     </div>
                   )}

                   {grade.TxHash && (
                     <div style={{ marginTop: 8 }}>
                       <Tooltip title={`Xem giao dịch trên Sepolia Etherscan: ${grade.TxHash}`}>
                         <Tag 
                           icon={<ShieldCheck size={12} style={{ marginRight: 4 }} />} 
                           color="green"
                           style={{ cursor: 'pointer', marginTop: 4 }}
                           onClick={() => {
                             if (grade.TxHash && !grade.TxHash.startsWith('0xMock')) {
                               window.open(`https://sepolia.etherscan.io/tx/${grade.TxHash}`, '_blank');
                             }
                           }}
                         >
                           Đã xác thực Blockchain {grade.TxHash.startsWith('0xMock') ? '(Mock)' : ''}
                           <ExternalLink size={10} style={{ marginLeft: 4 }} />
                         </Tag>
                       </Tooltip>
                     </div>
                   )}
                </div>
            ) : registration?.TrangThai === 'DaDuyet' ? (
                <div>
                  <Statistic title="Điểm Số On-chain" value="Chưa Tích Lũy" valueStyle={{ fontSize: 16, color: '#8c8c8c' }} />
                  <Paragraph style={{ marginTop: 8 }}><Text type="warning">Đang thực hiện đồ án</Text></Paragraph>
                </div>
            ) : (
                <Statistic title="Điểm Số On-chain" value="—" valueStyle={{ color: '#d9d9d9' }} />
            )}
          </Card>
        </Col>

        <Col span={8}>
          <Card 
            title={<span><Target size={18} style={{ marginRight: 8, color: '#722ed1' }} />Năng lực Kỹ Thuật</span>}
            bordered={false}
          >
            <Statistic 
              title="Trọng số Đầu Vào (GPA)" 
              value={gpaValue > 0 ? gpaValue : 'Chưa cập nhật'} 
              precision={gpaValue > 0 ? 1 : undefined}
              suffix={gpaValue > 0 ? "/ 10" : undefined}
              valueStyle={gpaValue > 0 ? {} : { fontSize: 16, color: '#8c8c8c' }}
            />
            {studentProfile?.KyNang && studentProfile.KyNang.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {studentProfile.KyNang.slice(0, 4).map((skill, i) => (
                  <Tag key={i} color="purple" style={{ marginBottom: 4 }}>{skill}</Tag>
                ))}
              </div>
            )}
            <Paragraph style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Hệ thống AI sẽ dùng điểm này để gợi ý đề tài Đồ Án phù hợp nhất.</Text>
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentDashboard;
