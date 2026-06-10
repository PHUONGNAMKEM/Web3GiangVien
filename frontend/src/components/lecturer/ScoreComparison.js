import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Card, Tag, Typography, Space, Statistic, Row, Col, Select, Empty, Spin, Tooltip, Drawer, Descriptions, Badge, Tabs } from 'antd';
import { 
  BarChart2, TrendingUp, TrendingDown, ShieldCheck, BrainCircuit, 
  Users, Award, BookOpen, LayoutDashboard, Layers 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell,
  PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';
import { useIsMobile } from '../../hooks/useResponsive';
import { useLecturerClassContext } from '../../contexts/LecturerClassContext';
import { useQuery } from '@tanstack/react-query';

const { Title, Text, Paragraph } = Typography;

const CLASS_COLORS = ['#1677ff', '#eb2f96', '#722ed1', '#fa8c16', '#13c2c2', '#52c41a', '#faad14'];

const ScoreComparison = () => {
  const isMobile = useIsMobile();
  const { selectedClassId, setSelectedClassId } = useLecturerClassContext();
  const [topicFilter, setTopicFilter] = useState('all');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [activeTab, setActiveTab] = useState('1');

  const user = authService.getCurrentUser();

  const { data: comparisons = [], isLoading: loading } = useQuery({
    queryKey: ['score-comparison', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const data = await aiApiService.getScoreComparison(user.id);
      return data.comparisons || [];
    },
    enabled: !!user?.id,
  });

  // Reset topic filter when class changes
  useEffect(() => {
    setTopicFilter('all');
  }, [selectedClassId]);

  // Lọc theo lớp học trước (Fix bug "Tất cả các lớp" không hiện dữ liệu)
  const classFilteredComparisons = useMemo(() => {
    return comparisons.filter(c => {
      if (!selectedClassId || selectedClassId === 'ALL') return true;
      if (!c.topic?.LopHoc || c.topic.LopHoc.length === 0) return true;
      return c.topic.LopHoc.some(lh => (lh._id || lh).toString() === selectedClassId.toString());
    });
  }, [comparisons, selectedClassId]);

  // Lọc theo đề tài
  const filteredData = useMemo(() => {
    return topicFilter === 'all'
      ? classFilteredComparisons
      : classFilteredComparisons.filter(c => c.topic?._id === topicFilter);
  }, [classFilteredComparisons, topicFilter]);

  // Thống kê động theo dữ liệu đã lọc
  const displayStats = useMemo(() => {
    const count = filteredData.length;
    if (count === 0) {
      return {
        totalGraded: 0,
        avgGV: 0,
        avgAI: 0,
        avgAbsDiff: 0,
        matchCount: 0,
        gvHigherCount: 0,
        aiHigherCount: 0
      };
    }
    const totalGV = filteredData.reduce((s, c) => s + (c.gvScore || 0), 0);
    const totalAI = filteredData.reduce((s, c) => s + (c.aiScore || 0), 0);
    const totalAbsDiff = filteredData.reduce((s, c) => s + (c.absDiff || 0), 0);
    const matchCount = filteredData.filter(c => Math.abs(c.diff) < 0.5).length;
    const gvHigherCount = filteredData.filter(c => c.diff > 0).length;
    const aiHigherCount = filteredData.filter(c => c.diff < 0).length;

    return {
      totalGraded: count,
      avgGV: Math.round((totalGV / count) * 100) / 100,
      avgAI: Math.round((totalAI / count) * 100) / 100,
      avgAbsDiff: Math.round((totalAbsDiff / count) * 100) / 100,
      matchCount,
      gvHigherCount,
      aiHigherCount
    };
  }, [filteredData]);

  // Danh sách đề tài unique cho filter
  const topicOptions = useMemo(() => {
    return [...new Map(classFilteredComparisons.map(c => [c.topic?._id, c.topic])).values()];
  }, [classFilteredComparisons]);

  // Data cho biểu đồ cột SV
  const studentChartData = useMemo(() => {
    return filteredData.map((c, idx) => ({
      name: c.student?.HoTen?.split(' ').pop() || `SV${idx + 1}`,
      fullName: c.student?.HoTen || 'N/A',
      maSV: c.student?.MaSV || 'N/A',
      topicName: c.topic?.TenDeTai || 'N/A',
      'Điểm GV': c.gvScore,
      'Điểm AI': c.aiScore,
      diff: c.diff
    }));
  }, [filteredData]);

  // Data cho biểu đồ tròn theo Lớp
  const classChartData = useMemo(() => {
    const classMap = {};
    filteredData.forEach(c => {
      const lopHocs = c.topic?.LopHoc || [];
      if (lopHocs.length === 0) {
        const key = 'unassigned';
        if (!classMap[key]) {
          classMap[key] = { id: 'unassigned', code: 'Không rõ lớp', name: 'Không rõ lớp học', total: 0, count: 0 };
        }
        classMap[key].total += (c.gvScore || 0);
        classMap[key].count++;
      } else {
        lopHocs.forEach(lh => {
          const id = lh._id || lh;
          const code = lh.MaLopHoc || 'N/A';
          const name = lh.TenLopHoc || lh.MaLopHoc || 'Lớp học';
          if (!classMap[id]) {
            classMap[id] = { id, code, name, total: 0, count: 0 };
          }
          classMap[id].total += (c.gvScore || 0);
          classMap[id].count++;
        });
      }
    });

    return Object.values(classMap).map(item => ({
      id: item.id,
      name: item.code,
      fullName: item.name,
      value: Math.round((item.total / item.count) * 100) / 100,
      count: item.count
    }));
  }, [filteredData]);

  // Data cho biểu đồ tròn Phân Bố Chênh Lệch
  const diffChartData = useMemo(() => {
    return [
      { name: 'Khớp (chênh lệch < 0.5)', value: displayStats.matchCount, color: '#52c41a' },
      { name: 'GV chấm cao hơn', value: displayStats.gvHigherCount, color: '#eb2f96' },
      { name: 'AI đề xuất cao hơn', value: displayStats.aiHigherCount, color: '#1677ff' },
    ].filter(d => d.value > 0);
  }, [displayStats]);

  // Data cho biểu đồ cột Đề Tài
  const topicChartData = useMemo(() => {
    const topicMap = {};
    filteredData.forEach(c => {
      const tId = c.topic?._id || 'unassigned';
      const tName = c.topic?.TenDeTai || 'N/A';
      if (!topicMap[tId]) {
        topicMap[tId] = { id: tId, name: tName, totalGV: 0, totalAI: 0, count: 0 };
      }
      topicMap[tId].totalGV += (c.gvScore || 0);
      topicMap[tId].totalAI += (c.aiScore || 0);
      topicMap[tId].count++;
    });

    return Object.values(topicMap).map(item => ({
      name: item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name,
      fullName: item.name,
      'Điểm GV': Math.round((item.totalGV / item.count) * 100) / 100,
      'Điểm AI': Math.round((item.totalAI / item.count) * 100) / 100,
      count: item.count
    }));
  }, [filteredData]);

  // Data cho biểu đồ phân bố điểm theo khoảng
  const scoreDistributionData = useMemo(() => {
    const ranges = [
      { name: 'Xuất sắc (9.0-10)', gvCount: 0, aiCount: 0 },
      { name: 'Giỏi (8.0-8.9)', gvCount: 0, aiCount: 0 },
      { name: 'Khá (6.5-7.9)', gvCount: 0, aiCount: 0 },
      { name: 'Trung bình (5.0-6.4)', gvCount: 0, aiCount: 0 },
      { name: 'Yếu/Kém (< 5.0)', gvCount: 0, aiCount: 0 },
    ];

    filteredData.forEach(c => {
      const gv = c.gvScore || 0;
      const ai = c.aiScore || 0;

      // GV
      if (gv >= 9) ranges[0].gvCount++;
      else if (gv >= 8) ranges[1].gvCount++;
      else if (gv >= 6.5) ranges[2].gvCount++;
      else if (gv >= 5) ranges[3].gvCount++;
      else ranges[4].gvCount++;

      // AI
      if (ai >= 9) ranges[0].aiCount++;
      else if (ai >= 8) ranges[1].aiCount++;
      else if (ai >= 6.5) ranges[2].aiCount++;
      else if (ai >= 5) ranges[3].aiCount++;
      else ranges[4].aiCount++;
    });

    return ranges;
  }, [filteredData]);

  // Data cho biểu đồ radar Rubrics
  const rubricsRadarData = useMemo(() => {
    const criteriaMap = {};
    filteredData.forEach(c => {
      if (c.rubricsDetail && c.rubricsDetail.length > 0) {
        c.rubricsDetail.forEach(r => {
          const name = r.criteria || 'N/A';
          if (!criteriaMap[name]) {
            criteriaMap[name] = { name, totalGV: 0, totalAI: 0, count: 0 };
          }
          criteriaMap[name].totalGV += (r.gvScore || 0);
          criteriaMap[name].totalAI += (r.aiScore || 0);
          criteriaMap[name].count++;
        });
      }
    });

    return Object.values(criteriaMap).map(item => ({
      subject: item.name,
      'Điểm GV': Math.round((item.totalGV / item.count) * 100) / 100,
      'Điểm AI': Math.round((item.totalAI / item.count) * 100) / 100,
      count: item.count
    }));
  }, [filteredData]);

  const onPieSliceClick = (data) => {
    if (data && data.id && data.id !== 'unassigned') {
      setSelectedClassId(data.id);
    }
  };

  const getDiffTag = (diff) => {
    if (Math.abs(diff) < 0.5) return <Tag color="green">Khớp</Tag>;
    if (diff > 0) return <Tag color="blue">GV +{diff}</Tag>;
    return <Tag color="orange">AI +{Math.abs(diff)}</Tag>;
  };

  // Custom tooltips cho recharts
  const StudentTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card size="small" style={{ border: '1px solid #d9d9d9', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{data.fullName}</div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>MSSV: {data.maSV}</div>
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            Đề tài: <span style={{ color: '#555' }}>{data.topicName}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            <span style={{ color: '#eb2f96', fontWeight: 'bold' }}>GV: {data['Điểm GV']}</span>
            <span style={{ color: '#1677ff', fontWeight: 'bold' }}>AI: {data['Điểm AI']}</span>
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
            Chênh lệch: <Tag color={Math.abs(data.diff) < 0.5 ? 'green' : data.diff > 0 ? 'blue' : 'orange'} style={{ marginRight: 0, fontSize: 10 }}>{data.diff > 0 ? `GV +${data.diff}` : `AI +${Math.abs(data.diff)}`}</Tag>
          </div>
        </Card>
      );
    }
    return null;
  };

  const ClassTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card size="small" style={{ border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontWeight: 'bold' }}>{data.fullName}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Sản lượng: {data.count} sinh viên</div>
          <div style={{ fontSize: 13, color: '#eb2f96', fontWeight: 'bold', marginTop: 4 }}>TB Điểm GV: {data.value}</div>
          <div style={{ fontSize: 11, color: '#1890ff', marginTop: 4 }}>Nhấp để lọc nhanh lớp này</div>
        </Card>
      );
    }
    return null;
  };

  const DiffTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Card size="small" style={{ border: '1px solid #e8e8e8', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontWeight: 'bold', color: data.color }}>{data.name}</div>
          <div style={{ fontSize: 13, fontWeight: 'bold', marginTop: 4 }}>Số lượng: {data.value} SV</div>
          <div style={{ fontSize: 12, color: '#666' }}>Tỷ lệ: {Math.round((data.value / (displayStats.totalGraded || 1)) * 100)}%</div>
        </Card>
      );
    }
    return null;
  };

  const columns = [
    {
      title: '#',
      key: 'index',
      width: 40,
      align: 'center',
      responsive: ['sm'],
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
      title: 'Lớp Học',
      key: 'class',
      width: 120,
      responsive: ['md'],
      render: (_, r) => {
        const lopHocs = r.topic?.LopHoc || [];
        if (lopHocs.length === 0) return <Tag>Tất cả lớp</Tag>;
        return (
          <Space size={2} wrap>
            {lopHocs.map(lh => (
              <Tag key={lh._id || lh} color="cyan">{lh.MaLopHoc || lh.TenLopHoc || lh}</Tag>
            ))}
          </Space>
        );
      }
    },
    {
      title: 'Môn Học',
      key: 'subject',
      width: 150,
      responsive: ['md'],
      render: (_, r) => {
        const monHoc = r.topic?.MonHoc;
        if (!monHoc) return <Text type="secondary">—</Text>;
        return <Tag color="geekblue">{monHoc.TenMonHoc || monHoc.MaMonHoc || monHoc}</Tag>;
      }
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
      responsive: ['sm'],
      sorter: (a, b) => Math.abs(b.diff) - Math.abs(a.diff),
      render: (_, r) => getDiffTag(r.diff),
    },
    {
      title: 'Rubrics',
      key: 'rubrics',
      width: 80,
      align: 'center',
      responsive: ['md'],
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

  const tabItems = [
    {
      key: '1',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <LayoutDashboard size={16} />
          Tổng Quan
        </span>
      ),
      children: (
        <div>
          {/* Thống kê cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '12px', 
            marginBottom: '24px' 
          }}>
            <Card bordered={false} style={{ height: '100%', background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ padding: '6px', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', display: 'flex' }}>
                    <Users size={18} color="#1677ff" />
                  </div>
                  <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.2 }}>Sinh viên</Text>
                </div>
                <Text style={{ fontSize: '24px', fontWeight: 400, color: '#000' }}>{displayStats.totalGraded || 0}</Text>
              </div>
            </Card>

            <Card bordered={false} style={{ height: '100%', background: 'linear-gradient(135deg, #fff0f6 0%, #ffd6e7 100%)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ padding: '6px', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', display: 'flex' }}>
                    <Award size={18} color="#eb2f96" />
                  </div>
                  <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.2 }}>TB Điểm GV</Text>
                </div>
                <Text style={{ fontSize: '24px', fontWeight: 400, color: '#eb2f96' }}>{(displayStats.avgGV || 0).toFixed(2)}</Text>
              </div>
            </Card>

            <Card bordered={false} style={{ height: '100%', background: 'linear-gradient(135deg, #f9f0ff 0%, #e8d0ff 100%)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ padding: '6px', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', display: 'flex' }}>
                    <BrainCircuit size={18} color="#722ed1" />
                  </div>
                  <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.2 }}>TB Điểm AI</Text>
                </div>
                <Text style={{ fontSize: '24px', fontWeight: 400, color: '#722ed1' }}>{(displayStats.avgAI || 0).toFixed(2)}</Text>
              </div>
            </Card>

            <Card bordered={false} style={{ height: '100%', background: 'linear-gradient(135deg, #fffbe6 0%, #ffe58f 100%)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ padding: '6px', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', display: 'flex' }}>
                    <TrendingUp size={18} color="#faad14" />
                  </div>
                  <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.2 }}>TB Chênh Lệch</Text>
                </div>
                <Text style={{ fontSize: '24px', fontWeight: 400, color: '#d48806' }}>{(displayStats.avgAbsDiff || 0).toFixed(2)}</Text>
              </div>
            </Card>

            <Card bordered={false} style={{ height: '100%', background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ padding: '6px', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', display: 'flex' }}>
                    <ShieldCheck size={18} color="#52c41a" />
                  </div>
                  <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.2 }}>Khớp (±0.5)</Text>
                </div>
                <div>
                  <Text style={{ fontSize: '24px', fontWeight: 400, color: '#52c41a' }}>{displayStats.matchCount || 0}</Text>
                  <Text style={{ fontSize: '14px', color: '#52c41a', marginLeft: 4 }}>/ {displayStats.totalGraded || 0}</Text>
                </div>
              </div>
            </Card>

            <Card bordered={false} style={{ height: '100%', background: 'linear-gradient(135deg, #fff2e8 0%, #ffbb96 100%)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ padding: '6px', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', display: 'flex' }}>
                    <TrendingUp size={18} color="#fa541c" />
                  </div>
                  <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.2 }}>GV cao hơn</Text>
                </div>
                <Text style={{ fontSize: '24px', fontWeight: 400, color: '#fa541c' }}>{displayStats.gvHigherCount || 0}</Text>
              </div>
            </Card>

            <Card bordered={false} style={{ height: '100%', background: 'linear-gradient(135deg, #f0f5ff 0%, #adc6ff 100%)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ padding: '6px', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', display: 'flex' }}>
                    <TrendingDown size={18} color="#2f54eb" />
                  </div>
                  <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.2 }}>AI cao hơn</Text>
                </div>
                <Text style={{ fontSize: '24px', fontWeight: 400, color: '#2f54eb' }}>{displayStats.aiHigherCount || 0}</Text>
              </div>
            </Card>
          </div>

          {/* Biểu đồ tròn */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="TB Điểm GV Theo Lớp Học" size="small" style={{ borderRadius: '12px' }}>
                {classChartData.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <RechartsTooltip content={<ClassTooltip />} />
                        <Pie
                          data={classChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          onClick={onPieSliceClick}
                          style={{ cursor: 'pointer' }}
                        >
                          {classChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CLASS_COLORS[index % CLASS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                    <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                      *Nhấp chọn 1 slice để lọc nhanh chi tiết theo lớp tương ứng
                    </Text>
                  </div>
                ) : (
                  <Empty description="Chưa có dữ liệu lớp học" style={{ padding: 40 }} />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="Phân Bố Mức Độ Chênh Lệch AI vs GV" size="small" style={{ borderRadius: '12px' }}>
                {diffChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <RechartsTooltip content={<DiffTooltip />} />
                      <Pie
                        data={diffChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {diffChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Chưa có dữ liệu chênh lệch" style={{ padding: 40 }} />
                )}
              </Card>
            </Col>
          </Row>
        </div>
      )
    },
    {
      key: '2',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={16} />
          Chi Tiết Sinh Viên
        </span>
      ),
      children: (
        <div>
          {/* Biểu đồ so sánh chi tiết sinh viên */}
          {studentChartData.length > 0 ? (
            <Card title="Biểu Đồ So Sánh Chi Tiết Từng Sinh Viên" style={{ marginBottom: 24, borderRadius: '12px' }} size="small">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={studentChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis domain={[0, 10]} fontSize={12} />
                  <RechartsTooltip content={<StudentTooltip />} />
                  <Legend />
                  <Bar dataKey="Điểm GV" fill="#eb2f96" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Điểm AI" fill="#1677ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          ) : null}

          {/* Filter + Bảng */}
          <Card size="small" style={{ borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <Space>
                <Text strong>Lọc theo đề tài:</Text>
                <Select
                  value={topicFilter}
                  onChange={setTopicFilter}
                  style={{ width: 280 }}
                  options={[
                    { value: 'all', label: 'Tất cả đề tài' },
                    ...topicOptions.map(t => ({ value: t?._id, label: t?.TenDeTai || 'N/A' }))
                  ]}
                />
              </Space>
              {selectedClassId !== 'ALL' && (
                <Tag color="blue" closable onClose={() => setSelectedClassId('ALL')}>
                  Đang lọc lớp học
                </Tag>
              )}
            </div>

            <Table
              columns={columns}
              dataSource={filteredData}
              rowKey="_id"
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: <Empty description="Chưa có dữ liệu chấm điểm nào có điểm AI." /> }}
            />
          </Card>
        </div>
      )
    },
    {
      key: '3',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Layers size={16} />
          Thống Kê Nâng Cao
        </span>
      ),
      children: (
        <div>
          <Row gutter={[16, 16]}>
            {/* Điểm TB theo đề tài */}
            <Col xs={24} lg={12}>
              <Card title="So Sánh Điểm TB Theo Đề Tài / Bài Toán" size="small" style={{ borderRadius: '12px' }}>
                {topicChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topicChartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis domain={[0, 10]} fontSize={11} />
                      <RechartsTooltip 
                        formatter={(value, name, props) => [`${value} (TB)`, name]} 
                        labelFormatter={(label, items) => items[0]?.payload?.fullName || label}
                      />
                      <Legend />
                      <Bar dataKey="Điểm GV" fill="#eb2f96" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Điểm AI" fill="#1677ff" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Không có dữ liệu đề tài" style={{ padding: 40 }} />
                )}
              </Card>
            </Col>

            {/* Phân bố khoảng điểm */}
            <Col xs={24} lg={12}>
              <Card title="Phân Bố Số Lượng Theo Khoảng Điểm" size="small" style={{ borderRadius: '12px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={scoreDistributionData} layout="y" margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" fontSize={11} width={130} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="gvCount" name="Số SV (GV chấm)" fill="#eb2f96" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="aiCount" name="Số SV (AI gợi ý)" fill="#1677ff" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Phân tích Rubrics (Radar Chart) */}
          {rubricsRadarData.length > 0 && (
            <Card title="Phân Tích So Sánh Chi Tiết Tiêu Chí Rubrics (TB Điểm)" size="small" style={{ marginTop: 24, borderRadius: '12px' }}>
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={rubricsRadarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} />
                  <Radar name="Điểm GV" dataKey="Điểm GV" stroke="#eb2f96" fill="#eb2f96" fillOpacity={0.25} />
                  <Radar name="Điểm AI" dataKey="Điểm AI" stroke="#1677ff" fill="#1677ff" fillOpacity={0.25} />
                  <Legend />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )
    }
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart2 size={24} /> Dashboard So Sánh Điểm AI vs Giảng Viên
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Dashboard phân tích và so sánh các đánh giá từ mô hình AI PhoBERT hỗ trợ giảng viên với điểm đánh giá thực tế của giảng viên.
      </Paragraph>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        items={tabItems} 
        style={{ marginBottom: 24 }}
        type="card"
      />

      {/* Drawer chi tiết */}
      <Drawer
        title="Chi Tiết So Sánh Kết Quả Đánh Giá"
        width={isMobile ? '100vw' : 520}
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
              <Card size="small" title="Nhận xét GV" style={{ marginBottom: 12, borderRadius: '8px' }}>
                <Paragraph style={{ margin: 0 }}>{selectedRecord.feedback}</Paragraph>
              </Card>
            )}

            {selectedRecord.aiFeedback && (
              <Card size="small" title="Phản hồi AI" style={{ marginBottom: 12, borderRadius: '8px' }}>
                <Paragraph style={{ margin: 0 }}>{selectedRecord.aiFeedback}</Paragraph>
              </Card>
            )}

            {selectedRecord.rubricsDetail?.length > 0 && (
              <Card size="small" title={`Rubrics Chi Tiết (${selectedRecord.rubricsDetail.length} tiêu chí)`} style={{ borderRadius: '8px' }}>
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
