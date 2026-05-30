import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Table, Button, Modal, Form, Input, Space, Tag, Popconfirm, message, Spin } from 'antd';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import authService from '../../services/authService';
import managementService from '../../services/managementService';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CourseManagement = () => {
  const [loading, setLoading] = useState(true);
  const [monHocs, setMonHocs] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  const currentUser = authService.getCurrentUser();

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const res = await managementService.getMonHocByGV(currentUser.id);
      if (res.success) {
        setMonHocs(res.data || []);
      }
    } catch (err) {
      message.error('Lỗi tải danh sách môn học');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (record = null) => {
    setEditingItem(record);
    if (record) {
      form.setFieldsValue({
        MaMonHoc: record.MaMonHoc,
        TenMonHoc: record.TenMonHoc,
        MoTa: record.MoTa,
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingItem) {
        const res = await managementService.updateMonHoc(editingItem._id, values);
        if (res.success) {
          message.success('Cập nhật môn học thành công');
        }
      } else {
        const res = await managementService.createMonHoc({
          ...values,
          GiangVien: currentUser.id,
        });
        if (res.success) {
          message.success('Tạo môn học thành công');
        }
      }
      setModalVisible(false);
      form.resetFields();
      setEditingItem(null);
      fetchData();
    } catch (err) {
      const errMsg = err?.response?.data?.message || 'Lỗi thao tác';
      message.error(errMsg);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await managementService.deleteMonHoc(id);
      if (res.success) {
        message.success('Đã xóa môn học');
        fetchData();
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || 'Không thể xóa môn học';
      message.error(errMsg);
    }
  };

  const columns = [
    {
      title: 'Mã Môn Học',
      dataIndex: 'MaMonHoc',
      key: 'MaMonHoc',
      width: 150,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Tên Môn Học',
      dataIndex: 'TenMonHoc',
      key: 'TenMonHoc',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Mô Tả',
      dataIndex: 'MoTa',
      key: 'MoTa',
      ellipsis: true,
      render: (text) => <Text type="secondary">{text || '—'}</Text>,
    },
    {
      title: 'Số Đề Tài',
      dataIndex: 'soDeTai',
      key: 'soDeTai',
      width: 110,
      align: 'center',
      render: (val) => <Tag color="green">{val || 0}</Tag>,
    },
    {
      title: 'Số Lớp Học',
      dataIndex: 'soLopHoc',
      key: 'soLopHoc',
      width: 110,
      align: 'center',
      render: (val) => <Tag color="orange">{val || 0}</Tag>,
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 130,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<Pencil size={16} />}
            onClick={() => handleOpenModal(record)}
            style={{ color: '#1677ff' }}
          />
          <Popconfirm
            title="Xóa môn học?"
            description="Chỉ xóa được nếu không còn đề tài hoặc lớp học nào ràng buộc."
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" icon={<Trash2 size={16} />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          <BookOpen size={28} style={{ marginRight: 12, verticalAlign: 'middle', color: '#1677ff' }} />
          Quản Lý Môn Học
        </Title>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
          Thêm Môn Học
        </Button>
      </div>

      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={monHocs}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Chưa có môn học nào. Hãy nhấn "Thêm Môn Học" để bắt đầu.' }}
        />
      </Card>

      <Modal
        title={editingItem ? 'Chỉnh Sửa Môn Học' : 'Thêm Môn Học Mới'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => { setModalVisible(false); form.resetFields(); setEditingItem(null); }}
        okText={editingItem ? 'Cập Nhật' : 'Tạo Mới'}
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="MaMonHoc"
            label="Mã Môn Học"
            rules={[{ required: true, message: 'Vui lòng nhập mã môn học' }]}
          >
            <Input placeholder="VD: COMP1413" disabled={!!editingItem} />
          </Form.Item>
          <Form.Item
            name="TenMonHoc"
            label="Tên Môn Học"
            rules={[{ required: true, message: 'Vui lòng nhập tên môn học' }]}
          >
            <Input placeholder="VD: Công nghệ Blockchain" />
          </Form.Item>
          <Form.Item name="MoTa" label="Mô Tả">
            <TextArea rows={3} placeholder="Mô tả ngắn gọn về môn học..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CourseManagement;
