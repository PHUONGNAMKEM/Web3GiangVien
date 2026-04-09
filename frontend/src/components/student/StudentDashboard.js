import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Row, Col, Statistic, Alert, Spin, Tag, Tooltip, Form, Input, InputNumber, Select, Button, Modal, message, Divider } from 'antd';
import { Target, Award, BookOpen, ShieldCheck, BrainCircuit, ExternalLink, Edit2, User, Save } from 'lucide-react';
import authService from '../../services/authService';
import aiApiService from '../../services/aiService';

const { Title, Paragraph, Text } = Typography;

const StudentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState(null);
  const [grade, setGrade] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [form] = Form.useForm();
  const user = authService.getCurrentUser();

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      // Lấy thông tin hồ sơ sinh viên
      try {
        const profile = await aiApiService.getStudentProfile(user.id);
        setStudentProfile(profile);

        // Nếu chưa cập nhật hồ sơ lần đầu → Tự mở form
        if (!profile.DaCapNhatHoSo) {
          setEditingProfile(true);
        }

        // Lấy danh sách lời mời nhóm
        const invs = await aiApiService.getMyInvitations(user.id);
        setInvitations(Array.isArray(invs) ? invs : []);
      } catch (e) {
        console.warn('Không lấy được hồ sơ SV hoặc lời mời:', e);
      }

      const regData = await aiApiService.getMyRegistration(user.id);
      if (regData && regData.registration) {
        setRegistration(regData.registration);

        if (regData.registration.TrangThai === 'DaDuyet') {
          try {
            const gradeData = await aiApiService.getDiemBySinhVien(user.id);
            if (Array.isArray(gradeData) && gradeData.length > 0) {
              const topicGrade = gradeData.find(g =>
                g.DeTai?._id === (regData.registration.DeTai?._id || regData.registration.DeTai)
              );
              setGrade(topicGrade);
            }
          } catch (e) {
            console.warn('Không lấy được điểm:', e);
          }
        }
      }
    } catch (e) {
      console.error('Lỗi lấy data dashboard:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveProfile = async (values) => {
    setSavingProfile(true);
    try {
      const result = await aiApiService.updateStudentProfile(user.id, {
        HoTen: values.HoTen,
        MaSV: values.MaSV,
        Email: values.Email,
        GPA: values.GPA || 0,
        ChuyenNganh: values.ChuyenNganh || '',
        KyNang: values.KyNang || []
      });
      setStudentProfile(result.data);
      setEditingProfile(false);
      message.success('Cập nhật hồ sơ thành công!');
    } catch (e) {
      const errMsg = e.response?.data?.error || 'Cập nhật thất bại';
      message.error(errMsg);
    } finally {
      setSavingProfile(false);
    }
  };

  const openEditProfile = () => {
    if (studentProfile) {
      form.setFieldsValue({
        HoTen: studentProfile.HoTen,
        MaSV: studentProfile.MaSV,
        Email: studentProfile.Email,
        GPA: studentProfile.GPA,
        ChuyenNganh: studentProfile.ChuyenNganh,
        KyNang: studentProfile.KyNang || []
      });
    }
    setEditingProfile(true);
  };

  const handleRespondInvitation = async (invitationId, accept) => {
    try {
      await aiApiService.respondToInvitation(invitationId, accept);
      message.success(accept ? 'Đã tham gia nhóm thành công!' : 'Đã từ chối lời mời');
      fetchData(); // Reload all data
    } catch (e) {
      message.error(e.response?.data?.error || 'Thao tác thất bại');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  const gpaValue = studentProfile?.GPA || 0;
  const needsProfileUpdate = !studentProfile?.DaCapNhatHoSo;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Dashboard Sinh Viên</Title>
      </div>

      {/* Cảnh báo cập nhật hồ sơ lần đầu */}
      {needsProfileUpdate ? (
        <Alert
          message="⚠️ Vui lòng cập nhật hồ sơ trước khi sử dụng hệ thống"
          description="Bạn cần hoàn tất hồ sơ cá nhân (Họ tên, Mã SV, Email, Kỹ năng) trước khi được phép đăng ký đề tài."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Button type="primary" onClick={openEditProfile} icon={<Edit2 size={14} />}>
              Cập Nhật Ngay
            </Button>
          }
        />
      ) : (
        <Alert
          message="Hệ Thống Đã Sẵn Sàng"
          description="Chào mừng bạn đến với mạng Web3 Hỗ trợ Đồ Án. Dữ liệu của bạn được đồng bộ trực tiếp với Blockchain Sepolia."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Hiển thị lời mời */}
      {invitations.length > 0 && invitations.map(inv => (
        <Alert
          key={inv._id}
          message={`📩 Bạn có lời mời tham gia nhóm Đề tài: ${inv.DeTai?.TenDeTai}`}
          description={`Trưởng nhóm: ${inv.SinhVien?.HoTen} (${inv.SinhVien?.MaSV}). Bạn có muốn tham gia không?`}
          type="info"
          showIcon
          style={{ marginBottom: 24, border: '1px solid #1677ff', background: '#e6f4ff' }}
          action={
            <Space direction="vertical">
              <Button size="small" type="primary" onClick={() => handleRespondInvitation(inv._id, true)}>
                Chấp nhận
              </Button>
              <Button size="small" danger onClick={() => handleRespondInvitation(inv._id, false)}>
                Từ chối
              </Button>
            </Space>
          }
        />
      ))}

      <Row gutter={16}>
        {/* Card 1: Hồ sơ cá nhân */}
        <Col span={8}>
          <Card
            title={<span><User size={18} style={{ marginRight: 8, color: '#1677ff' }} />Hồ Sơ Cá Nhân</span>}
            bordered={false}
            extra={<Button type="link" size="small" icon={<Edit2 size={14} />} onClick={openEditProfile}>Sửa</Button>}
          >
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">Họ tên: </Text>
              <Text strong>{studentProfile?.HoTen || 'Chưa cập nhật'}</Text>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">Mã SV: </Text>
              <Text strong>{studentProfile?.MaSV || 'Chưa cập nhật'}</Text>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">Email: </Text>
              <Text>{studentProfile?.Email || 'Chưa cập nhật'}</Text>
            </div>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">Chuyên ngành: </Text>
              <Text>{studentProfile?.ChuyenNganh || '—'}</Text>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <div>
              <Text type="secondary">GPA: </Text>
              <Text strong style={{ color: gpaValue > 0 ? '#1677ff' : '#8c8c8c' }}>
                {gpaValue > 0 ? `${gpaValue}/10` : 'Chưa cập nhật'}
              </Text>
            </div>
            {studentProfile?.KyNang && studentProfile.KyNang.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {studentProfile.KyNang.map((skill, i) => (
                  <Tag key={i} color="purple" style={{ marginBottom: 4 }}>{skill}</Tag>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* Card 2: Trạng thái đồ án */}
        <Col span={8}>
          <Card
            title={<span><BookOpen size={18} style={{ marginRight: 8, color: '#52c41a' }} />Trạng Thái Đồ Án</span>}
            bordered={false}
          >
            <Statistic
              title="Đề Tài Hiện Tại"
              value={registration ? (registration.TrangThai === 'DaDuyet' ? 'Đã Nhận Đề Tài' : 'Chờ Duyệt') : "Chưa Đăng Ký Đề Tài"}
              valueStyle={{ color: registration?.TrangThai === 'DaDuyet' ? '#52c41a' : '#faad14', fontSize: 18, fontWeight: 'bold' }}
            />
            {registration && registration.DeTai && (
              <Paragraph style={{ marginTop: 12 }} ellipsis={{ rows: 2, tooltip: true }}>
                <Text type="secondary">{registration.DeTai.TenDeTai || (typeof registration.DeTai === 'string' ? registration.DeTai : '')}</Text>
              </Paragraph>
            )}
          </Card>
        </Col>

        {/* Card 3: Điểm số */}
        <Col span={8}>
          <Card
            title={<span><Award size={18} style={{ marginRight: 8, color: '#eb2f96' }} />Tiến Độ & Điểm</span>}
            bordered={false}
          >
            {grade ? (
              <div>
                <Statistic title="Điểm Giảng Viên (On-chain)" value={grade.Diem} precision={1} suffix="/ 10" valueStyle={{ color: '#eb2f96', fontWeight: 'bold' }} />

                {grade.AI_Score != null && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary"><BrainCircuit size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Điểm AI gợi ý: </Text>
                    <Text strong style={{ color: '#1677ff' }}>{grade.AI_Score}/10</Text>
                  </div>
                )}

                {grade.NhanXet && (
                  <div style={{ marginTop: 8, padding: 8, background: '#f6ffed', borderRadius: 6, borderLeft: '3px solid #52c41a' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Nhận xét GV: </Text>
                    <Text style={{ fontSize: 12 }}>{grade.NhanXet}</Text>
                  </div>
                )}

                {grade.TxHash && (
                  <div style={{ marginTop: 8 }}>
                    <Tooltip title={`Xem giao dịch trên Sepolia Etherscan: ${grade.TxHash}`}>
                      <Tag
                        icon={<ShieldCheck size={12} style={{ marginRight: 4 }} />}
                        color="green"
                        style={{ cursor: 'pointer', marginTop: 4 }}
                        onClick={() => {
                          if (grade.TxHash && !grade.TxHash.startsWith('0xMock')) {
                            window.open(`https://sepolia.etherscan.io/tx/${grade.TxHash}`, '_blank');
                          }
                        }}
                      >
                        Verify trên Etherscan
                        <ExternalLink size={10} style={{ marginLeft: 4 }} />
                      </Tag>
                    </Tooltip>
                  </div>
                )}
              </div>
            ) : registration?.TrangThai === 'DaDuyet' ? (
              <div>
                <Statistic title="Điểm Số On-chain" value="Chưa Tích Lũy" valueStyle={{ fontSize: 16, color: '#8c8c8c' }} />
                <Paragraph style={{ marginTop: 8 }}><Text type="warning">Đang thực hiện đồ án</Text></Paragraph>
              </div>
            ) : (
              <Statistic title="Điểm Số On-chain" value="—" valueStyle={{ color: '#d9d9d9' }} />
            )}
          </Card>
        </Col>
      </Row>

      {/* Modal chỉnh sửa hồ sơ */}
      <Modal
        title={needsProfileUpdate ? "⚡ Hoàn Tất Hồ Sơ Cá Nhân (Bắt Buộc)" : "Chỉnh Sửa Hồ Sơ Cá Nhân"}
        open={editingProfile}
        onCancel={needsProfileUpdate ? undefined : () => setEditingProfile(false)}
        closable={!needsProfileUpdate}
        maskClosable={!needsProfileUpdate}
        footer={null}
        width={600}
      >
        {needsProfileUpdate && (
          <Alert
            message="Bạn cần điền đầy đủ thông tin trước khi sử dụng hệ thống"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveProfile}
          initialValues={{
            HoTen: studentProfile?.HoTen || '',
            MaSV: studentProfile?.MaSV || '',
            Email: studentProfile?.Email || '',
            GPA: studentProfile?.GPA || 0,
            ChuyenNganh: studentProfile?.ChuyenNganh || '',
            KyNang: studentProfile?.KyNang || []
          }}
        >
          <Form.Item name="HoTen" label="Họ và Tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}>
            <Input placeholder="Nguyễn Văn A" size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="MaSV" label="Mã Sinh Viên" rules={[{ required: true, message: 'Vui lòng nhập mã SV!' }]}>
                <Input placeholder="20110001" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="GPA" label="GPA (Thang 10)" rules={[{ required: true, message: 'Vui lòng nhập điểm GPA!' }]}>
                <InputNumber min={0} max={10} step={0.1} style={{ width: '100%' }} size="large" placeholder="8.5" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="Email" label="Email" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ!' }]}>
            <Input placeholder="sv@huit.edu.vn" size="large" />
          </Form.Item>

          <Form.Item name="ChuyenNganh" label="Chuyên Ngành">
            <Input placeholder="Công nghệ phần mềm" size="large" />
          </Form.Item>

          <Form.Item name="KyNang" label="Kỹ Năng (Dùng cho AI SBERT Matching)" rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 kỹ năng!' }]} tooltip="Nhập kỹ năng và nhấn Enter">
            <Select mode="tags" style={{ width: '100%' }} placeholder="React, Node.js, Python..." size="large">
              <Select.Option value="React">React</Select.Option>
              <Select.Option value="NodeJS">NodeJS</Select.Option>
              <Select.Option value="Python">Python</Select.Option>
              <Select.Option value="Solidity">Solidity</Select.Option>
              <Select.Option value="Machine Learning">Machine Learning</Select.Option>
              <Select.Option value="Java">Java</Select.Option>
              <Select.Option value="C#">C#</Select.Option>
            </Select>
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={savingProfile} size="large" style={{ width: '100%' }}
            icon={<Save size={16} />}>
            {needsProfileUpdate ? 'Hoàn Tất Hồ Sơ & Bắt Đầu' : 'Lưu Thay Đổi'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default StudentDashboard;
