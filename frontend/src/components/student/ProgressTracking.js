import React, { useState, useEffect } from 'react';
import { Steps, Typography, Card, Alert, Progress as AntProgress, Row, Col, Divider, Skeleton, Tag, Space } from 'antd';
import { CheckCircle, Clock, Search, BookOpen, BrainCircuit } from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';
import { useIsMobile } from '../../hooks/useResponsive';

const { Title, Paragraph, Text } = Typography;

const ProgressTracking = () => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [finalGrade, setFinalGrade] = useState(null);
  const [latestProgress, setLatestProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const user = authService.getCurrentUser();
      if (!user) return;

      try {
        // Lấy thông tin đăng ký đề tài
        const regRes = await aiApiService.getMyRegistration(user.id);
        const activeReg = regRes.registration;
        setRegistration(activeReg);

        // Lấy điểm nhận xét cuối cùng từ GV
        try {
          if (activeReg?.TrangThai === 'DaDuyet') {
            const diemRes = await aiApiService.getDiemBySinhVien(user.id);
            if (diemRes && diemRes.length > 0) {
              // Tìm điểm của đề tài đang đăng ký
              const topicGrade = diemRes.find(g => g.DeTai?._id === activeReg.DeTai?._id);
              if (topicGrade) {
                setFinalGrade(topicGrade);
              }
            }
          }
        } catch (e) {
          console.warn('Lỗi lấy điểm sinh viên:', e);
        }

        // Lấy tiến độ tuần gần nhất
        if (activeReg?.TrangThai === 'DaDuyet') {
          try {
            setProgressLoading(true);
            const progressRes = await aiApiService.getProgressBySinhVien(user.id, activeReg.DeTai?._id);
            const logs = progressRes?.data || [];
            const latest = [...logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
            setLatestProgress(latest || null);
          } catch (err) {
            console.warn('Lỗi lấy tiến độ gần nhất:', err);
            setLatestProgress(null);
          } finally {
            setProgressLoading(false);
          }
        }

        // Nếu đề tài đã duyệt, KHÔNG gọi AI ngay mà phải chờ có bài nộp
        if (regRes.registration?.TrangThai === 'DaDuyet' && regRes.registration?.DeTai) {
          try {
            // Kiểm tra xem sinh viên đã nộp báo cáo chưa
            const bcRes = await aiApiService.getMyBaoCao(user.id);
            if (bcRes && bcRes.baocao) {
              setAiLoading(true);
              try {
                const topic = regRes.registration.DeTai;
                // Nếu đã nộp, tạo text phân tích nội dung
                const demoText = `Báo cáo: ${bcRes.baocao.TieuDe}. Đề tài đồ án: ${topic.TenDeTai}. Báo cáo hoàn chỉnh.`;

                const aiRes = await aiApiService.analyzeReportAI(demoText, topic.YeuCau || []);
                setAiResult(aiRes);
              } catch (e) {
                console.warn('PhoBERT analysis failed:', e);
                setAiResult(null);
              } finally {
                setAiLoading(false);
              }
            }
          } catch (err) {
            console.warn('Lỗi kiểm tra báo cáo:', err);
          }
        }
      } catch (e) {
        console.error('Error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Tính step hiện tại dựa trên trạng thái thực
  const getCurrentStep = () => {
    if (!registration) return 0;
    if (registration.TrangThai === 'ChoDuyet') return 0;
    if (registration.TrangThai === 'DaDuyet') {
      if (finalGrade?.TxHash) return 4; // Lưu Blockchain thành công
      if (finalGrade) return 3; // GV đã chấm
      if (aiResult) return 2; // AI đã phân tích
      return 1; // Đã duyệt, chờ nộp/AI
    }
    return 0;
  };

  const topicName = registration?.DeTai?.TenDeTai || '';
  const topicRequires = registration?.DeTai?.YeuCau || [];
  const regStatus = registration?.TrangThai;

  if (loading) {
    return (
      <div style={{ maxWidth: isMobile ? '100%' : 1000, margin: '0 auto', padding: isMobile ? '0 12px' : 0 }}>
        <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: isMobile ? '100%' : 1000, margin: '0 auto', padding: isMobile ? '0 12px' : 0 }}>
      <Typography>
        <Title level={2}>Tiến Độ Xét Duyệt</Title>
        <Paragraph>
          Theo dõi toàn bộ quá trình Đồ án của bạn từ lúc đăng ký cho đến khi điểm được xác thực trên Blockchain.
        </Paragraph>
      </Typography>

      {/* Thông tin đề tài */}
      {registration && (
        <Card style={{ marginBottom: 16, borderLeft: regStatus === 'DaDuyet' ? '4px solid #52c41a' : '4px solid #1677ff' }}>
          <Space>
            <BookOpen size={18} />
            <Text strong>Đề tài: {topicName}</Text>
            <Tag color={regStatus === 'DaDuyet' ? 'success' : 'processing'}>
              {regStatus === 'DaDuyet' ? 'Đã Duyệt' : 'Chờ Duyệt'}
            </Tag>
          </Space>
          {topicRequires.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {topicRequires.map((t, i) => <Tag key={i} color="blue">{t}</Tag>)}
            </div>
          )}
        </Card>
      )}

      {!registration && (
        <Alert message="Bạn chưa đăng ký đề tài nào" description="Vui lòng đăng ký đề tài trước." type="warning" showIcon style={{ marginBottom: 16 }} />
      )}

      <Card bordered={false} style={{ marginTop: 8, borderRadius: 12 }}>
        <Steps
          direction={isMobile ? 'vertical' : 'horizontal'}
          current={getCurrentStep()}
          items={[
            {
              title: 'Đăng ký Đề tài',
              description: regStatus === 'DaDuyet' ? 'Đã phê duyệt' : (regStatus === 'ChoDuyet' ? 'Đang chờ duyệt' : 'Chưa đăng ký'),
              icon: <BookOpen size={24} />
            },
            {
              title: 'Nộp Báo cáo',
              description: regStatus === 'DaDuyet' ? 'Sẵn sàng nộp' : 'Chờ duyệt đề tài',
              icon: <CheckCircle size={24} />
            },
            {
              title: 'AI Phân Tích',
              description: aiResult ? `Điểm AI: ${aiResult.score}/10` : (aiLoading ? 'Đang gọi PhoBERT...' : 'Chờ nộp báo cáo'),
              icon: <BrainCircuit size={24} color={aiResult ? '#52c41a' : '#1677ff'} />
            },
            {
              title: 'GV Đánh Giá',
              description: finalGrade ? `Điểm: ${finalGrade.Diem}/10` : 'Chờ chấm điểm',
              icon: <Search size={24} color={finalGrade ? '#52c41a' : undefined} />
            },
            {
              title: 'Blockchain',
              description: finalGrade?.TxHash ? 'Ghi hệ thống hoàn tất' : 'Chờ xác thực',
              icon: <Clock size={24} color={finalGrade?.TxHash ? '#52c41a' : undefined} />
            },
          ]}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<span><BrainCircuit size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Đánh giá từ AI (PhoBERT - Local FastAPI Port 8001)</span>}
            bordered={false}
          >
            {aiLoading ? (
              <div>
                <Skeleton active paragraph={{ rows: 3 }} />
                <Text type="secondary">Đang truyền dữ liệu xuống Python ML Core...</Text>
              </div>
            ) : aiResult ? (
              <>
                <Alert
                  message={`Điểm AI PhoBERT: ${aiResult.score} / 10`}
                  description={
                    <div>
                      <Text>Phản hồi: {aiResult.feedback}</Text>
                      {aiResult.issues && aiResult.issues.length > 0 && (
                        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                          {aiResult.issues.map((iss, i) => (
                            <li key={i}><Text type="danger">{iss}</Text></li>
                          ))}
                        </ul>
                      )}
                    </div>
                  }
                  type={aiResult.score >= 7 ? "success" : aiResult.score >= 5 ? "info" : "warning"}
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <Tag color="cyan">Model: {aiResult.model || 'vinai/phobert-base'}</Tag>
                <Tag color="geekblue">Provider: {aiResult.aiProvider || 'local-fastapi'}</Tag>
              </>
            ) : (
              <Alert
                message={regStatus === 'DaDuyet' ? 'Chưa nộp báo cáo' : 'Chờ duyệt đề tài'}
                description={regStatus === 'DaDuyet'
                  ? 'Vui lòng nộp File Báo cáo PDF ở trang Nộp Báo Cáo. Sau khi nộp, PhoBERT AI sẽ tự động phân tích nội dung.'
                  : 'Đề tài cần được Giảng viên duyệt trước. Sau đó bạn nộp Báo cáo và AI sẽ chấm tự động.'
                }
                type="info"
                showIcon
              />
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card title="Tiến độ tuần gần nhất" bordered={false} style={{ height: '100%' }}>
            {progressLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : latestProgress ? (
              <div>
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Tag color="geekblue">Tuần {latestProgress.TuanSo || '—'}</Tag>
                  <Text strong>{latestProgress.PhanTramHoanThanh || 0}% hoàn thành</Text>
                  <Tag color={latestProgress.TrangThaiDanhGia === 'Dat' ? 'success' : latestProgress.TrangThaiDanhGia === 'CanBoSung' ? 'warning' : 'default'}>
                    {latestProgress.TrangThaiDanhGia || 'Chờ đánh giá'}
                  </Tag>
                  {latestProgress.DiemTienDo != null && (
                    <Text type="secondary">Điểm tuần: {latestProgress.DiemTienDo}</Text>
                  )}
                </Space>
              </div>
            ) : (
              <Alert
                message={regStatus === 'DaDuyet' ? 'Chưa có nhật ký tuần' : 'Chờ duyệt đề tài'}
                type="info"
                showIcon
              />
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card title="Khối Lập Phương Điểm" bordered={false} style={{ height: '100%', textAlign: 'center' }}>
            <AntProgress
              type="dashboard"
              percent={finalGrade ? Math.round(finalGrade.Diem * 10) : (aiResult ? Math.round(aiResult.score * 10) : 0)}
              format={() => finalGrade ? `${finalGrade.Diem}/10` : (aiResult ? `${aiResult.score}/10` : 'Chờ')}
              strokeColor={finalGrade ? '#1677ff' : (aiResult ? (aiResult.score >= 7 ? '#52c41a' : '#faad14') : { '0%': '#108ee9', '100%': '#87d068' })}
              size={180}
            />
            <Divider />
            <div style={{ minHeight: 60 }}>
              {finalGrade ? (
                <div style={{ textAlign: 'left' }}>
                  <Text strong style={{ display: 'block', color: '#1677ff' }}>Đánh giá Giảng Viên:</Text>
                  {finalGrade.NhanXet && <Text italic type="secondary">"{finalGrade.NhanXet}"</Text>}
                  {finalGrade.TxHash && (
                    <div style={{ marginTop: 8 }}>
                      <Tag color="green">Blockchain Confirmed</Tag>
                    </div>
                  )}
                </div>
              ) : (
                <Text type="secondary">
                  {aiResult ? 'Điểm dự đoán từ PhoBERT AI. GV chưa nhập điểm.' : 'Do Giảng Viên Quyết Định Cuối Cùng'}
                </Text>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProgressTracking;
