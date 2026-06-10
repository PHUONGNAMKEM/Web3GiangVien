import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, InputNumber, Space, Typography, Table, Tag, Modal, message, Tabs, Empty, Badge, Popconfirm, Alert, Descriptions, Tooltip } from 'antd';
import { Plus, Trash2, Trophy, Code2, ListChecks, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const EntranceTestManager = () => {
  const { deTaiId } = useParams();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [viewedCount, setViewedCount] = useState(() => parseInt(localStorage.getItem(`test_viewed_${deTaiId}`)) || 0);

  const [tieuDe, setTieuDe] = useState('');
  const [moTa, setMoTa] = useState('');
  const [thoiGianLam, setThoiGianLam] = useState(30);
  const [nguongDat, setNguongDat] = useState(75);
  const [cauHoi, setCauHoi] = useState([]);

  const { data: testData = {}, isLoading: loading } = useQuery({
    queryKey: ['entrance-test', deTaiId, user?.id],
    queryFn: async () => {
      const data = { topic: null, baiTest: null, results: [], registrations: [] };
      try {
        const topics = await aiApiService.getTopics();
        const found = (Array.isArray(topics) ? topics : topics.data || []).find(t => t._id === deTaiId);
        data.topic = found;

        try {
          const test = await aiApiService.getBaiTestByTopic(deTaiId);
          if (test) {
            data.baiTest = test;
            const res = await aiApiService.getTestResults(test._id);
            data.results = res || [];
            try {
              const regs = await aiApiService.getRegistrationsByLecturer(user.id);
              data.registrations = (regs || []).filter(r => {
                const rid = r.DeTai?._id || r.DeTai;
                return rid && rid.toString() === deTaiId;
              });
            } catch (e) {
              // Ignore
            }
          }
        } catch (e) {
          // Ignore, no test found
        }
      } catch (e) {
        console.error(e);
      }
      return data;
    },
    enabled: !!deTaiId && !!user?.id,
  });

  const { topic = null, baiTest = null, results = [], registrations = [] } = testData;

  useEffect(() => {
    if (activeTab === 'results' && results.length > 0) {
      setViewedCount(results.length);
      localStorage.setItem(`test_viewed_${deTaiId}`, results.length);
    }
  }, [activeTab, results.length, deTaiId]);

  const unreadCount = Math.max(0, results.length - viewedCount);

  // Thêm câu hỏi
  const addTracNghiem = () => {
    setCauHoi([...cauHoi, {
      LoaiCauHoi: 'TracNghiem',
      NoiDung: '',
      LuaChon: ['', '', '', ''],
      DapAnDung: 'A',
      Diem: 1
    }]);
  };

  const addCode = () => {
    setCauHoi([...cauHoi, {
      LoaiCauHoi: 'Code',
      NoiDung: '',
      NgonNgu: 'python',
      DapAnMau: '',
      Diem: 2
    }]);
  };

  const removeCauHoi = (idx) => {
    setCauHoi(cauHoi.filter((_, i) => i !== idx));
  };

  const updateCauHoi = (idx, field, value) => {
    const updated = [...cauHoi];
    updated[idx] = { ...updated[idx], [field]: value };
    setCauHoi(updated);
  };

  const updateLuaChon = (qIdx, cIdx, value) => {
    const updated = [...cauHoi];
    const choices = [...updated[qIdx].LuaChon];
    choices[cIdx] = value;
    updated[qIdx] = { ...updated[qIdx], LuaChon: choices };
    setCauHoi(updated);
  };

  // Tạo bài test
  const handleCreate = async () => {
    if (cauHoi.length === 0) { message.warning('Hãy thêm ít nhất 1 câu hỏi'); return; }
    setSaving(true);
    try {
      await aiApiService.createBaiTest({
        deTaiId,
        tieuDe: tieuDe || `Bài test: ${topic?.TenDeTai || ''}`,
        moTa,
        cauHoi,
        thoiGianLam,
        nguongDat
      });
      message.success('Tạo bài test thành công!');
      queryClient.invalidateQueries({ queryKey: ['entrance-test', deTaiId] });
    } catch (e) {
      message.error(e.response?.data?.error || 'Lỗi tạo bài test');
    } finally {
      setSaving(false);
    }
  };

  // Chọn nhóm thắng
  const handleSelectWinner = async (result) => {
    try {
      await aiApiService.selectTestWinner(baiTest._id, result.DangKyDeTai || result._id);
      message.success('Đã chọn nhóm thắng!');
      queryClient.invalidateQueries({ queryKey: ['entrance-test', deTaiId] });
    } catch (e) {
      message.error(e.response?.data?.error || 'Lỗi');
    }
  };

  // Xóa bài test
  const handleDelete = async () => {
    try {
      await aiApiService.deleteBaiTest(baiTest._id);
      message.success('Đã xóa bài test');
      queryClient.invalidateQueries({ queryKey: ['entrance-test', deTaiId] });
    } catch (e) {
      message.error('Lỗi xóa');
    }
  };

  // Bảng kết quả
  const resultColumns = [
    {
      title: 'STT',
      key: 'rank',
      width: 50,
      render: (_, __, idx) => <Text strong>{idx + 1}</Text>
    },
    {
      title: 'Nhóm / Sinh Viên',
      key: 'student',
      render: (_, r) => (
        <div>
          <Text strong>{r.SinhVien?.HoTen || 'N/A'} ({r.SinhVien?.MaSV})</Text>
          {r.Nhom && <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>{r.Nhom.TenNhom || 'Nhóm'}</Tag>}
        </div>
      ),
    },
    {
      title: 'Tổng Điểm',
      key: 'score',
      width: 110,
      align: 'center',
      render: (_, r) => {
        const pct = r.DiemToiDa > 0 ? Math.round((r.TongDiem / r.DiemToiDa) * 100) : 0;
        return (
          <div>
            <Text strong style={{ fontSize: 16, color: '#eb2f96' }}>{r.TongDiem} / {r.DiemToiDa}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{pct}%</Text>
          </div>
        );
      },
    },
    {
      title: 'Kết quả',
      key: 'result',
      width: 140,
      align: 'center',
      render: (_, r) => {
        const pct = r.DiemToiDa > 0 ? Math.round((r.TongDiem / r.DiemToiDa) * 100) : 0;
        const threshold = baiTest?.NguongDat || 75;
        const passed = pct >= threshold;
        // Check competition status from DangKyDeTai
        const regStatus = registrations.find(reg =>
          reg.Nhom?._id === r.Nhom?._id || reg.SinhVien?._id === r.SinhVien?._id
        );
        const isWinner = regStatus?.TrangThai === 'DaDuyet';
        const isLost = regStatus?.TrangThai === 'Thua';

        if (isWinner) return <Tag color="gold" style={{ fontSize: 13 }}>🏆 WINNER</Tag>;
        if (isLost) return <Tag color="default" style={{ fontSize: 13 }}>😞 Thua</Tag>;
        return <Tag color={passed ? 'success' : 'error'} style={{ fontSize: 13 }}>{passed ? `✅ Đạt (≥${threshold}%)` : `❌ Không đạt`}</Tag>;
      },
    },
    {
      title: 'Lần nộp',
      key: 'soLanNop',
      width: 80,
      align: 'center',
      render: (_, r) => <Tag color="purple">{r.SoLanNop || 1}/3</Tag>,
    },
    {
      title: 'Chi Tiết',
      key: 'detail',
      render: (_, r) => (
        <Space>
          {(r.TraLoi || []).map((tl, i) => (
            <Tag key={i} color={tl.DungSai ? 'green' : tl.AI_Similarity >= 0.65 ? 'blue' : 'red'}>
              C{i + 1}: {tl.Diem}/{tl.DiemToiDa}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Blockchain',
      key: 'tx',
      width: 100,
      render: (_, r) => r.TxHash
        ? <Tag color="green" icon={<ShieldCheck size={10} />}>On-chain</Tag>
        : <Tag color="default">Chưa ghi</Tag>,
    },
  ];

  if (loading) return <Card loading />;

  const hasWinner = registrations.some(r => r.TrangThai === 'DaDuyet');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}><Space><ListChecks style={{ verticalAlign: 'middle' }} size={24} /> Quản Lý Bài Test Cạnh Tranh</Space></Title>
        <Button icon={<ArrowLeft size={14} />} onClick={() => navigate('/lecturer/topics')}>Quay về Đề Tài</Button>
      </div>
      {topic && (
        <Alert message={`Đề tài: ${topic.TenDeTai}`} type="info" showIcon style={{ marginBottom: 16 }} />
      )}

      {baiTest ? (
        // === ĐÃ CÓ BÀI TEST ===
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          {
            key: 'info',
            label: `📋 Thông tin (${baiTest.CauHoi?.length || 0} câu)`,
            children: (
              <Card>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="Tiêu đề">{baiTest.TieuDe}</Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    <Tag color={baiTest.TrangThai === 'MoNop' ? 'green' : 'red'}>{baiTest.TrangThai === 'MoNop' ? 'Đang mở' : 'Đã đóng'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Thời gian">{baiTest.ThoiGianLam} phút</Descriptions.Item>
                  <Descriptions.Item label="Số câu">{baiTest.CauHoi?.length || 0}</Descriptions.Item>
                  <Descriptions.Item label="Ngưỡng đạt" span={2}>
                    <Tag color="blue" style={{ fontSize: 14 }}>≥ {baiTest.NguongDat || 75}%</Tag>
                    <Text type="secondary" style={{ marginLeft: 8 }}>SV đạt ngưỡng sẽ được duyệt tự động</Text>
                  </Descriptions.Item>
                </Descriptions>

                {/* Chi tiết câu hỏi */}
                <Title level={5} style={{ marginTop: 20 }}>Chi tiết câu hỏi</Title>
                {(baiTest.CauHoi || []).map((q, idx) => (
                  <Card key={idx} size="small" style={{ marginBottom: 8, borderLeft: `4px solid ${q.LoaiCauHoi === 'TracNghiem' ? '#1677ff' : '#722ed1'}` }}>
                    <Space style={{ marginBottom: 8 }}>
                      <Tag color={q.LoaiCauHoi === 'TracNghiem' ? 'blue' : 'purple'}>
                        {q.LoaiCauHoi === 'TracNghiem' ? 'Trắc Nghiệm' : 'Code'}
                      </Tag>
                      <Text strong>Câu {idx + 1}</Text>
                      <Text type="secondary">({q.Diem} điểm)</Text>
                    </Space>
                    <Paragraph style={{ marginBottom: 8 }}>{q.NoiDung}</Paragraph>

                    {q.LoaiCauHoi === 'TracNghiem' && (
                      <div>
                        {(q.LuaChon || []).map((lc, cIdx) => {
                          const letter = String.fromCharCode(65 + cIdx);
                          const isCorrect = q.DapAnDung === letter;
                          return (
                            <div key={cIdx} style={{
                              padding: '4px 8px', marginBottom: 2, borderRadius: 4,
                              background: isCorrect ? '#f6ffed' : 'transparent',
                              border: isCorrect ? '1px solid #b7eb8f' : '1px solid #f0f0f0'
                            }}>
                              <Tag color={isCorrect ? 'green' : 'default'}>{letter}</Tag>
                              {lc}
                              {isCorrect && <Text type="success" style={{ marginLeft: 8 }}>✓ Đáp án đúng</Text>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.LoaiCauHoi === 'Code' && (
                      <div>
                        <Text type="secondary">Ngôn ngữ: {q.NgonNgu || 'python'}</Text>
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Đáp án mẫu:</Text>
                          <Editor height="150px" language={q.NgonNgu || 'python'} value={q.DapAnMau || ''}
                            theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }} />
                        </div>
                      </div>
                    )}
                  </Card>
                ))}

                <div style={{ marginTop: 16 }}>
                  {hasWinner ? (
                    <Tooltip title="Không thể xóa bài test vì đã có nhóm trúng tuyển đề tài.">
                      <Button danger disabled icon={<Trash2 size={14} />}>Xóa bài test</Button>
                    </Tooltip>
                  ) : (
                    <Popconfirm
                      title={results.length > 0 ? "Đã có sinh viên nộp bài. Nếu xóa, toàn bộ kết quả test sẽ bị mất. Bạn chắc chắn chứ?" : "Xóa bài test này?"}
                      onConfirm={handleDelete}
                      okText="Xóa"
                      cancelText="Hủy"
                    >
                      <Button danger icon={<Trash2 size={14} />}>Xóa bài test</Button>
                    </Popconfirm>
                  )}
                </div>
              </Card>
            )
          },
          {
            key: 'results',
            label: unreadCount > 0 ? <Badge count={unreadCount} offset={[10, 0]}>📊 Kết Quả Test</Badge> : '📊 Kết Quả Test',
            children: (
              <Table
                columns={resultColumns}
                dataSource={results}
                rowKey="_id"
                pagination={false}
                locale={{ emptyText: <Empty description="Chưa có SV nào nộp bài test" /> }}
              />
            )
          }
        ]} />
      ) : (
        // === TẠO BÀI TEST MỚI ===
        <Card title="Tạo Bài Test Đầu Vào" style={{ borderTop: '3px solid #722ed1' }}>
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Input placeholder="Tiêu đề bài test" value={tieuDe} onChange={e => setTieuDe(e.target.value)} size="large" />
            <TextArea placeholder="Mô tả bài test" value={moTa} onChange={e => setMoTa(e.target.value)} rows={2} />
            <Space>
              <Text>Thời gian làm bài:</Text>
              <InputNumber value={thoiGianLam} onChange={setThoiGianLam} min={5} max={180} addonAfter="phút" />
            </Space>
            <Space>
              <Text>Ngưỡng đạt (auto-duyệt):</Text>
              <InputNumber value={nguongDat} onChange={setNguongDat} min={0} max={100} addonAfter="%" />
              <Text type="secondary" style={{ fontSize: 12 }}>SV đạt ngưỡng này sẽ được duyệt tự động</Text>
            </Space>

            <Title level={5}>Câu Hỏi ({cauHoi.length})</Title>

            {cauHoi.map((q, idx) => (
              <Card key={idx} size="small" title={
                <Space>
                  <Tag color={q.LoaiCauHoi === 'TracNghiem' ? 'blue' : 'purple'}>{q.LoaiCauHoi === 'TracNghiem' ? 'Trắc Nghiệm' : 'Code'}</Tag>
                  <Text>Câu {idx + 1} — {q.Diem} điểm</Text>
                </Space>
              } extra={<Button danger size="small" icon={<Trash2 size={12} />} onClick={() => removeCauHoi(idx)} />}>
                <TextArea placeholder="Nội dung câu hỏi / đề bài" value={q.NoiDung}
                  onChange={e => updateCauHoi(idx, 'NoiDung', e.target.value)} rows={2} style={{ marginBottom: 8 }} />

                <InputNumber size="small" value={q.Diem} onChange={v => updateCauHoi(idx, 'Diem', v)} min={1} max={10} addonBefore="Điểm" style={{ marginBottom: 8 }} />

                {q.LoaiCauHoi === 'TracNghiem' && (
                  <div>
                    {['A', 'B', 'C', 'D'].map((letter, cIdx) => (
                      <Input key={letter} addonBefore={<Tag color={q.DapAnDung === letter ? 'green' : 'default'}
                        style={{ cursor: 'pointer' }} onClick={() => updateCauHoi(idx, 'DapAnDung', letter)}>{letter}</Tag>}
                        placeholder={`Lựa chọn ${letter}`} value={q.LuaChon?.[cIdx] || ''}
                        onChange={e => updateLuaChon(idx, cIdx, e.target.value)}
                        style={{ marginBottom: 4 }} />
                    ))}
                    <Text type="secondary" style={{ fontSize: 12 }}>Click vào chữ cái để chọn đáp án đúng. Đáp án đúng: <Tag color="green">{q.DapAnDung}</Tag></Text>
                  </div>
                )}

                {q.LoaiCauHoi === 'Code' && (
                  <div>
                    <Select value={q.NgonNgu} onChange={v => updateCauHoi(idx, 'NgonNgu', v)}
                      options={[
                        { value: 'python', label: 'Python' },
                        { value: 'javascript', label: 'JavaScript' },
                        { value: 'java', label: 'Java' },
                        { value: 'cpp', label: 'C++' }
                      ]} style={{ width: 150, marginBottom: 8 }} />
                    <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Đáp án mẫu (SBERT sẽ so sánh code SV với code này):</Text>
                    <Editor height="200px" language={q.NgonNgu} value={q.DapAnMau || ''}
                      onChange={v => updateCauHoi(idx, 'DapAnMau', v || '')}
                      theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 13 }} />
                  </div>
                )}
              </Card>
            ))}

            <Space>
              <Button icon={<Plus size={14} />} onClick={addTracNghiem}>Thêm Trắc Nghiệm</Button>
              <Button icon={<Code2 size={14} />} onClick={addCode} type="dashed">Thêm Câu Code</Button>
            </Space>

            <Button type="primary" size="large" onClick={handleCreate} loading={saving} disabled={cauHoi.length === 0}
              style={{ width: '100%', background: '#722ed1', borderColor: '#722ed1', color: '#fff' }}>
              Tạo Bài Test ({cauHoi.length} câu)
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default EntranceTestManager;
