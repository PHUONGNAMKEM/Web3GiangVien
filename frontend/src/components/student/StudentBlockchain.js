import React, { useEffect, useState } from 'react';
import apiService from '../../services/apiService';
import { Alert, Button, Card, Empty, Skeleton, Space, Tag, Typography } from 'antd';
import { ShieldCheck, RefreshCw, Database } from 'lucide-react';

const { Title, Text, Paragraph, Link } = Typography;

const etherscanTxUrl = (hash) => `https://sepolia.etherscan.io/tx/${hash}`;

const formatTimestamp = (value) => {
  if (!value) return '-';
  return new Date(Number(value) * 1000).toLocaleString('vi-VN');
};

const shortenHash = (hash) => {
  if (!hash) return '';
  return hash.length > 16 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
};

const isMockTx = (hash) => typeof hash === 'string' && hash.startsWith('0xMock');

const stripReportLabel = (text) => (text || '').replace(/^\s*báo\s*cáo\b\s*:?\s*/i, '');

const getChainStatusMeta = (status) => ({
  found: { label: 'Đã có on-chain', color: 'green' },
  empty: { label: 'Chưa có on-chain', color: 'default' },
  error: { label: 'Lỗi đọc chain', color: 'red' }
}[status] || { label: 'Chưa kiểm tra', color: 'default' });

const getGradeBcMeta = (status) => ({
  ChuaGhi: { label: 'Chưa ghi', color: 'default' },
  Pending: { label: 'Đang ghi', color: 'processing' },
  DaGhi: { label: 'Đã ghi', color: 'green' },
  LoiGhi: { label: 'Lỗi ghi', color: 'red' }
}[status] || { label: 'Chưa chấm', color: 'orange' });

const renderTx = (hash) => {
  if (!hash) return <Text type="secondary">-</Text>;
  if (isMockTx(hash)) return <Text type="secondary" italic>Đồng bộ từ chain (không có tx thật)</Text>;
  return (
    <Text copyable={{ text: hash }} type="secondary">
      <Link href={etherscanTxUrl(hash)} target="_blank" rel="noopener noreferrer">{shortenHash(hash)}</Link>
    </Text>
  );
};

