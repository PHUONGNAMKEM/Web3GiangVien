import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Badge, Drawer, Alert, Typography, InputNumber, Space, message, Tag, Steps, Spin, Skeleton, Empty, Tooltip, Descriptions, List, Divider, Input, Modal, Select } from 'antd';
import { CheckSquare, ShieldCheck, BrainCircuit, ScanSearch, Fingerprint, ExternalLink, Download, Clock, RefreshCw } from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';

const { Title, Text, Paragraph } = Typography;

const WARNING_LABELS = {
  GIAM_PHAN_TRAM: 'Tiến độ giảm so với tuần trước',
  TANG_BAT_THUONG: 'Tiến độ tăng bất thường',
  KHONG_MINH_CHUNG_NHUNG_CAO: 'Không có minh chứng nhưng tiến độ cao',
  NOI_DUNG_NGAN: 'Nội dung đã làm còn ngắn',
  NOP_DON: 'Nộp quá nhiều lần trong thời gian ngắn',
  THIEU_KE_HOACH: 'Thiếu kế hoạch tuần sau'
};

const formatWarningLabel = (warning) => WARNING_LABELS[warning] || warning;

const getProgressStatusLabel = (status) => {
  const labels = {
    ChoDanhGia: 'Chờ đánh giá',
    Dat: 'Đạt',
    CanBoSung: 'Cần bổ sung',
    KhongDat: 'Không đạt'
  };
  return labels[status] || status;
};

const getSubmissionKey = (record) => record?._id || `${record?.student?._id || ''}-${record?.topic?._id || ''}`;

const countPendingProgress = (logs) => (
  Array.isArray(logs)
    ? logs.filter(item => !item.TrangThaiDanhGia || item.TrangThaiDanhGia === 'ChoDanhGia').length
    : 0
);

const getBlockchainStatusMeta = (status) => {
  const meta = {
    ChuaGhi: { label: 'Chưa ghi Blockchain', color: 'default', alertType: 'info' },
    Pending: { label: 'Đang ghi Blockchain', color: 'processing', alertType: 'info' },
    DaGhi: { label: 'Đã ghi Blockchain', color: 'success', alertType: 'success' },
    LoiGhi: { label: 'Lỗi ghi Blockchain', color: 'error', alertType: 'warning' }
  };
  return meta[status] || { label: status || 'Chưa rõ', color: 'default', alertType: 'info' };
};

