import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, Typography, message, Tooltip, Drawer, List, Spin, Badge, InputNumber, DatePicker, Divider, Descriptions, Switch, Alert, Row, Col } from 'antd';
import { Plus, Edit2, Trash2, Users, CheckCircle, XCircle, Eye, MinusCircle, NotebookText, ListChecks, Trophy, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';
import dayjs from 'dayjs';
import { useIsMobile } from '../../hooks/useResponsive';
import managementService from '../../services/managementService';
import { useLecturerClassContext } from '../../contexts/LecturerClassContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const TopicManagement = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClassId, setSelectedClassId } = useLecturerClassContext();
  const [topics, setTopics] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [chiTietBoSung, setChiTietBoSung] = useState([]);
  const [form] = Form.useForm();
  const [lopHocList, setLopHocList] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

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

      // Fetch LopHoc first so we can filter topics in classes taught by this lecturer
      let myClasses = [];
      try {
        const lhRes = await managementService.getLopHocByGV(user.id);
        myClasses = lhRes.data || [];
        setLopHocList(myClasses);
      } catch (e) {
        setLopHocList([]);
      }

      const allTopics = await aiApiService.getTopics();
      const topicList = Array.isArray(allTopics) ? allTopics : [];

      const myClassIds = new Set(myClasses.map(lh => (lh._id || lh).toString()));
      const filteredList = topicList.filter(t => {
        const gvHD = t.GiangVienHuongDan;
        if (!gvHD) return false;
        const gvId = typeof gvHD === 'object' ? (gvHD._id || gvHD).toString() : gvHD.toString();
        // Keep if advised by this lecturer OR belongs to classes taught by this lecturer
        if (gvId === user.id) return true;
        return (t.LopHoc || []).some(lh => myClassIds.has((lh._id || lh).toString()));
      });
      setTopics(filteredList);

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

  useEffect(() => {
    if (location.state?.highlightTopicId && topics.length > 0) {
      const topicId = location.state.highlightTopicId;
      const targetTopic = topics.find(t => t._id.toString() === topicId.toString());
      if (targetTopic) {
        // If the topic is not visible under current filter, change selectedClassId to 'ALL'
        const isVisible = !selectedClassId || selectedClassId === 'ALL' || (targetTopic.LopHoc || []).some(lh => (lh._id || lh).toString() === selectedClassId.toString());
        if (!isVisible) {
          setSelectedClassId('ALL');
        }
        setExpandedRowKeys([targetTopic._id]);
        navigate(location.pathname, { replace: true, state: {} });
        message.success(`Đã tự động mở chi tiết đề tài: ${targetTopic.TenDeTai}`);
      }
    }
  }, [location.state, topics, selectedClassId, setSelectedClassId, navigate, location.pathname]);

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
        YeuCau: Array.from(new Set((values.requires || []).flatMap(req => req.split(',').map(s => s.trim()).filter(Boolean)))),
        ChiTietBoSung: chiTietBoSung.filter(item => item.TieuDe && item.NoiDung),
        SoLuongSinhVien: values.soLuongSV || 1,
        Deadline: deadlineDate,
        HanDangKy: values.hanDangKy ? values.hanDangKy.toDate() : undefined,
        HanNopBaoCao: values.hanNopBaoCao ? values.hanNopBaoCao.toDate() : undefined,
        GiangVienHuongDan: user.id,
        TrangThai: editingTopic ? editingTopic.TrangThai : 'MoDangKy',
        // LopHoc
        LopHoc: values.lopHoc || [],
        // Rubrics
        SuDungRubrics: suDungRubrics,
        HienThiChiTietChoSV: hienThiChiTietChoSV,
        Rubrics: suDungRubrics ? rubricsTieuChi : [],
        _templateId: (suDungRubrics && rubricsSource === 'template') ? selectedTemplateId : undefined,
      };

      if (editingTopic) {
        await aiApiService.updateTopic(editingTopic._id, topicData);
        message.success('Cập nhật Đề tài thành công!');
      } else {
        await aiApiService.createTopic(topicData);
        message.success('Tạo Đề tài thành công! Sinh viên đã có thể thấy trên hệ thống.');
      }
      setIsModalVisible(false);
      form.resetFields();
      setChiTietBoSung([]);
      setSuDungRubrics(false);
      setRubricsTieuChi([]);
      setSelectedTemplateId(null);
      fetchData();
    } catch (err) {
      message.error((editingTopic ? 'Cập nhật' : 'Tạo') + ' đề tài thất bại: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (record) => {
    setEditingTopic(record);
    form.setFieldsValue({
      title: record.TenDeTai,
      description: record.MoTa,
      detailDescription: record.MoTaChiTiet,
      requires: record.YeuCau || [],
      soLuongSV: record.SoLuongSinhVien,
      deadline: record.Deadline ? dayjs(record.Deadline) : null,
      hanDangKy: record.HanDangKy ? dayjs(record.HanDangKy) : null,
      hanNopBaoCao: record.HanNopBaoCao ? dayjs(record.HanNopBaoCao) : null,
      lopHoc: (record.LopHoc || []).map(lh => lh._id || lh),
    });
    setChiTietBoSung(record.ChiTietBoSung || []);
    setSuDungRubrics(record.SuDungRubrics || false);
    setHienThiChiTietChoSV(record.HienThiChiTietChoSV || false);
    setRubricsTieuChi((record.Rubrics || []).map(tc => ({
      ...tc,
      DiemToiDa: tc.DiemToiDa || 10
    })));
    setRubricsSource('new');
    setIsModalVisible(true);
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
      width: 280,
      render: (text, record) => (
        <div>
          <strong style={{ color: '#1677ff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4' }}>{text}</strong>
          <Space size={2} wrap={false} style={{ marginTop: 2 }}>
            {record.SuDungRubrics && <Tag color="purple" style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px' }}>Rubrics</Tag>}
            {record.CoBaiTest && <Tag color="volcano" style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px' }}>🏆 Test</Tag>}
          </Space>
        </div>
      ),
    },
    {
      title: 'Lớp',
      key: 'lopHoc',
      width: 120,
      render: (_, record) => (
        <Space size={2} wrap>
          {(record.LopHoc || []).map(lh => (
            <Tag key={lh._id || lh} color="cyan">{lh.MaLopHoc || lh.TenLopHoc || lh}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Môn Học',
      key: 'monHoc',
      width: 140,
      render: (_, record) => {
        // Lấy MonHoc từ LopHoc (đã populate) hoặc từ DeTai.MonHoc
        const monHocSet = new Map();
        (record.LopHoc || []).forEach(lh => {
          if (lh.MonHoc && lh.MonHoc._id) {
            monHocSet.set(lh.MonHoc._id, lh.MonHoc);
          }
        });
        if (monHocSet.size === 0 && record.MonHoc) {
          const mh = record.MonHoc;
          return <Tag color="geekblue">{mh.TenMonHoc || mh.MaMonHoc || '—'}</Tag>;
        }
        return (
          <Space size={2} wrap>
            {Array.from(monHocSet.values()).map(mh => (
              <Tag key={mh._id} color="geekblue">{mh.TenMonHoc || mh.MaMonHoc}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Giảng Viên',
      key: 'giangVien',
      width: 145,
      render: (_, record) => {
        const gv = record.GiangVienHuongDan;
        if (!gv) return '—';
        return <Text strong style={{ color: '#595959' }}>{gv.HoTen || 'N/A'}</Text>;
      },
    },
    {
      title: 'SV',
      key: 'soLuong',
      width: 55,
      align: 'center',
      responsive: ['sm'],
      render: (_, record) => (
        <Tag color={record.SoLuongSinhVien > 1 ? 'blue' : 'default'} style={{ margin: 0 }}>
          {record.SoLuongSinhVien || 1}
        </Tag>
      ),
    },
    {
      title: 'Yêu cầu',
      dataIndex: 'YeuCau',
      key: 'YeuCau',
      width: 200,
      responsive: ['md'],
      render: tags => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {(tags || []).slice(0, 3).map(tag => (
            <Tag color="geekblue" key={tag} style={{ fontSize: 10, margin: 0, lineHeight: '16px', padding: '0 4px' }}>{tag.toUpperCase()}</Tag>
          ))}
          {(tags || []).length > 3 && <Tag style={{ fontSize: 10, margin: 0 }}>+{tags.length - 3}</Tag>}
        </div>
      ),
    },
    {
      title: 'Đăng Ký',
      key: 'registrations',
      width: 75,
      align: 'center',
      responsive: ['sm'],
      render: (_, record) => {
        const count = countRegistrations(record._id);
        return (
          <Badge count={count} showZero color={count > 0 ? '#1677ff' : '#d9d9d9'} size="small">
            <Users size={16} color="#595959" />
          </Badge>
        );
      },
    },
    {
      title: 'Trạng Thái',
      key: 'TrangThai',
      dataIndex: 'TrangThai',
      width: 100,
      align: 'center',
      render: status => {
        const colorMap = { 'MoDangKy': 'green', 'DaChot': 'volcano', 'HoanThanh': 'blue' };
        const labelMap = { 'MoDangKy': 'Mở ĐK', 'DaChot': 'Đã Chốt', 'HoanThanh': 'Xong' };
        return <Tag color={colorMap[status] || 'default'} style={{ margin: 0 }}>{labelMap[status] || status}</Tag>;
      },
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 160,
      align: 'center',
      render: (_, record) => {
        const regCount = countRegistrations(record._id);
        const gvId = record.GiangVienHuongDan ? (record.GiangVienHuongDan._id || record.GiangVienHuongDan).toString() : '';
        const isOwner = gvId === user.id;

        return (
          <Space size={8} style={{ justifyContent: 'center', width: '100%' }}>
            {record.TrangThai === 'MoDangKy' && (
              <Tooltip title="Bài test"><span>
                <Button size="small" icon={<ListChecks size={12} />}
                  onClick={() => navigate(`/lecturer/entrance-test/${record._id}`)}
                  style={{ fontSize: 12, padding: '0 6px', height: 24 }}
                  disabled={!isOwner} />
              </span></Tooltip>
            )}

            <Tooltip title={isOwner ? "Sửa" : "Bạn không phải GV hướng dẫn của đề tài này"}><span>
              <Button type="text" size="small" icon={<Edit2 size={14} />}
                disabled={!isOwner}
                onClick={() => handleEdit(record)} style={{ height: 24, width: 24, padding: 0 }} />
            </span></Tooltip>
            <Tooltip title={isOwner ? "Xóa" : "Bạn không phải GV hướng dẫn của đề tài này"}><span>
              <Button type="text" danger size="small" icon={<Trash2 size={14} />}
                disabled={!isOwner}
                onClick={() => handleDelete(record._id)} style={{ height: 24, width: 24, padding: 0 }} />
            </span></Tooltip>
          </Space>
        );
      },
    },
  ];

      const filteredTopics = topics.filter(topic => {
        if (!selectedClassId || selectedClassId === 'ALL') return true;
        return (topic.LopHoc || []).some(lh => (lh._id || lh).toString() === selectedClassId.toString());
      });

      return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Quản Lý Đề Tài Hướng Dẫn</Title>
        <Button
          type="primary"
          icon={<Plus size={18} />}
          size="large"
          onClick={() => {
            setEditingTopic(null);
            setChiTietBoSung([]);
            setSuDungRubrics(false);
            setHienThiChiTietChoSV(false);
            setRubricsTieuChi([]);
            setRubricsSource('new');
            setSelectedTemplateId(null);
            form.resetFields();
            if (selectedClassId && selectedClassId !== 'ALL') {
              form.setFieldsValue({ lopHoc: [selectedClassId] });
            }
            setIsModalVisible(true);
          }}
        >
          Tạo Đề Tài Mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={filteredTopics}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 5 }}
        size="small"
        scroll={{ x: 'max-content' }}
        expandable={{
          expandedRowKeys: expandedRowKeys,
          onExpandedRowsChange: (keys) => setExpandedRowKeys(keys),
          expandedRowRender: record => {
            const topicRegs = getRegistrationsForTopic(record._id);
            const approvedReg = topicRegs.find(r => r.TrangThai === 'DaDuyet');

            return (
              <div style={{ padding: '16px 24px', background: '#fafafa', borderRadius: 8, border: '1px solid #e8e8e8' }}>
                <Row gutter={[24, 24]}>
                  {/* Cột trái: Chi tiết đề tài */}
                  <Col xs={24} lg={12}>
                    <Title level={5} style={{ color: '#1677ff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <NotebookText size={16} /> Chi Tiết Đề Tài
                    </Title>
                    <Descriptions size="small" column={1} bordered style={{ background: '#fff' }}>
                      <Descriptions.Item label={<strong>Mã đề tài</strong>}>
                        <Tag color="blue">{record.MaDeTai}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label={<strong>Giảng viên hướng dẫn</strong>}>
                        <Text strong style={{ color: '#1677ff' }}>{record.GiangVienHuongDan?.HoTen || '—'}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label={<strong>Mô tả cốt lõi</strong>}>
                        {record.MoTa || <span style={{ color: '#aaa' }}>Không có</span>}
                      </Descriptions.Item>
                      <Descriptions.Item label={<strong>Mô tả chi tiết</strong>}>
                        {record.MoTaChiTiet ? (
                          <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 13 }}>
                            {record.MoTaChiTiet}
                          </Paragraph>
                        ) : <span style={{ color: '#aaa' }}>Không có</span>}
                      </Descriptions.Item>
                      <Descriptions.Item label={<strong>Yêu cầu / Tech Stack</strong>}>
                        <Space wrap size={4}>
                          {(record.YeuCau || []).map(req => (
                            <Tag key={req} color="blue" style={{ margin: 0 }}>{req}</Tag>
                          ))}
                          {(record.YeuCau || []).length === 0 && <span style={{ color: '#aaa' }}>Không có</span>}
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label={<strong>Lớp học & Môn học</strong>}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(record.LopHoc || []).map(lh => (
                            <span key={lh._id || lh}>
                              <Tag color="cyan">{lh.MaLopHoc}</Tag> 
                              <Text type="secondary" style={{ fontSize: 12 }}>{lh.TenLopHoc} {lh.MonHoc?.TenMonHoc ? `(${lh.MonHoc.TenMonHoc})` : ''} - GV: {lh.GiangVien?.HoTen || 'N/A'}</Text>
                            </span>
                          ))}
                        </div>
                      </Descriptions.Item>
                      <Descriptions.Item label={<strong>Hạn chót đăng ký</strong>}>
                        {record.Deadline ? new Date(record.Deadline).toLocaleString('vi-VN') : 'Không giới hạn'}
                      </Descriptions.Item>
                      <Descriptions.Item label={<strong>Số lượng SV tối đa</strong>}>
                        {record.SoLuongSinhVien || 1} SV ({record.SoLuongSinhVien > 1 ? 'Đề tài nhóm' : 'Đề tài cá nhân'})
                      </Descriptions.Item>
                    </Descriptions>

                    {/* Rubrics nếu có */}
                    {record.SuDungRubrics && record.Rubrics && record.Rubrics.length > 0 && (
                      <div style={{ padding: 12, background: '#faf0ff', border: '1px solid #d3adf7', borderRadius: 8, marginTop: 16 }}>
                        <Text strong style={{ color: '#722ed1', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <NotebookText size={16} /> Rubrics chấm điểm
                        </Text>
                        {record.Rubrics.map((tc, idx) => (
                          <div key={idx} style={{ marginBottom: 6, paddingLeft: 8, borderLeft: '2px solid #722ed1' }}>
                            <Text strong>{tc.TenTieuChi}</Text>
                            <Tag color="purple" style={{ marginLeft: 8 }}>{tc.TrongSo}%</Tag>
                            <Tag>{tc.DiemToiDa || 10}đ</Tag>
                            {tc.MoTa && <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{tc.MoTa}</Text>}
                          </div>
                        ))}
                      </div>
                    )}
                  </Col>

                  {/* Cột phải: Đăng ký & Phê duyệt */}
                  <Col xs={24} lg={12}>
                    <Title level={5} style={{ color: '#52c41a', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={16} /> Nhóm Đăng Ký & Phê Duyệt ({topicRegs.length})
                    </Title>

                    {/* Banner kiểm tra trạng thái giao đề tài */}
                    {approvedReg ? (
                      <Alert
                        message={
                          <span>
                            <strong>Đề tài đã có chủ!</strong> Đã phê duyệt chính thức cho nhóm <strong>{approvedReg.Nhom?.TenNhom || `Nhóm của ${approvedReg.TruongNhom?.HoTen || approvedReg.SinhVien?.HoTen || 'N/A'}`}</strong> làm đề tài này.
                          </span>
                        }
                        type="success"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    ) : (
                      <Alert
                        message="Đề tài này hiện chưa được giao cho nhóm nào chính thức (đang chờ duyệt)."
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    )}

                    <List
                      dataSource={topicRegs}
                      style={{ background: '#fff', padding: '0 16px', borderRadius: 8, border: '1px solid #e8e8e8' }}
                      renderItem={(reg) => {
                        const trangThaiColor = {
                          'ChoDuyet': 'orange', 'ChoTest': 'gold', 'DangLamTest': 'processing',
                          'DaSubmit': 'cyan', 'ChoDoi': 'blue', 'DaDuyet': 'success', 'TuChoi': 'error', 'Thua': 'default'
                        };
                        const trangThaiLabel = {
                          'ChoDuyet': '⏳ Chờ Duyệt', 'ChoTest': '📝 Chờ Test', 'DangLamTest': '✍️ Đang Làm',
                          'DaSubmit': '📤 Đã Submit', 'ChoDoi': '⏳ Chờ Kết Quả', 'DaDuyet': '✅ Đã Duyệt (Thắng)',
                          'TuChoi': '❌ Từ Chối', 'Thua': '😞 Thua'
                        };
                        const nhomName = reg.Nhom?.TenNhom || `Nhóm của ${reg.TruongNhom?.HoTen || reg.SinhVien?.HoTen || 'N/A'}`;
                        const gvId = record.GiangVienHuongDan ? (record.GiangVienHuongDan._id || record.GiangVienHuongDan).toString() : '';
                        const isOwner = gvId === user.id;

                        return (
                          <List.Item
                            actions={
                              reg.TrangThai === 'ChoDuyet' ? [
                                <Button type="primary" size="small" icon={<CheckCircle size={14} />}
                                  loading={approvingId === reg._id}
                                  disabled={!isOwner}
                                  onClick={() => handleApprove(reg._id, 'DaDuyet')}
                                  style={{ background: '#52c41a', borderColor: '#52c41a' }}>Duyệt</Button>,
                                <Button danger size="small" icon={<XCircle size={14} />}
                                  loading={approvingId === reg._id}
                                  disabled={!isOwner}
                                  onClick={() => handleApprove(reg._id, 'TuChoi')}>Từ Chối</Button>
                              ] : [
                                <Tag color={trangThaiColor[reg.TrangThai] || 'default'}>
                                  {trangThaiLabel[reg.TrangThai] || reg.TrangThai}
                                </Tag>
                              ]
                            }
                          >
                            <List.Item.Meta
                              avatar={<div style={{ fontSize: 24 }}>{reg.TrangThai === 'DaDuyet' ? '🏆' : '👥'}</div>}
                              title={
                                <Space>
                                  <Text strong>{nhomName}</Text>
                                  {reg.TrangThai === 'DaDuyet' && <Tag color="gold">WINNER</Tag>}
                                </Space>
                              }
                              description={
                                <div style={{ marginTop: 4 }}>
                                  {/* Thành viên nhóm */}
                                  <List
                                    size="small"
                                    dataSource={reg.ThanhVien || []}
                                    renderItem={tv => (
                                      <List.Item style={{ padding: '2px 0', borderBottom: 'none' }}>
                                        <Space>
                                          <Tag color={tv.VaiTro === 'TruongNhom' ? 'gold' : 'blue'} style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px' }}>
                                            {tv.VaiTro === 'TruongNhom' ? '👑' : '👤'}
                                          </Tag>
                                          <Text style={{ fontSize: 13 }}>{tv.SinhVien?.HoTen || 'N/A'} ({tv.SinhVien?.MaSV || ''})</Text>
                                        </Space>
                                      </List.Item>
                                    )}
                                  />
                                  {reg.ThoiGianSubmit && (
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                      <Clock size={10} style={{ marginRight: 4 }} />
                                      Submit: {new Date(reg.ThoiGianSubmit).toLocaleString('vi-VN')}
                                    </Text>
                                  )}
                                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                                    Đăng ký: {new Date(reg.createdAt).toLocaleString('vi-VN')}
                                  </Text>
                                </div>
                              }
                            />
                          </List.Item>
                        );
                      }}
                      locale={{ emptyText: 'Chưa có nhóm nào đăng ký đề tài này.' }}
                    />
                  </Col>
                </Row>
              </div>
            );
          },
          rowExpandable: record => true,
        }}
      />

      {/* Modal Tạo / Sửa Đề Tài - MỞ RỘNG VỚI RUBRICS */}
      <Modal
        title={editingTopic ? "Cập Nhật Đề Tài" : "Đăng Ký Đề Tài Mới Lên Hệ Thống"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText={editingTopic ? "Cập Nhật" : "Lưu Đề Tài"}
        cancelText="Hủy"
        width={isMobile ? '95vw' : 750}
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
            <Select mode="tags" style={{ width: '100%' }} placeholder="React, Django, Python..." size="large" tokenSeparators={[',']}>
              <Option value="React">React</Option>
              <Option value="NodeJS">NodeJS</Option>
              <Option value="Python">Python</Option>
              <Option value="Solidity">Solidity</Option>
              <Option value="Blockchain">Blockchain</Option>
              <Option value="Machine Learning">Machine Learning</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="lopHoc"
            label="Lớp học áp dụng"
            tooltip="Chọn các lớp học mà đề tài này thuộc về. Chỉ SV trong lớp mới thấy đề tài."
          >
            <Select
              mode="multiple"
              placeholder="Chọn lớp học..."
              options={lopHocList.map(lh => ({
                value: lh._id,
                label: `${lh.MaLopHoc} - ${lh.TenLopHoc}${lh.MonHoc?.TenMonHoc ? ` (${lh.MonHoc.TenMonHoc})` : ''} - GV: ${lh.GiangVien?.HoTen || 'N/A'}`
              }))}
              size="large"
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="soLuongSV" label="Số lượng Sinh viên" style={{ flex: 1 }}
              tooltip="Số SV tối đa cho đề tài này. Mặc định 1 = cá nhân.">
              <InputNumber min={1} style={{ width: '100%' }} size="large" placeholder="1" />
            </Form.Item>

            <Form.Item name="deadline" label="Deadline (chung)" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} size="large" placeholder="Chọn deadline" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="hanDangKy" label="Hạn đăng ký" style={{ flex: 1 }}
              tooltip="Sau mốc này SV không thể đăng ký. Bỏ trống = dùng Deadline chung.">
              <DatePicker showTime style={{ width: '100%' }} size="large" placeholder="Hạn chót đăng ký" />
            </Form.Item>

            <Form.Item name="hanNopBaoCao" label="Hạn nộp báo cáo" style={{ flex: 1 }}
              tooltip="Sau mốc này SV không thể nộp báo cáo. Bỏ trống = dùng Deadline chung.">
              <DatePicker showTime style={{ width: '100%' }} size="large" placeholder="Hạn chót nộp báo cáo" />
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
                      onChange={v => updateRubricsTieuChi(index, 'TrongSo', v)}
                      addonAfter="%"
                      style={{ width: 110 }}
                    />
                    <InputNumber
                      min={1} max={100}
                      value={tc.DiemToiDa}
                      onChange={v => updateRubricsTieuChi(index, 'DiemToiDa', v)}
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

    </div>
  );
};

export default TopicManagement;
