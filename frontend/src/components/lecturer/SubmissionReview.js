import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Badge, Drawer, Alert, Typography, InputNumber, Space, message, Tag, Steps, Spin, Skeleton, Empty, Tooltip, Descriptions, List, Divider, Input } from 'antd';
import { CheckSquare, ShieldCheck, BrainCircuit, ScanSearch, Fingerprint, ExternalLink, Download, Clock } from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';

const { Title, Text, Paragraph } = Typography;

const SubmissionReview = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [progressDrawerVisible, setProgressDrawerVisible] = useState(false);
  const [progressLogs, setProgressLogs] = useState([]);
  const [commentingId, setCommentingId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const viewProgress = async (record) => {
    setSelectedSubmission(record);
    setProgressDrawerVisible(true);
    setLoading(true);
    try {
      const svId = record.student._id;
      const res = await aiApiService.getProgressBySV(svId);
      // Lọc progress của riêng đề tài sinh viên đang đăng ký nếu cần
      setProgressLogs(res.data || []);
    } catch (e) {
      console.error(e);
      message.error("Lỗi lấy nhật ký tiến độ");
    } finally {
      setLoading(false);
    }
  };

  const handleCommentProgress = async (logId) => {
    try {
      setCommentingId(logId);
      await aiApiService.commentProgress(logId, commentText);
      message.success("Thêm nhận xét thành công");
      // Cập nhật lại logs
      setProgressLogs(prev => prev.map(log => log._id === logId ? { ...log, NhanXetGV: commentText } : log));
      setCommentText("");
    } catch (e) {
      message.error("Lỗi nhận xét tiến độ");
    } finally {
      setCommentingId(null);
    }
  };
  const [isMinting, setIsMinting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [existingGrade, setExistingGrade] = useState(null);
  const [score, setScore] = useState(0);

  // === RUBRICS STATE ===
  const [rubricsResult, setRubricsResult] = useState([]);  // Array: per-criteria results
  const [gvRubricsScores, setGvRubricsScores] = useState([]); // GV overrides for each criteria

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

  // Tính tổng điểm từ GV scores theo trọng số
  const calcWeightedScore = (scores) => {
    if (!scores || scores.length === 0) return 0;
    let total = 0;
    for (const s of scores) {
      if (s.DiemToiDa > 0) {
        total += (s.GV_DiemTieuChi / s.DiemToiDa) * s.TrongSo;
      }
    }
    return Math.round(total / 10 * 100) / 100; // on scale 10
  };

  const viewDetails = async (record) => {
    setSelectedSubmission(record);
    setDrawerVisible(true);
    setAiAnalysis(null);
    setScore(0);
    setExistingGrade(null);
    setRubricsResult([]);
    setGvRubricsScores([]);

    // Nếu đã chấm điểm rồi, lấy thông tin điểm đã lưu
    if (record.status === 'DaCham' && record.grade) {
      setExistingGrade(record.grade);
      setScore(record.grade.Diem || 0);
      if (record.grade.RubricsResult && record.grade.RubricsResult.length > 0) {
        setRubricsResult(record.grade.RubricsResult);
        setGvRubricsScores(record.grade.RubricsResult);
      }
    }

    if (record.submission) {
      const topic = record.topic;
      const hasSuDungRubrics = topic?.SuDungRubrics && topic?.Rubrics && topic.Rubrics.length > 0;

      setAnalyzing(true);
      try {
        if (hasSuDungRubrics) {
          // === RUBRICS MODE: gọi analyze-with-rubrics ===
          const textForAI = `Báo cáo Đồ án: ${topic?.TenDeTai || ''}. ${topic?.MoTa || ''}. Sinh viên sử dụng các công nghệ: ${(topic?.YeuCau || []).join(', ')}.`;
          const aiResult = await aiApiService.analyzeReportWithRubrics(textForAI, topic.Rubrics);

          setAiAnalysis({
            score: aiResult.score,
            feedback: aiResult.feedback,
            model: aiResult.model || 'vinai/phobert-base',
            chunks_info: aiResult.chunks_info || [],
          });
          setRubricsResult(aiResult.rubrics_result || []);
          // Init GV scores from AI suggestions
          setGvRubricsScores((aiResult.rubrics_result || []).map(r => ({
            ...r,
            GV_DiemTieuChi: r.AI_DiemTieuChi,
          })));
          // Calculate initial weighted score
          const initScore = calcWeightedScore((aiResult.rubrics_result || []).map(r => ({
            ...r,
            GV_DiemTieuChi: r.AI_DiemTieuChi,
          })));
          setScore(initScore);
        } else {
          // === LEGACY MODE: chấm tự do ===
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
        }
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
        aiFeedback: aiAnalysis?.feedback || "",
        rubricsResult: gvRubricsScores.length > 0 ? gvRubricsScores : undefined,
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
      title: 'Điểm Số',
      key: 'scoreDetail',
      render: (_, record) => {
        if (record.status !== 'DaCham' || !record.grade) return <Text type="secondary">—</Text>;
        const gvScore = record.grade.Diem;
        const aiScore = record.grade.AI_Score;
        if (aiScore != null) {
          const diff = gvScore - aiScore;
          return (
            <Space direction="vertical" size={0}>
              <Text strong style={{ color: '#eb2f96' }}>GV: {gvScore}</Text>
              <Space size={4}>
                <Text type="secondary" style={{ fontSize: 12 }}>AI: {aiScore}</Text>
                {Math.abs(diff) < 0.1 ? (
                  <Tag color="green" style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>Khớp</Tag>
                ) : (
                  <Tag color={diff > 0 ? 'blue' : 'warning'} style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                    {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                  </Tag>
                )}
              </Space>
            </Space>
          );
        }
        return <Text strong style={{ color: '#eb2f96', fontSize: 16 }}>{gvScore}</Text>;
      },
    },
    {
      title: 'Thao Tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="default" icon={<Clock size={16} />} onClick={() => viewProgress(record)}>
            Tiến Độ
          </Button>
          {record.status === 'DaCham' ? (
            <Button type="default" icon={<ShieldCheck size={16} />} onClick={() => viewDetails(record)}>
              Xem Điểm & Review
            </Button>
          ) : record.submission ? (
            <Button type="primary" icon={<ScanSearch size={16} />} onClick={() => viewDetails(record)}>
              Chấm Điểm & Review
            </Button>
          ) : (
            <Tag color="default">Chờ SV nộp bài</Tag>
          )}
        </Space>
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

            {/* Nút Download / Xem file IPFS */}
            {selectedSubmission.submission?.IPFS_CID && (
              <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 8, border: '1px solid #91d5ff' }}>
                <Space>
                  <Button
                    type="primary"
                    icon={<Download size={16} />}
                    href={`https://gateway.pinata.cloud/ipfs/${selectedSubmission.submission.IPFS_CID}`}
                    target="_blank"
                  >
                    Tải xuống báo cáo (IPFS)
                  </Button>
                  <Tag color="cyan">CID: {selectedSubmission.submission.IPFS_CID.substring(0, 16)}...</Tag>
                </Space>
              </div>
            )}

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

            {/* === RUBRICS CHI TIẾT (nếu đề tài có Rubrics) === */}
            {rubricsResult.length > 0 && (
              <div style={{ padding: 16, background: '#faf0ff', borderRadius: 8, marginBottom: 24, borderLeft: '4px solid #722ed1' }}>
                <Space style={{ marginBottom: 12 }}>
                  <Text strong style={{ color: '#722ed1', fontSize: 15 }}>📋 Chấm Điểm Theo Rubrics ({rubricsResult.length} tiêu chí)</Text>
                </Space>

                {gvRubricsScores.map((criteria, idx) => (
                  <div key={idx} style={{
                    padding: 12, marginBottom: 8, background: '#fff', borderRadius: 6,
                    border: '1px solid #d3adf7'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Space>
                        <Text strong>{criteria.TenTieuChi}</Text>
                        <Tag color="blue">{criteria.TrongSo}%</Tag>
                      </Space>
                      <Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>AI: {criteria.AI_DiemTieuChi}</Text>
                        <Text strong>/</Text>
                        <InputNumber
                          min={0}
                          max={criteria.DiemToiDa || 10}
                          step={0.5}
                          size="small"
                          value={criteria.GV_DiemTieuChi}
                          style={{ width: 70 }}
                          disabled={selectedSubmission?.status === 'DaCham'}
                          onChange={v => {
                            const updated = [...gvRubricsScores];
                            updated[idx] = { ...updated[idx], GV_DiemTieuChi: v || 0 };
                            setGvRubricsScores(updated);
                            setScore(calcWeightedScore(updated));
                          }}
                        />
                        <Text type="secondary">/ {criteria.DiemToiDa || 10}</Text>
                      </Space>
                    </div>

                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                      {criteria.AI_NhanXetTieuChi}
                    </Text>

                    {criteria.MatchedChunk && (
                      <Tag color="purple" style={{ marginTop: 4, fontSize: 10 }}>
                        Matched: {criteria.MatchedChunk.heading}
                      </Tag>
                    )}
                  </div>
                ))}

                <div style={{ textAlign: 'right', marginTop: 8, padding: 8, background: '#f0e6ff', borderRadius: 6 }}>
                  <Text strong style={{ color: '#722ed1', fontSize: 14 }}>
                    Tổng điểm (trọng số): {score} / 10
                  </Text>
                </div>
              </div>
            )}

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
                                  <Space>
                                    <Text style={{ color: '#1677ff' }}>{selectedSubmission.grade.AI_Score}</Text>
                                    {selectedSubmission.grade?.Diem !== undefined && selectedSubmission.grade.AI_Score !== undefined && (
                                      (() => {
                                        const diff = selectedSubmission.grade.Diem - selectedSubmission.grade.AI_Score;
                                        if (Math.abs(diff) < 0.1) return <Tag color="green">Khớp gợi ý AI</Tag>;
                                        return <Tag color={diff > 0 ? 'blue' : 'warning'}>{diff > 0 ? '+' : ''}{diff.toFixed(1)} so với AI</Tag>;
                                      })()
                                    )}
                                  </Space>
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

      {/* Drawer xem Tiến Độ */}
      <Drawer
        title={`Tiến độ của sinh viên: ${selectedSubmission?.student?.HoTen || 'N/A'}`}
        width={550}
        placement="right"
        onClose={() => setProgressDrawerVisible(false)}
        open={progressDrawerVisible}
      >
        <List
          loading={loading}
          itemLayout="vertical"
          dataSource={progressLogs}
          locale={{ emptyText: 'Chưa có nhật ký tiến độ nào.' }}
          renderItem={item => (
            <div style={{ marginBottom: 16, padding: '16px', border: '1px solid #e8e8e8', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <Tag color="cyan">{item.LoaiCapNhat}</Tag>
                  <Tag color={item.PhanTramHoanThanh === 100 ? 'success' : 'processing'}>
                    {item.PhanTramHoanThanh}% Hoàn thành
                  </Tag>
                </div>
                <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={14} /> {new Date(item.createdAt).toLocaleString('vi-VN')}
                </Text>
              </div>

              <Paragraph style={{ fontSize: 15 }}>{item.NoiDung}</Paragraph>

              {item.FileDinhKem && (
                <Paragraph>Link đính kèm: <a href={item.FileDinhKem} target="_blank" rel="noreferrer">Xem file</a></Paragraph>
              )}

              <Divider style={{ margin: '12px 0' }} />

              {item.NhanXetGV ? (
                <div style={{ padding: 8, background: '#f6ffed', borderRadius: 4 }}>
                  <Text strong style={{ color: '#389e0d' }}>Đã nhận xét: </Text>
                  <Text>{item.NhanXetGV}</Text>
                </div>
              ) : (
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="Nhập nhận xét..."
                    onChange={e => setCommentText(e.target.value)}
                  />
                  <Button
                    type="primary"
                    onClick={() => handleCommentProgress(item._id)}
                    loading={commentingId === item._id}
                  >
                    Gửi
                  </Button>
                </Space.Compact>
              )}
            </div>
          )}
        />
      </Drawer>
    </div>
  );
};

export default SubmissionReview;