const SubmissionReview = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [progressDrawerVisible, setProgressDrawerVisible] = useState(false);
  const [progressLogs, setProgressLogs] = useState([]);
  const [progressPendingMap, setProgressPendingMap] = useState({});
  const [progressSummary, setProgressSummary] = useState(null);
  const [commentingId, setCommentingId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [weeklyModalVisible, setWeeklyModalVisible] = useState(false);
  const [weeklyTarget, setWeeklyTarget] = useState(null);
  const [weeklyRubrics, setWeeklyRubrics] = useState([]);
  const [weeklyStatus, setWeeklyStatus] = useState('ChoDanhGia');
  const [weeklyComment, setWeeklyComment] = useState('');
  const [weeklyScore, setWeeklyScore] = useState(0);
  const [weeklyWarnings, setWeeklyWarnings] = useState([]);
  const [weeklySaving, setWeeklySaving] = useState(false);

  const viewProgress = async (record) => {
    setSelectedSubmission(record);
    setProgressDrawerVisible(true);
    setLoading(true);
    try {
      const svId = record.student._id;
      const res = await aiApiService.getProgressBySinhVien(svId, record.topic?._id);
      const logs = res.data || [];
      setProgressLogs(logs);
      setProgressSummary(buildProgressSummary(logs));
      setProgressPendingMap(prev => ({
        ...prev,
        [getSubmissionKey(record)]: countPendingProgress(logs)
      }));
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
      await aiApiService.commentProgress(logId, commentDrafts[logId] || '');
      message.success("Thêm nhận xét thành công");
      // Cập nhật lại logs
      setProgressLogs(prev => prev.map(log => log._id === logId ? { ...log, NhanXetGV: commentDrafts[logId] || '' } : log));
      setCommentDrafts(prev => ({ ...prev, [logId]: '' }));
    } catch (e) {
      message.error("Lỗi nhận xét tiến độ");
    } finally {
      setCommentingId(null);
    }
  };
  const [isMinting, setIsMinting] = useState(false);
  const [isRetryingBlockchain, setIsRetryingBlockchain] = useState(false);
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
      const nextSubmissions = Array.isArray(data) ? data : [];
      setSubmissions(nextSubmissions);

      const pendingEntries = await Promise.all(
        nextSubmissions.map(async (record) => {
          try {
            const res = await aiApiService.getProgressBySinhVien(record.student?._id, record.topic?._id);
            return [getSubmissionKey(record), countPendingProgress(res.data || [])];
          } catch (err) {
            console.warn('Không lấy được trạng thái tiến độ:', err);
            return [getSubmissionKey(record), 0];
          }
        })
      );
      setProgressPendingMap(Object.fromEntries(pendingEntries));
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
    setProgressSummary(null);

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

    try {
      const progressRes = await aiApiService.getProgressBySinhVien(record.student?._id, record.topic?._id);
      setProgressSummary(buildProgressSummary(progressRes.data || []));
    } catch (err) {
      console.error('Lỗi lấy tóm tắt tiến độ:', err);
    }
  };

  const handleBlockchainMint = async () => {
    setIsMinting(true);
    try {
      if (!selectedSubmission?.submission) {
        message.error("Sinh viên chưa nộp bài, không thể chấm điểm!");
        return;
      }

      const submissionIndex = Number.isFinite(Number(selectedSubmission.submission?.SubmissionIndex))
        ? Number(selectedSubmission.submission?.SubmissionIndex)
        : Number.isFinite(Number(selectedSubmission.submission?.submissionIndex))
          ? Number(selectedSubmission.submission?.submissionIndex)
          : null;

      const payload = {
        baoCaoId: selectedSubmission.submission._id,
        deTaiId: selectedSubmission.topic._id,
        sinhVienId: selectedSubmission.student._id,
        giangVienId: user.id,
        diem: score,
        nhanXet: aiAnalysis?.feedback || "",
        aiScore: aiAnalysis?.score || 0,
        aiFeedback: aiAnalysis?.feedback || "",
        rubricsResult: gvRubricsScores.length > 0 ? gvRubricsScores : undefined,
      };

      if (submissionIndex != null) {
        payload.submissionIndex = submissionIndex;
      }

      const response = await aiApiService.chamDiem(payload);

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

  const handleRetryBlockchain = async () => {
    const gradeId = selectedSubmission?.grade?._id;
    if (!gradeId) {
      message.error('Không tìm thấy bản ghi điểm để ghi lại Blockchain.');
      return;
    }

    try {
      setIsRetryingBlockchain(true);
      const response = await aiApiService.retryGradeBlockchain(gradeId, user.id);
      const updatedGrade = response.data || selectedSubmission.grade;
      const updatedSubmission = { ...selectedSubmission, grade: updatedGrade };
      setSelectedSubmission(updatedSubmission);
      setSubmissions(prev => prev.map(s =>
        s._id === selectedSubmission._id ? updatedSubmission : s
      ));
      message.success('Ghi lại Blockchain thành công');
    } catch (error) {
      const updatedGrade = error.response?.data?.data;
      if (updatedGrade) {
        const updatedSubmission = { ...selectedSubmission, grade: updatedGrade };
        setSelectedSubmission(updatedSubmission);
        setSubmissions(prev => prev.map(s =>
          s._id === selectedSubmission._id ? updatedSubmission : s
        ));
      }
      message.error(error.response?.data?.error || 'Ghi lại Blockchain thất bại');
    } finally {
      setIsRetryingBlockchain(false);
    }
  };

  const defaultWeeklyRubrics = [
    { MaTieuChi: 'DUNG_HAN', TenTieuChi: 'Đúng hạn và đầy đủ', TrongSo: 15, DiemToiDa: 10, DiemGV: 0 },
    { MaTieuChi: 'HOAN_THANH', TenTieuChi: 'Mức độ hoàn thành mục tiêu tuần', TrongSo: 30, DiemToiDa: 10, DiemGV: 0 },
    { MaTieuChi: 'CHAT_LUONG', TenTieuChi: 'Chất lượng nội dung và minh chứng', TrongSo: 25, DiemToiDa: 10, DiemGV: 0 },
    { MaTieuChi: 'KHO_KHAN', TenTieuChi: 'Xử lý khó khăn và tư duy phản hồi', TrongSo: 15, DiemToiDa: 10, DiemGV: 0 },
    { MaTieuChi: 'KE_HOACH', TenTieuChi: 'Kế hoạch tuần sau', TrongSo: 15, DiemToiDa: 10, DiemGV: 0 },
  ];

  const calcWeeklyScore = (rubrics) => {
    if (!rubrics || rubrics.length === 0) return 0;
    const total = rubrics.reduce((sum, item) => {
      const diemToiDa = item.DiemToiDa || 10;
      const diemGV = item.DiemGV || 0;
      return sum + (diemGV / diemToiDa) * (item.TrongSo || 0);
    }, 0);
    return Math.round((total / 100 * 10) * 100) / 100;
  };

  const buildProgressSummary = (logs) => {
    const validLogs = Array.isArray(logs) ? logs : [];
    const graded = validLogs.filter(item => item.TrangThaiDanhGia === 'Dat' && item.DiemTienDo != null);
    const avg = graded.length > 0
      ? Math.round((graded.reduce((sum, item) => sum + (item.DiemTienDo || 0), 0) / graded.length) * 100) / 100
      : null;
    const warnings = validLogs.flatMap(item => item.CanhBaoTienDo || []);
    return {
      totalWeeks: validLogs.filter(item => item.TuanSo != null).length,
      gradedWeeks: graded.length,
      averageScore: avg,
      warnings: Array.from(new Set(warnings))
    };
  };

  const openWeeklyEvaluation = async (log) => {
    setWeeklyTarget(log);
    setWeeklyStatus(log.TrangThaiDanhGia || 'ChoDanhGia');
    setWeeklyComment(log.NhanXetGV || '');
    setWeeklyWarnings(log.CanhBaoTienDo || []);
    setWeeklyModalVisible(true);

    try {
      const detail = await aiApiService.getProgressDetail(log._id);
      const detailData = detail.data || log;
      const rubrics = Array.isArray(detailData.RubricsTuan) && detailData.RubricsTuan.length > 0
        ? detailData.RubricsTuan.map(r => ({ ...r, DiemGV: r.DiemGV ?? 0 }))
        : defaultWeeklyRubrics;
      setWeeklyRubrics(rubrics);
      setWeeklyWarnings(detail.canhBao || detailData.CanhBaoTienDo || []);
      setWeeklyScore(calcWeeklyScore(rubrics));
    } catch (err) {
      console.error('Lỗi lấy chi tiết tiến độ:', err);
      setWeeklyRubrics(defaultWeeklyRubrics);
      setWeeklyScore(calcWeeklyScore(defaultWeeklyRubrics));
    }
  };

  const saveWeeklyEvaluation = async (useRubrics) => {
    if (!weeklyTarget) return;
    try {
      setWeeklySaving(true);
      const payload = {
        giangVienId: user.id,
        trangThaiDanhGia: weeklyStatus,
        nhanXetGV: weeklyComment
      };

      if (useRubrics) {
        payload.rubricsTuan = weeklyRubrics;
      }

      const response = await aiApiService.evaluateProgress(weeklyTarget._id, payload);
      const updated = response.data || weeklyTarget;
      setProgressLogs(prev => {
        const nextLogs = prev.map(item => item._id === weeklyTarget._id ? updated : item);
        setProgressSummary(buildProgressSummary(nextLogs));
        setProgressPendingMap(current => ({
          ...current,
          [getSubmissionKey(selectedSubmission)]: countPendingProgress(nextLogs)
        }));
        return nextLogs;
      });
      setWeeklyModalVisible(false);
      setWeeklyTarget(null);
      message.success('Lưu đánh giá tuần thành công');
    } catch (err) {
      message.error(err.response?.data?.error || 'Lỗi lưu đánh giá tuần');
    } finally {
      setWeeklySaving(false);
    }
  };

  const groupedProgressLogs = useMemo(() => {
    const weekly = [];
    const legacy = [];
    progressLogs.forEach(item => {
      if (Number.isFinite(Number(item.TuanSo))) {
        weekly.push(item);
      } else {
        legacy.push(item);
      }
    });

    weekly.sort((a, b) => (Number(a.TuanSo) || 0) - (Number(b.TuanSo) || 0));
    return { weekly, legacy };
  }, [progressLogs]);

  const columns = [
    {
      title: 'Sinh Viên',
      key: 'student',
      width: 180,
      render: (_, record) => (
        <strong>{record.student?.HoTen || 'N/A'} ({record.student?.MaSV || ''})</strong>
      ),
    },
    {
      title: 'Đề Tài',
      key: 'topic',
      ellipsis: true,
      width: 360,
      render: (_, record) => record.topic?.TenDeTai || 'N/A',
    },
    {
      title: 'Trạng Thái Nộp',
      key: 'status',
      width: 170,
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
      width: 160,
      render: (_, record) => (
        record.submission
          ? new Date(record.submission.NgayNop || record.submission.createdAt).toLocaleString('vi-VN')
          : <Text type="secondary">—</Text>
      ),
    },
    {
      title: 'Điểm Số',
      key: 'scoreDetail',
      width: 130,
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
      width: 260,
      render: (_, record) => {
        const hasPendingProgress = (progressPendingMap[getSubmissionKey(record)] || 0) > 0;

        return (
          <Space size={[8, 8]} wrap>
            <Tooltip title={hasPendingProgress ? 'Có tiến độ chưa đánh giá' : 'Xem tiến độ'}>
              <Badge dot={hasPendingProgress} offset={[-2, 2]}>
                <Button type="default" icon={<Clock size={16} />} onClick={() => viewProgress(record)}>
                  Tiến Độ
                </Button>
              </Badge>
            </Tooltip>
            {record.status === 'DaCham' ? (
              <Button type="default" icon={<ShieldCheck size={16} />} onClick={() => viewDetails(record)}>
                Xem Điểm & Review
              </Button>
            ) : record.submission ? (
              <Button type="primary" icon={<ScanSearch size={16} />} onClick={() => viewDetails(record)}>
                Chấm Điểm & Review
              </Button>
            ) : (
              <Tag color="default" style={{ margin: 0 }}>Chờ SV nộp bài</Tag>
            )}
          </Space>
        );
      },
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
        scroll={{ x: 1100 }}
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

            {progressSummary && (
              <div style={{ padding: 16, background: '#fff7e6', borderRadius: 8, marginBottom: 24, borderLeft: '4px solid #fa8c16' }}>
                <Space style={{ marginBottom: 8 }}>
                  <Text strong style={{ color: '#ad4e00', fontSize: 15 }}>Tóm tắt tiến độ tuần</Text>
                </Space>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <Text type="secondary">Tổng số tuần có nhật ký</Text>
                    <div><Text strong>{progressSummary.totalWeeks}</Text></div>
                  </div>
                  <div>
                    <Text type="secondary">Tuần đạt yêu cầu</Text>
                    <div><Text strong>{progressSummary.gradedWeeks}</Text></div>
                  </div>
                  <div>
                    <Text type="secondary">Điểm trung bình (tuần đạt)</Text>
                    <div><Text strong>{progressSummary.averageScore != null ? progressSummary.averageScore : '—'}</Text></div>
                  </div>
                </div>
                <Text type="secondary" italic style={{ display: 'block', marginTop: 12 }}>
                  Điểm quá trình chỉ mang tính tham khảo - KHÔNG tự cộng vào điểm cuối kỳ.
                </Text>
                {progressSummary.warnings?.length > 0 && (
                  <div style={{ marginTop: 12, padding: 10, background: '#fff1f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
                    <Text strong style={{ color: '#a8071a' }}>Cảnh báo tiến độ:</Text>
                    <ul style={{ margin: '6px 0 0 18px' }}>
                      {progressSummary.warnings.map((warn, idx) => (
                        <li key={idx}><Text>{formatWarningLabel(warn)}</Text></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

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
                        disabled={analyzing || selectedSubmission?.status === 'DaCham'}
                      />
                      {selectedSubmission?.status === 'DaCham'
                        ? <Text type="secondary" style={{ marginLeft: 16 }}>(Đã chấm — không thể thay đổi)</Text>
                        : aiAnalysis && <Text type="secondary" style={{ marginLeft: 16 }}>(Có thể sửa đè điểm AI {aiAnalysis.score})</Text>
                      }

                      <div style={{ marginTop: 24 }}>
                        {selectedSubmission.status === 'DaCham' ? (
                          (() => {
                            const blockchainMeta = getBlockchainStatusMeta(selectedSubmission.grade?.TrangThaiBlockchain);
                            return (
                          <div>
                            <Alert
                              type={blockchainMeta.alertType}
                              message={`Sinh viên đã được chấm điểm: ${selectedSubmission.grade?.Diem || score}`}
                              description={
                                <Space direction="vertical" size={4}>
                                  <Space size={8} wrap>
                                    <Text>Trạng thái Blockchain:</Text>
                                    <Tag color={blockchainMeta.color} style={{ margin: 0 }}>{blockchainMeta.label}</Tag>
                                  </Space>
                                  {selectedSubmission.grade?.TrangThaiBlockchain !== 'DaGhi' && (
                                    <Button
                                      size="small"
                                      icon={<RefreshCw size={14} />}
                                      onClick={handleRetryBlockchain}
                                      loading={isRetryingBlockchain}
                                    >
                                      Ghi lại Blockchain
                                    </Button>
                                  )}
                                  {selectedSubmission.grade?.LoiBlockchain && (
                                    <Text type="danger">Lỗi: {selectedSubmission.grade.LoiBlockchain}</Text>
                                  )}
                                </Space>
                              }
                              showIcon
                              style={{ marginBottom: 12 }}
                            />
                            <Descriptions column={1} size="small" bordered style={{ background: '#f6ffed', borderRadius: 8 }}>
                              <Descriptions.Item label="Điểm GV chấm">
                                <Text strong style={{ color: '#eb2f96', fontSize: 16 }}>{selectedSubmission.grade?.Diem || score}</Text>
                              </Descriptions.Item>
                              <Descriptions.Item label="Trạng thái Blockchain">
                                <Tag color={blockchainMeta.color} style={{ margin: 0 }}>{blockchainMeta.label}</Tag>
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
                            );
                          })()
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
        {loading ? (
          <List loading itemLayout="vertical" dataSource={[]} />
        ) : (
          <div>
            {groupedProgressLogs.weekly.length === 0 && groupedProgressLogs.legacy.length === 0 && (
              <Empty description="Chưa có nhật ký tiến độ nào." />
            )}

            {groupedProgressLogs.weekly.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <Title level={5} style={{ marginBottom: 12 }}>Tiến độ theo tuần</Title>
                {groupedProgressLogs.weekly.map(item => (
                  <div key={item._id} style={{ marginBottom: 16, padding: '16px', border: '1px solid #e8e8e8', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <Space size={[8, 6]} wrap>
                        <Tag color="geekblue">Tuần {item.TuanSo}</Tag>
                        {item.LanNopLai > 0 && <Tag color="orange">Nộp lại lần {item.LanNopLai}</Tag>}
                        <Tag color={item.TrangThaiDanhGia === 'Dat' ? 'success' : item.TrangThaiDanhGia === 'CanBoSung' ? 'warning' : 'default'}>
                          {getProgressStatusLabel(item.TrangThaiDanhGia) || 'Chờ đánh giá'}
                        </Tag>
                        {item.DiemTienDo != null && (
                          <Tag color="purple">Điểm tuần: {item.DiemTienDo}</Tag>
                        )}
                      </Space>
                      <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={14} /> {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </Text>
                    </div>

                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary">Thời gian tuần:</Text>{' '}
                      <Text>
                        {item.NgayBatDauTuan ? new Date(item.NgayBatDauTuan).toLocaleDateString('vi-VN') : '—'}
                        {' '}→{' '}
                        {item.NgayKetThucTuan ? new Date(item.NgayKetThucTuan).toLocaleDateString('vi-VN') : '—'}
                      </Text>
                    </div>
                    {item.MucTieuTuan && <Paragraph><Text strong>Mục tiêu tuần:</Text> {item.MucTieuTuan}</Paragraph>}
                    {item.NoiDungDaLam && <Paragraph><Text strong>Đã làm:</Text> {item.NoiDungDaLam}</Paragraph>}
                    {item.KhoKhan && <Paragraph><Text strong>Khó khăn:</Text> {item.KhoKhan}</Paragraph>}
                    {item.KeHoachTuanSau && <Paragraph><Text strong>Kế hoạch tuần sau:</Text> {item.KeHoachTuanSau}</Paragraph>}

                    {Array.isArray(item.MinhChung) && item.MinhChung.length > 0 && (
                      <Paragraph>
                        <Text strong>Minh chứng:</Text>{' '}
                        {item.MinhChung.map((mc, idx) => {
                          const url = typeof mc === 'string' ? mc : mc?.Url;
                          const label = typeof mc === 'string' ? `Link ${idx + 1}` : (mc?.TenFile || `Link ${idx + 1}`);
                          return (
                            <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>
                              {label}
                            </a>
                          );
                        })}
                      </Paragraph>
                    )}

                    {item.CanhBaoTienDo?.length > 0 && (
                      <div style={{ marginTop: 8, padding: 10, background: '#fff1f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
                        <Text strong style={{ color: '#a8071a' }}>Cảnh báo:</Text>
                        <ul style={{ margin: '6px 0 0 18px' }}>
                          {item.CanhBaoTienDo.map((warn, idx) => (
                            <li key={idx}><Text>{formatWarningLabel(warn)}</Text></li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Divider style={{ margin: '12px 0' }} />
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {item.NhanXetGV ? (
                        <div style={{ padding: 8, background: '#f6ffed', borderRadius: 4 }}>
                          <Text strong style={{ color: '#389e0d' }}>Nhận xét GV: </Text>
                          <Text>{item.NhanXetGV}</Text>
                        </div>
                      ) : (
                        <Text type="secondary">Chưa có nhận xét của giảng viên.</Text>
                      )}
                      <Button type="primary" onClick={() => openWeeklyEvaluation(item)}>Đánh Giá Tuần</Button>
                    </Space>
                  </div>
                ))}
              </div>
            )}

            {groupedProgressLogs.legacy.length > 0 && (
              <div>
                <Title level={5} style={{ marginBottom: 12 }}>Cập nhật khác</Title>
                {groupedProgressLogs.legacy.map(item => (
                  <div key={item._id} style={{ marginBottom: 16, padding: '16px', border: '1px solid #e8e8e8', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Space size={[8, 6]} wrap>
                        <Tag color="cyan">{item.LoaiCapNhat}</Tag>
                        <Tag color={item.PhanTramHoanThanh === 100 ? 'success' : 'processing'}>
                          {item.PhanTramHoanThanh}% Hoàn thành
                        </Tag>
                      </Space>
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
                          value={commentDrafts[item._id] || ''}
                          onChange={e => setCommentDrafts(prev => ({ ...prev, [item._id]: e.target.value }))}
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
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        title={`Đánh giá tuần ${weeklyTarget?.TuanSo || ''} - ${selectedSubmission?.student?.HoTen || ''}`}
        open={weeklyModalVisible}
        onCancel={() => setWeeklyModalVisible(false)}
        footer={[
          <Button key="quick" onClick={() => saveWeeklyEvaluation(false)} loading={weeklySaving}>
            Lưu nhanh
          </Button>,
          <Button key="rubrics" type="primary" onClick={() => saveWeeklyEvaluation(true)} loading={weeklySaving}>
            Lưu kèm Rubrics
          </Button>
        ]}
        width={700}
      >
        {weeklyTarget && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary">Thời gian tuần:</Text>{' '}
              <Text>
                {weeklyTarget.NgayBatDauTuan ? new Date(weeklyTarget.NgayBatDauTuan).toLocaleDateString('vi-VN') : '—'}
                {' '}→{' '}
                {weeklyTarget.NgayKetThucTuan ? new Date(weeklyTarget.NgayKetThucTuan).toLocaleDateString('vi-VN') : '—'}
              </Text>
            </div>
            {weeklyTarget.MucTieuTuan && <Paragraph><Text strong>Mục tiêu tuần:</Text> {weeklyTarget.MucTieuTuan}</Paragraph>}
            {weeklyTarget.NoiDungDaLam && <Paragraph><Text strong>Đã làm:</Text> {weeklyTarget.NoiDungDaLam}</Paragraph>}
            {weeklyTarget.KhoKhan && <Paragraph><Text strong>Khó khăn:</Text> {weeklyTarget.KhoKhan}</Paragraph>}
            {weeklyTarget.KeHoachTuanSau && <Paragraph><Text strong>Kế hoạch tuần sau:</Text> {weeklyTarget.KeHoachTuanSau}</Paragraph>}

            {weeklyWarnings?.length > 0 && (
              <div style={{ marginBottom: 12, padding: 10, background: '#fff1f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
                <Text strong style={{ color: '#a8071a' }}>Cảnh báo:</Text>
                <ul style={{ margin: '6px 0 0 18px' }}>
                  {weeklyWarnings.map((warn, idx) => (
                    <li key={idx}><Text>{formatWarningLabel(warn)}</Text></li>
                  ))}
                </ul>
              </div>
            )}

            <Divider style={{ margin: '12px 0' }} />
            <div style={{ marginBottom: 12 }}>
              <Text strong>Trạng thái đánh giá:</Text>
              <Select
                value={weeklyStatus}
                onChange={setWeeklyStatus}
                style={{ width: 220, marginLeft: 8 }}
                options={[
                  { value: 'ChoDanhGia', label: 'Chờ đánh giá' },
                  { value: 'Dat', label: 'Đạt' },
                  { value: 'CanBoSung', label: 'Cần bổ sung' },
                  { value: 'KhongDat', label: 'Không đạt' },
                ]}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Nhận xét:</Text>
              <Input.TextArea
                rows={3}
                value={weeklyComment}
                onChange={(e) => setWeeklyComment(e.target.value)}
                placeholder="Nhập nhận xét cho tuần này..."
                style={{ marginTop: 8 }}
              />
            </div>

            <Divider style={{ margin: '12px 0' }} />
            <Title level={5} style={{ marginBottom: 12 }}>Rubrics tuần</Title>
            {weeklyRubrics.map((criteria, idx) => (
              <div key={idx} style={{ padding: 12, marginBottom: 8, background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Space>
                    <Text strong>{criteria.TenTieuChi}</Text>
                    <Tag color="blue">{criteria.TrongSo}%</Tag>
                  </Space>
                  <Space>
                    <InputNumber
                      min={0}
                      max={criteria.DiemToiDa || 10}
                      step={0.5}
                      size="small"
                      value={criteria.DiemGV}
                      style={{ width: 80 }}
                      onChange={v => {
                        const updated = [...weeklyRubrics];
                        updated[idx] = { ...updated[idx], DiemGV: v || 0 };
                        setWeeklyRubrics(updated);
                        setWeeklyScore(calcWeeklyScore(updated));
                      }}
                    />
                    <Text type="secondary">/ {criteria.DiemToiDa || 10}</Text>
                  </Space>
                </div>
                {criteria.NhanXetTieuChi && (
                  <Text type="secondary" style={{ fontSize: 12 }}>{criteria.NhanXetTieuChi}</Text>
                )}
                <Input.TextArea
                  rows={1}
                  placeholder="Nhận xét tiêu chí (tùy chọn)"
                  value={criteria.NhanXetTieuChi || ''}
                  style={{ marginTop: 8 }}
                  onChange={e => {
                    const updated = [...weeklyRubrics];
                    updated[idx] = { ...updated[idx], NhanXetTieuChi: e.target.value };
                    setWeeklyRubrics(updated);
                  }}
                />
              </div>
            ))}
            <div style={{ textAlign: 'right', marginTop: 8, padding: 8, background: '#f0f5ff', borderRadius: 6 }}>
              <Text strong style={{ color: '#1d39c4', fontSize: 14 }}>
                Điểm tuần (rubrics): {weeklyScore} / 10
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SubmissionReview;