const StudentBlockchain = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get('/blockchain/my-records');
      setData(response.data);
    } catch (err) {
      const raw = err.response?.data?.error ?? err.message;
      setError(typeof raw === 'string' ? raw : (JSON.stringify(raw) || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const records = data?.records || [];
  const total = records.length;
  const matched = records.filter((r) => r.chain?.matchedByCid).length;
  const allOk = total > 0 && matched === total;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={2} style={{ marginBottom: 4 }}>
              <ShieldCheck size={26} style={{ verticalAlign: 'middle', marginRight: 8 }} />
              Lịch sử Blockchain của tôi
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Đối chiếu báo cáo &amp; điểm của bạn giữa hệ thống và Blockchain — bằng chứng dữ liệu không bị chỉnh sửa.
            </Paragraph>
          </div>
          <Button icon={<RefreshCw size={16} />} onClick={fetchRecords} loading={loading}>
            Tải lại
          </Button>
        </div>

        {data?.network && (
          <Space wrap>
            <Tag icon={<Database size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />} color="blue">
              Mạng: {data.network.name} ({data.network.chainId})
            </Tag>
            {data?.contract?.version && <Tag color="geekblue">Contract {data.contract.version}</Tag>}
          </Space>
        )}

        {error && <Alert type="error" message="Không đọc được dữ liệu Blockchain" description={error} showIcon />}

        {loading && !data ? (
          <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
        ) : total === 0 ? (
          <Card>
            <Empty description="Bạn chưa có báo cáo nào được ghi nhận trên hệ thống." />
          </Card>
        ) : (
          <>
            <Alert
              type={allOk ? 'success' : 'warning'}
              showIcon
              message={
                allOk
                  ? `Tất cả ${total} báo cáo của bạn đều khớp dữ liệu trên Blockchain — không phát hiện sai lệch.`
                  : `${matched}/${total} báo cáo khớp Blockchain. ${total - matched} báo cáo chưa khớp / chưa ghi.`
              }
            />

            {records.map((record) => {
              const chainMeta = getChainStatusMeta(record.chain?.status);
              const gradeMeta = getGradeBcMeta(record.grade?.blockchainStatus);
              const onChain = record.chain?.data || [];
              return (
                <Card
                  key={record.report?.id}
                  title={
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Text strong>{record.topic?.title || 'Đề tài'}</Text>
                      <Text type="secondary" style={{ fontWeight: 400 }}>
                        Báo cáo: {stripReportLabel(record.report?.title) || '-'}
                      </Text>
                    </Space>
                  }
                  extra={<Tag color={record.chain?.matchedByCid ? 'green' : 'orange'}>
                    {record.chain?.matchedByCid
                      ? `CID khớp${record.chain?.matchedVia === 'group' ? ' (nhóm)' : ''}`
                      : 'CID chưa khớp'}
                  </Tag>}
                >
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color={record.report?.submitTxHash ? 'green' : 'default'}>
                        Nộp: {record.report?.submitTxHash ? 'Có tx' : 'Chưa có tx'}
                      </Tag>
                      <Tag color={gradeMeta.color}>
                        Chấm: {gradeMeta.label}{record.grade?.fromGroup ? ' (theo nhóm)' : ''}
                      </Tag>
                      <Tag color={chainMeta.color}>{chainMeta.label}</Tag>
                      <Text copyable={{ text: record.report?.ipfsCID }} type="secondary">
                        <Text strong>CID:</Text> {shortenHash(record.report?.ipfsCID)}
                      </Text>
                    </Space>

                    <Space direction="vertical" size={2}>
                      <Text type="secondary"><Text strong>Tx nộp báo cáo:</Text> {renderTx(record.report?.submitTxHash)}</Text>
                      <Text type="secondary"><Text strong>Tx ghi điểm:</Text> {renderTx(record.grade?.txHash)}</Text>
                    </Space>

                    {record.grade && (
                      <Alert
                        type="info"
                        showIcon={false}
                        message={
                          <Space direction="vertical" size={2} style={{ width: '100%' }}>
                            <Text><Text strong>Điểm Giảng viên:</Text> {record.grade.score}/10
                              {record.grade.aiScore != null && <Text type="secondary"> · Điểm AI: {record.grade.aiScore}/10</Text>}
                            </Text>
                            {record.grade.feedback && <Text italic type="secondary">"{record.grade.feedback}"</Text>}
                          </Space>
                        }
                      />
                    )}

                    <div>
                      <Text strong>Dữ liệu ghi nhận trên Blockchain ({onChain.length}):</Text>
                      {onChain.length === 0 ? (
                        <div style={{ marginTop: 6 }}>
                          <Text type="secondary">Chưa có dữ liệu on-chain cho báo cáo này.</Text>
                          {record.chain?.error && <Text type="danger"> ({record.chain.error})</Text>}
                        </div>
                      ) : (
                        <Space direction="vertical" size={10} style={{ width: '100%', marginTop: 8 }}>
                          {onChain.map((item, index) => (
                            <div
                              key={`${item.timestamp}-${index}`}
                              style={{ border: '1px solid var(--border-subtle)', borderRadius: 6, padding: 10, background: 'var(--bg-subtle)' }}
                            >
                              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                <Space wrap>
                                  <Tag color="blue">Lần nộp #{index}</Tag>
                                  <Tag color={item.graded ? 'green' : 'orange'}>{item.graded ? 'Đã chấm' : 'Chưa chấm'}</Tag>
                                </Space>
                                <Text><Text strong>Điểm:</Text> {item.grade} / 10 <Text type="secondary">(gốc ×10: {item.rawGrade})</Text></Text>
                                <Text type="secondary"><Text strong>Thời điểm:</Text> {formatTimestamp(item.timestamp)}</Text>
                                <Text copyable={{ text: item.ipfsCID }} type="secondary"><Text strong>IPFS CID:</Text> {shortenHash(item.ipfsCID)}</Text>
                                {item.feedback && (
                                  <Paragraph style={{ margin: 0 }} ellipsis={{ rows: 2, expandable: 'collapsible', symbol: (e) => (e ? 'Thu gọn' : 'Xem thêm') }}>
                                    <Text strong>Feedback: </Text>{item.feedback}
                                  </Paragraph>
                                )}
                              </Space>
                            </div>
                          ))}
                        </Space>
                      )}
                    </div>
                  </Space>
                </Card>
              );
            })}
          </>
        )}
      </Space>
    </div>
  );
};

export default StudentBlockchain;
