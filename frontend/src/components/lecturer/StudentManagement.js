import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Table, Input, Tag, Space, Spin, message } from 'antd';
import { Users, Search } from 'lucide-react';
import managementService from '../../services/managementService';

const { Title, Text } = Typography;

const StudentManagement = () => {
  const [loading, setLoading] = useState(true);
  const [sinhViens, setSinhViens] = useState([]);
  const [searchText, setSearchText] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await managementService.getAllSinhVien();
      const list = Array.isArray(res) ? res : (res?.data || []);
      setSinhViens(list);
    } catch (err) {
      message.error('Lỗi tải danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = sinhViens.filter(sv => {
    if (!searchText) return true;
    const text = searchText.toLowerCase();
    return (
      sv.MaSV?.toLowerCase().includes(text) ||
      sv.HoTen?.toLowerCase().includes(text) ||
      sv.Email?.toLowerCase().includes(text) ||
      sv.ChuyenNganh?.toLowerCase().includes(text) ||
      sv.WalletAddress?.toLowerCase().includes(text)
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
          <Users size={28} style={{ marginRight: 12, verticalAlign: 'middle', color: '#52c41a' }} />
          Quản Lý Sinh Viên
        </Title>
        <Text type="secondary">Tổng cộng: {sinhViens.length} sinh viên</Text>
      </div>

      <Card bordered={false}>
        <div style={{ marginBottom: 16 }}>
          <Input
            prefix={<Search size={16} style={{ color: '#bfbfbf' }} />}
            placeholder="Tìm kiếm theo Mã SV, Họ tên, Email, Chuyên ngành hoặc Ví..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ maxWidth: 500 }}
          />
        </div>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="_id"
          pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['10', '15', '30', '50'] }}
          locale={{ emptyText: searchText ? 'Không tìm thấy sinh viên nào' : 'Chưa có sinh viên nào trong hệ thống' }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};

export default StudentManagement;
