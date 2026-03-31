import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Tag, Badge, message, Row, Col, Modal, Skeleton, Alert } from 'antd';
import { CheckCircle, Code, Zap, Lock } from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';

const { Title, Paragraph, Text } = Typography;

const TopicRegistration = () => {
  const [loadingId, setLoadingId] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeredTopicId, setRegisteredTopicId] = useState(null); // ID đề tài đã đăng ký
  const [registrationStatus, setRegistrationStatus] = useState(null); // 'ChoDuyet' | 'DaDuyet' | 'TuChoi'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const user = authService.getCurrentUser();
        if (!user) return;

        // 1. Kiểm tra SV đã đăng ký đề tài nào chưa
        const regRes = await aiApiService.getMyRegistration(user.id);
        if (regRes.registration) {
          setRegisteredTopicId(regRes.registration.DeTai?._id || regRes.registration.DeTai);
          setRegistrationStatus(regRes.registration.TrangThai);
        }

        // 2. Lấy danh sách đề tài từ DB
        const dbRes = await aiApiService.getTopics();
        const topicList = Array.isArray(dbRes) ? dbRes : (dbRes.data || []);

        if (topicList.length === 0) {
          setLoading(false);
          return;
        }

        // 3. Lấy profile SV thật từ DB
        let studentProfile = { chuyen_nganh: '', ky_nang: [] };
        try {
          const svProfile = await aiApiService.getStudentProfile(user.id);
          studentProfile = {
            chuyen_nganh: svProfile.ChuyenNganh || '',
            ky_nang: svProfile.KyNang || [],
            gpa: svProfile.GPA || 0
          };
        } catch (e) {
          console.warn('Không lấy được profile SV, dùng default');
        }

        // 4. Gọi SBERT matching với profile thật
        let enriched = topicList.map(t => ({ ...t, ai_score: '0.0', isRecommended: false }));

        try {
          const matchRes = await aiApiService.matchTopicsAI(studentProfile, topicList);
          if (matchRes.status === "success" && matchRes.recommendations) {
            const recs = matchRes.recommendations;
            enriched = topicList.map(t => {
              const rec = recs.find(r => r.topicId === (t._id || '').toString());
              const score = rec ? rec.matchScore : 0;
              return {
                ...t,
                ai_score: (score * 10).toFixed(1),
                isRecommended: score > 0.3
              };
            });
          }
        } catch (e) {
          console.warn('SBERT matching failed, hiển thị không có điểm AI');
        }

        setTopics(enriched.sort((a, b) => parseFloat(b.ai_score) - parseFloat(a.ai_score)));
      } catch (error) {
        console.error("Lỗi lấy đề tài:", error);
        message.warning("Có lỗi khi tải dữ liệu đề tài.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRegister = (topic) => {
    const user = authService.getCurrentUser();
    if (!user) {
      message.error('Vui lòng đăng nhập lại.');
      return;
    }

    if (registeredTopicId) {
      message.warning('Bạn đã đăng ký một đề tài rồi. Không thể đăng ký thêm.');
      return;
    }

    Modal.confirm({
      title: 'Xác nhận Đăng ký Đề tài',
      content: `Bạn có chắc chắn muốn đăng ký đề tài "${topic.TenDeTai}"? Mỗi sinh viên chỉ được đăng ký 1 đề tài duy nhất.`,
      okText: 'Xác Nhận Đăng Ký',
      cancelText: 'Hủy',
      onOk: async () => {
        setLoadingId(topic._id);
        try {
          await aiApiService.registerTopic(topic._id, user.id);
          setRegisteredTopicId(topic._id);
          message.success('Đã gửi yêu cầu đăng ký đề tài thành công! Chờ Giảng viên duyệt.');
        } catch (err) {
          const errMsg = err.response?.data?.error || 'Đăng ký thất bại';
          message.error(errMsg);
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  const isRegistered = (topicId) => {
    return registeredTopicId && registeredTopicId.toString() === topicId.toString();
  };

  const hasAnyRegistration = !!registeredTopicId;

  return (
    <div>
      <Typography>
        <Title level={2}>Đăng Ký Đề Tài</Title>
        <Paragraph>
          Hệ thống AI NLP SBERT (Local FastAPI) phân tích hồ sơ chuyên môn của bạn để đối chiếu với yêu cầu kỹ thuật của từng Đề tài, từ đó xếp hạng Topic phù hợp nhất!
        </Paragraph>
      </Typography>

      {hasAnyRegistration && (
        <Alert
          message={registrationStatus === 'DaDuyet' ? 'Đề tài đã được Giảng viên Duyệt!' : 'Bạn đã đăng ký đề tài'}
          description={registrationStatus === 'DaDuyet'
            ? 'Giảng viên đã phê duyệt đề tài của bạn. Bạn có thể tiến hành Nộp Báo Cáo ở trang bên.'
            : 'Mỗi sinh viên chỉ được đăng ký 1 đề tài. Đề tài bạn chọn đang chờ Giảng viên duyệt.'
          }
          type={registrationStatus === 'DaDuyet' ? 'success' : 'info'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {loading ? (
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          {[1, 2, 3].map(i => (
            <Col xs={24} md={12} lg={8} key={i}>
              <Card><Skeleton active /></Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          {topics.map(topic => {
            const thisRegistered = isRegistered(topic._id);
            const disabled = hasAnyRegistration;

            const cardContent = (
              <Card
                title={<Text strong style={{ fontSize: 16, whiteSpace: 'normal' }}>{topic.TenDeTai}</Text>}
                hoverable={!disabled}
                actions={[
                  thisRegistered ? (
                    <Button
                      type="primary"
                      icon={<Lock size={16} />}
                      disabled
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: registrationStatus === 'DaDuyet' ? '#52c41a' : '#1677ff', borderColor: registrationStatus === 'DaDuyet' ? '#52c41a' : '#1677ff', color: '#fff', opacity: 0.8 }}
                    >
                      {registrationStatus === 'DaDuyet' ? 'Đã Được Duyệt' : 'Đã Đăng Ký (Chờ Duyệt)'}
                    </Button>
                  ) : (
                    <Button
                      type={topic.isRecommended ? 'primary' : 'default'}
                      icon={<CheckCircle size={16} />}
                      onClick={() => handleRegister(topic)}
                      loading={loadingId === topic._id}
                      disabled={disabled}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}
                    >
                      {disabled ? 'Không khả dụng' : 'Đăng Ký'}
                    </Button>
                  )
                ]}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: thisRegistered ? '2px solid #52c41a' : (topic.isRecommended ? '2px solid #1677ff' : '1px solid #f0f0f0'),
                  boxShadow: thisRegistered ? '0 4px 12px rgba(82, 196, 26, 0.2)' : (topic.isRecommended ? '0 4px 12px rgba(22, 119, 255, 0.15)' : 'none'),
                  opacity: (disabled && !thisRegistered) ? 0.6 : 1
                }}
                headStyle={{ minHeight: 80 }}
                bodyStyle={{ flexGrow: 1 }}
              >
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary">Mô tả cốt lõi:</Text>
                  <Paragraph ellipsis={{ rows: 2, expandable: false }} style={{ marginTop: 4, marginBottom: 12 }}>
                    {topic.MoTa}
                  </Paragraph>
                  <Text type="secondary">Yêu cầu công nghệ:</Text>
                  <div style={{ marginTop: 8 }}>
                    {topic.YeuCau && topic.YeuCau.map((tech, idx) => (
                      <Tag key={idx} icon={<Code size={12} />} style={{ marginBottom: 8 }}>
                        {tech}
                      </Tag>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                  <Text strong>
                    Độ Tương Thích (AI SBERT Match):
                    <Tag color={topic.isRecommended ? 'success' : 'warning'} style={{ marginLeft: 8 }}>
                      <Zap size={12} style={{ marginRight: 4 }} />
                      {topic.ai_score} / 10
                    </Tag>
                  </Text>
                </div>
              </Card>
            );

            return (
              <Col xs={24} md={12} lg={8} key={topic._id}>
                {topic.isRecommended && !thisRegistered ? (
                  <Badge.Ribbon text="AI Khuyên Chọn" color="blue">
                    {cardContent}
                  </Badge.Ribbon>
                ) : thisRegistered ? (
                  <Badge.Ribbon text="Đề Tài Của Bạn" color="green">
                    {cardContent}
                  </Badge.Ribbon>
                ) : cardContent}
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default TopicRegistration;
