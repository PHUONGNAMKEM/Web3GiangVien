import React, { useState, useEffect } from 'react';
import { Table, Space, Button, Modal, Input, Spin, Alert, Typography, message } from 'antd';
import { Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import axios from 'axios';
import io from 'socket.io-client';
import authService from '../../services/authService';

const { Title, Text } = Typography;
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000';

const AdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRequests();

    const token = authService.getToken();
    const socket = io(SOCKET_URL);
    
    socket.on('connect', () => {
      socket.emit('admin:join');
    });

    socket.on('admin:newRequest', (newReq) => {
      setRequests(prev => [newReq, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const token = authService.getToken();
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const res = await axios.get(`${API_BASE_URL}/admin/requests`, config);
      if (res.data.success) {
        setRequests(res.data.requests);
      }
    } catch (err) {
      console.error('Fetch data error:', err);
      setError('Lỗi khi tải dữ liệu yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      const token = authService.getToken();
      await axios.post(`${API_BASE_URL}/admin/approve/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests();
      message.success('Đã duyệt Giảng viên!');
      window.dispatchEvent(new CustomEvent('admin:refreshBadge'));
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (id) => {
    setSelectedRequestId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const token = authService.getToken();
      await axios.post(`${API_BASE_URL}/admin/reject/${selectedRequestId}`, { reason: rejectReason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRejectModalOpen(false);
      fetchRequests();
      message.success('Đã từ chối yêu cầu!');
      window.dispatchEvent(new CustomEvent('admin:refreshBadge'));
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}><Spin size="large" /></div>;
  }

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => new Date(text).toLocaleString('vi-VN'),
    },
    {
      title: 'Họ và Tên',
      dataIndex: 'hoTen',
      key: 'hoTen',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Chuyên ngành',
      dataIndex: 'chuyenNganh',
      key: 'chuyenNganh',
    },
    {
      title: 'Ví MetaMask',
      dataIndex: 'walletAddress',
      key: 'walletAddress',
      render: (text) => `${text.slice(0, 6)}...${text.slice(-4)}`,
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
            size="small"
            icon={<CheckIcon fontSize="small" style={{ fontSize: 14 }} />}
            onClick={() => handleApprove(record._id)}
            loading={actionLoading}
          >
            Duyệt
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseIcon fontSize="small" style={{ fontSize: 14 }} />}
            onClick={() => openRejectModal(record._id)}
            disabled={actionLoading}
          >
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>Quản lý Yêu cầu Phê duyệt</Title>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Title level={5} style={{ marginBottom: 16 }}>
          Yêu cầu cấp quyền Giảng viên đang chờ duyệt ({requests.length})
        </Title>
        {requests.length === 0 ? (
          <Text type="secondary">Không có yêu cầu nào đang chờ.</Text>
        ) : (
          <Table 
            columns={columns} 
            dataSource={requests.map(r => ({ ...r, key: r._id }))} 
            pagination={{ pageSize: 5 }}
            scroll={{ x: 'max-content' }}
            size="small"
          />
        )}
      </div>

      <Modal
        title="Từ chối yêu cầu"
        open={rejectModalOpen}
        onCancel={() => !actionLoading && setRejectModalOpen(false)}
        footer={[
          <Button key="back" onClick={() => setRejectModalOpen(false)} disabled={actionLoading}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" danger onClick={handleReject} loading={actionLoading} disabled={!rejectReason.trim()}>
            Xác nhận Từ chối
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16 }}>Vui lòng nhập lý do từ chối để Giảng viên biết:</div>
        <Input.TextArea
          autoFocus
          rows={4}
          placeholder="Lý do từ chối..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default AdminRequests;
