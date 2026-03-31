import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, Typography, message, Tooltip, Drawer, List, Spin, Badge } from 'antd';
import { Plus, Edit2, Trash2, Users, CheckCircle, XCircle, Eye } from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';

const { Title, Text } = Typography;
const { Option } = Select;

const TopicManagement = () => {
  const [topics, setTopics] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [form] = Form.useForm();

  const user = authService.getCurrentUser();

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // Lấy tất cả đề tài từ DB
      const allTopics = await aiApiService.getTopics();
      const topicList = Array.isArray(allTopics) ? allTopics : [];
      
      // Lọc chỉ lấy đề tài do GV đang đăng nhập tạo
      const myTopics = topicList.filter(t => {
        const gvHD = t.GiangVienHuongDan;
        if (!gvHD) return false;
        const gvId = typeof gvHD === 'object' ? (gvHD._id || gvHD).toString() : gvHD.toString();
        return gvId === user.id;
      });
      setTopics(myTopics);

      // Lấy danh sách đăng ký cho đề tài của GV
      try {
        const regs = await aiApiService.getRegistrationsByLecturer(user.id);
        setRegistrations(Array.isArray(regs) ? regs : []);
      } catch (e) {
        setRegistrations([]);
      }

    } catch (err) {
      console.error('Lỗi tải đề tài:', err);
      message.error('Không thể tải danh sách đề tài');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Đếm số SV đăng ký cho 1 đề tài
  const countRegistrations = (topicId) => {
    return registrations.filter(r => {
      const regTopicId = r.DeTai?._id || r.DeTai;
      return regTopicId && regTopicId.toString() === topicId.toString();
    }).length;
  };

  // Lấy đăng ký cho 1 đề tài
  const getRegistrationsForTopic = (topicId) => {
    return registrations.filter(r => {
      const regTopicId = r.DeTai?._id || r.DeTai;
      return regTopicId && regTopicId.toString() === topicId.toString();
    });
  };

  const handleAddSubmit = async (values) => {
    try {
      const topicData = {
        MaDeTai: `DT_${Date.now()}`,
        TenDeTai: values.title,
        MoTa: values.description || '',
        YeuCau: values.requires || [],
        Deadline: new Date(new Date().setMonth(new Date().getMonth() + 2)),
        GiangVienHuongDan: user.id,
        TrangThai: 'MoDangKy'
      };
      await aiApiService.createTopic(topicData);
      setIsModalVisible(false);
      form.resetFields();
      message.success('Tạo Đề tài thành công! Sinh viên đã có thể thấy trên hệ thống.');
      fetchData();
    } catch (err) {
      message.error('Tạo đề tài thất bại: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = (topicId) => {
    Modal.confirm({
      title: 'Xác nhận xóa đề tài',
      content: 'Việc xóa đề tài sẽ hủy tất cả đăng ký liên quan. Bạn chắc chắn?',
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await aiApiService.deleteTopic(topicId);
          message.success('Đã xóa Đề tài.');
          fetchData();
        } catch (err) {
          message.error('Xóa thất bại');
        }
      }
    });
  };

  const handleApprove = async (registrationId, trangThai) => {
    setApprovingId(registrationId);
    try {
      await aiApiService.approveRegistration(registrationId, trangThai);
      message.success(trangThai === 'DaDuyet' ? 'Đã duyệt sinh viên!' : 'Đã từ chối đăng ký.');
      fetchData();
    } catch (err) {
      message.error('Thao tác thất bại');
    } finally {
      setApprovingId(null);
    }
  };

  const showRegistrationDrawer = (topic) => {
    setSelectedTopic(topic);
    setDrawerVisible(true);
  };

  const columns = [
    {
      title: 'Tên Đề Tài',
      dataIndex: 'TenDeTai',
      key: 'TenDeTai',
      render: text => <strong style={{ color: '#1677ff' }}>{text}</strong>,
      width: '35%',
    },
    {
      title: 'Yêu cầu (Tags NLP)',
      dataIndex: 'YeuCau',
      key: 'YeuCau',
      render: tags => (
        <span>
          {(tags || []).map(tag => (
            <Tag color="geekblue" key={tag}>
              {tag.toUpperCase()}
            </Tag>
          ))}
        </span>
      ),
    },
    {
      title: 'SV Đăng Ký',
      key: 'registrations',
      render: (_, record) => {
        const count = countRegistrations(record._id);
        return (
          <Space>
            <Users size={16} color="#595959" />
            <Badge count={count} showZero color={count > 0 ? '#1677ff' : '#d9d9d9'}>
              <span style={{ padding: '0 8px' }}>{count} SV</span>
            </Badge>
          </Space>
        );
      },
    },
    {
      title: 'Trạng Thái',
      key: 'TrangThai',
      dataIndex: 'TrangThai',
      render: status => {
        const colorMap = { 'MoDangKy': 'green', 'DaChot': 'volcano', 'HoanThanh': 'blue' };
        const labelMap = { 'MoDangKy': 'Mở Đăng Ký', 'DaChot': 'Đã Chốt SV', 'HoanThanh': 'Hoàn Thành' };
        return <Tag color={colorMap[status] || 'default'}>{labelMap[status] || status}</Tag>;
      },
    },
    {
      title: 'Thao Tác',
      key: 'action',
      render: (_, record) => {
        const regCount = countRegistrations(record._id);
        return (
          <Space size="middle">
            {regCount > 0 && (
              <Tooltip title="Xem đăng ký">
                <span>
                  <Button 
                    type="primary" 
                    size="small"
                    icon={<Eye size={14} />} 
                    onClick={() => showRegistrationDrawer(record)}
                  >
                    Duyệt ({regCount})
                  </Button>
                </span>
              </Tooltip>
            )}
            <Tooltip title="Xóa đề tài">
              <span>
                <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => handleDelete(record._id)} />
              </span>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Quản Lý Đề Tài Hướng Dẫn</Title>
        <Button 
          type="primary" 
          icon={<Plus size={18} />} 
          size="large"
          onClick={() => setIsModalVisible(true)}
        >
          Tạo Đề Tài Mới
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={topics} 
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 5 }} 
      />

      {/* Modal Tạo Đề Tài */}
      <Modal
        title="Đăng Ký Đề Tài Mới Lên Hệ Thống"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText="Lưu Đề Tài"
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleAddSubmit}>
          <Form.Item 
            name="title" 
            label="Tên Đề Tài" 
            rules={[{ required: true, message: 'Vui lòng nhập tên đề tài!' }]}
          >
            <Input placeholder="VD: Ứng dụng AI điểm danh lớp học..." size="large" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả cốt lõi">
            <Input.TextArea rows={3} placeholder="Ngắn gọn 1-2 câu về mục tiêu đề tài..." />
          </Form.Item>
          
          <Form.Item 
            name="requires" 
            label="Yêu cầu Kỹ năng / Stack (Dùng cho SBERT Matching)"
            tooltip="Hệ thống AI sẽ dùng các từ khóa này để chấm điểm độ tương đồng với sinh viên."
          >
            <Select mode="tags" style={{ width: '100%' }} placeholder="Gõ kỹ năng và ấn Enter (VD: React, Django)" size="large">
              <Option value="React">React</Option>
              <Option value="NodeJS">NodeJS</Option>
              <Option value="Python">Python</Option>
              <Option value="Solidity">Solidity</Option>
              <Option value="Blockchain">Blockchain</Option>
              <Option value="Machine Learning">Machine Learning</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer Xem Chi Tiết Đăng Ký */}
      <Drawer
        title={
          <Space>
            <Users size={20} color="#1677ff" />
            <span>Danh sách Sinh viên Đăng ký</span>
          </Space>
        }
        width={500}
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        extra={selectedTopic && <Tag color="blue">{selectedTopic.TenDeTai}</Tag>}
      >
        {selectedTopic && (
          <List
            dataSource={getRegistrationsForTopic(selectedTopic._id)}
            renderItem={(reg) => (
              <List.Item
                actions={
                  reg.TrangThai === 'ChoDuyet' ? [
                    <Button 
                      type="primary" 
                      size="small"
                      icon={<CheckCircle size={14} />}
                      loading={approvingId === reg._id}
                      onClick={() => handleApprove(reg._id, 'DaDuyet')}
                      style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    >
                      Duyệt
                    </Button>,
                    <Button 
                      danger 
                      size="small"
                      icon={<XCircle size={14} />}
                      loading={approvingId === reg._id}
                      onClick={() => handleApprove(reg._id, 'TuChoi')}
                    >
                      Từ Chối
                    </Button>
                  ] : [
                    <Tag color={reg.TrangThai === 'DaDuyet' ? 'success' : 'error'}>
                      {reg.TrangThai === 'DaDuyet' ? '✓ Đã Duyệt' : '✗ Đã Từ Chối'}
                    </Tag>
                  ]
                }
              >
                <List.Item.Meta
                  title={<Text strong>{reg.SinhVien?.HoTen || 'Sinh viên'}</Text>}
                  description={
                    <Space direction="vertical" size={2}>
                      <Text type="secondary">Mã SV: {reg.SinhVien?.MaSV || 'N/A'}</Text>
                      <Text type="secondary">Email: {reg.SinhVien?.Email || 'N/A'}</Text>
                      <Text type="secondary">Đăng ký lúc: {new Date(reg.createdAt).toLocaleString('vi-VN')}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
            locale={{ emptyText: 'Chưa có sinh viên nào đăng ký đề tài này.' }}
          />
        )}
      </Drawer>
    </div>
  );
};

export default TopicManagement;
