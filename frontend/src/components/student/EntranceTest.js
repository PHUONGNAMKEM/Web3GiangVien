import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Radio, Space, Typography, Tag, Alert, Spin, Progress, Statistic, Result, Descriptions, message } from 'antd';
import { Clock, Send, Code2, CheckCircle, ShieldCheck } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';

const { Title, Text, Paragraph } = Typography;
const { Countdown } = Statistic;

const EntranceTest = () => {
  const { deTaiId } = useParams();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [baiTest, setBaiTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => { fetchTest(); }, [deTaiId]);

  const fetchTest = async () => {
    try {
      setLoading(true);
      // Kiểm tra đã nộp chưa
      const check = await aiApiService.checkTestSubmitted(deTaiId, user.id);
      if (check.submitted) {
        setSubmitted(true);
        setResult(check.result);
        return;
      }
      // Lấy bài test (ẩn đáp án)
      const test = await aiApiService.getBaiTestForStudent(deTaiId);
      setBaiTest(test);
    } catch (e) {
      console.error(e);
      message.error(e.response?.data?.error || 'Không thể tải bài test');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    setStarted(true);
    setStartTime(new Date());
  };

  const handleAnswer = (idx, value) => {
    setAnswers({ ...answers, [idx]: value });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Chuyển answers object thành array theo thứ tự
      const traLoi = [];
      for (let i = 0; i < baiTest.CauHoi.length; i++) {
        traLoi.push(answers[i] || '');
      }

      const res = await aiApiService.submitBaiTest(baiTest._id, {
        sinhVienId: user.id,
        traLoi,
        thoiGianBatDau: startTime?.toISOString()
      });

      setSubmitted(true);
      setResult({ ...res.data, isDat: res.isDat, phanTram: res.phanTram, nguongDat: res.nguongDat, autoResult: res.autoResult });

      if (res.isDat) {
        message.success('Chúc mừng! Bạn đạt ngưỡng yêu cầu, đề tài đã được duyệt tự động! 🎉');
      } else {
        message.warning('Bạn chưa đạt ngưỡng yêu cầu bài test.');
      }
    } catch (e) {
      message.error(e.response?.data?.error || 'Lỗi nộp bài');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    message.warning('Hết thời gian! Bài test sẽ được nộp tự động.');
    handleSubmit();
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  // Đã nộp → hiển thị kết quả
  if (submitted && result) {
    const percent = result.DiemToiDa > 0 ? Math.round((result.TongDiem / result.DiemToiDa) * 100) : 0;
    const isDat = result.isDat != null ? result.isDat : percent >= 75;
    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <Result
          status={isDat ? 'success' : 'warning'}
          title={isDat ? `Đạt! ${result.TongDiem} / ${result.DiemToiDa} điểm (${percent}%)` : `Chưa đạt! ${result.TongDiem} / ${result.DiemToiDa} điểm (${percent}%)`}
          subTitle={isDat
            ? `Bạn đạt ngưỡng ${result.nguongDat || 75}% — Đề tài đã được duyệt tự động!`
            : `Ngưỡng yêu cầu: ${result.nguongDat || 75}%. Bạn cần đạt điểm cao hơn.`
          }
        />
        <Card>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Tổng điểm">
              <Text strong style={{ fontSize: 18, color: '#eb2f96' }}>{result.TongDiem} / {result.DiemToiDa}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian nộp">{new Date(result.ThoiGianNop).toLocaleString('vi-VN')}</Descriptions.Item>
            {result.TxHash && (
              <Descriptions.Item label="Blockchain">
                <Tag color="green" icon={<ShieldCheck size={10} />} style={{ cursor: 'pointer' }}
                  onClick={() => { if (!result.TxHash.startsWith('0xMock')) window.open(`https://sepolia.etherscan.io/tx/${result.TxHash}`, '_blank'); }}>
                  {result.TxHash.substring(0, 18)}...
                </Tag>
              </Descriptions.Item>
            )}
          </Descriptions>

          <Title level={5} style={{ marginTop: 16 }}>Chi tiết từng câu</Title>
          {(result.TraLoi || []).map((tl, i) => (
            <div key={i} style={{ padding: '8px 12px', marginBottom: 4, background: tl.DungSai ? '#f6ffed' : (tl.AI_Similarity >= 0.65 ? '#e6f7ff' : '#fff2f0'), borderRadius: 6, border: '1px solid #f0f0f0' }}>
              <Space>
                <Tag color={tl.LoaiCauHoi === 'TracNghiem' ? 'blue' : 'purple'}>{tl.LoaiCauHoi}</Tag>
                <Text>Câu {i + 1}:</Text>
                <Text strong style={{ color: tl.Diem > 0 ? '#52c41a' : '#f5222d' }}>{tl.Diem} / {tl.DiemToiDa}</Text>
                {tl.AI_Similarity != null && <Text type="secondary">Similarity: {Math.round(tl.AI_Similarity * 100)}%</Text>}
              </Space>
            </div>
          ))}

          <Button type="primary" style={{ marginTop: 16 }} onClick={() => navigate('/student/register')}>
            Quay lại Đăng Ký Đề Tài
          </Button>
        </Card>
      </div>
    );
  }

  if (!baiTest) return <Alert message="Không tìm thấy bài test cho đề tài này" type="error" showIcon />;

  // Chưa bắt đầu
  if (!started) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card style={{ borderTop: '4px solid #722ed1', textAlign: 'center' }}>
          <Title level={3}>{baiTest.TieuDe}</Title>
          {baiTest.MoTa && <Paragraph type="secondary">{baiTest.MoTa}</Paragraph>}

          <Descriptions column={1} bordered size="small" style={{ textAlign: 'left', marginBottom: 24 }}>
            <Descriptions.Item label="Đề tài">{baiTest.DeTai?.TenDeTai || deTaiId}</Descriptions.Item>
            <Descriptions.Item label="Số câu hỏi">{baiTest.soCauHoi || baiTest.CauHoi?.length} câu</Descriptions.Item>
            <Descriptions.Item label="Thời gian">{baiTest.ThoiGianLam} phút</Descriptions.Item>
          </Descriptions>

          <Alert message="Lưu ý: Bạn chỉ được nộp 1 lần. Kết quả sẽ được ghi lên Blockchain." type="warning" showIcon style={{ marginBottom: 16, textAlign: 'left' }} />

          <Button type="primary" size="large" onClick={handleStart}
            style={{ width: '100%', height: 50, fontSize: 16, background: '#722ed1', borderColor: '#722ed1' }}>
            Bắt Đầu Làm Bài
          </Button>
        </Card>
      </div>
    );
  }

  // Đang làm bài
  const deadline = startTime ? new Date(startTime.getTime() + baiTest.ThoiGianLam * 60000).getTime() : 0;
  const answeredCount = Object.keys(answers).length;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header cố định */}
      <Card size="small" style={{ marginBottom: 16, position: 'sticky', top: 0, zIndex: 10, borderTop: '3px solid #722ed1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Title level={4} style={{ margin: 0 }}>{baiTest.TieuDe}</Title>
            <Tag color="blue">{answeredCount} / {baiTest.CauHoi.length} đã trả lời</Tag>
          </Space>
          <Space>
            <Clock size={16} />
            <Countdown value={deadline} onFinish={handleTimeUp} format="mm:ss" valueStyle={{ fontSize: 20, color: '#f5222d', fontWeight: 700 }} />
          </Space>
        </div>
        <Progress percent={Math.round((answeredCount / baiTest.CauHoi.length) * 100)} size="small" style={{ marginTop: 8 }} />
      </Card>

      {/* Câu hỏi */}
      {baiTest.CauHoi.map((q, idx) => (
        <Card key={idx} style={{ marginBottom: 12, borderLeft: answers[idx] ? '4px solid #52c41a' : '4px solid #d9d9d9' }}>
          <Space style={{ marginBottom: 8 }}>
            <Tag color={q.LoaiCauHoi === 'TracNghiem' ? 'blue' : 'purple'}>
              {q.LoaiCauHoi === 'TracNghiem' ? 'Trắc Nghiệm' : 'Code'}
            </Tag>
            <Text strong>Câu {idx + 1}</Text>
            <Text type="secondary">({q.Diem} điểm)</Text>
          </Space>

          <Paragraph style={{ fontSize: 15, marginBottom: 12 }}>{q.NoiDung}</Paragraph>

          {q.LoaiCauHoi === 'TracNghiem' && (
            <Radio.Group value={answers[idx]} onChange={e => handleAnswer(idx, e.target.value)}>
              <Space direction="vertical">
                {(q.LuaChon || []).map((choice, cIdx) => (
                  <Radio key={cIdx} value={String.fromCharCode(65 + cIdx)}
                    style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #f0f0f0', width: '100%' }}>
                    {choice || `Lựa chọn ${String.fromCharCode(65 + cIdx)}`}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          )}

          {q.LoaiCauHoi === 'Code' && (
            <div>
              <Space style={{ marginBottom: 8 }}>
                <Code2 size={14} />
                <Text type="secondary">Ngôn ngữ: {q.NgonNgu || 'python'}</Text>
              </Space>
              <Editor
                height="250px"
                language={q.NgonNgu || 'python'}
                value={answers[idx] || ''}
                onChange={v => handleAnswer(idx, v || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true
                }}
              />
            </div>
          )}
        </Card>
      ))}

      {/* Nút nộp bài */}
      <Card style={{ borderTop: '3px solid #eb2f96' }}>
        <Alert message={`Bạn đã trả lời ${answeredCount} / ${baiTest.CauHoi.length} câu`}
          type={answeredCount === baiTest.CauHoi.length ? 'success' : 'warning'} showIcon style={{ marginBottom: 16 }} />
        <Button type="primary" size="large" icon={<Send size={16} />} onClick={handleSubmit}
          loading={submitting} style={{ width: '100%', height: 50, fontSize: 16 }}>
          {submitting ? 'Đang chấm điểm & ghi Blockchain...' : 'Nộp Bài Test'}
        </Button>
      </Card>
    </div>
  );
};

export default EntranceTest;
