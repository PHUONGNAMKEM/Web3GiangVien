import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Table, Button, Modal, Form, Input, Space, Tag, Popconfirm, message, Spin } from 'antd';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import managementService from '../../services/managementService';
import aiApiService from '../../services/aiService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const { Title, Text } = Typography;
const { TextArea } = Input;

const CourseManagement = () => {
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  const currentUser = authService.getCurrentUser();
  const queryClient = useQueryClient();

  const { data: { monHocs = [], allTopics = [] } = {}, isLoading: loading } = useQuery({
    queryKey: ['courses', currentUser?.id],
    queryFn: async () => {
      let mh = [];
      let tp = [];
      try {
        const res = await managementService.getMonHocByGV(currentUser.id);
        if (res.success) mh = res.data || [];

        try {
          const topics = await aiApiService.getTopics();
          tp = Array.isArray(topics) ? topics : [];
        } catch (err) {
          console.warn('Lỗi tải danh sách đề tài cho môn học:', err);
        }
      } catch (err) {
        message.error('Lỗi tải danh sách môn học');
      }
      return { monHocs: mh, allTopics: tp };
    },
    enabled: !!currentUser?.id,
  });

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
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] }); // Cập nhật dropdown môn học ở Quản Lý Lớp
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
        queryClient.invalidateQueries({ queryKey: ['courses'] });
        queryClient.invalidateQueries({ queryKey: ['classes'] }); // Cập nhật dropdown môn học ở Quản Lý Lớp
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

  const getTopicsForMonHoc = (monHocId) => {
    return allTopics.filter(t => {
      const mhId = t.MonHoc?._id || t.MonHoc;
      if (mhId && mhId.toString() === monHocId.toString()) return true;
      return (t.LopHoc || []).some(lh => {
        const lhMhId = lh.MonHoc?._id || lh.MonHoc;
        return lhMhId && lhMhId.toString() === monHocId.toString();
      });
    });
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
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
          expandable={{
            expandedRowRender: (record) => {
              const subjectTopics = getTopicsForMonHoc(record._id);
              return (
                <div style={{ padding: '12px 24px', background: '#fafafa', borderRadius: 8 }}>
                  <Typography.Title level={5} style={{ margin: '0 0 12px 0', color: '#1677ff', fontSize: '14px' }}>
                    Danh Sách Đề Tài Thuộc Môn Học ({subjectTopics.length})
                  </Typography.Title>
                  {subjectTopics.length > 0 ? (
                    <Table
                      size="small"
                      bordered
                      pagination={false}
                      dataSource={subjectTopics}
                      rowKey="_id"
                      columns={[
                        {
                          title: 'Mã Đề Tài',
                          dataIndex: 'MaDeTai',
                          key: 'MaDeTai',
                          width: 140,
                          render: (text) => <Tag color="blue">{text}</Tag>
                        },
                        {
                          title: 'Tên Đề Tài',
                          dataIndex: 'TenDeTai',
                          key: 'TenDeTai',
                          render: (text, topicRecord) => (
                            <a
                              style={{ fontWeight: 600, color: '#1677ff' }}
                              onClick={() => {
                                navigate('/lecturer/topics', { state: { highlightTopicId: topicRecord._id } });
                              }}
                            >
                              {text}
                            </a>
                          )
                        },
                        {
                          title: 'Giảng Viên Hướng Dẫn',
                          key: 'giangVien',
                          width: 180,
                          render: (_, topicRecord) => {
                            const gv = topicRecord.GiangVienHuongDan;
                            return <Text strong style={{ color: '#595959' }}>{gv?.HoTen || 'N/A'}</Text>;
                          }
                        },
                        {
                          title: 'Lớp Áp Dụng',
                          key: 'lophoc',
                          width: 180,
                          render: (_, topicRecord) => (
                            <Space size={2} wrap>
                              {(topicRecord.LopHoc || []).map(lh => (
                                <Tag key={lh._id || lh} color="cyan">{lh.MaLopHoc || lh.TenLopHoc || lh}</Tag>
                              ))}
                            </Space>
                          )
                        }
                      ]}
                    />
                  ) : (
                    <Text type="secondary">Chưa có đề tài nào thuộc môn học này.</Text>
                  )}
                </div>
              );
            },
            rowExpandable: (record) => true,
          }}
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
