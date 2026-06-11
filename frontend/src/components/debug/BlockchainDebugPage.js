import React, { useEffect, useState } from 'react';
import apiService from '../../services/apiService';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message
} from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { Database, FileSearch, RefreshCw, Search, History } from 'lucide-react';

const { Title, Text, Paragraph, Link } = Typography;

// Mạng test Sepolia — mọi giao dịch / hợp đồng tra cứu công khai tại đây
const etherscanTxUrl = (hash) => `https://sepolia.etherscan.io/tx/${hash}`;
const etherscanAddressUrl = (addr) => `https://sepolia.etherscan.io/address/${addr}`;

const formatTimestamp = (value) => {
  if (!value) return '-';
  return new Date(Number(value) * 1000).toLocaleString('vi-VN');
};

// Rút gọn hash/địa chỉ dài: 0x1234abcd…ef5678
const shortenHash = (hash) => {
  if (!hash) return '';
  return hash.length > 16 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
};

// Tx giả do hệ thống tự đồng bộ khi điểm đã chốt từ trước (không phải giao dịch thật)
const isMockTx = (hash) => typeof hash === 'string' && hash.startsWith('0xMock');

// Bỏ tiền tố "Báo cáo" lặp trong tiêu đề báo cáo (tránh "Báo cáo: Báo cáo ...")
const stripReportLabel = (text) => (text || '').replace(/^\s*báo\s*cáo\b\s*:?\s*/i, '');

const renderAddress = (addr) => {
  if (!addr) return <Text type="secondary">-</Text>;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <Link href={etherscanAddressUrl(addr)} target="_blank" rel="noopener noreferrer">{addr}</Link>
      <Text copyable={{ text: addr }} />
    </div>
  );
};

// Hiển thị mã tx: thật -> link Etherscan bấm được; giả -> nhãn đồng bộ; rỗng -> "-"
const renderTx = (hash) => {
  if (!hash) return <Text type="secondary">-</Text>;
  if (isMockTx(hash)) return <Text type="secondary" italic>Đồng bộ từ chain (không có tx thật)</Text>;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <Text type="secondary">
        <Link href={etherscanTxUrl(hash)} target="_blank" rel="noopener noreferrer">
          {shortenHash(hash)}
        </Link>
      </Text>
      <Text copyable={{ text: hash }} />
    </div>
  );
};

// Nhãn trạng thái đọc on-chain
const getChainStatusMeta = (status) => ({
  found: { label: 'Đã có on-chain', color: 'green' },
  empty: { label: 'Chưa có on-chain', color: 'default' },
  error: { label: 'Lỗi đọc chain', color: 'red' }
}[status] || { label: 'Chưa kiểm tra', color: 'default' });

// Nhãn trạng thái ghi điểm lên Blockchain (enum DB -> tiếng Việt)
const getGradeBcMeta = (status) => ({
  ChuaGhi: { label: 'Chưa ghi', color: 'default' },
  Pending: { label: 'Đang ghi', color: 'processing' },
  DaGhi: { label: 'Đã ghi', color: 'green' },
  LoiGhi: { label: 'Lỗi ghi', color: 'red' }
}[status] || { label: 'Chưa chấm', color: 'orange' });

