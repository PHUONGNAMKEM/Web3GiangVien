import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, Typography, message, Tooltip, Drawer, List, Spin, Badge, InputNumber, DatePicker, Divider } from 'antd';
import { Plus, Edit2, Trash2, Users, CheckCircle, XCircle, Eye, MinusCircle } from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const TopicManagement = () => {
  const [topics, setTopics] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [chiTietBoSung, setChiTietBoSung] = useState([]);
  const [form] = Form.useForm();

  const user = authService.getCurrentUser();

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      const allTopics = await aiApiService.getTopics();
      const topicList = Array.isArray(allTopics) ? allTopics : [];

      const myTopics = topicList.filter(t => {
        const gvHD = t.GiangVienHuongDan;
        if (!gvHD) return false;
        const gvId = typeof gvHD === 'object' ? (gvHD._id || gvHD).toString() : gvHD.toString();
        return gvId === user.id;
      });
      setTopics(myTopics);

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

  const countRegistrations = (topicId) => {
    return registrations.filter(r => {
      const regTopicId = r.DeTai?._id || r.DeTai;
      return regTopicId && regTopicId.toString() === topicId.toString();
    }).length;
  };

  const getRegistrationsForTopic = (topicId) => {
    return registrations.filter(r => {
      const regTopicId = r.DeTai?._id || r.DeTai;
      return regTopicId && regTopicId.toString() === topicId.toString();
    });
  };

  const handleAddSubmit = async (values) => {
    try {
      const deadlineDate = values.deadline ? values.deadline.toDate() : new Date(new Date().setMonth(new Date().getMonth() + 2));

      const topicData = {
        MaDeTai: `DT_${Date.now()}`,
        TenDeTai: values.title,
        MoTa: values.description || '',
        MoTaChiTiet: values.detailDescription || '',
        YeuCau: values.requires || [],
        ChiTietBoSung: chiTietBoSung.filter(item => item.TieuDe && item.NoiDung),
        SoLuongSinhVien: values.soLuongSV || 1,
        Deadline: deadlineDate,
        GiangVienHuongDan: user.id,
        TrangThai: 'MoDangKy'
      };
      await aiApiService.createTopic(topicData);
      setIsModalVisible(false);
      form.resetFields();
      setChiTietBoSung([]);
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

  // Thêm/Xóa ChiTietBoSung
  const addChiTiet = () => {
    setChiTietBoSung([...chiTietBoSung, { TieuDe: '', NoiDung: '' }]);
  };

  const removeChiTiet = (index) => {
    setChiTietBoSung(chiTietBoSung.filter((_, i) => i !== index));
  };

  const updateChiTiet = (index, field, value) => {
    const updated = [...chiTietBoSung];
    updated[index][field] = value;
    setChiTietBoSung(updated);
  };

  const columns = [
    {
      title: 'Tên Đề Tài',
      dataIndex: 'TenDeTai',
      key: 'TenDeTai',
      render: text => <strong style={{ color: '#1677ff' }}>{text}</strong>,
      width: '30%',
    },
    {
      title: 'Số SV',
      key: 'soLuong',
      width: '8%',
      render: (_, record) => (
        <Tag color={record.SoLuongSinhVien > 1 ? 'blue' : 'default'}>
          {record.SoLuongSinhVien || 1} SV
        </Tag>
      ),
    },
    {
      title: 'Yêu cầu (Tags NLP)',
      dataIndex: 'YeuCau',
      key: 'YeuCau',
      render: tags => (
        <span>
          {(tags || []).map(tag => (
            <Tag color="geekblue" key={tag}>{tag.toUpperCase()}</Tag>
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
          onClick={() => { setChiTietBoSung([]); setIsModalVisible(true); }}
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

      {/* Modal Tạo Đề Tài - MỞ RỘNG */}
      <Modal
        title="Đăng Ký Đề Tài Mới Lên Hệ Thống"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText="Lưu Đề Tài"
        cancelText="Hủy"
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleAddSubmit}>
          <Form.Item
            name="title"
            label="Tên Đề Tài"
            rules={[{ required: true, message: 'Vui lòng nhập tên đề tài!' }]}
          >
            <Input placeholder="VD: Ứng dụng AI điểm danh lớp học..." size="large" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả cốt lõi (ngắn gọn, dùng cho AI SBERT matching)">
            <Input.TextArea rows={2} placeholder="Ngắn gọn 1-2 câu về mục tiêu đề tài..." />
          </Form.Item>

          <Form.Item name="detailDescription" label="Mô tả chi tiết (dài, hiển thị khi SV xem chi tiết)">
            <Input.TextArea rows={4} placeholder="Mô tả đầy đủ về đề tài, mục tiêu, phạm vi, phương pháp..." />
          </Form.Item>

          <Form.Item
            name="requires"
            label="Yêu cầu Kỹ năng / Stack (Dùng cho SBERT Matching)"
            tooltip="Hệ thống AI sẽ dùng các từ khóa này để chấm điểm độ tương đồng với sinh viên."
          >
            <Select mode="tags" style={{ width: '100%' }} placeholder="React, Django, Python..." size="large">
              <Option value="React">React</Option>
              <Option value="NodeJS">NodeJS</Option>
              <Option value="Python">Python</Option>
              <Option value="Solidity">Solidity</Option>
              <Option value="Blockchain">Blockchain</Option>
              <Option value="Machine Learning">Machine Learning</Option>
            </Select>
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="soLuongSV" label="Số lượng Sinh viên" style={{ flex: 1 }}
              tooltip="Số SV tối đa cho đề tài này. Mặc định 1 = cá nhân.">
              <InputNumber min={1} style={{ width: '100%' }} size="large" placeholder="1" />
            </Form.Item>

            <Form.Item name="deadline" label="Deadline" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} size="large" placeholder="Chọn deadline" />
            </Form.Item>
          </div>

          {/* Thông tin bổ sung - Linh hoạt */}
          <Divider orientation="left" plain>Thông tin bổ sung (Tùy chọn)</Divider>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Thêm các mục bổ sung tùy ý: Mục tiêu, Bộ môn, Yêu cầu nội dung, v.v.
          </Text>

          {chiTietBoSung.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
              <Input
                placeholder="Tiêu đề (VD: Mục tiêu)"
                value={item.TieuDe}
                onChange={e => updateChiTiet(index, 'TieuDe', e.target.value)}
                style={{ flex: 1 }}
              />
              <Input.TextArea
                placeholder="Nội dung"
                value={item.NoiDung}
                onChange={e => updateChiTiet(index, 'NoiDung', e.target.value)}
                rows={1}
                style={{ flex: 2 }}
              />
              <Button type="text" danger icon={<MinusCircle size={18} />} onClick={() => removeChiTiet(index)} />
            </div>
          ))}
          <Button type="dashed" onClick={addChiTiet} style={{ width: '100%' }} icon={<Plus size={14} />}>
            + Thêm mục bổ sung
          </Button>
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
          <>
            {selectedTopic.SoLuongSinhVien > 1 && (
              <Tag color="blue" style={{ marginBottom: 16 }}>
                Đề tài nhóm: Tối đa {selectedTopic.SoLuongSinhVien} SV
              </Tag>
            )}
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
                        {reg.TrangThai === 'DaDuyet' ? '✓ Đã Duyệt Nhóm' : '✗ Đã Từ Chối Nhóm'}
                      </Tag>
                    ]
                  }
                >
                  <List.Item.Meta
                    title={<Text strong>Nhóm của {reg.SinhVien?.HoTen}</Text>}
                    description={
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary">Trạng thái: {(reg.ThanhVien || []).filter(tv => tv.TrangThaiTV === 'DaChapNhan').length} / {selectedTopic.SoLuongSinhVien} thành viên đã tham gia</Text>
                        <List
                          size="small"
                          dataSource={reg.ThanhVien || []}
                          renderItem={tv => (
                            <List.Item style={{ padding: '4px 0', borderBottom: 'none' }}>
                              <Space>
                                <Tag color={tv.VaiTro === 'TruongNhom' ? 'gold' : 'blue'}>
                                  {tv.VaiTro === 'TruongNhom' ? 'Trưởng Nhóm' : 'Thành Viên'}
                                </Tag>
                                <Text>{tv.SinhVien?.HoTen} ({tv.SinhVien?.MaSV})</Text>
                                {tv.TrangThaiTV !== 'DaChapNhan' && (
                                  <Tag color="orange">Chờ phản hồi</Tag>
                                )}
                                <Space split={<Divider type="vertical" />} style={{ marginLeft: 8 }}>
                                  {tv.SinhVien?.GPA !== undefined && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>GPA: <Text strong>{tv.SinhVien.GPA.toFixed(2)}</Text></Text>
                                  )}
                                  {tv.SinhVien?.KyNang && tv.SinhVien.KyNang.length > 0 && (
                                    <Text type="secondary" style={{ fontSize: 12 }}>Dự kiến: <Text strong>{tv.SinhVien.KyNang.join(', ')}</Text></Text>
                                  )}
                                </Space>
                              </Space>
                            </List.Item>
                          )}
                        />
                        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>Nộp lúc: {new Date(reg.createdAt).toLocaleString('vi-VN')}</Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'Chưa có sinh viên nào đăng ký đề tài này.' }}
            />
          </>
        )}
      </Drawer>
    </div>
  );
};

export default TopicManagement;

