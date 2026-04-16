import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, Typography, message, Tooltip, Drawer, List, Spin, Badge, InputNumber, DatePicker, Divider, Descriptions, Switch, Alert } from 'antd';
import { Plus, Edit2, Trash2, Users, CheckCircle, XCircle, Eye, MinusCircle, NotebookText } from 'lucide-react';
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

  // === RUBRICS STATE ===
  const [suDungRubrics, setSuDungRubrics] = useState(false);
  const [hienThiChiTietChoSV, setHienThiChiTietChoSV] = useState(false);
  const [rubricsTieuChi, setRubricsTieuChi] = useState([]);
  const [rubricsSource, setRubricsSource] = useState('new'); // 'new' | 'template'
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

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

      // Fetch Rubrics Templates
      try {
        const tpls = await aiApiService.getRubricsTemplates(user.id);
        setTemplates(Array.isArray(tpls) ? tpls : []);
      } catch (e) {
        setTemplates([]);
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

  // === RUBRICS HELPERS ===
  const tongTrongSo = rubricsTieuChi.reduce((sum, tc) => sum + (tc.TrongSo || 0), 0);

  const addRubricsTieuChi = () => {
    setRubricsTieuChi([...rubricsTieuChi, { TenTieuChi: '', MoTa: '', TrongSo: 0, DiemToiDa: 10, GoiYChoAI: [] }]);
  };

  const removeRubricsTieuChi = (index) => {
    if (rubricsTieuChi.length <= 1) return;
    setRubricsTieuChi(rubricsTieuChi.filter((_, i) => i !== index));
  };

  const updateRubricsTieuChi = (index, field, value) => {
    const updated = [...rubricsTieuChi];
    updated[index] = { ...updated[index], [field]: value };
    setRubricsTieuChi(updated);
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    const tpl = templates.find(t => t._id === templateId);
    if (tpl) {
      setRubricsTieuChi(tpl.TieuChi.map(tc => ({
        TenTieuChi: tc.TenTieuChi,
        MoTa: tc.MoTa || '',
        TrongSo: tc.TrongSo,
        DiemToiDa: tc.DiemToiDa || 10,
        GoiYChoAI: tc.GoiYChoAI || []
      })));
    }
  };

  const handleAddSubmit = async (values) => {
    try {
      // Validate Rubrics nếu bật
      if (suDungRubrics) {
        if (rubricsTieuChi.length === 0) {
          message.error('Cần ít nhất 1 tiêu chí Rubrics!');
          return;
        }
        if (tongTrongSo !== 100) {
          message.error(`Tổng trọng số phải = 100%. Hiện tại = ${tongTrongSo}%.`);
          return;
        }
        const invalid = rubricsTieuChi.find(tc => !tc.TenTieuChi || tc.TrongSo <= 0);
        if (invalid) {
          message.error('Mỗi tiêu chí phải có Tên và Trọng số > 0.');
          return;
        }
      }

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
        TrangThai: 'MoDangKy',
        // Rubrics
        SuDungRubrics: suDungRubrics,
        HienThiChiTietChoSV: hienThiChiTietChoSV,
        Rubrics: suDungRubrics ? rubricsTieuChi : [],
        _templateId: (suDungRubrics && rubricsSource === 'template') ? selectedTemplateId : undefined,
      };

      await aiApiService.createTopic(topicData);
      setIsModalVisible(false);
      form.resetFields();
      setChiTietBoSung([]);
      setSuDungRubrics(false);
      setRubricsTieuChi([]);
      setSelectedTemplateId(null);
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
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <strong style={{ color: '#1677ff' }}>{text}</strong>
          {record.SuDungRubrics && <Tag color="purple" style={{ fontSize: 10 }}>Rubrics</Tag>}
        </Space>
      ),
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
          onClick={() => {
            setChiTietBoSung([]);
            setSuDungRubrics(false);
            setHienThiChiTietChoSV(false);
            setRubricsTieuChi([]);
            setRubricsSource('new');
            setSelectedTemplateId(null);
            setIsModalVisible(true);
          }}
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
        expandable={{
          expandedRowRender: record => (
            <div style={{ padding: '8px 24px', background: '#fafafa', borderRadius: 8 }}>
              <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label={<strong style={{ color: '#1677ff' }}>Mô tả chi tiết</strong>}>
                  {record.MoTaChiTiet ? (
                    <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                      {record.MoTaChiTiet}
                    </Typography.Paragraph>
                  ) : <span style={{ color: '#aaa' }}>Không có.</span>}
                </Descriptions.Item>
                {record.Deadline && (
                  <Descriptions.Item label={<strong style={{ color: '#1677ff' }}>Hạn chót đăng ký</strong>}>
                    {new Date(record.Deadline).toLocaleString('vi-VN')}
                  </Descriptions.Item>
                )}
                {record.ChiTietBoSung && record.ChiTietBoSung.length > 0 && (
                  <Descriptions.Item label={<strong style={{ color: '#1677ff' }}>Thông tin bổ sung</strong>}>
                    <List
                      size="small"
                      dataSource={record.ChiTietBoSung}
                      renderItem={item => (
                        <List.Item style={{ padding: '4px 0', borderBottom: 'none' }}>
                          <Typography.Text strong>{item.TieuDe}: </Typography.Text>
                          <Typography.Text>{item.NoiDung}</Typography.Text>
                        </List.Item>
                      )}
                    />
                  </Descriptions.Item>
                )}
                {/* Hiển thị Rubrics nếu đề tài có */}
                {record.SuDungRubrics && record.Rubrics && record.Rubrics.length > 0 && (
                  <Descriptions.Item label={<strong style={{ color: '#722ed1' }}>📋 Rubrics Chấm Điểm</strong>}>
                    <div>
                      <Space style={{ marginBottom: 8 }}>
                        <Tag color="purple">{record.Rubrics.length} tiêu chí</Tag>
                        <Tag color={record.HienThiChiTietChoSV ? 'green' : 'default'}>
                          SV {record.HienThiChiTietChoSV ? 'xem được' : 'không xem được'} chi tiết
                        </Tag>
                      </Space>
                      {record.Rubrics.map((tc, idx) => (
                        <div key={idx} style={{ marginBottom: 4, paddingLeft: 8, borderLeft: '2px solid #722ed1' }}>
                          <Text strong>{tc.TenTieuChi}</Text>
                          <Tag color="blue" style={{ marginLeft: 8 }}>{tc.TrongSo}%</Tag>
                          <Tag>{tc.DiemToiDa || 10} điểm</Tag>
                          {tc.MoTa && <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{tc.MoTa}</Text>}
                          {tc.GoiYChoAI && tc.GoiYChoAI.length > 0 && (
                            <div>
                              {tc.GoiYChoAI.map((kw, ki) => <Tag key={ki} color="geekblue" style={{ fontSize: 10 }}>{kw}</Tag>)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          ),
          rowExpandable: record => true,
        }}
      />

      {/* Modal Tạo Đề Tài - MỞ RỘNG VỚI RUBRICS */}
      <Modal
        title="Đăng Ký Đề Tài Mới Lên Hệ Thống"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText="Lưu Đề Tài"
        cancelText="Hủy"
        width={750}
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
          <Button type="dashed" onClick={addChiTiet} style={{ width: '100%', marginBottom: 16 }} icon={<Plus size={14} />}>
            Thêm mục bổ sung
          </Button>

          {/* === RUBRICS CHẤM ĐIỂM === */}
          <Divider orientation="left" plain>
            <div style={{ color: '#722ed1', display: 'flex', alignItems: 'center', gap: 8 }}> <NotebookText />Rubrics Chấm Điểm (Tùy chọn)</div>
          </Divider>

          <div style={{ marginBottom: 16, display: 'flex', gap: 24 }}>
            <Space>
              <Switch checked={suDungRubrics} onChange={v => {
                setSuDungRubrics(v);
                if (v && rubricsTieuChi.length === 0) {
                  setRubricsTieuChi([{ TenTieuChi: '', MoTa: '', TrongSo: 0, DiemToiDa: 10, GoiYChoAI: [] }]);
                }
              }} />
              <Text>Sử dụng Rubrics chấm điểm</Text>
            </Space>
            <Space>
              <Switch checked={hienThiChiTietChoSV} onChange={setHienThiChiTietChoSV} disabled={!suDungRubrics} />
              <Text type={suDungRubrics ? undefined : 'secondary'}>Cho SV xem chi tiết điểm</Text>
            </Space>
          </div>

          {suDungRubrics && (
            <div style={{ padding: 16, border: '1px solid #d3adf7', borderRadius: 8, background: '#faf0ff' }}>
              {/* Chọn nguồn Rubrics */}
              <div style={{ marginBottom: 16 }}>
                <Select
                  value={rubricsSource}
                  onChange={v => {
                    setRubricsSource(v);
                    if (v === 'new') {
                      setSelectedTemplateId(null);
                      setRubricsTieuChi([{ TenTieuChi: '', MoTa: '', TrongSo: 0, DiemToiDa: 10, GoiYChoAI: [] }]);
                    }
                  }}
                  style={{ width: 200, marginRight: 12 }}
                >
                  <Option value="new">Tạo Rubrics mới</Option>
                  <Option value="template" disabled={templates.length === 0}>Chọn từ mẫu có sẵn</Option>
                </Select>

                {rubricsSource === 'template' && (
                  <Select
                    value={selectedTemplateId}
                    onChange={handleTemplateSelect}
                    placeholder="Chọn Rubrics Template..."
                    style={{ width: 300 }}
                  >
                    {templates.map(tpl => (
                      <Option key={tpl._id} value={tpl._id}>
                        {tpl.TenMau} ({tpl.TieuChi?.length} tiêu chí)
                        {tpl.MacDinh && ' ⭐'}
                      </Option>
                    ))}
                  </Select>
                )}
              </div>

              {/* Hiển thị tổng trọng số */}
              <div style={{ marginBottom: 12, textAlign: 'right' }}>
                <Tag color={tongTrongSo === 100 ? 'success' : 'error'} style={{ fontSize: 13 }}>
                  Tổng trọng số: {tongTrongSo}% {tongTrongSo === 100 ? '✅' : '❌'}
                </Tag>
              </div>

              {/* Danh sách tiêu chí */}
              {rubricsTieuChi.map((tc, index) => (
                <div key={index} style={{
                  padding: 10, marginBottom: 10, border: '1px solid #f0f0f0',
                  borderRadius: 6, background: '#fff'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text strong style={{ color: '#722ed1' }}>Tiêu chí {index + 1}</Text>
                    <Button type="text" danger size="small" icon={<MinusCircle size={14} />}
                      onClick={() => removeRubricsTieuChi(index)} disabled={rubricsTieuChi.length <= 1} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <Input
                      placeholder="Tên tiêu chí"
                      value={tc.TenTieuChi}
                      onChange={e => updateRubricsTieuChi(index, 'TenTieuChi', e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <InputNumber
                      min={0} max={100}
                      value={tc.TrongSo}
                      onChange={v => updateRubricsTieuChi(index, 'TrongSo', v || 0)}
                      addonAfter="%"
                      style={{ width: 110 }}
                    />
                    <InputNumber
                      min={1} max={100}
                      value={tc.DiemToiDa}
                      onChange={v => updateRubricsTieuChi(index, 'DiemToiDa', v || 10)}
                      addonAfter="đ"
                      style={{ width: 110 }}
                    />
                  </div>
                  <Input.TextArea
                    placeholder="Mô tả tiêu chí..."
                    value={tc.MoTa}
                    onChange={e => updateRubricsTieuChi(index, 'MoTa', e.target.value)}
                    rows={1}
                    style={{ marginBottom: 6 }}
                  />
                  <Select
                    mode="tags"
                    value={tc.GoiYChoAI}
                    onChange={v => updateRubricsTieuChi(index, 'GoiYChoAI', v)}
                    placeholder="Gợi ý từ khóa cho AI (nhấn Enter thêm)"
                    style={{ width: '100%' }}
                    size="small"
                  />
                </div>
              ))}

              <Button type="dashed" onClick={addRubricsTieuChi} style={{ width: '100%' }} icon={<Plus size={14} />}>
                Thêm tiêu chí
              </Button>
            </div>
          )}
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
