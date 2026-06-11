import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Table, Button, Badge, Drawer, Alert, Typography, InputNumber, Space, message, Tag, Steps, Spin, Skeleton, Empty, Tooltip, Descriptions, List, Divider, Input, Modal, Select, Card, Switch, Progress } from 'antd';
import { CheckSquare, ShieldCheck, BrainCircuit, ScanSearch, Fingerprint, ExternalLink, Download, Clock, RefreshCw, Users, TrendingUp, ListChecks } from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';
import { useIsMobile } from '../../hooks/useResponsive';
import { useLecturerClassContext } from '../../contexts/LecturerClassContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExclamationCircleFilled, CheckCircleFilled } from '@ant-design/icons';
import DeadlineBadge from '../common/DeadlineBadge';
import { getEffectiveDeadline } from '../../utils/deadlineUtils';
import dayjs from 'dayjs';

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

const formatBlockchainError = (errorStr) => {
  if (!errorStr) return '';
  const str = String(errorStr);
  if (str.includes('không đủ phí gas') || str.includes('Địa chỉ ví hệ thống')) {
    return str;
  }
  if (str.includes('already graded') || str.includes('Submission already graded')) {
    return 'Điểm số này đã được khóa và ghi nhận an toàn trên Smart Contract Blockchain từ trước. Để bảo vệ dữ liệu chống giả mạo, hệ thống chặn mọi thao tác ghi đè hoặc chấm lại điểm. Dữ liệu sẽ được cập nhật lại theo bản ghi đã có trên Blockchain để đồng nhất dữ liệu và đảm bảo tính bảo mật. Hãy nhấn nút "Đồng bộ từ Blockchain" để hoàn tất cập nhật.';
  }
  if (str.includes('user rejected action') || str.includes('ACTION_REJECTED')) {
    return 'Giao dịch bị từ chối ký trên ví MetaMask.';
  }
  if (str.includes('insufficient funds')) {
    return 'Tài khoản ví hệ thống không đủ phí gas Sepolia để thực hiện giao dịch ghi điểm. Vui lòng nạp thêm ETH Sepolia.';
  }

  // Extract execution revert reason if possible
  const match = str.match(/execution reverted: "([^"]+)"/) || str.match(/reason="([^"]+)"/);
  if (match && match[1]) {
    return `Lỗi Smart Contract: ${match[1]}`;
  }

  if (str.length > 250) {
    return str.split('\n')[0].substring(0, 250) + '...';
  }
  return str;
};

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
  const isMobile = useIsMobile();
  const { selectedClassId } = useLecturerClassContext();
  const user = authService.getCurrentUser();
  const queryClient = useQueryClient();

  const { data: { submissions = [], progressPendingMap = {} } = {}, isLoading: loading } = useQuery({
    queryKey: ['submissions', user?.id],
    queryFn: async () => {
      if (!user) return { submissions: [], progressPendingMap: {} };
      const data = await aiApiService.getSubmissionsByLecturer(user.id);
      const nextSubmissions = Array.isArray(data) ? data : [];

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
      return {
        submissions: nextSubmissions,
        progressPendingMap: Object.fromEntries(pendingEntries)
      };
    },
    enabled: !!user?.id,
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [progressDrawerVisible, setProgressDrawerVisible] = useState(false);
  const [progressLogs, setProgressLogs] = useState([]);
  const [progressSummary, setProgressSummary] = useState(null);
  const [commentingId, setCommentingId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [weeklyModalVisible, setWeeklyModalVisible] = useState(false);
  const [activeProgressStudentId, setActiveProgressStudentId] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [alertProgressClosed, setAlertProgressClosed] = useState(false);
  const [alertPdfClosed, setAlertPdfClosed] = useState(false);
  const [alertSecurityClosed, setAlertSecurityClosed] = useState(false);
  const [readProgressKeys, setReadProgressKeys] = useState(new Set());
  const [dismissedDrawerWarnings, setDismissedDrawerWarnings] = useState(new Set());

  // Cache kết quả AI theo submissionId — tránh gọi lại API khi đóng/mở modal
  const aiCacheRef = useRef({});

  // Track previous pending counts to detect NEW progress → reset read status so dot reappears
  const prevPendingMapRef = useRef({});
  useEffect(() => {
    const prev = prevPendingMapRef.current;
    const keysToReset = [];
    for (const key of Object.keys(progressPendingMap)) {
      if ((progressPendingMap[key] || 0) > (prev[key] || 0)) {
        keysToReset.push(key);
      }
    }
    if (keysToReset.length > 0) {
      setReadProgressKeys(prevSet => {
        const next = new Set(prevSet);
        keysToReset.forEach(k => next.delete(k));
        return next;
      });
    }
    prevPendingMapRef.current = { ...progressPendingMap };
  }, [progressPendingMap]);



  const groupMembers = useMemo(() => {
    if (!selectedSubmission) return [];
    if (selectedSubmission.members) return selectedSubmission.members;

    // Fallback: filter by registration ID instead of Nhom ID from submission
    const regId = selectedSubmission.registration?._id;
    if (!regId) return [];
    return submissions.filter(sub => {
      return sub.registration?._id?.toString() === regId.toString();
    });
  }, [selectedSubmission, submissions]);

  const isGroupTopic = selectedSubmission && (selectedSubmission.topic?.SoLuongSinhVien || 1) > 1;
  const [weeklyTarget, setWeeklyTarget] = useState(null);
  const [weeklyRubrics, setWeeklyRubrics] = useState([]);
  const [weeklyStatus, setWeeklyStatus] = useState('ChoDanhGia');
  const [weeklyComment, setWeeklyComment] = useState('');
  const [weeklyScore, setWeeklyScore] = useState(0);
  const [weeklyWarnings, setWeeklyWarnings] = useState([]);
  const [weeklySaving, setWeeklySaving] = useState(false);
  const [weeklyAiLoading, setWeeklyAiLoading] = useState(false);
  const [weeklyAiScore, setWeeklyAiScore] = useState(null);

  const fetchStudentProgress = async (svId, topicId, record) => {
    setProgressLoading(true);
    try {
      const res = await aiApiService.getProgressBySinhVien(svId, topicId);
      const logs = res.data || [];
      setProgressLogs(logs);
      setProgressSummary(buildProgressSummary(logs));
      const matchedMember = record?.members?.find(m => m.student?._id === svId) || record;

      queryClient.setQueryData(['submissions', user?.id], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          progressPendingMap: {
            ...oldData.progressPendingMap,
            [getSubmissionKey(matchedMember)]: countPendingProgress(logs)
          }
        };
      });
    } catch (e) {
      console.error(e);
      message.error("Lỗi lấy nhật ký tiến độ");
    } finally {
      setProgressLoading(false);
    }
  };

  const viewProgress = async (record) => {
    setSelectedSubmission(record);
    const defaultSvId = record.student?._id;
    setActiveProgressStudentId(defaultSvId);
    setProgressDrawerVisible(true);
    setDismissedDrawerWarnings(new Set());
    // Mark as read so badge dot disappears
    const recordKey = getSubmissionKey(record);
    setReadProgressKeys(prev => new Set(prev).add(recordKey));
    if (record.members) {
      setReadProgressKeys(prev => {
        const next = new Set(prev);
        record.members.forEach(m => next.add(getSubmissionKey(m)));
        return next;
      });
    }
    await fetchStudentProgress(defaultSvId, record.topic?._id, record);
  };

  const handleProgressStudentChange = async (svId) => {
    setActiveProgressStudentId(svId);
    if (selectedSubmission) {
      await fetchStudentProgress(svId, selectedSubmission.topic?._id, selectedSubmission);
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

  // === LLM FEEDBACK (Gemini) STATE ===
  const [useLlmFeedback, setUseLlmFeedback] = useState(false); // toggle bật/tắt nhận xét LLM
  const [llmFeedback, setLlmFeedback] = useState(null);        // nhận xét Gemini (cache trong phiên)
  const [llmProvider, setLlmProvider] = useState(null);        // provider đã dùng
  const [llmLoading, setLlmLoading] = useState(false);         // đang gọi Gemini

  // === TIẾN ĐỘ PHÂN TÍCH PhoBERT (thanh % thật qua polling) ===
  const [analyzeProgress, setAnalyzeProgress] = useState(null); // {percent,current,total,chunks,stage}
  const progressTimerRef = useRef(null);

  const stopProgressPolling = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const startProgressPolling = (jobId) => {
    stopProgressPolling();
    progressTimerRef.current = setInterval(async () => {
      try {
        const p = await aiApiService.getAnalyzeProgress(jobId);
        if (p && p.status !== 'unknown') setAnalyzeProgress(p);
        if (p && p.status === 'done') stopProgressPolling();
      } catch (e) { /* bỏ qua lỗi poll lẻ */ }
    }, 500);
  };

  // Dọn interval khi unmount
  useEffect(() => () => stopProgressPolling(), []);

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
    const submissionId = record.submission?._id;
    setSelectedSubmission(record);
    setDrawerVisible(true);
    setScore(0);
    setExistingGrade(null);
    setRubricsResult([]);
    setGvRubricsScores([]);
    setUseLlmFeedback(false);
    setLlmFeedback(null);
    setLlmProvider(null);
    setLlmLoading(false);
    setAnalyzeProgress(null);
    stopProgressPolling();
    setProgressSummary(null);
    setAlertProgressClosed(false);
    setAlertPdfClosed(false);
    setAlertSecurityClosed(false);

    // === 1. Nếu đã chấm điểm → khôi phục từ grade, không gọi AI ===
    const alreadyGraded = record.status === 'DaCham' && record.grade;
    if (alreadyGraded) {
      setExistingGrade(record.grade);
      setScore(record.grade.Diem || 0);
      if (record.grade.RubricsResult && record.grade.RubricsResult.length > 0) {
        setRubricsResult(record.grade.RubricsResult);
        setGvRubricsScores(record.grade.RubricsResult);
      }
      const aiScore = record.grade.AI_Score ?? record.grade.Diem ?? 0;
      let storedFeedback = record.grade.AI_Feedback || record.grade.NhanXet || '';
      // Nếu feedback cũ là dạng generic không có giá trị → sinh feedback dựa trên điểm thực tế
      const isStale = !storedFeedback 
        || /^Phân tích \d+ tiêu chí qua \d+ phần nội dung/.test(storedFeedback)
        || (aiScore < 6 && storedFeedback.includes('xuất sắc'));
      if (isStale) {
        if (aiScore < 5) storedFeedback = `Báo cáo chưa đạt yêu cầu (${aiScore}/10). Cần bổ sung và cải thiện nội dung.`;
        else if (aiScore < 7) storedFeedback = `Báo cáo đạt mức trung bình (${aiScore}/10). Có thể nâng cao chất lượng nội dung thêm.`;
        else if (aiScore < 8.5) storedFeedback = `Báo cáo khá tốt (${aiScore}/10), đáp ứng phần lớn tiêu chí.`;
        else storedFeedback = `Báo cáo tốt (${aiScore}/10), đáp ứng đầy đủ các tiêu chí Rubrics.`;
      }
      setAiAnalysis({
        score: aiScore,
        feedback: storedFeedback,
        issues: [],
        model: 'vinai/phobert-base',
      });
      // Nhận xét LLM (nếu đã lưu khi chấm) — đọc thẳng từ DB, KHÔNG gọi lại Gemini
      if (record.grade.AI_LLM_Feedback) {
        setLlmFeedback(record.grade.AI_LLM_Feedback);
        setLlmProvider(record.grade.AI_LLM_Provider || 'google-gemini');
        setUseLlmFeedback(true); // đã có sẵn → mặc định hiển thị nhận xét LLM
      }
      // Vẫn lấy tiến độ
      try {
        const progressRes = await aiApiService.getProgressBySinhVien(record.student?._id, record.topic?._id);
        setProgressSummary(buildProgressSummary(progressRes.data || []));
      } catch (err) {
        console.error('Lỗi lấy tóm tắt tiến độ:', err);
      }
      return; // Dừng — không gọi AI
    }

    // === 2. Nếu có cache AI cho submission này → khôi phục từ cache ===
    if (submissionId && aiCacheRef.current[submissionId]) {
      const cached = aiCacheRef.current[submissionId];
      setAiAnalysis(cached.aiAnalysis);
      setScore(cached.score);
      if (cached.rubricsResult) setRubricsResult(cached.rubricsResult);
      if (cached.gvRubricsScores) setGvRubricsScores(cached.gvRubricsScores);
      if (cached.workingRecord) setSelectedSubmission(cached.workingRecord);
      // Khôi phục nhận xét LLM đã sinh trong phiên → toggle qua lại không gọi lại API
      if (cached.llmFeedback !== undefined) setLlmFeedback(cached.llmFeedback);
      if (cached.llmProvider !== undefined) setLlmProvider(cached.llmProvider);
      if (cached.useLlmFeedback !== undefined) setUseLlmFeedback(cached.useLlmFeedback);
      // Lấy tiến độ
      try {
        const progressRes = await aiApiService.getProgressBySinhVien(record.student?._id, record.topic?._id);
        setProgressSummary(buildProgressSummary(progressRes.data || []));
      } catch (err) {
        console.error('Lỗi lấy tóm tắt tiến độ:', err);
      }
      return; // Dừng — dùng cache
    }

    // === 3. Chưa có cache phiên → kiểm tra cache DB rồi mới gọi AI ===
    setAiAnalysis(null);

    let workingRecord = record;
    let dbAiCache = null;
    if (submissionId) {
      try {
        const extractedData = await aiApiService.getExtractedText(submissionId);
        dbAiCache = extractedData.aiCache || null;  // cache AI bền (đã validate hash ở backend)
        workingRecord = {
          ...record,
          submission: {
            ...record.submission,
            ...extractedData
          }
        };
        setSelectedSubmission(workingRecord);

        // Ghi ExtractedText vào submission trong cache react-query
        queryClient.setQueryData(['submissions', user?.id], (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            submissions: oldData.submissions.map(item =>
              item.submission?._id === record.submission._id ? workingRecord : item
            )
          };
        });
      } catch (err) {
        console.warn('Khong lay duoc ExtractedText:', err);
      }
    }

    // === 3a. Có cache AI bền trong DB → khôi phục, KHÔNG gọi lại PhoBERT/Gemini ===
    if (dbAiCache && dbAiCache.score != null) {
      const aiData = {
        score: dbAiCache.score,
        feedback: dbAiCache.feedback,
        issues: dbAiCache.issues || [],
        model: dbAiCache.model || 'vinai/phobert-base',
        security_flags: dbAiCache.securityFlags || [],
        repetition_rate: dbAiCache.repetitionRate ?? null,
        chunks_info: [],
      };
      const rubricsData = dbAiCache.rubricsResult || [];
      const gvScoresData = rubricsData.length > 0
        ? rubricsData.map(r => ({ ...r, GV_DiemTieuChi: r.GV_DiemTieuChi ?? r.AI_DiemTieuChi }))
        : [];
      const scoreData = gvScoresData.length > 0 ? calcWeightedScore(gvScoresData) : dbAiCache.score;

      setAiAnalysis(aiData);
      if (rubricsData.length > 0) {
        setRubricsResult(rubricsData);
        setGvRubricsScores(gvScoresData);
      }
      setScore(scoreData);
      if (dbAiCache.llmFeedback) {
        setLlmFeedback(dbAiCache.llmFeedback);
        setLlmProvider(dbAiCache.llmProvider || 'google-gemini');
        setUseLlmFeedback(true);
      }
      if (submissionId) {
        aiCacheRef.current[submissionId] = {
          aiAnalysis: aiData,
          score: scoreData,
          rubricsResult: rubricsData,
          gvRubricsScores: gvScoresData,
          workingRecord,
          llmFeedback: dbAiCache.llmFeedback || null,
          llmProvider: dbAiCache.llmProvider || null,
          useLlmFeedback: !!dbAiCache.llmFeedback,
        };
      }
      try {
        const progressRes = await aiApiService.getProgressBySinhVien(workingRecord.student?._id, workingRecord.topic?._id);
        setProgressSummary(buildProgressSummary(progressRes.data || []));
      } catch (err) {
        console.error('Lỗi lấy tóm tắt tiến độ:', err);
      }
      return; // Dừng — dùng cache DB, không gọi AI
    }

    if (workingRecord.submission) {
      const topic = workingRecord.topic;
      const hasSuDungRubrics = topic?.SuDungRubrics && topic?.Rubrics && topic.Rubrics.length > 0;

      setAnalyzing(true);
      // jobId cho thanh tiến độ % thật; bắt đầu poll trước khi gọi AI
      const jobId = (window.crypto?.randomUUID?.() || `job-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      setAnalyzeProgress({ percent: 0, current: 0, total: 1, chunks: 0, stage: 'embedding_chunks' });
      startProgressPolling(jobId);
      try {
        const extractedText = workingRecord.submission.ExtractedText;
        const metadataFallback = [
          `Đề tài: ${topic?.TenDeTai || ''}`,
          topic?.MoTa ? `Mô tả: ${topic.MoTa}` : '',
          (topic?.YeuCau || []).length > 0 ? `Yêu cầu: ${topic.YeuCau.join(', ')}` : ''
        ].filter(Boolean).join('\n');
        const textForAI = extractedText || metadataFallback;

        let aiData = null;
        let rubricsData = null;
        let gvScoresData = null;
        let scoreData = 0;

        if (hasSuDungRubrics) {
          const aiResult = await aiApiService.analyzeReportWithRubrics(textForAI, topic.Rubrics, jobId);
          aiData = {
            score: aiResult.score,
            feedback: aiResult.feedback,
            model: aiResult.model || 'vinai/phobert-base',
            chunks_info: aiResult.chunks_info || [],
            security_flags: aiResult.security_flags || [],
            repetition_rate: aiResult.repetition_rate ?? null,
          };
          rubricsData = aiResult.rubrics_result || [];
          gvScoresData = rubricsData.map(r => ({ ...r, GV_DiemTieuChi: r.AI_DiemTieuChi }));
          scoreData = calcWeightedScore(gvScoresData);

          setAiAnalysis(aiData);
          setRubricsResult(rubricsData);
          setGvRubricsScores(gvScoresData);
          setScore(scoreData);
        } else {
          const topicReqs = topic?.YeuCau || [];
          const aiResult = await aiApiService.analyzeReportAI(textForAI, topicReqs, jobId);
          aiData = {
            score: aiResult.score,
            feedback: aiResult.feedback,
            issues: aiResult.issues || [],
            model: aiResult.model || 'vinai/phobert-base',
            security_flags: aiResult.security_flags || [],
            repetition_rate: aiResult.repetition_rate ?? null,
          };
          scoreData = aiResult.score;

          setAiAnalysis(aiData);
          setScore(scoreData);
        }

        // Lưu cache phiên
        if (submissionId) {
          aiCacheRef.current[submissionId] = {
            aiAnalysis: aiData,
            score: scoreData,
            rubricsResult: rubricsData,
            gvRubricsScores: gvScoresData,
            workingRecord,
            llmFeedback: null,      // chưa sinh nhận xét LLM
            llmProvider: null,
            useLlmFeedback: false,
          };
          // Lưu cache bền DB → reload/mở lại không gọi lại PhoBERT (backend bỏ qua nếu không có ExtractedText)
          aiApiService.saveAiCache(submissionId, {
            isRubrics: hasSuDungRubrics,
            score: aiData.score,
            feedback: aiData.feedback,
            issues: aiData.issues || [],
            rubricsResult: rubricsData || undefined,
            securityFlags: aiData.security_flags || [],
            repetitionRate: aiData.repetition_rate ?? null,
            model: aiData.model,
          }).catch(e => console.warn('Lưu AICache thất bại:', e?.message));
        }
      } catch (err) {
        console.error('AI Analysis failed:', err);
        message.warning('PhoBERT AI chưa phản hồi.');
        setAiAnalysis({
          score: 0,
          feedback: 'AI Server không phản hồi. Giảng viên có thể tự nhập điểm.',
          issues: ['Không kết nối được ML Service. Vui lòng thử lại sau.']
        });
        setScore(0);
      } finally {
        stopProgressPolling();
        setAnalyzing(false);
      }
    }

    try {
      const progressRes = await aiApiService.getProgressBySinhVien(workingRecord.student?._id, workingRecord.topic?._id);
      setProgressSummary(buildProgressSummary(progressRes.data || []));
    } catch (err) {
      console.error('Lỗi lấy tóm tắt tiến độ:', err);
    }
  };

  // Toggle nhận xét LLM (Gemini). Gọi API TỐI ĐA 1 lần/bài; sau đó toggle qua lại dùng state/cache.
  const handleToggleLlm = async (checked) => {
    setUseLlmFeedback(checked);
    const submissionId = selectedSubmission?.submission?._id;
    if (submissionId && aiCacheRef.current[submissionId]) {
      aiCacheRef.current[submissionId].useLlmFeedback = checked;
    }
    // Tắt, hoặc đã có nhận xét LLM (từ DB/cache/lần gọi trước) → KHÔNG gọi lại API
    if (!checked || llmFeedback) return;

    if (!aiAnalysis) {
      message.warning('Chưa có kết quả phân tích AI để sinh nhận xét.');
      setUseLlmFeedback(false);
      return;
    }

    try {
      setLlmLoading(true);
      const topic = selectedSubmission?.topic;
      const isRubrics = !!(topic?.SuDungRubrics && rubricsResult.length > 0);
      const res = await aiApiService.getLlmFeedback({
        score: aiAnalysis.score,
        isRubrics,
        rubricsResult: isRubrics ? (gvRubricsScores.length > 0 ? gvRubricsScores : rubricsResult) : [],
        issues: aiAnalysis.issues || [],
        topicName: topic?.TenDeTai || '',
        phobertFeedback: aiAnalysis.feedback || '',
      });
      setLlmFeedback(res.feedback);
      setLlmProvider(res.provider);
      if (!res.usedLLM) {
        message.info('LLM chưa được cấu hình (thiếu API key) — đang hiển thị nhận xét PhoBERT.');
      }
      // Lưu cache phiên → đóng/mở lại hoặc toggle qua lại không gọi lại API
      if (submissionId && aiCacheRef.current[submissionId]) {
        aiCacheRef.current[submissionId].llmFeedback = res.feedback;
        aiCacheRef.current[submissionId].llmProvider = res.provider;
        aiCacheRef.current[submissionId].useLlmFeedback = true;
      }
      // Lưu cache bền DB (bài CHƯA chấm) → reload không gọi lại Gemini (tốn phí)
      if (submissionId && !existingGrade && res.usedLLM) {
        aiApiService.saveAiCache(submissionId, {
          isRubrics,
          score: aiAnalysis.score,
          feedback: aiAnalysis.feedback,
          issues: aiAnalysis.issues || [],
          rubricsResult: (gvRubricsScores.length > 0 ? gvRubricsScores : rubricsResult) || undefined,
          securityFlags: aiAnalysis.security_flags || [],
          repetitionRate: aiAnalysis.repetition_rate ?? null,
          model: aiAnalysis.model,
          llmFeedback: res.feedback,
          llmProvider: res.provider,
        }).catch(e => console.warn('Lưu AICache (LLM) thất bại:', e?.message));
      }
    } catch (err) {
      console.error('LLM feedback failed:', err);
      message.error('Không sinh được nhận xét LLM. Giữ nhận xét PhoBERT.');
      setUseLlmFeedback(false);
    } finally {
      setLlmLoading(false);
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

      // Nhận xét chính thức = nhận xét LLM nếu GV bật toggle, ngược lại dùng PhoBERT
      const effectiveFeedback = (useLlmFeedback && llmFeedback) ? llmFeedback : (aiAnalysis?.feedback || "");

      const payload = {
        baoCaoId: selectedSubmission.submission._id,
        deTaiId: selectedSubmission.topic._id,
        sinhVienId: selectedSubmission.student._id,
        giangVienId: user.id,
        diem: score,
        nhanXet: effectiveFeedback,
        aiScore: aiAnalysis?.score || 0,
        aiFeedback: aiAnalysis?.feedback || "",
        aiLlmFeedback: llmFeedback || undefined,        // cache bền: lưu để mở lại không gọi lại Gemini
        aiLlmProvider: llmFeedback ? (llmProvider || 'google-gemini') : undefined,
        aiSecurityFlags: aiAnalysis?.security_flags || [],
        aiRepetitionRate: aiAnalysis?.repetition_rate ?? null,
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

      // Cập nhật trạng thái chấm điểm đồng bộ cho tất cả thành viên trong nhóm
      queryClient.setQueryData(['submissions', user?.id], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          submissions: oldData.submissions.map(s =>
            s.registration?._id === selectedSubmission.registration?._id
              ? { ...s, status: 'DaCham', grade: s.isLeader ? gradeData : { ...gradeData, Diem: gradeData.Diem } }
              : s
          )
        };
      });

      message.success({
        content: `Đã ký Smart Contract và Ghi điểm (${score}) cho ${selectedSubmission?.student?.HoTen} thành công!`,
        duration: 4,
        icon: <ShieldCheck color="#52c41a" />,
      });

      queryClient.invalidateQueries({ queryKey: ['submissions', user?.id] });
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
      queryClient.setQueryData(['submissions', user?.id], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          submissions: oldData.submissions.map(s =>
            s.grade?._id === gradeId ? { ...s, grade: updatedGrade } : s
          )
        };
      });
      const successMsg = response.data?.message || 'Ghi lại Blockchain thành công';
      message.success({ content: successMsg, duration: 6 });
    } catch (error) {
      const updatedGrade = error.response?.data?.data;
      if (updatedGrade) {
        const updatedSubmission = { ...selectedSubmission, grade: updatedGrade };
        setSelectedSubmission(updatedSubmission);
        queryClient.setQueryData(['submissions', user?.id], (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            submissions: oldData.submissions.map(s =>
              s.grade?._id === gradeId ? { ...s, grade: updatedGrade } : s
            )
          };
        });
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
    setWeeklyAiScore(null);
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

  const handleAiSuggestWeekly = async () => {
    if (!weeklyTarget) return;
    try {
      setWeeklyAiLoading(true);
      const res = await aiApiService.aiSuggestProgress(weeklyTarget._id);
      const aiRubrics = res.aiRubrics || [];
      const updated = weeklyRubrics.map((c, idx) => {
        const ai = aiRubrics.find(a => a.TenTieuChi === c.TenTieuChi) || aiRubrics[idx];
        if (!ai) return c;
        const maxScore = c.DiemToiDa || 10;
        const suggested = Math.min(maxScore, Math.round((ai.AI_DiemTieuChi || 0) * 2) / 2);
        return { ...c, DiemGV: suggested, NhanXetTieuChi: c.NhanXetTieuChi || ai.AI_NhanXetTieuChi || '' };
      });
      setWeeklyRubrics(updated);
      setWeeklyScore(calcWeeklyScore(updated));
      setWeeklyAiScore(res.aiScore);
      message.success(`AI gợi ý điểm tuần ${res.aiScore}/10 (chỉ tham khảo — GV có thể chỉnh lại)`);
    } catch (err) {
      message.error(err.response?.data?.error || 'AI gợi ý điểm tuần thất bại');
    } finally {
      setWeeklyAiLoading(false);
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

        queryClient.setQueryData(['submissions', user?.id], (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            progressPendingMap: {
              ...oldData.progressPendingMap,
              [getSubmissionKey(selectedSubmission)]: countPendingProgress(nextLogs)
            }
          };
        });

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
      title: 'Nhóm / Sinh Viên',
      key: 'group',
      width: 220,
      render: (_, record) => {
        const isGroup = record.members && record.members.length > 1;
        const groupName = record.registration?.Nhom?.TenNhom || record.submission?.Nhom?.TenNhom;

        return (
          <div>
            {isGroup ? (
              <Space direction="vertical" size={2}>
                <Text strong style={{ color: '#1677ff' }}>{groupName || 'Nhóm học tập'}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Trưởng nhóm: {record.student?.HoTen || 'N/A'}
                </Text>
              </Space>
            ) : (
              <Space direction="vertical" size={2}>
                <Text strong>{record.student?.HoTen || 'N/A'}</Text>
                <Tag color="default" style={{ fontSize: 10, margin: 0 }}>👤 Cá nhân</Tag>
              </Space>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thông Tin Ngữ Cảnh',
      key: 'context',
      width: 280,
      render: (_, record) => {
        const isKL = record.topic?.LoaiDeTai === 'KhoaLuan';
        const classes = record.topic?.LopHoc || [];
        const classNameStr = isKL ? '📝 Khóa Luận' : (classes.map(c => c.TenLopHoc || c.MaLopHoc).join(', ') || 'N/A');
        const subjectName = isKL ? '—' : (record.topic?.MonHoc?.TenMonHoc || 'N/A');
        const lecturerName = record.topic?.GiangVienHuongDan?.HoTen || 'N/A';

        return (
          <Space direction="vertical" size={2} style={{ fontSize: 13 }}>
            <div><Text type="secondary">Lớp:</Text> <Text strong style={{ color: isKL ? '#d4b106' : 'inherit' }}>{classNameStr}</Text></div>
            <div><Text type="secondary">Môn:</Text> <Text>{subjectName}</Text></div>
            <div><Text type="secondary">GVHD:</Text> <Text italic style={{ color: '#555' }}>{lecturerName}</Text></div>
          </Space>
        );
      }
    },
    {
      title: 'Đề Tài',
      key: 'topic',
      ellipsis: true,
      width: 320,
      render: (_, record) => record.topic?.TenDeTai || 'N/A',
    },
    {
      title: 'Trạng Thái Nộp',
      key: 'status',
      width: 170,
      render: (_, record) => {
        if (record.groupStatus === 'DaCham') {
          return <Badge status="success" text={<Text strong style={{ color: '#eb2f96' }}>Đã chấm điểm</Text>} />
        }
        return record.hasSubmission ? (
          <Badge status="processing" text={<Text strong style={{ color: '#1677ff' }}>Đã nộp bài</Text>} />
        ) : (
          <Badge status="default" text={<Text type="secondary">Chưa nộp</Text>} />
        );
      },
    },
    {
      title: 'Thời Gian Nộp',
      key: 'submitDate',
      width: 180,
      className: 'hide-on-mobile',
      render: (_, record) => {
        const deadline = getEffectiveDeadline(record.topic, 'baoCao');
        let isLate = false;
        let submitTime = null;

        if (record.submission) {
          submitTime = new Date(record.submission.NgayNop || record.submission.createdAt);
          if (deadline && new Date(submitTime) > new Date(deadline)) {
            isLate = true;
          }
        }

        return (
          <Space direction="vertical" size={2}>
            {submitTime ? (
              <Text>{submitTime.toLocaleString('vi-VN')}</Text>
            ) : (
              <Text type="secondary">—</Text>
            )}
            {deadline && (
              <div style={{ fontSize: 12 }}>
                <Text type="secondary">Hạn: {new Date(deadline).toLocaleString('vi-VN')}</Text>
              </div>
            )}
            {isLate && <Tag color="error" style={{ margin: 0, marginTop: 4 }}>Nộp trễ hạn</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Điểm Số',
      key: 'scoreDetail',
      width: 130,
      render: (_, record) => {
        if (record.groupStatus !== 'DaCham' || !record.grade) return <Text type="secondary">—</Text>;
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
        const hasPendingProgress = record.members?.some(m => (progressPendingMap[getSubmissionKey(m)] || 0) > 0);
        const allRead = record.members?.every(m => readProgressKeys.has(getSubmissionKey(m)));
        const showDot = hasPendingProgress && !allRead;

        return (
          <Space size={[8, 8]} wrap>
            <Tooltip title={hasPendingProgress ? 'Có tiến độ chưa đánh giá' : 'Xem tiến độ'}>
              <Badge dot={showDot} offset={[-2, 2]}>
                <Button type="default" icon={<Clock size={16} />} onClick={() => viewProgress(record)}>
                  Tiến Độ
                </Button>
              </Badge>
            </Tooltip>
            {record.groupStatus === 'DaCham' ? (
              <Button type="default" icon={<ShieldCheck size={16} />} onClick={() => viewDetails(record)}>
                Xem Điểm & Review
              </Button>
            ) : record.hasSubmission ? (
              <Button type="primary" icon={<ScanSearch size={16} />} onClick={() => viewDetails(record)}>
                Chấm Điểm & Review
              </Button>
            ) : (
              <Button disabled style={{ margin: 0 }}>Chờ SV nộp bài</Button>
            )}
          </Space>
        );
      },
    },
  ];

  const memberColumns = [
    {
      title: 'Họ và Tên',
      dataIndex: ['student', 'HoTen'],
      key: 'name',
      render: (text, member) => (
        <Text strong>
          {text} {member.isLeader && <Tag color="gold" style={{ marginLeft: 8 }}>Trưởng Nhóm</Tag>}
        </Text>
      )
    },
    {
      title: 'Mã SV',
      dataIndex: ['student', 'MaSV'],
      key: 'maSV'
    },
    {
      title: 'Trạng Thái Nộp',
      key: 'status',
      render: (_, member) => {
        if (member.status === 'DaCham') {
          return <Badge status="success" text="Đã chấm điểm" />
        }
        return member.submission ? (
          <Badge status="processing" text="Đã nộp bài" />
        ) : (
          <Badge status="default" text="Chưa nộp" />
        );
      }
    },
    {
      title: 'Điểm Cá Nhân',
      key: 'memberGrade',
      render: (_, member) => {
        if (member.status !== 'DaCham' || !member.grade) {
          return <Text type="secondary">—</Text>;
        }
        return (
          <Text strong style={{ color: '#52c41a', fontSize: 15 }}>
            {member.grade.Diem}
          </Text>
        );
      }
    }
  ];

  const filteredSubmissions = submissions.filter(record => {
    if (selectedClassId === 'KHOA_LUAN') {
      return record.topic?.LoaiDeTai === 'KhoaLuan';
    }
    if (record.topic?.LoaiDeTai === 'KhoaLuan') return false;
    if (!selectedClassId || selectedClassId === 'ALL') return true;
    const topicLopHocs = record.topic?.LopHoc || [];
    return topicLopHocs.some(lh => (lh._id || lh).toString() === selectedClassId.toString());
  });

  const groupedSubmissions = useMemo(() => {
    const groups = {};
    filteredSubmissions.forEach(sub => {
      const regId = sub.registration?._id;
      if (!regId) return;

      if (!groups[regId]) {
        groups[regId] = {
          key: regId,
          registration: sub.registration,
          topic: sub.topic,
          members: [],
          leader: null,
          hasSubmission: false,
          hasGrade: false,
          submission: null,
          grade: null,
          status: 'ChuaNop'
        };
      }

      groups[regId].members.push(sub);

      if (sub.isLeader) {
        groups[regId].leader = sub;
      }

      if (sub.submission) {
        groups[regId].hasSubmission = true;
        if (!groups[regId].submission || sub.isLeader) {
          groups[regId].submission = sub.submission;
        }
      }

      if (sub.grade) {
        groups[regId].hasGrade = true;
        if (!groups[regId].grade || sub.isLeader) {
          groups[regId].grade = sub.grade;
        }
      }
    });

    return Object.values(groups).map(g => {
      if (!g.leader && g.members.length > 0) {
        g.leader = g.members[0];
      }

      const hasCham = g.members.some(m => m.status === 'DaCham');
      const hasNop = g.members.some(m => m.status === 'DaNop');
      const status = hasCham ? 'DaCham' : (hasNop ? 'DaNop' : 'ChuaNop');

      return {
        ...g.leader,
        _id: g.key,
        key: g.key,
        members: g.members,
        groupStatus: status,
        hasGrade: g.hasGrade,
        hasSubmission: g.hasSubmission
      };
    });
  }, [filteredSubmissions]);

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Duyệt Báo Cáo & Chấm Điểm</Title>
      <Paragraph type="secondary">
        Sử dụng MetaMask để xác thực danh tính Giảng Viên trước khi chốt điểm. Mọi thay đổi sẽ được Audit công khai trên Mạng Blockchain Ethereum.
      </Paragraph>

      <Card bordered={false}>
        <Table
        columns={columns}
        dataSource={groupedSubmissions}
        rowKey="_id"
        loading={loading}
        locale={{ emptyText: <Empty description="Chưa có nhóm nào được duyệt đề tài. Hãy duyệt đề tài ở trang Đề Tài trước." /> }}
        scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: '8px 16px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              <Title level={5} style={{ marginBottom: 12, color: '#1677ff' }}>👥 Danh Sách Thành Viên Nhóm</Title>
              <Table
                columns={memberColumns}
                dataSource={record.members}
                rowKey={(member) => member.student?._id || member._id}
                pagination={false}
                size="small"
                bordered
              />
            </div>
          ),
          rowExpandable: (record) => record.members && record.members.length > 1,
        }}
      />
      </Card>

      <Drawer
        title={
          <Space>
            <CheckSquare color="#1677ff" />
            <span>Đánh Giá Báo Cáo Môn Học</span>
          </Space>
        }
        width={isMobile ? '100vw' : 650}
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
              <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0' }}>
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

            {/* Cảnh báo trạng thái trích xuất PDF */}
            {selectedSubmission.submission && (
              (() => {
                const extractedText = selectedSubmission.submission.ExtractedText;
                const isUsingFallback = !extractedText;
                const method = selectedSubmission.submission.ExtractionMethod;
                const pageCount = selectedSubmission.submission.PageCount;
                const warnings = selectedSubmission.submission.ExtractionWarnings || [];

                return (
                  <div style={{ marginBottom: 16 }}>
                    {isUsingFallback ? (
                      <Alert
                        type="warning"
                        message="Chưa trích xuất được nội dung bài làm từ file PDF nộp"
                        description="Hệ thống PhoBERT AI sẽ chấm điểm dựa trên mô tả đề tài thay thế. Điểm đánh giá có thể không phản ánh chính xác bài làm thực tế của sinh viên."
                        showIcon
                      />
                    ) : (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {alertPdfClosed ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: warnings.length > 0 ? 8 : 0 }}>
                            <CheckCircleFilled
                              style={{ color: '#52c41a', fontSize: 16, cursor: 'pointer' }}
                              onClick={() => setAlertPdfClosed(false)}
                              title="Xem lại thông báo đọc PDF"
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>Đã đọc PDF thành công</Text>
                          </div>
                        ) : (
                          <Alert
                            type="success"
                            message={`Đã đọc thành công báo cáo PDF (${method === 'ocr' ? 'OCR quét ảnh' : 'văn bản native'})`}
                            description={`Hệ thống đã đọc ${pageCount || '?'} trang bài làm thực tế của sinh viên. Đã sẵn sàng phân tích.`}
                            showIcon
                            closable
                            onClose={() => setAlertPdfClosed(true)}
                            style={{ marginBottom: warnings.length > 0 ? 8 : 0 }}
                          />
                        )}

                        {warnings.length > 0 && (
                          alertSecurityClosed ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                              <ExclamationCircleFilled
                                style={{ color: '#faad14', fontSize: 16, cursor: 'pointer' }}
                                onClick={() => setAlertSecurityClosed(false)}
                                title="Xem lại cảnh báo bảo mật"
                              />
                              <Text type="secondary" style={{ fontSize: 12 }}>Có cảnh báo nội dung PDF</Text>
                            </div>
                          ) : (
                            <Alert
                              type="warning"
                              message="Phát hiện cảnh báo bảo mật/nội dung"
                              description={
                                <ul style={{ margin: 0, paddingLeft: 16 }}>
                                  {warnings.map((w, i) => {
                                    let text = w;
                                    if (text.toLowerCase().includes("prompt injection")) {
                                      text = "Phát hiện nội dung bất thường/ẩn có thể gây nhiễu hệ thống chấm điểm tự động.";
                                    }
                                    return <li key={i}>{text}</li>;
                                  })}
                                </ul>
                              }
                              showIcon
                              closable
                              onClose={() => setAlertSecurityClosed(true)}
                              style={{ marginTop: 8 }}
                            />
                          )
                        )}
                      </Space>
                    )}
                  </div>
                );
              })()
            )}

            {/* === PHOBERT AI ANALYTICS === */}
            <Card
              size="small"
              title={
                <Space>
                  <BrainCircuit size={16} color="#1677ff" />
                  <Text strong>PhoBERT AI Phân Tích</Text>
                </Space>
              }
              extra={
                <Tooltip title="Bật để sinh nhận xét tự nhiên bằng LLM (Gemini). Tắt để dùng nhận xét mặc định của PhoBERT.">
                  <Space size={6}>
                    <Text style={{ fontSize: 12 }} type="secondary">Nhận xét AI (Gemini)</Text>
                    <Switch size="small" checked={useLlmFeedback} loading={llmLoading} onChange={handleToggleLlm} />
                  </Space>
                </Tooltip>
              }
              style={{ marginBottom: 20, borderLeft: '3px solid #1677ff' }}
            >
              {analyzing ? (
                <div style={{ padding: 16, textAlign: 'center' }}>
                  <Progress
                    type="circle"
                    percent={analyzeProgress?.percent ?? 0}
                    size={96}
                    status="active"
                    strokeColor={{
                      '0%': '#4285F4',   // Google xanh dương
                      '33%': '#EA4335',  // đỏ
                      '66%': '#FBBC05',  // vàng
                      '100%': '#34A853', // xanh lá
                    }}
                  />
                  <div style={{ marginTop: 12 }}>
                    <Text type="secondary" style={{ display: 'block' }}>Đang phân tích bằng PhoBERT AI...</Text>
                    {analyzeProgress?.chunks > 0 && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {analyzeProgress.stage === 'scoring' ? 'Đang chấm tiêu chí' : 'Đang đọc nội dung'}:{' '}
                        {analyzeProgress.current}/{analyzeProgress.total} phần
                        {' • '}{analyzeProgress.chunks} chunk
                        {selectedSubmission?.submission?.PageCount ? ` • ${selectedSubmission.submission.PageCount} trang` : ''}
                      </Text>
                    )}
                  </div>
                  <Skeleton active paragraph={{ rows: 1 }} style={{ marginTop: 12 }} />
                </div>
              ) : aiAnalysis ? (
                <Alert
                  message={`Điểm AI Đánh Giá (Kỹ thuật/Nội dung): ${aiAnalysis.score} / 10`}
                  description={
                    <ul style={{ paddingLeft: 20, margin: 0, marginTop: 8 }}>
                      <li>
                        <Text type="success">Phản Hồi Trọng Tâm:</Text>{' '}
                        {llmLoading && useLlmFeedback ? (
                          <Spin size="small" />
                        ) : (useLlmFeedback && llmFeedback ? llmFeedback : aiAnalysis.feedback)}
                        {useLlmFeedback && llmFeedback && (
                          <Tag color="purple" style={{ marginLeft: 6 }}>Gemini</Tag>
                        )}
                      </li>
                      {aiAnalysis.issues && aiAnalysis.issues.map((iss, idx) => (
                        <li key={idx}><Text type="danger">Vấn đề rủi ro:</Text> {iss}</li>
                      ))}
                      {aiAnalysis.model && (
                        <li><Text type="secondary">Model: {aiAnalysis.model}</Text></li>
                      )}
                    </ul>
                  }
                  type={aiAnalysis.score >= 7 ? "success" : "warning"}
                />
              ) : (
                <Text type="secondary" italic>Chưa có dữ liệu phân tích AI.</Text>
              )}
            </Card>

            {/* === WEEKLY PROGRESS SUMMARY === */}
            {progressSummary && (
              <Card
                size="small"
                title={
                  <Space>
                    <TrendingUp size={16} color="#fa8c16" />
                    <Text strong>Tóm Tắt Tiến Độ Tuần</Text>
                  </Space>
                }
                style={{ marginBottom: 20, borderLeft: '3px solid #fa8c16' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: '#fafafa', padding: 12, borderRadius: 6, marginBottom: 12 }}>
                  <div>
                    <Text type="secondary">Tổng số tuần</Text>
                    <div><Text strong style={{ fontSize: 16 }}>{progressSummary.totalWeeks}</Text></div>
                  </div>
                  <div>
                    <Text type="secondary">Tuần đạt yêu cầu</Text>
                    <div><Text strong style={{ fontSize: 16, color: '#52c41a' }}>{progressSummary.gradedWeeks}</Text></div>
                  </div>
                  <div>
                    <Text type="secondary">Điểm trung bình tuần</Text>
                    <div><Text strong style={{ fontSize: 16, color: '#1677ff' }}>{progressSummary.averageScore != null ? progressSummary.averageScore : '—'}</Text></div>
                  </div>
                </div>

                {progressSummary.warnings?.length > 0 ? (
                  <div style={{ marginBottom: 12 }}>
                    {alertProgressClosed ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ExclamationCircleFilled
                          style={{ color: '#ff4d4f', fontSize: 16, cursor: 'pointer' }}
                          onClick={() => setAlertProgressClosed(false)}
                          title="Hiển thị lại cảnh báo tiến độ"
                        />
                        <Text type="danger" style={{ fontSize: 13 }}>{progressSummary.warnings.length}</Text>
                      </div>
                    ) : (
                      <Alert
                        type="error"
                        showIcon
                        closable
                        onClose={() => setAlertProgressClosed(true)}
                        message="Cảnh báo tiến độ"
                        description={
                          <ul style={{ margin: 0, paddingLeft: 16 }}>
                            {progressSummary.warnings.map((warn, idx) => (
                              <li key={idx}><Text>{formatWarningLabel(warn)}</Text></li>
                            ))}
                          </ul>
                        }
                      />
                    )}
                  </div>
                ) : (
                  <Alert
                    type="success"
                    showIcon
                    message="Tiến độ ổn định"
                    description="Không phát hiện bất thường trong quá trình thực hiện."
                    style={{ marginBottom: 12 }}
                  />
                )}

                <Text type="secondary" italic style={{ display: 'block', fontSize: 12 }}>
                  * Điểm quá trình chỉ mang tính tham khảo - KHÔNG tự cộng vào điểm cuối kỳ.
                </Text>
              </Card>
            )}

            {/* === RUBRICS DETAIL EVALUATION === */}
            {rubricsResult.length > 0 && (
              <Card
                size="small"
                title={
                  <Space>
                    <ListChecks size={16} color="#722ed1" />
                    <Text strong>Chấm Điểm Theo Rubrics ({rubricsResult.length} tiêu chí)</Text>
                  </Space>
                }
                style={{ marginBottom: 20, borderLeft: '3px solid #722ed1' }}
              >
                {gvRubricsScores.map((criteria, idx) => (
                  <div key={idx} style={{
                    padding: 12, marginBottom: 8, background: '#fafafa', borderRadius: 6,
                    border: '1px solid #f0f0f0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Space>
                        <Text strong>{criteria.TenTieuChi}</Text>
                        <Tag color="purple">{criteria.TrongSo}%</Tag>
                      </Space>
                      <Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>AI gợi ý: {criteria.AI_DiemTieuChi}</Text>
                        <Text strong>|</Text>
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

                <div style={{ textAlign: 'right', marginTop: 12, padding: 12, background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                  <Text strong style={{ color: '#722ed1', fontSize: 14 }}>
                    Tổng điểm (trọng số): <span style={{ fontSize: 16 }}>{score}</span> / 10
                  </Text>
                </div>
              </Card>
            )}

            <Steps
              direction="vertical"
              current={aiAnalysis ? 2 : 1}
              items={[
                { title: 'Sinh viên Nộp Hệ Thống (IPFS)', description: selectedSubmission.submission ? 'Đã nộp' : 'Chưa nộp' },
                { title: 'PhoBERT AI Phân Tích', description: analyzing ? 'Đang phân tích báo cáo...' : (aiAnalysis ? `Điểm gợi ý: ${aiAnalysis.score}` : 'Chờ xử lý') },
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
                            const isAlreadyGraded = selectedSubmission.grade?.LoiBlockchain &&
                              (String(selectedSubmission.grade.LoiBlockchain).includes('already graded') ||
                                String(selectedSubmission.grade.LoiBlockchain).includes('Submission already graded'));
                            const blockchainMeta = isAlreadyGraded
                              ? { label: 'Đã ghi nhận an toàn (Blockchain)', color: 'success', alertType: 'success' }
                              : getBlockchainStatusMeta(selectedSubmission.grade?.TrangThaiBlockchain);
                            return (
                              <div>
                                <Alert
                                  type={blockchainMeta.alertType}
                                  message={`Sinh viên đã được chấm điểm: ${selectedSubmission.grade?.Diem || score}`}
                                  description={
                                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
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
                                          style={{ marginTop: 4 }}
                                        >
                                          Đồng bộ từ Blockchain
                                        </Button>
                                      )}
                                      {selectedSubmission.grade?.LoiBlockchain && (
                                        <div style={{ marginTop: 8, borderTop: '1px dashed rgba(0, 0, 0, 0.08)', paddingTop: 8 }}>
                                          <Text strong style={{ display: 'block', marginBottom: 4 }}>
                                            Thông tin hệ thống Blockchain:
                                          </Text>
                                          <Text style={{ fontSize: 13, display: 'block', color: 'rgba(0, 0, 0, 0.65)' }}>
                                            {formatBlockchainError(selectedSubmission.grade.LoiBlockchain)}
                                          </Text>
                                        </div>
                                      )}
                                    </Space>
                                  }
                                  showIcon
                                  style={{ marginBottom: 12 }}
                                />

                                {/* MỚI: Section danh sách thành viên nhóm */}
                                {isGroupTopic && groupMembers.length > 0 && (
                                  <div style={{ padding: 12, background: '#fafafa', borderRadius: 8, marginBottom: 16, border: '1px solid #f0f0f0' }}>
                                    <Space style={{ marginBottom: 4 }}>
                                      <Users size={14} color="#52c41a" />
                                      <Text strong>Điểm các thành viên trong nhóm</Text>
                                    </Space>
                                    <List
                                      size="small"
                                      style={{ marginTop: 4 }}
                                      dataSource={groupMembers}
                                      renderItem={member => (
                                        <List.Item>
                                          <Space>
                                            <Text>{member.student?.HoTen} ({member.student?.MaSV})</Text>
                                            <Tag color="success">
                                              {member.grade?.Diem ?? '—'}/10
                                            </Tag>
                                          </Space>
                                        </List.Item>
                                      )}
                                    />
                                  </div>
                                )}

                                <Descriptions column={1} size="small" bordered style={{ background: '#fafafa', borderRadius: 8 }}>
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
        title={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              Tiến độ: {selectedSubmission?.registration?.Nhom?.TenNhom ? `Nhóm ${selectedSubmission.registration.Nhom.TenNhom}` : (selectedSubmission?.student?.HoTen || 'N/A')}
            </span>
          </div>
        }
        width={isMobile ? '100vw' : 550}
        placement="right"
        onClose={() => setProgressDrawerVisible(false)}
        open={progressDrawerVisible}
      >
        {progressLoading ? (
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
                      <div style={{ marginTop: 8 }}>
                        {dismissedDrawerWarnings.has(item._id) ? (
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                            onClick={() => setDismissedDrawerWarnings(prev => { const next = new Set(prev); next.delete(item._id); return next; })}
                            title="Hiển thị lại cảnh báo"
                          >
                            <ExclamationCircleFilled style={{ color: '#ff4d4f', fontSize: 16 }} />
                            <Text type="danger" style={{ fontSize: 12 }}>Cảnh báo ({item.CanhBaoTienDo.length})</Text>
                          </div>
                        ) : (
                          <Alert
                            type="error"
                            showIcon
                            closable
                            onClose={() => setDismissedDrawerWarnings(prev => new Set(prev).add(item._id))}
                            message="Cảnh báo"
                            description={
                              <ul style={{ margin: 0, paddingLeft: 16 }}>
                                {item.CanhBaoTienDo.map((warn, idx) => (
                                  <li key={idx}><Text>{formatWarningLabel(warn)}</Text></li>
                                ))}
                              </ul>
                            }
                          />
                        )}
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
        width={isMobile ? '95vw' : 700}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Title level={5} style={{ margin: 0 }}>Rubrics tuần</Title>
              <Button size="small" onClick={handleAiSuggestWeekly} loading={weeklyAiLoading}>
                AI gợi ý điểm (PhoBERT)
              </Button>
            </div>
            {weeklyAiScore != null && (
              <Alert
                type="info" showIcon style={{ marginBottom: 12 }}
                message={`AI gợi ý: ${weeklyAiScore}/10 — chỉ tham khảo, giảng viên quyết định điểm cuối.`}
              />
            )}
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
