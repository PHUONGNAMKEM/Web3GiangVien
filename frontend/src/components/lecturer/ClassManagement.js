import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Table, Button, Modal, Form, Input, Select, Space, Tag,
  Popconfirm, message, Spin, Descriptions, List, Avatar, Badge, Tabs, Divider, AutoComplete
} from 'antd';
import { Plus, Pencil, Trash2, School, Eye, UserPlus, UserMinus, Users } from 'lucide-react';
import authService from '../../services/authService';
import managementService from '../../services/managementService';

const { Title, Text } = Typography;

const ClassManagement = () => {
  const [loading, setLoading] = useState(true);
  const [lopHocs, setLopHocs] = useState([]);
  const [monHocs, setMonHocs] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [addSvModalVisible, setAddSvModalVisible] = useState(false);
  const [allSinhVien, setAllSinhVien] = useState([]);
  const [selectedSvId, setSelectedSvId] = useState(null);
  const [svSearchOptions, setSvSearchOptions] = useState([]);
  const [form] = Form.useForm();

  const currentUser = authService.getCurrentUser();

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const [lopRes, monRes] = await Promise.all([
        managementService.getLopHocByGV(currentUser.id),
        managementService.getMonHocByGV(currentUser.id),
      ]);
      if (lopRes.success) setLopHocs(lopRes.data || []);
      if (monRes.success) setMonHocs(monRes.data || []);
    } catch (err) {
      message.error('Lỗi tải dữ liệu');
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
        MaLopHoc: record.MaLopHoc,
        TenLopHoc: record.TenLopHoc,
        MonHoc: record.MonHoc?._id || record.MonHoc,
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
        const res = await managementService.updateLopHoc(editingItem._id, values);
        if (res.success) message.success('Cập nhật lớp học thành công');
      } else {
        const res = await managementService.createLopHoc({
          ...values,
          GiangVien: currentUser.id,
        });
        if (res.success) message.success('Tạo lớp học thành công');
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
      const res = await managementService.deleteLopHoc(id);
      if (res.success) {
        message.success('Đã xóa lớp học');
        fetchData();
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Lỗi xóa lớp học');
    }
  };

  // Xem chi tiết lớp học
  const handleViewDetail = async (record) => {
    try {
      setDetailLoading(true);
      setDetailVisible(true);
      const res = await managementService.getLopHocDetail(record._id);
      if (res.success) {
        setDetailData(res.data);
      }
    } catch (err) {
      message.error('Lỗi tải chi tiết lớp học');
    } finally {
      setDetailLoading(false);
    }
  };

  // Thêm SV vào lớp
  const handleOpenAddSv = async () => {
    try {
      const res = await managementService.getAllSinhVien();
      const svList = Array.isArray(res) ? res : (res?.data || []);
      setAllSinhVien(svList);
      setSvSearchOptions(svList.map(sv => ({
        value: sv._id,
        label: `${sv.MaSV} - ${sv.HoTen} (${sv.Email})`,
      })));
      setAddSvModalVisible(true);
    } catch (err) {
      message.error('Lỗi tải danh sách sinh viên');
    }
  };

  const handleAddSv = async () => {
    if (!selectedSvId || !detailData?.lopHoc?._id) return;
    try {
      const res = await managementService.addSinhVienToLop(detailData.lopHoc._id, selectedSvId);
      if (res.success) {
        message.success('Đã thêm sinh viên vào lớp');
        setAddSvModalVisible(false);
        setSelectedSvId(null);
        handleViewDetail({ _id: detailData.lopHoc._id });
        fetchData();
      }
    } catch (err) {
      message.error(err?.response?.data?.message || 'Lỗi thêm sinh viên');
    }
  };

  const handleRemoveSv = async (svId) => {
    if (!detailData?.lopHoc?._id) return;
    try {
      const res = await managementService.removeSinhVienFromLop(detailData.lopHoc._id, svId);
      if (res.success) {
        message.success('Đã xóa sinh viên khỏi lớp');
        handleViewDetail({ _id: detailData.lopHoc._id });
        fetchData();
      }
    } catch (err) {
      message.error('Lỗi xóa sinh viên khỏi lớp');
    }
  };

  const handleSvSearch = (searchText) => {
    const currentSvIds = (detailData?.lopHoc?.SinhVien || []).map(sv => sv._id);
    const filtered = allSinhVien
      .filter(sv => !currentSvIds.includes(sv._id))
      .filter(sv => {
        const text = searchText.toLowerCase();
        return (
          sv.MaSV?.toLowerCase().includes(text) ||
          sv.HoTen?.toLowerCase().includes(text) ||
          sv.Email?.toLowerCase().includes(text)
        );
      })
      .map(sv => ({
        value: sv._id,
        label: `${sv.MaSV} - ${sv.HoTen} (${sv.Email})`,
      }));
    setSvSearchOptions(filtered);
  };

  // Trạng thái đăng ký
  const trangThaiColor = {
    ChoDuyet: 'gold', DaDuyet: 'green', TuChoi: 'red',
    ChoTest: 'orange', DangLamTest: 'blue', DaSubmit: 'cyan', ChoDoi: 'purple', Thua: 'default',
  };

  const columns = [
    {
      title: 'Mã Lớp',
      dataIndex: 'MaLopHoc',
      key: 'MaLopHoc',
      width: 130,
      render: (text) => <Tag color="purple">{text}</Tag>,
    },
    {
      title: 'Tên Lớp Học',
      dataIndex: 'TenLopHoc',
      key: 'TenLopHoc',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Môn Học',
      dataIndex: 'MonHoc',
      key: 'MonHoc',
      render: (mh) => mh ? <Tag color="blue">{mh.MaMonHoc} — {mh.TenMonHoc}</Tag> : '—',
    },
    {
      title: 'Sĩ Số',
      dataIndex: 'siSo',
      key: 'siSo',
      width: 90,
      align: 'center',
      render: (val) => <Badge count={val || 0} showZero style={{ backgroundColor: '#52c41a' }} />,
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<Eye size={16} />} onClick={() => handleViewDetail(record)} style={{ color: '#1677ff' }} />
          <Button type="text" icon={<Pencil size={16} />} onClick={() => handleOpenModal(record)} style={{ color: '#faad14' }} />
          <Popconfirm
            title="Xóa lớp học này?"
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

  // Bảng SV trong chi tiết lớp học
  const svColumns = [
    {
      title: 'Mã SV',
      dataIndex: 'MaSV',
      key: 'MaSV',
      width: 120,
      render: (text) => <Tag>{text}</Tag>,
    },
    { title: 'Họ Tên', dataIndex: 'HoTen', key: 'HoTen' },
    { title: 'Email', dataIndex: 'Email', key: 'Email', ellipsis: true },
    {
      title: 'GPA',
      dataIndex: 'GPA',
      key: 'GPA',
      width: 80,
      align: 'center',
      render: (val) => <Tag color={val >= 3.0 ? 'green' : val >= 2.0 ? 'orange' : 'red'}>{val?.toFixed(1) || '—'}</Tag>,
    },
    { title: 'Chuyên Ngành', dataIndex: 'ChuyenNganh', key: 'ChuyenNganh', ellipsis: true },
    {
      title: '',
      key: 'remove',
      width: 50,
      render: (_, sv) => (
        <Popconfirm title="Xóa sinh viên khỏi lớp?" onConfirm={() => handleRemoveSv(sv._id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
          <Button type="text" icon={<UserMinus size={14} />} danger size="small" />
        </Popconfirm>
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
          <School size={28} style={{ marginRight: 12, verticalAlign: 'middle', color: '#722ed1' }} />
          Quản Lý Lớp Học
        </Title>
        <Button type="primary" icon={<Plus size={16} />} onClick={() => handleOpenModal()}>
          Thêm Lớp Học
        </Button>
      </div>

      <Card bordered={false}>
        <Table
          columns={columns}
          dataSource={lopHocs}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Chưa có lớp học nào. Hãy thêm môn học trước rồi tạo lớp.' }}
        />
      </Card>

      {/* Modal Tạo/Sửa Lớp Học */}
      <Modal
        title={editingItem ? 'Chỉnh Sửa Lớp Học' : 'Thêm Lớp Học Mới'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => { setModalVisible(false); form.resetFields(); setEditingItem(null); }}
        okText={editingItem ? 'Cập Nhật' : 'Tạo Mới'}
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="MaLopHoc" label="Mã Lớp Học" rules={[{ required: true, message: 'Nhập mã lớp' }]}>
            <Input placeholder="VD: 21DHT01" disabled={!!editingItem} />
          </Form.Item>
          <Form.Item name="TenLopHoc" label="Tên Lớp Học" rules={[{ required: true, message: 'Nhập tên lớp' }]}>
            <Input placeholder="VD: Lớp Blockchain ứng dụng" />
          </Form.Item>
          <Form.Item name="MonHoc" label="Môn Học" rules={[{ required: true, message: 'Chọn môn học' }]}>
            <Select placeholder="Chọn môn học">
              {monHocs.map(mh => (
                <Select.Option key={mh._id} value={mh._id}>
                  {mh.MaMonHoc} — {mh.TenMonHoc}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Chi Tiết Lớp Học */}
      <Modal
        title={detailData?.lopHoc ? `Chi Tiết Lớp: ${detailData.lopHoc.TenLopHoc}` : 'Chi Tiết Lớp Học'}
        open={detailVisible}
        onCancel={() => { setDetailVisible(false); setDetailData(null); }}
        footer={null}
        width={900}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
        ) : detailData ? (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Mã Lớp">{detailData.lopHoc.MaLopHoc}</Descriptions.Item>
              <Descriptions.Item label="Tên Lớp">{detailData.lopHoc.TenLopHoc}</Descriptions.Item>
              <Descriptions.Item label="Môn Học">
                {detailData.lopHoc.MonHoc?.MaMonHoc} — {detailData.lopHoc.MonHoc?.TenMonHoc}
              </Descriptions.Item>
              <Descriptions.Item label="Sĩ Số">
                {detailData.lopHoc.SinhVien?.length || 0} sinh viên
              </Descriptions.Item>
            </Descriptions>

            <Tabs
              defaultActiveKey="sinhvien"
              items={[
                {
                  key: 'sinhvien',
                  label: `Sinh Viên (${detailData.lopHoc.SinhVien?.length || 0})`,
                  children: (
                    <div>
                      <div style={{ marginBottom: 12, textAlign: 'right' }}>
                        <Button type="primary" icon={<UserPlus size={14} />} onClick={handleOpenAddSv}>
                          Thêm Sinh Viên
                        </Button>
                      </div>
                      <Table
                        columns={svColumns}
                        dataSource={detailData.lopHoc.SinhVien || []}
                        rowKey="_id"
                        pagination={false}
                        size="small"
                        locale={{ emptyText: 'Chưa có sinh viên nào trong lớp' }}
                      />
                    </div>
                  ),
                },
                {
                  key: 'nhom',
                  label: `Nhóm & Đề Tài (${detailData.dangKys?.length || 0})`,
                  children: (
                    <div>
                      {(!detailData.dangKys || detailData.dangKys.length === 0) ? (
                        <Text type="secondary">Chưa có nhóm nào đăng ký đề tài.</Text>
                      ) : (
                        <List
                          dataSource={detailData.dangKys}
                          renderItem={(dk) => (
                            <Card
                              size="small"
                              style={{ marginBottom: 12 }}
                              title={
                                <Space>
                                  <Users size={16} />
                                  <Text strong>Đề tài: {dk.DeTai?.TenDeTai || dk.DeTai?.MaDeTai || '—'}</Text>
                                  <Tag color={trangThaiColor[dk.TrangThai] || 'default'}>{dk.TrangThai}</Tag>
                                </Space>
                              }
                            >
                              {dk.TruongNhom && (
                                <div style={{ marginBottom: 4 }}>
                                  <Text type="secondary">Trưởng nhóm: </Text>
                                  <Tag color="blue">{dk.TruongNhom.HoTen} ({dk.TruongNhom.MaSV})</Tag>
                                </div>
                              )}
                              {dk.SinhVien && !dk.TruongNhom && (
                                <div style={{ marginBottom: 4 }}>
                                  <Text type="secondary">Sinh viên: </Text>
                                  <Tag>{dk.SinhVien.HoTen} ({dk.SinhVien.MaSV})</Tag>
                                </div>
                              )}
                              {dk.ThanhVien && dk.ThanhVien.length > 0 && (
                                <div>
                                  <Text type="secondary">Thành viên: </Text>
                                  {dk.ThanhVien.map((tv, i) => (
                                    <Tag key={i} color={tv.TrangThaiTV === 'DaChapNhan' ? 'green' : tv.TrangThaiTV === 'TuChoi' ? 'red' : 'gold'}>
                                      {tv.SinhVien?.HoTen || '—'} ({tv.VaiTro})
                                    </Tag>
                                  ))}
                                </div>
                              )}
                            </Card>
                          )}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  key: 'detai',
                  label: `Đề Tài Môn (${detailData.deTais?.length || 0})`,
                  children: (
                    <Table
                      dataSource={detailData.deTais || []}
                      rowKey="_id"
                      size="small"
                      pagination={false}
                      columns={[
                        { title: 'Mã Đề Tài', dataIndex: 'MaDeTai', key: 'MaDeTai', render: (t) => <Tag>{t}</Tag> },
                        { title: 'Tên Đề Tài', dataIndex: 'TenDeTai', key: 'TenDeTai' },
                        {
                          title: 'Trạng Thái', dataIndex: 'TrangThai', key: 'TrangThai',
                          render: (t) => <Tag color={t === 'MoDangKy' ? 'green' : t === 'DaChot' ? 'orange' : 'blue'}>{t}</Tag>,
                        },
                      ]}
                      locale={{ emptyText: 'Chưa có đề tài nào thuộc môn học này' }}
                    />
                  ),
                },
              ]}
            />
          </div>
        ) : null}
      </Modal>

      {/* Modal Thêm Sinh Viên */}
      <Modal
        title="Thêm Sinh Viên Vào Lớp"
        open={addSvModalVisible}
        onOk={handleAddSv}
        onCancel={() => { setAddSvModalVisible(false); setSelectedSvId(null); }}
        okText="Thêm"
        cancelText="Hủy"
        okButtonProps={{ disabled: !selectedSvId }}
      >
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
            Tìm kiếm theo Mã SV, Họ tên hoặc Email:
          </Text>
          <AutoComplete
            style={{ width: '100%' }}
            options={svSearchOptions}
            onSearch={handleSvSearch}
            onSelect={(value) => setSelectedSvId(value)}
            placeholder="Gõ để tìm sinh viên..."
            allowClear
            onClear={() => setSelectedSvId(null)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ClassManagement;
