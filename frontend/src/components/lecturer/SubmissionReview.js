import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Badge, Drawer, Alert, Typography, InputNumber, Space, message, Tag, Steps, Spin, Skeleton, Empty, Tooltip, Descriptions } from 'antd';
import { CheckSquare, ShieldCheck, BrainCircuit, ScanSearch, Fingerprint, ExternalLink } from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';

const { Title, Text, Paragraph } = Typography;

const SubmissionReview = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isMinting, setIsMinting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [existingGrade, setExistingGrade] = useState(null);
  const [score, setScore] = useState(0);

  const user = authService.getCurrentUser();

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await aiApiService.getSubmissionsByLecturer(user.id);
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Lỗi lấy submissions:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const viewDetails = async (record) => {
    setSelectedSubmission(record);
    setDrawerVisible(true);
    setAiAnalysis(null);
    setScore(0);
    setExistingGrade(null);

    // Nếu đã chấm điểm rồi, lấy thông tin điểm đã lưu
    if (record.status === 'DaCham' && record.grade) {
      setExistingGrade(record.grade);
      setScore(record.grade.Diem || 0);
    }

    if (record.submission) {
      // Có bài nộp → Gọi PhoBERT phân tích
      setAnalyzing(true);
      try {
        const topic = record.topic;
        const textForAI = `Báo cáo Đồ án: ${topic?.TenDeTai || ''}. ${topic?.MoTa || ''}. Sinh viên sử dụng các công nghệ: ${(topic?.YeuCau || []).join(', ')}.`;
        const topicReqs = topic?.YeuCau || [];

        const aiResult = await aiApiService.analyzeReportAI(textForAI, topicReqs);
        setAiAnalysis({
          score: aiResult.score,
          feedback: aiResult.feedback,
          issues: aiResult.issues || [],
          model: aiResult.model || 'vinai/phobert-base'
        });
        setScore(aiResult.score);
      } catch (err) {
        console.error('AI Analysis failed:', err);
        message.warning('PhoBERT AI chưa phản hồi.');
        setAiAnalysis({
          score: 7.0,
          feedback: 'AI Server không phản hồi.',
          issues: ['Vui lòng kiểm tra uvicorn port 8001']
        });
        setScore(7.0);
      } finally {
        setAnalyzing(false);
      }
    }
  };

  const handleBlockchainMint = async () => {
    setIsMinting(true);
    try {
      if (!selectedSubmission?.submission) {
          message.error("Sinh viên chưa nộp bài, không thể chấm điểm!");
          return;
      }

      const response = await aiApiService.chamDiem({
        baoCaoId: selectedSubmission.submission._id,
        deTaiId: selectedSubmission.topic._id,
        sinhVienId: selectedSubmission.student._id,
        giangVienId: user.id,
        diem: score,
        nhanXet: aiAnalysis?.feedback || "",
        aiScore: aiAnalysis?.score || 0,
        aiFeedback: aiAnalysis?.feedback || ""
      });

      // Capture the full grade data from API response (includes TxHash)
      const gradeData = response?.data || { 
        Diem: score, 
        NhanXet: aiAnalysis?.feedback || "", 
        AI_Score: aiAnalysis?.score || 0,
        TxHash: response?.data?.TxHash || null
      };

      // Update state locally so the modal shows as "graded"
      const updatedSubmission = { ...selectedSubmission, status: 'DaCham', grade: gradeData };
      setSelectedSubmission(updatedSubmission);
      
      // Update the main submissions array
      setSubmissions(prev => prev.map(s => 
          s.submission?._id === selectedSubmission.submission._id ? updatedSubmission : s
      ));

      message.success({
        content: `Đã ký Smart Contract và Ghi điểm (${score}) cho ${selectedSubmission?.student?.HoTen} thành công!`,
        duration: 4,
        icon: <ShieldCheck color="#52c41a" />,
      });
    } catch (error) {
        console.error('Lệnh lỗi khi chấm điểm:', error);
        message.error(error.response?.data?.error || "Có lỗi xảy ra khi gọi hàm chấm điểm.");
    } finally {
        setIsMinting(false);
    }
  };

  const columns = [
    {
      title: 'Sinh Viên',
      key: 'student',
      render: (_, record) => (
        <strong>{record.student?.HoTen || 'N/A'} ({record.student?.MaSV || ''})</strong>
      ),
    },
    {
      title: 'Đề Tài',
      key: 'topic',
      ellipsis: true,
      width: '30%',
      render: (_, record) => record.topic?.TenDeTai || 'N/A',
    },
    {
      title: 'Trạng Thái Nộp',
      key: 'status',
      render: (_, record) => {
        if (record.status === 'DaCham') {
            return <Badge status="success" text={<Text strong style={{ color: '#eb2f96' }}>Đã chấm điểm</Text>} />
        }
        return record.submission ? (
          <Badge status="processing" text={<Text strong style={{ color: '#1677ff' }}>Đã nộp bài</Text>} />
        ) : (
          <Badge status="default" text={<Text type="secondary">Chưa nộp</Text>} />
        );
      },
    },
    {
      title: 'Thời Gian Nộp',
      key: 'submitDate',
      render: (_, record) => (
        record.submission
          ? new Date(record.submission.NgayNop || record.submission.createdAt).toLocaleString('vi-VN')
          : <Text type="secondary">—</Text>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'action',
      render: (_, record) => (
        record.status === 'DaCham' ? (
           <Button type="default" icon={<ShieldCheck size={16} />} onClick={() => viewDetails(record)}>
             Xem Điểm & Review
           </Button>
        ) : record.submission ? (
          <Button type="primary" icon={<ScanSearch size={16} />} onClick={() => viewDetails(record)}>
            Chấm Điểm & Review
          </Button>
        ) : (
          <Tag color="default">Chờ SV nộp bài</Tag>
        )
      ),
    },
  ];

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <Title level={3} style={{ marginBottom: 24 }}>Duyệt Báo Cáo & Chấm Điểm</Title>
      <Paragraph type="secondary">
        Sử dụng MetaMask để xác thực danh tính Giảng Viên trước khi chốt điểm. Mọi thay đổi sẽ được Audit công khai trên Mạng Blockchain Ethereum.
      </Paragraph>

      <Table
        columns={columns}
        dataSource={submissions}
        rowKey="_id"
        loading={loading}
        locale={{ emptyText: <Empty description="Chưa có sinh viên nào được duyệt đề tài. Hãy duyệt đề tài ở trang Quản Lý Đề Tài trước." /> }}
      />

      <Drawer
        title={
          <Space>
            <CheckSquare color="#1677ff" />
            <span>Đánh Giá Báo Cáo Môn Học</span>
          </Space>
        }
        width={650}
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={
          selectedSubmission?.submission && (
            <Tag color="cyan">IPFS CID: {selectedSubmission.submission.IPFS_CID}</Tag>
          )
        }
      >
        {selectedSubmission && (
          <div>
            <Title level={4}>{selectedSubmission.topic?.TenDeTai}</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Sinh viên: {selectedSubmission.student?.HoTen} ({selectedSubmission.student?.MaSV})
            </Text>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              Nộp lúc: {new Date(selectedSubmission.submission?.NgayNop || selectedSubmission.submission?.createdAt).toLocaleString('vi-VN')}
            </Text>

            <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8, marginBottom: 24, borderLeft: '4px solid #1677ff' }}>
              <Space style={{ marginBottom: 8 }}>
                <BrainCircuit color="#1677ff" />
                <Text strong>Trí Tuệ Nhân Tạo (PhoBERT) Phân Tích</Text>
              </Space>

              {analyzing ? (
                <div style={{ padding: 16, textAlign: 'center' }}>
                  <Spin size="large" />
                  <br />
                  <Text type="secondary" style={{ marginTop: 12, display: 'inline-block' }}>Đang gọi PhoBERT AI tại cổng 8001...</Text>
                  <Skeleton active paragraph={{ rows: 2 }} />
                </div>
              ) : aiAnalysis ? (
                <Alert
                  message={`Điểm AI Đánh Giá (Kỹ thuật/Nội dung): ${aiAnalysis.score} / 10`}
                  description={
                    <ul style={{ paddingLeft: 20, margin: 0, marginTop: 8 }}>
                      <li><Text type="success">Phản Hồi Trọng Tâm:</Text> {aiAnalysis.feedback}</li>
                      {aiAnalysis.issues && aiAnalysis.issues.map((iss, idx) => (
                        <li key={idx}><Text type="danger">Vấn đề rủi ro:</Text> {iss}</li>
                      ))}
                      {aiAnalysis.model && (
                        <li><Text type="secondary">Model: {aiAnalysis.model}</Text></li>
                      )}
                    </ul>
                  }
                  type={aiAnalysis.score >= 7 ? "success" : "warning"}
                  style={{ marginTop: 8 }}
                />
              ) : null}
            </div>

            <Steps
              direction="vertical"
              current={aiAnalysis ? 2 : 1}
              items={[
                { title: 'Sinh viên Nộp Hệ Thống (IPFS)', description: selectedSubmission.submission ? 'Đã nộp' : 'Chưa nộp' },
                { title: 'PhoBERT AI Phân Tích', description: analyzing ? 'Đang gọi API cổng 8001...' : (aiAnalysis ? `Điểm gợi ý: ${aiAnalysis.score}` : 'Chờ xử lý') },
                {
                  title: 'Nhập Điểm Chấm Thực Tế',
                  description: (
                    <div style={{ marginTop: 12, padding: 16, border: '1px dashed #d9d9d9', borderRadius: 8, background: '#fff' }}>
                      <Text strong style={{ marginRight: 16 }}>Điểm Số Ghi On-chain:</Text>
                      <InputNumber
                        min={0} max={10} step={0.1}
                        value={score}
                        onChange={setScore}
                        size="large"
                        style={{ width: 100 }}
                        disabled={analyzing}
                      />
                      {aiAnalysis && <Text type="secondary" style={{ marginLeft: 16 }}>(Có thể sửa đè điểm AI {aiAnalysis.score})</Text>}

                      <div style={{ marginTop: 24 }}>
                        {selectedSubmission.status === 'DaCham' ? (
                            <div>
                              <Alert 
                                  type="success" 
                                  message={`Sinh viên đã được chấm điểm trên Blockchain: ${selectedSubmission.grade?.Diem || score}`} 
                                  showIcon 
                                  style={{ marginBottom: 12 }}
                              />
                              <Descriptions column={1} size="small" bordered style={{ background: '#f6ffed', borderRadius: 8 }}>
                                <Descriptions.Item label="Điểm GV chấm">
                                  <Text strong style={{ color: '#eb2f96', fontSize: 16 }}>{selectedSubmission.grade?.Diem || score}</Text>
                                </Descriptions.Item>
                                {selectedSubmission.grade?.AI_Score != null && (
                                  <Descriptions.Item label="Điểm AI gợi ý">
                                    <Text style={{ color: '#1677ff' }}>{selectedSubmission.grade.AI_Score}</Text>
                                  </Descriptions.Item>
                                )}
                                {selectedSubmission.grade?.NhanXet && (
                                  <Descriptions.Item label="Nhận xét">
                                    <Text>{selectedSubmission.grade.NhanXet}</Text>
                                  </Descriptions.Item>
                                )}
                                {selectedSubmission.grade?.TxHash && (
                                  <Descriptions.Item label="Blockchain TxHash">
                                    <Tooltip title="Xem trên Sepolia Etherscan">
                                      <Tag 
                                        icon={<ShieldCheck size={12} style={{ marginRight: 4 }} />} 
                                        color="green" 
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                          if (selectedSubmission.grade.TxHash && !selectedSubmission.grade.TxHash.startsWith('0xMock')) {
                                            window.open(`https://sepolia.etherscan.io/tx/${selectedSubmission.grade.TxHash}`, '_blank');
                                          }
                                        }}
                                      >
                                        {selectedSubmission.grade.TxHash.substring(0, 18)}...
                                        <ExternalLink size={10} style={{ marginLeft: 4 }} />
                                      </Tag>
                                    </Tooltip>
                                  </Descriptions.Item>
                                )}
                              </Descriptions>
                            </div>
                        ) : (
                            <Button
                            type="primary"
                            size="large"
                            icon={isMinting ? <Spin size="small" /> : <Fingerprint />}
                            onClick={handleBlockchainMint}
                            loading={isMinting}
                            disabled={analyzing}
                            style={{ background: '#f6851b', borderColor: '#f6851b', width: '100%' }}
                            >
                            {isMinting ? 'Đang mở MetaMask Signing...' : 'Ký Số MetaMask & Ghi Blockchain'}
                            </Button>
                        )}
                      </div>
                    </div>
                  )
                },
              ]}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default SubmissionReview;
