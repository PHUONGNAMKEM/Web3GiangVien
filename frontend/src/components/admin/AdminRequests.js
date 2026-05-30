import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Space, Button, Modal, Input, Spin, Alert, Typography, message, Tabs, Tag, Descriptions, Select, Drawer, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { Check as CheckIcon, Close as CloseIcon } from '@mui/icons-material';
import { Eye, History, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';
import authService from '../../services/authService';

const { Title, Text } = Typography;
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'http://localhost:5000';

const AdminRequests = () => {
  // ===== PENDING REQUESTS STATE =====
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ===== HISTORY STATE =====
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [historyStatusFilter, setHistoryStatusFilter] = useState(undefined);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateRange, setHistoryDateRange] = useState(null);
  const searchTimerRef = useRef(null);

  // ===== DETAIL DRAWER STATE =====
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ===== ACTIVE TAB =====
  const [activeTab, setActiveTab] = useState('pending');

  // ===== SOCKET + FETCH PENDING =====
  useEffect(() => {
    fetchRequests();

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

  // ===== FETCH HISTORY =====
  const fetchHistory = useCallback(async (page = 1, status = undefined, search = '', dateRange = null) => {
    setHistoryLoading(true);
    try {
      const token = authService.getToken();
      const params = new URLSearchParams({ page, limit: 10 });
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      if (dateRange && dateRange[0]) params.append('fromDate', dateRange[0].format('YYYY-MM-DD'));
      if (dateRange && dateRange[1]) params.append('toDate', dateRange[1].format('YYYY-MM-DD'));

      const res = await axios.get(`${API_BASE_URL}/admin/requests/history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setHistoryData(res.data.requests);
        setHistoryPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
      message.error('Lỗi khi tải lịch sử yêu cầu.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Fetch history when switching to history tab or filter changes
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(1, historyStatusFilter, historySearch, historyDateRange);
    }
  }, [activeTab, historyStatusFilter, historyDateRange, fetchHistory]);

  // Debounce search
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setHistorySearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchHistory(1, historyStatusFilter, val, historyDateRange);
    }, 500);
  };

  // ===== FETCH DETAIL =====
  const fetchDetail = async (id) => {
    setDetailLoading(true);
    setDetailDrawerOpen(true);
    try {
      const token = authService.getToken();
      const res = await axios.get(`${API_BASE_URL}/admin/requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setDetailData(res.data.request);
      }
    } catch (err) {
      console.error('Fetch detail error:', err);
      message.error('Lỗi khi tải chi tiết yêu cầu.');
    } finally {
      setDetailLoading(false);
    }
  };

  // ===== ACTIONS =====
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

  // ===== COLUMNS: PENDING =====
  const pendingColumns = [
    {
      title: 'Thời gian gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
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
      render: (text) => text ? `${text.slice(0, 6)}...${text.slice(-4)}` : 'N/A',
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center',
      width: 200,
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

  // ===== COLUMNS: HISTORY =====
  const historyColumns = [
    {
      title: 'Thời gian gửi',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (text) => new Date(text).toLocaleString('vi-VN'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
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
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      align: 'center',
      render: (status) => {
        if (status === 'approved') return <Tag icon={<CheckCircle size={12} />} color="success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Đã duyệt</Tag>;
        if (status === 'rejected') return <Tag icon={<XCircle size={12} />} color="error" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Từ chối</Tag>;
        return <Tag color="default">{status}</Tag>;
      },
    },
    {
      title: 'Thời gian xử lý',
      dataIndex: 'reviewedAt',
      key: 'reviewedAt',
      width: 170,
      render: (text) => text ? new Date(text).toLocaleString('vi-VN') : 'N/A',
      defaultSortOrder: 'descend',
      sorter: (a, b) => new Date(a.reviewedAt || 0) - new Date(b.reviewedAt || 0),
    },
    {
      title: 'Người duyệt',
      dataIndex: ['reviewedBy', 'HoTen'],
      key: 'reviewedBy',
      width: 140,
      render: (text) => text || 'N/A',
    },
    {
      title: '',
      key: 'detail',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<Eye size={16} />}
          onClick={() => fetchDetail(record._id)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  // ===== RENDER =====
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}><Spin size="large" /></div>;
  }

  const tabItems = [
    {
      key: 'pending',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={16} />
          Chờ duyệt ({requests.length})
        </span>
      ),
      children: (
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Title level={5} style={{ marginBottom: 16 }}>
            Yêu cầu cấp quyền Giảng viên đang chờ duyệt ({requests.length})
          </Title>
          {requests.length === 0 ? (
            <Text type="secondary">Không có yêu cầu nào đang chờ.</Text>
          ) : (
            <Table
              columns={pendingColumns}
              dataSource={requests.map(r => ({ ...r, key: r._id }))}
              pagination={{ pageSize: 5 }}
              scroll={{ x: 'max-content' }}
              size="small"
            />
          )}
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <History size={16} />
          Lịch sử đã xử lý
        </span>
      ),
      children: (
        <div style={{ background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <Title level={5} style={{ margin: 0 }}>
              Lịch sử yêu cầu đã xử lý ({historyPagination.total})
            </Title>
          </div>

          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <Input
              placeholder="Tìm theo tên, email, chuyên ngành..."
              prefix={<Search size={16} color="#bfbfbf" />}
              value={historySearch}
              onChange={handleSearchChange}
              allowClear
              style={{ width: 300 }}
            />
            <DatePicker.RangePicker
              value={historyDateRange}
              onChange={(dates) => setHistoryDateRange(dates)}
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              style={{ width: 280 }}
              allowClear
            />
            <Select
              value={historyStatusFilter}
              onChange={(val) => setHistoryStatusFilter(val)}
              style={{ width: 160 }}
              allowClear
              placeholder="Trạng thái"
            >
              <Select.Option value="approved">
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={14} color="#52c41a" /> Đã duyệt
                </span>
              </Select.Option>
              <Select.Option value="rejected">
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <XCircle size={14} color="#ff4d4f" /> Từ chối
                </span>
              </Select.Option>
            </Select>
          </div>

          <Table
            columns={historyColumns}
            dataSource={historyData.map(r => ({ ...r, key: r._id }))}
            loading={historyLoading}
            pagination={{
              current: historyPagination.page,
              pageSize: historyPagination.limit,
              total: historyPagination.total,
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} yêu cầu`,
              showSizeChanger: false,
              onChange: (page) => {
                fetchHistory(page, historyStatusFilter, historySearch, historyDateRange);
              },
            }}
            scroll={{ x: 'max-content' }}
            size="small"
            locale={{ emptyText: 'Chưa có lịch sử yêu cầu nào.' }}
            onRow={(record) => ({
              onClick: () => fetchDetail(record._id),
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ marginBottom: 24 }}>Quản lý Yêu cầu Phê duyệt</Title>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />

      {/* Reject Modal */}
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

      {/* Detail Drawer */}
      <Drawer
        title="Chi tiết Yêu cầu"
        placement="right"
        width={520}
        onClose={() => { setDetailDrawerOpen(false); setDetailData(null); }}
        open={detailDrawerOpen}
      >
        {detailLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spin size="large" /></div>
        ) : detailData ? (
          <div>
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              {detailData.status === 'approved' && (
                <Tag icon={<CheckCircle size={14} />} color="success" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '4px 12px' }}>
                  ĐÃ DUYỆT
                </Tag>
              )}
              {detailData.status === 'rejected' && (
                <Tag icon={<XCircle size={14} />} color="error" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '4px 12px' }}>
                  ĐÃ TỪ CHỐI
                </Tag>
              )}
              {detailData.status === 'pending' && (
                <Tag icon={<Clock size={14} />} color="processing" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, padding: '4px 12px' }}>
                  ĐANG CHỜ DUYỆT
                </Tag>
              )}
            </div>

            <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: 600, width: 150 }}>
              <Descriptions.Item label="Họ và Tên">{detailData.hoTen}</Descriptions.Item>
              <Descriptions.Item label="Email">{detailData.email}</Descriptions.Item>
              <Descriptions.Item label="Chuyên ngành">{detailData.chuyenNganh}</Descriptions.Item>
              <Descriptions.Item label="Ví MetaMask">
                <Text copyable={{ text: detailData.walletAddress }} style={{ wordBreak: 'break-all' }}>
                  {detailData.walletAddress}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Role yêu cầu">
                <Tag color="blue">{detailData.requestedRole === 'LECTURER_ROLE' ? 'Giảng viên' : detailData.requestedRole}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian gửi">
                {new Date(detailData.createdAt).toLocaleString('vi-VN')}
              </Descriptions.Item>
            </Descriptions>

            {(detailData.status === 'approved' || detailData.status === 'rejected') && (
              <>
                <Title level={5} style={{ marginTop: 24, marginBottom: 12 }}>Thông tin xử lý</Title>
                <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: 600, width: 150 }}>
                  <Descriptions.Item label="Người duyệt">
                    {detailData.reviewedBy?.HoTen || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Thời gian xử lý">
                    {detailData.reviewedAt ? new Date(detailData.reviewedAt).toLocaleString('vi-VN') : 'N/A'}
                  </Descriptions.Item>
                  {detailData.status === 'rejected' && detailData.rejectReason && (
                    <Descriptions.Item label="Lý do từ chối">
                      <Text type="danger">{detailData.rejectReason}</Text>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </>
            )}
          </div>
        ) : (
          <Text type="secondary">Không có dữ liệu.</Text>
        )}
      </Drawer>
    </div>
  );
};

export default AdminRequests;
