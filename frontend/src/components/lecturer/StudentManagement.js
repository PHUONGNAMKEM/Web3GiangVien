import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Typography, Table, Input, Tag, Space, Spin, message } from 'antd';
import { Search } from 'lucide-react';
import authService from '../../services/authService';
import managementService from '../../services/managementService';

const { Title, Text } = Typography;

const StudentManagement = () => {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState([]); // flat list from API
  const [searchText, setSearchText] = useState('');

  const currentUser = authService.getCurrentUser();

  const fetchData = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const res = await managementService.getSinhVienByGV(currentUser.id);
      const list = res?.data || [];
      setRawData(list);
    } catch (err) {
      message.error('Lỗi tải danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Gộp theo sinh viên: 1 dòng per SV, gom nhiều lớp/môn/GV thành arrays
  const groupedData = useMemo(() => {
    const map = {};
    rawData.forEach(item => {
      const svId = item.sinhVien?._id;
      if (!svId) return;
      if (!map[svId]) {
        map[svId] = {
          ...item.sinhVien,
          classes: []
        };
      }
      map[svId].classes.push({
        lopHoc: item.lopHoc,
        monHoc: item.monHoc,
        giangVien: item.giangVien
      });
    });
    return Object.values(map);
  }, [rawData]);

  const filteredData = groupedData.filter(sv => {
    if (!searchText) return true;
    const text = searchText.toLowerCase();
    // Search across all basic fields + class/subject names
    const classTexts = (sv.classes || []).map(c =>
      `${c.lopHoc?.MaLopHoc || ''} ${c.lopHoc?.TenLopHoc || ''} ${c.monHoc?.TenMonHoc || ''} ${c.monHoc?.MaMonHoc || ''} ${c.giangVien?.HoTen || ''}`
    ).join(' ').toLowerCase();

    return (
      sv.MaSV?.toLowerCase().includes(text) ||
      sv.HoTen?.toLowerCase().includes(text) ||
      sv.Email?.toLowerCase().includes(text) ||
      sv.ChuyenNganh?.toLowerCase().includes(text) ||
      sv.WalletAddress?.toLowerCase().includes(text) ||
      classTexts.includes(text)
    );
  });

  const columns = [
    {
      title: 'Mã SV',
      dataIndex: 'MaSV',
      key: 'MaSV',
      width: 120,
      render: (text) => <Tag color="blue">{text}</Tag>,
      sorter: (a, b) => (a.MaSV || '').localeCompare(b.MaSV || ''),
    },
    {
      title: 'Họ Tên',
      dataIndex: 'HoTen',
      key: 'HoTen',
      render: (text) => <Text strong>{text}</Text>,
      sorter: (a, b) => (a.HoTen || '').localeCompare(b.HoTen || ''),
    },
    {
      title: 'Email',
      dataIndex: 'Email',
      key: 'Email',
      ellipsis: true,
      render: (text) => <Text type="secondary">{text}</Text>,
    },
    {
      title: 'GPA',
      dataIndex: 'GPA',
      key: 'GPA',
      width: 80,
      align: 'center',
      sorter: (a, b) => (a.GPA || 0) - (b.GPA || 0),
      render: (val) => {
        const color = val >= 3.2 ? 'green' : val >= 2.5 ? 'blue' : val >= 2.0 ? 'orange' : 'red';
        return <Tag color={color}>{val?.toFixed(1) || '—'}</Tag>;
      },
    },
    {
      title: 'Lớp Học',
      key: 'lopHoc',
      render: (_, record) => {
        const classes = record.classes || [];
        if (classes.length === 0) return <Text type="secondary">—</Text>;
        return (
          <Space size={[0, 4]} wrap>
            {classes.map((c, i) => (
              <Tag key={i} color="purple" style={{ fontSize: 11 }}>
                {c.lopHoc?.MaLopHoc || '—'}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Môn Học',
      key: 'monHoc',
      render: (_, record) => {
        const classes = record.classes || [];
        // Deduplicate by monHoc _id
        const uniqueMH = [];
        const seenMH = new Set();
        classes.forEach(c => {
          const mhId = c.monHoc?._id;
          if (mhId && !seenMH.has(mhId)) {
            seenMH.add(mhId);
            uniqueMH.push(c.monHoc);
          }
        });
        if (uniqueMH.length === 0) return <Text type="secondary">—</Text>;
        return (
          <Space size={[0, 4]} wrap>
            {uniqueMH.map((mh, i) => (
              <Tag key={i} color="blue" style={{ fontSize: 11 }}>
                {mh.TenMonHoc || mh.MaMonHoc || '—'}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Giảng Viên',
      key: 'giangVien',
      render: (_, record) => {
        const classes = record.classes || [];
        // Deduplicate by giangVien _id
        const uniqueGV = [];
        const seenGV = new Set();
        classes.forEach(c => {
          const gvId = c.giangVien?._id;
          if (gvId && !seenGV.has(gvId)) {
            seenGV.add(gvId);
            uniqueGV.push(c.giangVien);
          }
        });
        if (uniqueGV.length === 0) return <Text type="secondary">—</Text>;
        return (
          <Space size={[0, 4]} wrap>
            {uniqueGV.map((gv, i) => (
              <Tag key={i} color="cyan" style={{ fontSize: 11 }}>
                {gv.HoTen || gv.MaGV || '—'}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Chuyên Ngành',
      dataIndex: 'ChuyenNganh',
      key: 'ChuyenNganh',
      render: (text) => text ? <Tag>{text}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Kỹ Năng',
      dataIndex: 'KyNang',
      key: 'KyNang',
      ellipsis: true,
      render: (skills) => {
        if (!skills || skills.length === 0) return <Text type="secondary">—</Text>;
        return (
          <Space size={[0, 4]} wrap>
            {skills.slice(0, 4).map((s, i) => (
              <Tag key={i} color="geekblue" style={{ fontSize: 11 }}>{s}</Tag>
            ))}
            {skills.length > 4 && <Tag>+{skills.length - 4}</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Hồ Sơ',
      dataIndex: 'DaCapNhatHoSo',
      key: 'DaCapNhatHoSo',
      width: 100,
      align: 'center',
      render: (val) => val ? <Tag color="green">Đầy đủ</Tag> : <Tag color="red">Chưa</Tag>,
    },
    {
      title: 'Ví MetaMask',
      dataIndex: 'WalletAddress',
      key: 'WalletAddress',
      width: 140,
      ellipsis: true,
      render: (text) => text ? (
        <Text copyable={{ text }} style={{ fontSize: 12 }}>
          {text.substring(0, 6)}...{text.substring(text.length - 4)}
        </Text>
      ) : '—',
    },
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Quản Lý Sinh Viên
        </Title>
        <Text type="secondary">Tổng cộng: {groupedData.length} sinh viên (trong {rawData.length > 0 ? [...new Set(rawData.map(d => d.lopHoc?._id))].length : 0} lớp)</Text>
      </div>

      <Card bordered={false}>
        <div style={{ marginBottom: 16 }}>
          <Input
            prefix={<Search size={16} style={{ color: '#bfbfbf' }} />}
            placeholder="Tìm kiếm theo Mã SV, Họ tên, Email, Chuyên ngành, Lớp, Môn, Ví..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: 550 }}
          />
        </div>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['10', '15', '30', '50'] }}
          locale={{ emptyText: searchText ? 'Không tìm thấy sinh viên nào' : 'Chưa có sinh viên nào trong các lớp của bạn' }}
          scroll={{ x: 1400 }}
        />
      </Card>
    </div>
  );
};

export default StudentManagement;