const BlockchainDebugPage = () => {
  const [contracts, setContracts] = useState(null);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState('');
  const [topic, setTopic] = useState(null);
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicError, setTopicError] = useState('');
  const [submissions, setSubmissions] = useState(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState('');
  const [dbRecords, setDbRecords] = useState(null);
  const [dbRecordsLoading, setDbRecordsLoading] = useState(false);
  const [dbRecordsError, setDbRecordsError] = useState('');
  const [backfilling, setBackfilling] = useState(false);
  const [alertClosed, setAlertClosed] = useState(false);

  const fetchContracts = async () => {
    setContractsLoading(true);
    setContractsError('');
    try {
      const response = await apiService.get('/blockchain/contracts');
      setContracts(response.data);
    } catch (error) {
      setContractsError(error.response?.data?.error || error.message);
    } finally {
      setContractsLoading(false);
    }
  };

  const fetchDbRecords = async () => {
    setDbRecordsLoading(true);
    setDbRecordsError('');
    try {
      let response;
      try {
        response = await apiService.get('/blockchain/db-records', { limit: 50 });
      } catch (error) {
        if (error.response?.status !== 404) {
          throw error;
        }
        response = await apiService.get('/blockchain/thesis/db-records', { limit: 50 });
      }
      setDbRecords(response.data);
    } catch (error) {
      const errMsg = error.response?.status === 404
        ? 'Backend chua co route doc du lieu tong hop. Hay restart backend de nap route /api/blockchain/db-records.'
        : (error.response?.data?.error || error.message);
      setDbRecordsError(errMsg);
    } finally {
      setDbRecordsLoading(false);
    }
  };

  const handleBackfillTx = async () => {
    setBackfilling(true);
    try {
      const response = await apiService.post('/blockchain/backfill-tx');
      const g = response.data?.grade || {};
      const r = response.data?.report || {};
      message.success(`Truy hồi xong — Điểm: ${g.updated || 0}/${g.scanned || 0} có tx thật; Nộp: ${r.updated || 0}/${r.scanned || 0} có tx thật.`);
      fetchDbRecords();
    } catch (error) {
      message.error(error.response?.data?.error || 'Truy hồi tx thất bại');
    } finally {
      setBackfilling(false);
    }
  };

  const fetchTopic = async ({ topicId }) => {
    setTopicLoading(true);
    setTopicError('');
    setTopic(null);
    try {
      const response = await apiService.get(`/blockchain/thesis/topic/${topicId}`);
      setTopic(response.data);
    } catch (error) {
      setTopicError(error.response?.data?.error || error.message);
    } finally {
      setTopicLoading(false);
    }
  };

  const fetchSubmissions = async ({ studentId, topicId }) => {
    setSubmissionsLoading(true);
    setSubmissionsError('');
    setSubmissions(null);
    try {
      const response = await apiService.get('/blockchain/thesis/submissions', { studentId, topicId });
      setSubmissions(response.data);
    } catch (error) {
      setSubmissionsError(error.response?.data?.error || error.message);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchDbRecords();
  }, []);

  const submissionColumns = [
    {
      title: 'Thời điểm',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 170,
      render: formatTimestamp
    },
    {
      title: 'CID IPFS',
      dataIndex: 'ipfsCID',
      key: 'ipfsCID',
      render: (value) => <Text copyable>{value}</Text>
    },
    {
      title: 'Điểm',
      dataIndex: 'grade',
      key: 'grade',
      width: 100,
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value}</Text>
          <Text type="secondary">Raw: {record.rawGrade}</Text>
        </Space>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'graded',
      key: 'graded',
      width: 130,
      render: (value) => (
        <Tag color={value ? 'green' : 'orange'}>
          {value ? 'Đã chấm' : 'Chưa chấm'}
        </Tag>
      )
    },
    {
      title: 'Nhận xét',
      dataIndex: 'feedback',
      key: 'feedback',
      render: (value) => value || '-'
    }
  ];

  const dbRecordColumns = [
    {
      title: 'Sinh viên',
      key: 'student',
      width: 190,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.student?.name || '-'}</Text>
          <Text type="secondary">{record.student?.code || record.student?.id}</Text>
        </Space>
      )
    },
    {
      title: 'Đề tài / báo cáo',
      key: 'topic',
      width: 280,
      render: (_, record) => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Paragraph ellipsis={{ rows: 2, tooltip: true }} strong style={{ margin: 0 }}>{record.topic?.title || '-'}</Paragraph>
          <Paragraph ellipsis={{ rows: 2, tooltip: true }} type="secondary" style={{ margin: 0 }}><Text strong>Báo cáo:</Text> {stripReportLabel(record.report?.title) || '-'}</Paragraph>
          <Text copyable={{ text: record.report?.ipfsCID }} type="secondary"><Text strong>CID:</Text> {shortenHash(record.report?.ipfsCID)}</Text>
        </Space>
      )
    },
    {
      title: 'DB',
      key: 'database',
      width: 190,
      render: (_, record) => {
        const gradeMeta = getGradeBcMeta(record.grade?.blockchainStatus);
        const txHash = record.grade?.txHash;
        return (
          <Space direction="vertical" size={4}>
            <Tag color={record.report?.submitTxHash ? 'green' : 'default'}>
              Nộp: {record.report?.submitTxHash ? 'Có tx' : 'Chưa có tx'}
            </Tag>
            <Tag color={gradeMeta.color}>
              Chấm: {gradeMeta.label}{record.grade?.fromGroup ? ' (theo nhóm)' : ''}
            </Tag>
            {txHash && (
              isMockTx(txHash)
                ? <Text type="secondary" italic>Đồng bộ từ chain</Text>
                : (
                  <Text copyable={{ text: txHash }} type="secondary">
                    Tx: <Link href={etherscanTxUrl(txHash)} target="_blank" rel="noopener noreferrer">{shortenHash(txHash)}</Link>
                  </Text>
                )
            )}
          </Space>
        );
      }
    },
    {
      title: 'On-chain',
      key: 'chain',
      width: 180,
      render: (_, record) => {
        const statusMeta = getChainStatusMeta(record.chain?.status);
        return (
          <Space direction="vertical" size={4}>
            <Space wrap>
              <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
              <Tag color={record.chain?.matchedByCid ? 'green' : 'orange'}>
                CID {record.chain?.matchedByCid ? 'khớp' : 'chưa khớp'}
                {record.chain?.matchedByCid && record.chain?.matchedVia === 'group' ? ' (nhóm)' : ''}
              </Tag>
            </Space>
            <Text type="secondary">{record.chain?.count || 0} bản ghi</Text>
            {record.chain?.error && <Text type="danger">{record.chain.error}</Text>}
          </Space>
        );
      }
    },
    {
      title: 'Giá trị ghi nhận',
      key: 'values',
      render: (_, record) => {
        const data = record.chain?.data || [];
        if (!data.length) return <Text type="secondary">Chưa có dữ liệu on-chain</Text>;
        return (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {data.map((item, index) => (
              <div
                key={`${item.timestamp}-${index}`}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 6,
                  padding: 10,
                  background: 'var(--bg-subtle)'
                }}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color="blue">Submission #{index}</Tag>
                    <Tag color={item.graded ? 'green' : 'orange'}>
                      {item.graded ? 'Đã chấm' : 'Chưa chấm'}
                    </Tag>
                  </Space>
                  <Text><Text strong>Điểm:</Text> <Text strong>{item.grade}</Text> / 10</Text>
                  <Text type="secondary"><Text strong>Điểm gốc (×10):</Text> {item.rawGrade}</Text>
                  <Text type="secondary"><Text strong>Thời điểm:</Text> {formatTimestamp(item.timestamp)}</Text>
                  <Text copyable={{ text: item.studentDID }} type="secondary"><Text strong>Student DID:</Text> {shortenHash(item.studentDID)}</Text>
                  <Text copyable={{ text: item.topicId }} type="secondary"><Text strong>Topic ID:</Text> {shortenHash(item.topicId)}</Text>
                  <Text copyable={{ text: item.ipfsCID }} type="secondary"><Text strong>IPFS CID:</Text> {shortenHash(item.ipfsCID)}</Text>
                  <Text><Text strong>Feedback:</Text> {item.feedback || '-'}</Text>
                </Space>
              </div>
            ))}
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        .custom-inner-table .ant-table {
          margin-inline: 0 !important;
          margin-block: 0 !important;
          border-top: 1px solid var(--border-subtle) !important;
        }
      `}</style>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <Space direction="vertical" size={22} style={{ width: '100%' }}>
          <div>
            <Title level={2} style={{ marginBottom: 4 }}>Đối Chiếu Blockchain</Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Đối chiếu dữ liệu điểm số giữa Database và Blockchain để chứng minh dữ liệu không bị giả mạo.
            </Paragraph>
          </div>

          <Card
            title={
              <Space>
                <Database size={18} style={{ display: "flex", alignItems: "center" }} />
                <span>Contract hệ thống</span>
              </Space>
            }
            extra={
              <Button icon={<RefreshCw size={16} />} onClick={fetchContracts} loading={contractsLoading}>
                Tải lại
              </Button>
            }
          >
            {contractsError && <Alert type="error" message="Không đọc được contract" description={contractsError} showIcon />}
            <Spin spinning={contractsLoading}>
              {contracts && (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                    <Descriptions.Item label="Mạng">
                      {contracts.network?.name} ({contracts.network?.chainId})
                    </Descriptions.Item>
                    <Descriptions.Item label="Thesis contract">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                        {renderAddress(contracts.contracts?.thesis?.address)}
                        <Space>
                          <Tag color="blue">{contracts.contracts?.thesis?.version}</Tag>
                          <Tag color={contracts.contracts?.thesis?.hasCode ? 'green' : 'red'}>
                            {contracts.contracts?.thesis?.hasCode ? 'Có bytecode' : 'Không có bytecode'}
                          </Tag>
                        </Space>
                      </div>
                    </Descriptions.Item>
                    <Descriptions.Item label="HR Payroll">
                      {renderAddress(contracts.contracts?.hrPayroll?.address)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Token">
                      {renderAddress(contracts.contracts?.token?.address)}
                    </Descriptions.Item>
                  </Descriptions>
                </Space>
              )}
            </Spin>
          </Card>

          <Row gutter={[18, 18]}>
            <Col xs={24} lg={10}>
              <Card
                title={
                  <Space>
                    <FileSearch style={{ display: "flex", alignItems: "center" }} size={18} />
                    <span>Tra cứu đề tài</span>
                  </Space>
                }
              >
                <Form layout="vertical" onFinish={fetchTopic}>
                  <Form.Item
                    label="Topic ID"
                    name="topicId"
                    rules={[{ required: true, message: 'Vui lòng nhập Topic ID' }]}
                  >
                    <Input placeholder="VD: 6a09632c50f104096757f2cd" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" icon={<Search size={16} />} loading={topicLoading}>
                    Xem topic
                  </Button>
                </Form>

                <Divider />
                {topicError && <Alert type="error" message="Không đọc được topic" description={topicError} showIcon />}
                <Spin spinning={topicLoading}>
                  {topic && (
                    <Descriptions bordered size="small" column={1}>
                      <Descriptions.Item label="Contract">
                        <Space wrap>
                          {renderAddress(topic.contract?.address)}
                          <Tag color="blue">{topic.contract?.version}</Tag>
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="Topic ID">
                        <Text copyable>{topic.topicId}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Tên đề tài">{topic.data?.title || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Giảng viên">{topic.data?.advisorDID || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Deadline">{formatTimestamp(topic.data?.deadline)}</Descriptions.Item>
                      <Descriptions.Item label="Tồn tại">
                        <Tag color={topic.data?.exists ? 'green' : 'red'}>
                          {topic.data?.exists ? 'Có' : 'Không'}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  )}
                </Spin>
              </Card>
            </Col>

            <Col xs={24} lg={14}>
              <Card
                title={
                  <Space>
                    <Search style={{ display: "flex", alignItems: "center" }} size={18} />
                    <span>Lịch sử nộp và chấm</span>
                  </Space>
                }
              >
                <Form layout="vertical" onFinish={fetchSubmissions}>
                  <Row gutter={12}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="Student ID"
                        name="studentId"
                        rules={[{ required: true, message: 'Vui lòng nhập Student ID' }]}
                      >
                        <Input placeholder="VD: 69feb2ef1e6e57ad2094f5b4" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="Topic ID"
                        name="topicId"
                        rules={[{ required: true, message: 'Vui lòng nhập Topic ID' }]}
                      >
                        <Input placeholder="VD: 6a09632c50f104096757f2cd" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" htmlType="submit" icon={<Search size={16} />} loading={submissionsLoading}>
                    Xem lịch sử
                  </Button>
                </Form>

                <Divider />
                {submissionsError && (
                  <Alert type="error" message="Không đọc được lịch sử nộp" description={submissionsError} showIcon />
                )}
                <Spin spinning={submissionsLoading}>
                  {submissions && (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color="blue">{submissions.contract?.version}</Tag>
                        <Tag color={submissions.count > 0 ? 'green' : 'default'}>{submissions.count} bản ghi</Tag>
                      </Space>
                      <Table
                        rowKey={(record, index) => `${record.timestamp}-${index}`}
                        columns={submissionColumns}
                        dataSource={submissions.data || []}
                        pagination={false}
                        size="small"
                        scroll={{ x: 900 }}
                      />
                    </Space>
                  )}
                </Spin>
              </Card>
            </Col>
          </Row>

          <Card
            title={
              <Space>
                <Database style={{ display: "flex", alignItems: "center" }} size={18} />
                <span>Dữ liệu DB đã đối chiếu Blockchain</span>
              </Space>
            }
            extra={
              <Space>
                <Button icon={<History style={{ verticalAlign: 'middle' }} size={16} />} onClick={handleBackfillTx} loading={backfilling}>
                  Truy hồi tx thật
                </Button>
                <Button icon={<RefreshCw style={{ verticalAlign: 'middle' }} size={16} />} onClick={fetchDbRecords} loading={dbRecordsLoading}>
                  Tải lại
                </Button>
              </Space>
            }
          >
            {dbRecordsError && (
              <Alert type="error" message="Không đọc được dữ liệu tổng hợp" description={dbRecordsError} showIcon />
            )}
            <Spin spinning={dbRecordsLoading}>
              {dbRecords && (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color="blue">{dbRecords.contract?.version}</Tag>
                    <Tag color="green">{dbRecords.count} bản ghi từ DB</Tag>
                    {alertClosed && dbRecords.records?.filter((r) => r.chain?.matchedByCid).length !== dbRecords.records?.length && (
                      <ExclamationCircleFilled 
                        style={{ color: '#faad14', fontSize: 16, cursor: 'pointer' }} 
                        onClick={() => setAlertClosed(false)}
                        title="Hiển thị lại thông báo"
                      />
                    )}
                  </Space>
                  {(() => {
                    const recs = dbRecords.records || [];
                    const total = recs.length;
                    const matched = recs.filter((r) => r.chain?.matchedByCid).length;
                    const allOk = total > 0 && matched === total;
                    if (alertClosed) return null;
                    return (
                      <Alert
                        type={allOk ? 'success' : 'warning'}
                        showIcon
                        closable
                        onClose={() => setAlertClosed(true)}
                        message={
                          allOk
                            ? `Tất cả ${total} bản ghi đều khớp dữ liệu trên Blockchain — không phát hiện sai lệch.`
                            : `${matched}/${total} bản ghi khớp Blockchain. ${total - matched} bản ghi chưa khớp / chưa ghi — cần kiểm tra.`
                        }
                      />
                    );
                  })()}
                  <Table
                    rowKey={(record) => record.report?.id}
                    columns={dbRecordColumns}
                    dataSource={dbRecords.records || []}
                    pagination={{ pageSize: 8 }}
                    size="small"
                    expandable={{
                      expandedRowRender: (record) => (
                        <Space direction="vertical" size={10} style={{ width: '100%' }}>
                          <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                            <Descriptions.Item label="Student ID">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text>{record.student?.id}</Text>
                                <Text copyable={{ text: record.student?.id }} />
                              </div>
                            </Descriptions.Item>
                            <Descriptions.Item label="Topic ID">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text>{record.topic?.id}</Text>
                                <Text copyable={{ text: record.topic?.id }} />
                              </div>
                            </Descriptions.Item>
                            <Descriptions.Item label="Report ID">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text>{record.report?.id}</Text>
                                <Text copyable={{ text: record.report?.id }} />
                              </div>
                            </Descriptions.Item>
                            <Descriptions.Item label="Grade ID">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text>{record.grade?.id || '-'}</Text>
                                {record.grade?.id && <Text copyable={{ text: record.grade?.id }} />}
                              </div>
                            </Descriptions.Item>
                            <Descriptions.Item label="Submit tx">
                              {renderTx(record.report?.submitTxHash)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Grade tx">
                              {renderTx(record.grade?.txHash)}
                            </Descriptions.Item>
                          </Descriptions>
                          <Table
                            rowKey={(item, index) => `${item.timestamp}-${index}`}
                            columns={submissionColumns}
                            dataSource={record.chain?.data || []}
                            pagination={false}
                            size="small"
                            scroll={{ x: 900 }}
                            bordered
                            className="custom-inner-table"
                            style={{ margin: 0, marginTop: 12 }}
                          />
                        </Space>
                      )
                    }}
                  />
                </Space>
              )}
            </Spin>
          </Card>
        </Space>
      </div>
    </div>
  );
};

export default BlockchainDebugPage;
