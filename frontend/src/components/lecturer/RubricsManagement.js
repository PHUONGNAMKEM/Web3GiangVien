import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, Typography, message, Tooltip, InputNumber, Divider, Badge, Empty, Alert, Popconfirm } from 'antd';
import { Plus, Edit2, Trash2, Star, Lock, Eye, Copy } from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';

const { Title, Text } = Typography;

const RubricsManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [tieuChiList, setTieuChiList] = useState([{ TenTieuChi: '', MoTa: '', TrongSo: 0, DiemToiDa: 10, GoiYChoAI: [] }]);
  const [form] = Form.useForm();

  const user = authService.getCurrentUser();

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await aiApiService.getRubricsTemplates(user.id);
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi tải Rubrics Templates:', err);
      message.error('Không thể tải danh sách Rubrics Template');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const tongTrongSo = tieuChiList.reduce((sum, tc) => sum + (tc.TrongSo || 0), 0);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setTieuChiList([{ TenTieuChi: '', MoTa: '', TrongSo: 0, DiemToiDa: 10, GoiYChoAI: [] }]);
    form.resetFields();
    setIsModalVisible(true);
  };

  const openEditModal = (template) => {
    if (template.DaApDung) {
      message.warning('Template đã áp dụng, không thể sửa!');
      return;
    }
    setEditingTemplate(template);
    setTieuChiList(template.TieuChi.map(tc => ({
      TenTieuChi: tc.TenTieuChi,
      MoTa: tc.MoTa || '',
      TrongSo: tc.TrongSo,
      DiemToiDa: tc.DiemToiDa || 10,
      GoiYChoAI: tc.GoiYChoAI || []
    })));
    form.setFieldsValue({
      TenMau: template.TenMau,
      MoTaMau: template.MoTaMau,
      MacDinh: template.MacDinh,
    });
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    if (tongTrongSo !== 100) {
      message.error(`Tổng trọng số phải = 100%. Hiện tại = ${tongTrongSo}%.`);
      return;
    }

    const invalidTieuChi = tieuChiList.find(tc => !tc.TenTieuChi || tc.TrongSo <= 0);
    if (invalidTieuChi) {
      message.error('Mỗi tiêu chí phải có Tên và Trọng số > 0.');
      return;
    }

    try {
      const payload = {
        TenMau: values.TenMau,
        MoTaMau: values.MoTaMau || '',
        GiangVien: user.id,
        TieuChi: tieuChiList,
        MacDinh: values.MacDinh || false,
      };

      if (editingTemplate) {
        await aiApiService.updateRubricsTemplate(editingTemplate._id, payload);
        message.success('Cập nhật template thành công!');
      } else {
        await aiApiService.createRubricsTemplate(payload);
        message.success('Tạo template mới thành công!');
      }

      setIsModalVisible(false);
      form.resetFields();
      fetchTemplates();
    } catch (err) {
      message.error(err.response?.data?.error || 'Lỗi lưu template');
    }
  };

  const handleDelete = async (template) => {
    try {
      await aiApiService.deleteRubricsTemplate(template._id);
      message.success('Đã xóa template.');
      fetchTemplates();
    } catch (err) {
      message.error(err.response?.data?.error || 'Lỗi xóa template');
    }
  };

  const handleSetDefault = async (template) => {
    try {
      await aiApiService.setDefaultRubricsTemplate(template._id);
      message.success('Đã đặt làm mẫu mặc định!');
      fetchTemplates();
    } catch (err) {
      message.error('Lỗi đặt mẫu mặc định');
    }
  };

  // Quản lý tiêu chí trong modal
  const addTieuChi = () => {
    setTieuChiList([...tieuChiList, { TenTieuChi: '', MoTa: '', TrongSo: 0, DiemToiDa: 10, GoiYChoAI: [] }]);
  };

  const removeTieuChi = (index) => {
    if (tieuChiList.length <= 1) {
      message.warning('Cần ít nhất 1 tiêu chí!');
      return;
    }
    setTieuChiList(tieuChiList.filter((_, i) => i !== index));
  };

  const updateTieuChi = (index, field, value) => {
    const updated = [...tieuChiList];
    updated[index] = { ...updated[index], [field]: value };
    setTieuChiList(updated);
  };

  const columns = [
    {
      title: 'Tên Mẫu',
      dataIndex: 'TenMau',
      key: 'TenMau',
      render: (text, record) => (
        <Space>
          <strong style={{ color: '#1677ff' }}>{text}</strong>
          {record.MacDinh && <Tag color="gold" icon={<Star size={10} style={{ marginRight: 2 }} />}>Mặc định</Tag>}
        </Space>
      ),
      width: '25%',
    },
    {
      title: 'Số Tiêu Chí',
      key: 'soTieuChi',
      width: '12%',
      render: (_, record) => (
        <Tag color="blue">{record.TieuChi?.length || 0} tiêu chí</Tag>
      ),
    },
    {
      title: 'Đã Sử Dụng',
      key: 'daDung',
      width: '12%',
      render: (_, record) => (
        <Badge count={record.SoLuotDung || 0} showZero
          color={record.DaApDung ? '#1677ff' : '#d9d9d9'}
          overflowCount={99}
        >
          <span style={{ padding: '0 8px' }}>
            {record.SoLuotDung || 0} đề tài
          </span>
        </Badge>
      ),
    },
    {
      title: 'Trạng Thái',
      key: 'trangThai',
      width: '12%',
      render: (_, record) => (
        record.DaApDung
          ? <Tag icon={<Lock size={10} style={{ marginRight: 2 }} />} color="volcano">Đã khóa</Tag>
          : <Tag color="green">Có thể sửa</Tag>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          {!record.MacDinh && (
            <Tooltip title="Đặt làm mẫu mặc định">
              <Button type="text" size="small" icon={<Star size={16} />} onClick={() => handleSetDefault(record)} />
            </Tooltip>
          )}
          {record.DaApDung ? (
            <Tooltip title="Template đã áp dụng, không thể sửa/xóa">
              <Button type="text" size="small" icon={<Lock size={16} color="#d48806" />} disabled />
            </Tooltip>
          ) : (
            <>
              <Tooltip title="Sửa template">
                <Button type="text" size="small" icon={<Edit2 size={16} />} onClick={() => openEditModal(record)} />
              </Tooltip>
              <Popconfirm title="Xóa template này?" onConfirm={() => handleDelete(record)} okText="Xóa" cancelText="Hủy">
                <Tooltip title="Xóa">
                  <Button type="text" danger size="small" icon={<Trash2 size={16} />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Quản Lý Rubrics Template</Title>
          <Text type="secondary">Tạo bộ tiêu chí chấm điểm mẫu để tái sử dụng cho nhiều đề tài</Text>
        </div>
        <Button type="primary" icon={<Plus size={18} />} size="large" onClick={openCreateModal}>
          Tạo Mẫu Rubrics Mới
        </Button>
      </div>

      <Alert
        message="Lưu ý về tính bất biến"
        description="Sau khi template đã được áp dụng vào đề tài, bạn sẽ KHÔNG THỂ sửa hoặc xóa template gốc. Nếu muốn thay đổi tiêu chí, hãy sửa trực tiếp trên Rubrics của Đề tài cụ thể."
        type="info"
        showIcon
        closable
        style={{ marginBottom: 16 }}
      />

      <Table
        columns={columns}
        dataSource={templates}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 8 }}
        locale={{ emptyText: <Empty description="Chưa có Rubrics Template nào. Hãy tạo mẫu đầu tiên!" /> }}
        expandable={{
          expandedRowRender: record => (
            <div style={{ padding: '8px 24px', background: '#fafafa', borderRadius: 8 }}>
              {record.MoTaMau && <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>{record.MoTaMau}</Text>}
              <Table
                size="small"
                dataSource={record.TieuChi}
                pagination={false}
                rowKey={(_, idx) => idx}
                columns={[
                  { title: 'Tiêu chí', dataIndex: 'TenTieuChi', key: 'ten', render: t => <strong>{t}</strong> },
                  { title: 'Mô tả', dataIndex: 'MoTa', key: 'mota', ellipsis: true },
                  { title: 'Trọng số', dataIndex: 'TrongSo', key: 'ts', width: 80, render: v => <Tag color="blue">{v}%</Tag> },
                  { title: 'Điểm tối đa', dataIndex: 'DiemToiDa', key: 'dtd', width: 90, render: v => v || 10 },
                  {
                    title: 'Gợi ý AI', dataIndex: 'GoiYChoAI', key: 'ai', width: 200,
                    render: tags => (tags || []).map((t, i) => <Tag key={i} color="geekblue">{t}</Tag>)
                  },
                ]}
              />
            </div>
          ),
        }}
      />

      {/* Modal Tạo/Sửa Template */}
      <Modal
        title={editingTemplate ? 'Sửa Rubrics Template' : 'Tạo Rubrics Template Mới'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText={editingTemplate ? 'Cập Nhật' : 'Tạo Template'}
        cancelText="Hủy"
        width={800}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="TenMau" label="Tên Mẫu Rubrics" rules={[{ required: true, message: 'Nhập tên mẫu!' }]}>
            <Input placeholder="VD: Rubrics Đồ Án CNTT" size="large" />
          </Form.Item>

          <Form.Item name="MoTaMau" label="Mô tả mẫu (tùy chọn)">
            <Input.TextArea rows={2} placeholder="Mô tả ngắn về bộ tiêu chí này..." />
          </Form.Item>

          <Divider orientation="left" plain>
            <Space>
              Danh sách Tiêu chí
              <Tag color={tongTrongSo === 100 ? 'success' : 'error'}>
                Tổng: {tongTrongSo}% {tongTrongSo === 100 ? '✅' : '❌'}
              </Tag>
            </Space>
          </Divider>

          {tieuChiList.map((tc, index) => (
            <div key={index} style={{
              padding: 12, marginBottom: 12, border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafafa'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong>Tiêu chí {index + 1}</Text>
                <Button type="text" danger size="small" icon={<Trash2 size={14} />} onClick={() => removeTieuChi(index)}>
                  Xóa
                </Button>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Input
                  placeholder="Tên tiêu chí"
                  value={tc.TenTieuChi}
                  onChange={e => updateTieuChi(index, 'TenTieuChi', e.target.value)}
                  style={{ flex: 2 }}
                />
                <InputNumber
                  min={0} max={100}
                  value={tc.TrongSo}
                  onChange={v => updateTieuChi(index, 'TrongSo', v || 0)}
                  addonAfter="%"
                  placeholder="Trọng số"
                  style={{ width: 120 }}
                />
                <InputNumber
                  min={1} max={100}
                  value={tc.DiemToiDa}
                  onChange={v => updateTieuChi(index, 'DiemToiDa', v || 10)}
                  addonAfter="đ"
                  placeholder="Điểm max"
                  style={{ width: 120 }}
                />
              </div>

              <Input.TextArea
                placeholder="Mô tả tiêu chí..."
                value={tc.MoTa}
                onChange={e => updateTieuChi(index, 'MoTa', e.target.value)}
                rows={1}
                style={{ marginBottom: 8 }}
              />

              <Select
                mode="tags"
                value={tc.GoiYChoAI}
                onChange={v => updateTieuChi(index, 'GoiYChoAI', v)}
                placeholder="Gợi ý từ khóa cho AI (nhấn Enter để thêm)"
                style={{ width: '100%' }}
              />
            </div>
          ))}

          <Button type="dashed" onClick={addTieuChi} style={{ width: '100%' }} icon={<Plus size={14} />}>
            Thêm tiêu chí
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default RubricsManagement;
