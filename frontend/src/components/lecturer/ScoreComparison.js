import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Tag, Typography, Space, Statistic, Row, Col, Select, Empty, Spin, Tooltip, Drawer, Descriptions, Badge } from 'antd';
import { BarChart2, TrendingUp, TrendingDown, Equal, ShieldCheck, BrainCircuit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';

const { Title, Text, Paragraph } = Typography;

const ScoreComparison = () => {
  const [loading, setLoading] = useState(true);
  const [comparisons, setComparisons] = useState([]);
  const [stats, setStats] = useState({});
  const [topicFilter, setTopicFilter] = useState('all');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const user = authService.getCurrentUser();

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await aiApiService.getScoreComparison(user.id);
      setComparisons(data.comparisons || []);
      setStats(data.stats || {});
    } catch (e) {
      console.error('Lỗi lấy dữ liệu so sánh:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Lọc theo đề tài
  const filteredData = topicFilter === 'all'
    ? comparisons
    : comparisons.filter(c => c.topic?._id === topicFilter);

  // Danh sách đề tài unique cho filter
  const topicOptions = [...new Map(comparisons.map(c => [c.topic?._id, c.topic])).values()];

  // Data cho biểu đồ
  const chartData = filteredData.map((c, idx) => ({
    name: c.student?.MaSV || `SV${idx + 1}`,
    'Điểm GV': c.gvScore,
    'Điểm AI': c.aiScore,
  }));

  const getDiffTag = (diff) => {
    if (Math.abs(diff) < 0.5) return <Tag color="green">Khớp</Tag>;
    if (diff > 0) return <Tag color="blue">GV +{diff}</Tag>;
    return <Tag color="orange">AI +{Math.abs(diff)}</Tag>;
  };

  const columns = [
    {
      title: '#',
      key: 'index',
      width: 40,
      align: 'center',
      render: (_, __, idx) => <Text type="secondary">{idx + 1}</Text>,
    },
    {
      title: 'Sinh Viên',
      key: 'student',
      width: 140,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.student?.HoTen || 'N/A'}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.student?.MaSV || ''}</Text>
        </Space>
      ),
    },
    {
      title: 'Đề Tài',
      key: 'topic',
      width: 220,
      render: (_, r) => (
        <Text style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4' }}>
          {r.topic?.TenDeTai || 'N/A'}
        </Text>
      ),
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Điểm AI</span>,
      key: 'aiScore',
      width: 80,
      align: 'center',
      sorter: (a, b) => a.aiScore - b.aiScore,
      render: (_, r) => <Text style={{ color: '#1677ff', fontWeight: 700, fontSize: 15 }}>{r.aiScore}</Text>,
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Điểm GV</span>,
      key: 'gvScore',
      width: 80,
      align: 'center',
      sorter: (a, b) => a.gvScore - b.gvScore,
      render: (_, r) => <Text style={{ color: '#eb2f96', fontWeight: 700, fontSize: 15 }}>{r.gvScore}</Text>,
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Chênh Lệch</span>,
      key: 'diff',
      width: 90,
      align: 'center',
      sorter: (a, b) => Math.abs(b.diff) - Math.abs(a.diff),
      render: (_, r) => getDiffTag(r.diff),
    },
    {
      title: 'Rubrics',
      key: 'rubrics',
      width: 80,
      align: 'center',
      render: (_, r) => r.rubricsDetail?.length > 0
        ? <Tag color="purple" style={{ margin: 0 }}>{r.rubricsDetail.length} TC</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: '',
      key: 'action',
      width: 60,
      align: 'center',
      render: (_, r) => (
        <a onClick={() => { setSelectedRecord(r); setDrawerVisible(true); }}>Chi tiết</a>
      ),
    },
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /><br /><Text type="secondary">Đang tải dữ liệu...</Text></div>;
  }

  return (
    <div>
      <Title level={3} style={{ marginBottom: 8 }}>
        <Space><BarChart2 size={24} /> So Sánh Điểm AI vs Giảng Viên</Space>
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Bảng tổng hợp so sánh điểm AI (PhoBERT) gợi ý với điểm Giảng viên chấm thực tế cho tất cả sinh viên đã được chấm điểm.
      </Paragraph>

      {/* Thống kê tổng quan */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Card size="small" style={{ borderTop: '3px solid #1677ff' }}>
            <Statistic title="Số SV đã chấm" value={stats.totalGraded || 0} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Card size="small" style={{ borderTop: '3px solid #eb2f96' }}>
            <Statistic title="TB Điểm GV" value={stats.avgGV || 0} precision={2} valueStyle={{ color: '#eb2f96' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Card size="small" style={{ borderTop: '3px solid #1677ff' }}>
            <Statistic title="TB Điểm AI" value={stats.avgAI || 0} precision={2} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Card size="small" style={{ borderTop: '3px solid #faad14' }}>
            <Statistic title="TB Chênh Lệch" value={stats.avgAbsDiff || 0} precision={2} prefix={<TrendingUp size={14} />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Card size="small" style={{ borderTop: '3px solid #52c41a' }}>
            <Statistic title="Khớp (±0.5)" value={stats.matchCount || 0} suffix={`/ ${stats.totalGraded || 0}`} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Card size="small" style={{ borderTop: '3px solid #722ed1' }}>
            <Statistic title="GV cao hơn" value={stats.gvHigherCount || 0} valueStyle={{ color: '#722ed1' }} prefix={<TrendingUp size={14} />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4} xl={3}>
          <Card size="small" style={{ borderTop: '3px solid #fa8c16' }}>
            <Statistic title="AI cao hơn" value={stats.aiHigherCount || 0} valueStyle={{ color: '#fa8c16' }} prefix={<TrendingDown size={14} />} />
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ */}
      {chartData.length > 0 && (
        <Card title="Biểu Đồ So Sánh" style={{ marginBottom: 24 }} size="small">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis domain={[0, 10]} fontSize={12} />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="Điểm AI" fill="#1677ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Điểm GV" fill="#eb2f96" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Filter + Bảng */}
      <Card size="small">
        <Space style={{ marginBottom: 16 }}>
          <Text strong>Lọc theo đề tài:</Text>
          <Select
            value={topicFilter}
            onChange={setTopicFilter}
            style={{ width: 300 }}
            options={[
              { value: 'all', label: 'Tất cả đề tài' },
              ...topicOptions.map(t => ({ value: t?._id, label: t?.TenDeTai || 'N/A' }))
            ]}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="small"
          scroll={{ x: 800 }}
          locale={{ emptyText: <Empty description="Chưa có dữ liệu chấm điểm nào có điểm AI." /> }}
        />
      </Card>

      {/* Drawer chi tiết */}
      <Drawer
        title="Chi Tiết So Sánh"
        width={500}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        {selectedRecord && (
          <div>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Sinh viên">
                <Text strong>{selectedRecord.student?.HoTen}</Text> ({selectedRecord.student?.MaSV})
              </Descriptions.Item>
              <Descriptions.Item label="Đề tài">{selectedRecord.topic?.TenDeTai}</Descriptions.Item>
              <Descriptions.Item label="Điểm GV">
                <Text style={{ color: '#eb2f96', fontWeight: 700, fontSize: 18 }}>{selectedRecord.gvScore}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Điểm AI">
                <Text style={{ color: '#1677ff', fontWeight: 700, fontSize: 18 }}>{selectedRecord.aiScore}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Chênh lệch">{getDiffTag(selectedRecord.diff)}</Descriptions.Item>
              <Descriptions.Item label="Ngày chấm">{new Date(selectedRecord.gradedAt).toLocaleString('vi-VN')}</Descriptions.Item>
              {selectedRecord.txHash && (
                <Descriptions.Item label="Blockchain">
                  <Tooltip title="Xem trên Etherscan">
                    <Tag color="green" style={{ cursor: 'pointer' }}
                      onClick={() => { if (!selectedRecord.txHash.startsWith('0xMock')) window.open(`https://sepolia.etherscan.io/tx/${selectedRecord.txHash}`, '_blank'); }}>
                      {selectedRecord.txHash.substring(0, 16)}...
                    </Tag>
                  </Tooltip>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedRecord.feedback && (
              <Card size="small" title="Nhận xét GV" style={{ marginBottom: 12 }}>
                <Paragraph>{selectedRecord.feedback}</Paragraph>
              </Card>
            )}

            {selectedRecord.aiFeedback && (
              <Card size="small" title="Phản hồi AI" style={{ marginBottom: 12 }}>
                <Paragraph>{selectedRecord.aiFeedback}</Paragraph>
              </Card>
            )}

            {selectedRecord.rubricsDetail?.length > 0 && (
              <Card size="small" title={`Rubrics Chi Tiết (${selectedRecord.rubricsDetail.length} tiêu chí)`}>
                {selectedRecord.rubricsDetail.map((r, idx) => (
                  <div key={idx} style={{ padding: '8px 0', borderBottom: idx < selectedRecord.rubricsDetail.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Space>
                        <Text strong>{r.criteria}</Text>
                        <Tag color="blue">{r.weight}%</Tag>
                      </Space>
                      <Text type="secondary">/{r.maxScore || 10}</Text>
                    </div>
                    <Space size={16}>
                      <Text style={{ color: '#1677ff' }}>AI: {r.aiScore ?? '—'}</Text>
                      <Text style={{ color: '#eb2f96' }}>GV: {r.gvScore ?? '—'}</Text>
                      {r.aiScore != null && r.gvScore != null && (
                        getDiffTag(Math.round(((r.gvScore || 0) - (r.aiScore || 0)) * 100) / 100)
                      )}
                    </Space>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default ScoreComparison;
