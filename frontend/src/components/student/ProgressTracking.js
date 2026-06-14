import React, { useState, useEffect, useRef } from 'react';
import { Steps, Typography, Card, Alert, Progress as AntProgress, Row, Col, Divider, Skeleton, Tag, Space } from 'antd';
import { CheckCircle, Clock, Search, BookOpen, BrainCircuit } from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';
import { useIsMobile } from '../../hooks/useResponsive';
import { useClassContext } from '../../contexts/ClassContext';
import { useQuery } from '@tanstack/react-query';

const { Title, Paragraph, Text } = Typography;

const ProgressTracking = () => {
  const isMobile = useIsMobile();
  const { selectedClassId } = useClassContext();
  const user = authService.getCurrentUser();

  // --- State cho lần chấm AI "live" (chỉ chạy khi CHƯA có điểm GV / cache) ---
  const [liveAi, setLiveAi] = useState(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(null); // {percent,current,total,chunks,stage}
  const liveAiRunRef = useRef(null);   // dedupe: baoCaoId đã (đang) chạy live
  const progressTimerRef = useRef(null);

  // Query NHANH: KHÔNG gọi PhoBERT ở đây → trang hiển thị tức thì.
  // Chỉ lấy: đăng ký, điểm GV (kèm AI_Score), tiến độ tuần, và cache AI (nếu có).
  const { data = {}, isLoading: loading } = useQuery({
    queryKey: ['progress-tracking', user?.id, selectedClassId],
    queryFn: async () => {
      let result = {
        registration: null,
        finalGrade: null,
        latestProgress: null,
        storedAi: null,   // điểm AI đã có sẵn (từ điểm GV hoặc cache) → dùng ngay
        aiInputs: null    // dữ liệu để chạy live AI khi chưa có storedAi
      };
      if (!user || !selectedClassId) return result;

      try {
        const regRes = await aiApiService.getMyRegistration(user.id, selectedClassId);
        const activeReg = regRes.registration;
        result.registration = activeReg;

        if (activeReg && activeReg.TrangThai === 'DaDuyet') {
          const deTaiId = activeReg.DeTai?._id || activeReg.DeTai;

          // Điểm GV (có kèm AI_Score / AI_Feedback đã lưu)
          try {
            const diemRes = await aiApiService.getDiemBySinhVien(user.id);
            if (diemRes && diemRes.length > 0) {
              const topicGrade = diemRes.find(g => {
                const gDeTaiId = g.DeTai?._id || g.DeTai;
                return gDeTaiId && deTaiId && String(gDeTaiId) === String(deTaiId);
              });
              if (topicGrade) result.finalGrade = topicGrade;
            }
          } catch (e) {
            console.warn('Lỗi lấy điểm sinh viên:', e);
          }

          // Tiến độ tuần gần nhất
          try {
            const progressRes = await aiApiService.getProgressBySinhVien(user.id, deTaiId);
            const logs = progressRes?.data || [];
            const latest = [...logs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
            result.latestProgress = latest || null;
          } catch (err) {
            console.warn('Lỗi lấy tiến độ gần nhất:', err);
          }

          // Báo cáo + text đã trích + cache AI (KHÔNG gọi PhoBERT ở đây)
          try {
            const bcRes = await aiApiService.getMyBaoCao(user.id, deTaiId);
            if (bcRes && bcRes.baocao) {
              const topic = activeReg.DeTai;
              const baoCaoId = bcRes.baocao._id;

              let extracted = null;
              try {
                extracted = await aiApiService.getExtractedText(baoCaoId);
              } catch (extractErr) {
                console.warn('Không lấy được ExtractedText:', extractErr);
              }
              const aiCache = extracted?.aiCache || null;

              // 1) Ưu tiên cache AI (GV đã phân tích) → đầy đủ feedback/issues
              if (aiCache && aiCache.score != null) {
                result.storedAi = {
                  score: aiCache.score,
                  feedback: aiCache.feedback,
                  issues: aiCache.issues || [],
                  model: aiCache.model || 'vinai/phobert-base',
                  source: 'cache'
                };
              // 2) Kế đến điểm AI đã lưu trong điểm GV
              } else if (result.finalGrade?.AI_Score != null) {
                result.storedAi = {
                  score: result.finalGrade.AI_Score,
                  feedback: result.finalGrade.AI_Feedback,
                  issues: [],
                  model: 'vinai/phobert-base',
                  source: 'grade'
                };
              }

              // 3) Nếu CHƯA có điểm AI nào → chuẩn bị input để chạy live (có % tiến trình)
              if (!result.storedAi) {
                let textForAI = extracted?.ExtractedText || '';
                if (!textForAI) {
                  textForAI = [
                    `Đề tài: ${topic?.TenDeTai || ''}`,
                    topic?.MoTa ? `Mô tả: ${topic.MoTa}` : '',
                    (topic?.YeuCau || []).length > 0 ? `Yêu cầu: ${topic.YeuCau.join(', ')}` : ''
                  ].filter(Boolean).join('\n');
                }
                const hasRubrics = topic?.SuDungRubrics && topic?.Rubrics && topic.Rubrics.length > 0;
                result.aiInputs = {
                  baoCaoId,
                  textForAI,
                  hasRubrics,
                  rubrics: topic?.Rubrics || [],
                  requires: topic?.YeuCau || [],
                  pageCount: bcRes.baocao.PageCount || null
                };
              }
            }
          } catch (err) {
            console.warn('Lỗi kiểm tra báo cáo:', err);
          }
        }
      } catch (e) {
        console.error('Error fetching progress tracking:', e);
      }
      return result;
    },
    enabled: !!(user?.id && selectedClassId),
  });

  const { registration, finalGrade, latestProgress, storedAi, aiInputs } = data;
  const aiResult = storedAi || liveAi;

  const stopProgressPolling = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  // Dọn interval khi rời trang
  useEffect(() => () => stopProgressPolling(), []);

  // Chạy AI "live" CHỈ khi chưa có điểm AI sẵn — kèm thanh % thật.
  // Dedupe theo baoCaoId để không gọi lặp (an toàn cả với StrictMode).
  useEffect(() => {
    if (!aiInputs || storedAi) return;
    if (liveAiRunRef.current === aiInputs.baoCaoId) return;
    liveAiRunRef.current = aiInputs.baoCaoId;

    const jobId = (window.crypto?.randomUUID?.() || `job-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    setAiRunning(true);
    setAnalyzeProgress({ percent: 0, current: 0, total: 1, chunks: 0, stage: 'embedding_chunks' });

    stopProgressPolling();
    progressTimerRef.current = setInterval(async () => {
      try {
        const p = await aiApiService.getAnalyzeProgress(jobId);
        if (p && p.status !== 'unknown') setAnalyzeProgress(p);
        if (p && p.status === 'done') stopProgressPolling();
      } catch (e) { /* bỏ qua lỗi poll lẻ */ }
    }, 500);

    (async () => {
      try {
        const res = aiInputs.hasRubrics
          ? await aiApiService.analyzeReportWithRubrics(aiInputs.textForAI, aiInputs.rubrics, jobId)
          : await aiApiService.analyzeReportAI(aiInputs.textForAI, aiInputs.requires, jobId);
        setLiveAi(res);

        // Lưu cache bền DB → lần sau SV mở lại không phải chạy lại PhoBERT
        aiApiService.saveAiCache(aiInputs.baoCaoId, {
          isRubrics: aiInputs.hasRubrics,
          score: res.score,
          feedback: res.feedback,
          issues: res.issues || [],
          rubricsResult: res.rubrics_result || undefined,
          securityFlags: res.security_flags || [],
          repetitionRate: res.repetition_rate ?? null,
          model: res.model,
        }).catch(e => console.warn('Lưu AICache thất bại:', e?.message));
      } catch (e) {
        console.warn('Lỗi phân tích AI (live):', e);
      } finally {
        stopProgressPolling();
        setAiRunning(false);
      }
    })();
  }, [aiInputs, storedAi]);

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
  const aiStepDesc = aiResult
    ? `Điểm AI: ${aiResult.score}/10`
    : (aiRunning ? `Đang phân tích... ${analyzeProgress?.percent ?? 0}%` : 'Chờ nộp báo cáo');

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
        <Card style={{ marginBottom: 16, borderLeft: '4px solid #1677ff' }}>
          <Space>
            <BookOpen style={{ verticalAlign: 'middle' }} size={18} />
            <Text strong>Đề tài: {topicName}</Text>
            <Tag color={regStatus === 'DaDuyet' ? 'blue' : 'processing'}>
              {regStatus === 'DaDuyet' ? 'Đã Duyệt' : 'Chờ Duyệt'}
            </Tag>
          </Space>
          {topicRequires.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {topicRequires.map((t, i) => <Tag key={i} color="blue" style={{ margin: 0 }}>{t}</Tag>)}
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
              description: aiStepDesc,
              icon: <BrainCircuit size={24} color={aiResult ? '#1677ff' : undefined} />
            },
            {
              title: 'GV Đánh Giá',
              description: finalGrade ? `Điểm: ${finalGrade.Diem}/10` : 'Chờ chấm điểm',
              icon: <Search size={24} color={finalGrade ? '#1677ff' : undefined} />
            },
            {
              title: 'Blockchain',
              description: finalGrade?.TxHash ? 'Ghi hệ thống hoàn tất' : 'Chờ xác thực',
              icon: <Clock size={24} color={finalGrade?.TxHash ? '#1677ff' : undefined} />
            },
          ]}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<span><BrainCircuit size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Đánh giá từ AI (PhoBERT)</span>}
            bordered={false}
          >
            {aiRunning ? (
              <div style={{ padding: 16, textAlign: 'center' }}>
                <AntProgress
                  type="circle"
                  percent={analyzeProgress?.percent ?? 0}
                  size={120}
                  status="active"
                  strokeColor={{
                    '0%': '#4285F4',
                    '33%': '#EA4335',
                    '66%': '#FBBC05',
                    '100%': '#34A853',
                  }}
                />
                <div style={{ marginTop: 12 }}>
                  <Text type="secondary" style={{ display: 'block' }}>Đang phân tích bằng PhoBERT AI...</Text>
                  {analyzeProgress?.chunks > 0 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {analyzeProgress.stage === 'scoring' ? 'Đang chấm tiêu chí' : 'Đang đọc nội dung'}:{' '}
                      {analyzeProgress.current}/{analyzeProgress.total} phần
                      {' • '}{analyzeProgress.chunks} chunk
                      {aiInputs?.pageCount ? ` • ${aiInputs.pageCount} trang` : ''}
                    </Text>
                  )}
                </div>
              </div>
            ) : aiResult ? (
              <>
                <Alert
                  message={`Điểm AI PhoBERT: ${aiResult.score} / 10`}
                  description={
                    <div>
                      <Text>Phản hồi: {
                        (() => {
                          const fb = aiResult.feedback || '';
                          const sc = aiResult.score || 0;
                          const isStale = !fb || /^Phân tích \d+ tiêu chí qua \d+ phần nội dung/.test(fb) || (sc < 6 && fb.includes('xuất sắc'));
                          if (!isStale) return fb;
                          if (sc < 5) return `Báo cáo chưa đạt yêu cầu (${sc}/10). Cần bổ sung và cải thiện nội dung.`;
                          if (sc < 7) return `Báo cáo đạt mức trung bình (${sc}/10). Có thể nâng cao chất lượng nội dung thêm.`;
                          if (sc < 8.5) return `Báo cáo khá tốt (${sc}/10), đáp ứng phần lớn tiêu chí.`;
                          return `Báo cáo tốt (${sc}/10), đáp ứng đầy đủ các tiêu chí Rubrics.`;
                        })()
                      }</Text>
                      {aiResult.issues && aiResult.issues.length > 0 && (
                        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                          {aiResult.issues.map((iss, i) => (
                            <li key={i}><Text type="danger">{iss}</Text></li>
                          ))}
                        </ul>
                      )}
                    </div>
                  }
                  type={aiResult.score >= 7 ? 'success' : aiResult.score >= 5 ? 'info' : 'warning'}
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  <Tag color="cyan">Model: {aiResult.model || 'vinai/phobert-base'}</Tag>
                  <Tag color="geekblue">Provider: {aiResult.aiProvider || 'local-fastapi'}</Tag>
                </div>
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
            {latestProgress ? (
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
              strokeColor={finalGrade || aiResult ? '#1677ff' : '#d9d9d9'}
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
