import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, InputNumber, Space, Typography, Table, Tag, Modal, message, Tabs, Empty, Badge, Popconfirm, Alert, Descriptions } from 'antd';
import { Plus, Trash2, Trophy, Code2, ListChecks, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const EntranceTestManager = () => {
  const { deTaiId } = useParams();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [topic, setTopic] = useState(null);
  const [baiTest, setBaiTest] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state tạo bài test
  const [tieuDe, setTieuDe] = useState('');
  const [moTa, setMoTa] = useState('');
  const [thoiGianLam, setThoiGianLam] = useState(30);
  const [cauHoi, setCauHoi] = useState([]);

  useEffect(() => { fetchData(); }, [deTaiId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Lấy thông tin đề tài
      const topics = await aiApiService.getTopics();
      const found = (Array.isArray(topics) ? topics : topics.data || []).find(t => t._id === deTaiId);
      setTopic(found);

      // Lấy bài test nếu có
      try {
        const test = await aiApiService.getBaiTestByTopic(deTaiId);
        setBaiTest(test);
        // Lấy kết quả
        const res = await aiApiService.getTestResults(test._id);
        setResults(res || []);
      } catch (e) {
        setBaiTest(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
        thoiGianLam
      });
      message.success('Tạo bài test thành công!');
      fetchData();
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
      fetchData();
    } catch (e) {
      message.error(e.response?.data?.error || 'Lỗi');
    }
  };

  // Xóa bài test
  const handleDelete = async () => {
    try {
      await aiApiService.deleteBaiTest(baiTest._id);
      message.success('Đã xóa bài test');
      setBaiTest(null);
      setResults([]);
    } catch (e) {
      message.error('Lỗi xóa');
    }
  };

  // Bảng kết quả
  const resultColumns = [
    {
      title: 'Hạng',
      key: 'rank',
      width: 60,
      render: (_, __, idx) => {
        const icons = ['🥇', '🥈', '🥉'];
        return <Text strong style={{ fontSize: 18 }}>{icons[idx] || idx + 1}</Text>;
      }
    },
    {
      title: 'Sinh Viên',
      key: 'student',
      render: (_, r) => <Text strong>{r.SinhVien?.HoTen || 'N/A'} ({r.SinhVien?.MaSV})</Text>,
    },
    {
      title: 'Tổng Điểm',
      key: 'score',
      width: 120,
      align: 'center',
      render: (_, r) => (
        <Text strong style={{ fontSize: 18, color: '#eb2f96' }}>
          {r.TongDiem} / {r.DiemToiDa}
        </Text>
      ),
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
    {
      title: '',
      key: 'action',
      width: 120,
      render: (_, r, idx) => idx === 0 && baiTest?.TrangThai === 'MoNop' ? (
        <Popconfirm title="Chọn nhóm này là người thắng?" onConfirm={() => handleSelectWinner(r)}>
          <Button type="primary" size="small" icon={<Trophy size={14} />}>Chọn</Button>
        </Popconfirm>
      ) : null,
    },
  ];

  if (loading) return <Card loading />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}><Space><ListChecks size={24} /> Quản Lý Bài Test Cạnh Tranh</Space></Title>
        <Button icon={<ArrowLeft size={14} />} onClick={() => navigate('/lecturer/topics')}>Quay về Đề Tài</Button>
      </div>
      {topic && (
        <Alert message={`Đề tài: ${topic.TenDeTai}`} type="info" showIcon style={{ marginBottom: 16 }} />
      )}

      {baiTest ? (
        // === ĐÃ CÓ BÀI TEST ===
        <Tabs items={[
          {
            key: 'info',
            label: `📋 Thông tin (${baiTest.CauHoi?.length || 0} câu)`,
            children: (
              <Card>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="Tiêu đề">{baiTest.TieuDe}</Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    <Tag color={baiTest.TrangThai === 'MoNop' ? 'green' : 'red'}>{baiTest.TrangThai}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Thời gian">{baiTest.ThoiGianLam} phút</Descriptions.Item>
                  <Descriptions.Item label="Số câu">{baiTest.CauHoi?.length || 0}</Descriptions.Item>
                </Descriptions>
                <Popconfirm title="Xóa bài test này?" onConfirm={handleDelete}>
                  <Button danger style={{ marginTop: 16 }} icon={<Trash2 size={14} />}>Xóa bài test</Button>
                </Popconfirm>
              </Card>
            )
          },
          {
            key: 'results',
            label: <Badge count={results.length} offset={[10, 0]}>🏆 Bảng Xếp Hạng</Badge>,
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
