import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Tag, message, Modal, Input, InputNumber, Space, List, Divider, Alert, Spin, Empty, Tooltip, Badge, Select } from 'antd';
import { Users, UserPlus, Crown, LogOut, Trash2, CheckCircle, XCircle, Lock, ArrowRightLeft } from 'lucide-react';
import authService from '../../services/authService';
import nhomService from '../../services/nhomService';

const { Title, Text, Paragraph } = Typography;

const GroupManagement = () => {
  const [loading, setLoading] = useState(true);
  const [nhom, setNhom] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [tenNhom, setTenNhom] = useState('');
  const [soLuong, setSoLuong] = useState(2);
  const [creating, setCreating] = useState(false);
  const [inviteMaSV, setInviteMaSV] = useState('');
  const [inviting, setInviting] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedNewLeader, setSelectedNewLeader] = useState(null);

  const user = authService.getCurrentUser();

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [nhomRes, invitesRes] = await Promise.all([
        nhomService.getNhomBySinhVien(user.id),
        nhomService.getPendingInvites(user.id)
      ]);
      setNhom(nhomRes.nhom);
      setPendingInvites(invitesRes || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu nhóm:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, []);

  // === Tạo nhóm ===
  const handleCreateNhom = async () => {
    if (soLuong < 1) {
      message.warning('Số lượng thành viên phải >= 1');
      return;
    }
    setCreating(true);
    try {
      await nhomService.createNhom(user.id, tenNhom, soLuong);
      message.success('Tạo nhóm thành công!');
      setCreateModalVisible(false);
      setTenNhom('');
      setSoLuong(2);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || 'Tạo nhóm thất bại');
    } finally {
      setCreating(false);
    }
  };

  // === Mời thành viên ===
  const handleInvite = async () => {
    if (!inviteMaSV.trim()) {
      message.warning('Vui lòng nhập Mã Sinh Viên.');
      return;
    }
    setInviting(true);
    try {
      await nhomService.inviteMember(nhom._id, inviteMaSV.trim());
      message.success('Đã gửi lời mời!');
      setInviteMaSV('');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || 'Gửi lời mời thất bại');
    } finally {
      setInviting(false);
    }
  };

  // === Trả lời lời mời ===
  const handleRespondInvite = async (nhomId, accept) => {
    try {
      await nhomService.respondToInvite(nhomId, user.id, accept);
      message.success(accept ? 'Đã gia nhập nhóm!' : 'Đã từ chối lời mời.');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || 'Thao tác thất bại');
    }
  };

  // === Kick thành viên ===
  const handleKick = (svId, hoTen) => {
    Modal.confirm({
      title: 'Xóa thành viên',
      content: `Bạn có chắc muốn xóa ${hoTen} khỏi nhóm?`,
      okText: 'Xóa',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await nhomService.kickMember(nhom._id, svId);
          message.success('Đã xóa thành viên.');
          fetchData();
        } catch (err) {
          message.error(err.response?.data?.error || 'Xóa thất bại');
        }
      }
    });
  };

  // === Rời nhóm ===
  const handleLeave = () => {
    Modal.confirm({
      title: 'Rời nhóm',
      content: 'Bạn có chắc muốn rời khỏi nhóm này?',
      okText: 'Rời nhóm',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await nhomService.leaveNhom(nhom._id, user.id);
          message.success('Đã rời nhóm.');
          fetchData();
        } catch (err) {
          message.error(err.response?.data?.error || 'Rời nhóm thất bại');
        }
      }
    });
  };

  // === Chuyển quyền trưởng nhóm ===
  const handleTransferLeader = async () => {
    if (!selectedNewLeader) {
      message.warning('Vui lòng chọn thành viên.');
      return;
    }
    try {
      await nhomService.transferLeader(nhom._id, user.id, selectedNewLeader);
      message.success('Đã chuyển quyền trưởng nhóm!');
      setTransferModalVisible(false);
      setSelectedNewLeader(null);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || 'Chuyển quyền thất bại');
    }
  };

  // === Chốt nhóm ===
  const handleChotNhom = () => {
    Modal.confirm({
      title: 'Chốt nhóm',
      content: 'Sau khi chốt, bạn sẽ không thể thêm/xóa thành viên nữa. Tiếp tục?',
      okText: 'Chốt nhóm',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await nhomService.chotNhom(nhom._id);
          message.success('Đã chốt nhóm thành công!');
          fetchData();
        } catch (err) {
          message.error(err.response?.data?.error || 'Chốt nhóm thất bại');
        }
      }
    });
  };

  // === Xóa nhóm ===
  const handleDeleteNhom = () => {
    Modal.confirm({
      title: 'Xóa nhóm',
      content: 'Bạn có chắc muốn xóa nhóm này? Thao tác không thể hoàn tác.',
      okText: 'Xóa nhóm',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await nhomService.deleteNhom(nhom._id);
          message.success('Đã xóa nhóm.');
          fetchData();
        } catch (err) {
          message.error(err.response?.data?.error || 'Xóa nhóm thất bại');
        }
      }
    });
  };

  const isLeader = nhom && nhom.TruongNhom?._id === user?.id;
  const acceptedMembers = nhom?.ThanhVien?.filter(tv => tv.TrangThai === 'DaChapNhan') || [];
  const pendingMembers = nhom?.ThanhVien?.filter(tv => tv.TrangThai === 'DaMoi') || [];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <br /><br />
        <Text type="secondary">Đang tải thông tin nhóm...</Text>
      </div>
    );
  }

  return (
    <div>
      <Typography>
        <Title level={2}>
          <Users size={28} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Nhóm Của Tôi
        </Title>
        <Paragraph>Quản lý nhóm sinh viên trước khi đăng ký đề tài. Tạo nhóm, mời thành viên, chốt nhóm rồi đăng ký đề tài cạnh tranh.</Paragraph>
      </Typography>

      {/* === LỜI MỜI ĐANG CHỜ === */}
      {pendingInvites.length > 0 && !nhom && (
        <Card title="📩 Lời mời gia nhập nhóm" style={{ marginBottom: 24, border: '1px solid #faad14' }}>
          <List
            dataSource={pendingInvites}
            renderItem={invite => {
              const leader = invite.TruongNhom;
              return (
                <List.Item
                  actions={[
                    <Button type="primary" size="small" icon={<CheckCircle size={14} />}
                      onClick={() => handleRespondInvite(invite._id, true)}
                    >Chấp nhận</Button>,
                    <Button size="small" danger icon={<XCircle size={14} />}
                      onClick={() => handleRespondInvite(invite._id, false)}
                    >Từ chối</Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<div style={{ fontSize: 28 }}>👥</div>}
                    title={<Text strong>{invite.TenNhom || `Nhóm của ${leader?.HoTen || 'N/A'}`}</Text>}
                    description={`Trưởng nhóm: ${leader?.HoTen || 'N/A'} (${leader?.MaSV || ''}) • ${invite.SoLuong} thành viên`}
                  />
                </List.Item>
              );
            }}
          />
        </Card>
      )}

      {/* === CHƯA CÓ NHÓM === */}
      {!nhom && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <Empty
            image={<Users size={64} style={{ color: '#bfbfbf' }} />}
            description={<Text type="secondary">Bạn chưa có nhóm nào</Text>}
          >
            <Button type="primary" size="large" icon={<UserPlus size={18} />}
              onClick={() => setCreateModalVisible(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              Tạo Nhóm Mới
            </Button>
          </Empty>
        </Card>
      )}

      {/* === ĐÃ CÓ NHÓM === */}
      {nhom && (
        <Card
          title={
            <Space>
              <Users size={20} />
              <span>{nhom.TenNhom || 'Nhóm của tôi'}</span>
              {nhom.DaChot ? (
                <Tag color="green" style={{ display: 'flex', alignItems: 'center' }} icon={<Lock size={12} />}>Đã chốt</Tag>
              ) : (
                <Tag color="orange">Chưa chốt</Tag>
              )}
            </Space>
          }
          extra={
            isLeader && !nhom.DaChot ? (
              <Space>
                <Button type="primary" onClick={handleChotNhom}
                  disabled={acceptedMembers.length < nhom.SoLuong}
                  icon={<Lock size={14} />}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  Chốt nhóm ({acceptedMembers.length}/{nhom.SoLuong})
                </Button>
                <Button danger onClick={handleDeleteNhom} icon={<Trash2 size={14} />}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >Xóa nhóm</Button>
              </Space>
            ) : null
          }
        >
          {/* Thông tin nhóm */}
          <Alert
            message={`Thành viên: ${acceptedMembers.length} / ${nhom.SoLuong}`}
            description={nhom.DaChot
              ? 'Nhóm đã được chốt. Bạn có thể đăng ký đề tài.'
              : `Cần đủ ${nhom.SoLuong} thành viên chấp nhận để chốt nhóm.`
            }
            type={nhom.DaChot ? 'success' : 'info'}
            showIcon
            style={{ marginBottom: 16 }}
          />

          {/* Danh sách thành viên */}
          <Title level={5}>Thành viên nhóm</Title>
          <List
            dataSource={nhom.ThanhVien}
            renderItem={tv => {
              const sv = tv.SinhVien;
              const isTVLeader = tv.VaiTro === 'TruongNhom';
              const isMe = sv?._id === user?.id;

              return (
                <List.Item
                  actions={
                    isLeader && !nhom.DaChot && !isTVLeader ? [
                      tv.TrangThai === 'DaMoi' ? (
                        <Tag color="orange">Đang chờ</Tag>
                      ) : null,
                      <Tooltip title="Xóa khỏi nhóm">
                        <Button size="small" danger icon={<Trash2 size={14} />}
                          onClick={() => handleKick(sv?._id, sv?.HoTen || 'N/A')}
                        />
                      </Tooltip>
                    ].filter(Boolean) : [
                      tv.TrangThai === 'DaMoi' && isMe ? (
                        <Space key="respond">
                          <Button type="primary" size="small" onClick={() => handleRespondInvite(nhom._id, true)}>Chấp nhận</Button>
                          <Button size="small" danger onClick={() => handleRespondInvite(nhom._id, false)}>Từ chối</Button>
                        </Space>
                      ) : tv.TrangThai === 'DaMoi' ? (
                        <Tag color="orange">Đang chờ</Tag>
                      ) : null
                    ].filter(Boolean)
                  }
                >
                  <List.Item.Meta
                    avatar={<div style={{ fontSize: 24 }}>{isTVLeader ? '👑' : '👤'}</div>}
                    title={
                      <Space>
                        <Text strong>{sv?.HoTen || 'Đang tải...'}</Text>
                        <Text type="secondary">({sv?.MaSV || ''})</Text>
                        {isTVLeader && <Tag color="gold">Trưởng nhóm</Tag>}
                        {isMe && <Tag color="blue">Bạn</Tag>}
                      </Space>
                    }
                    description={
                      <Tag color={
                        tv.TrangThai === 'DaChapNhan' ? 'green' :
                          tv.TrangThai === 'DaMoi' ? 'orange' : 'red'
                      }>
                        {tv.TrangThai === 'DaChapNhan' ? '✅ Đã tham gia' :
                          tv.TrangThai === 'DaMoi' ? '⏳ Chờ xác nhận' : '❌ Từ chối'}
                      </Tag>
                    }
                  />
                </List.Item>
              );
            }}
          />

          {/* Form mời thành viên */}
          {isLeader && !nhom.DaChot && acceptedMembers.length < nhom.SoLuong && (
            <>
              <Divider />
              <Title level={5}><UserPlus size={16} style={{ marginRight: 6 }} />Mời Thành Viên</Title>
              <Space>
                <Input
                  placeholder="Nhập Mã Sinh Viên"
                  value={inviteMaSV}
                  onChange={e => setInviteMaSV(e.target.value)}
                  onPressEnter={handleInvite}
                  style={{ width: 250 }}
                />
                <Button type="primary" onClick={handleInvite} loading={inviting}>Gửi lời mời</Button>
              </Space>
            </>
          )}

          {/* Actions cho thành viên */}
          {!isLeader && !nhom.DaChot && (
            <>
              <Divider />
              <Button danger icon={<LogOut size={14} />} onClick={handleLeave}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >Rời nhóm</Button>
            </>
          )}

          {/* Actions cho trưởng nhóm */}
          {isLeader && !nhom.DaChot && acceptedMembers.length > 1 && (
            <>
              <Divider />
              <Button icon={<ArrowRightLeft size={14} />} onClick={() => setTransferModalVisible(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >Chuyển quyền trưởng nhóm</Button>
            </>
          )}
        </Card>
      )}

      {/* === MODAL TẠO NHÓM === */}
      <Modal
        title="Tạo Nhóm Mới"
        open={createModalVisible}
        onOk={handleCreateNhom}
        onCancel={() => setCreateModalVisible(false)}
        confirmLoading={creating}
        okText="Tạo nhóm"
        cancelText="Hủy"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>Tên nhóm (tùy chọn):</Text>
            <Input
              placeholder="VD: Team Alpha"
              value={tenNhom}
              onChange={e => setTenNhom(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>
          <div>
            <Text strong>Số lượng thành viên tối đa: <Text type="danger">*</Text></Text>
            <br />
            <InputNumber
              min={1}
              max={10}
              value={soLuong}
              onChange={val => setSoLuong(val)}
              style={{ marginTop: 8, width: '100%' }}
            />
          </div>
          <Alert
            message="Lưu ý"
            description="Số lượng thành viên phải khớp với yêu cầu SoLuongSinhVien của đề tài bạn muốn đăng ký."
            type="info"
            showIcon
          />
        </Space>
      </Modal>

      {/* === MODAL CHUYỂN QUYỀN === */}
      <Modal
        title="Chuyển quyền Trưởng nhóm"
        open={transferModalVisible}
        onOk={handleTransferLeader}
        onCancel={() => { setTransferModalVisible(false); setSelectedNewLeader(null); }}
        okText="Chuyển quyền"
        cancelText="Hủy"
      >
        <Text>Chọn thành viên để chuyển quyền trưởng nhóm:</Text>
        <Select
          style={{ width: '100%', marginTop: 12 }}
          placeholder="Chọn thành viên"
          value={selectedNewLeader}
          onChange={val => setSelectedNewLeader(val)}
          options={
            acceptedMembers
              .filter(tv => tv.SinhVien?._id !== user?.id)
              .map(tv => ({
                value: tv.SinhVien?._id,
                label: `${tv.SinhVien?.HoTen || 'N/A'} (${tv.SinhVien?.MaSV || ''})`
              }))
          }
        />
      </Modal>
    </div>
  );
};

export default GroupManagement;
