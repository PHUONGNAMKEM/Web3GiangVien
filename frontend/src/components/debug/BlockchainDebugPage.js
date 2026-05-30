import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
  Typography
} from 'antd';
import { Database, FileSearch, RefreshCw, Search } from 'lucide-react';

const { Title, Text, Paragraph } = Typography;

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const formatTimestamp = (value) => {
  if (!value) return '-';
  return new Date(Number(value) * 1000).toLocaleString('vi-VN');
};

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

  const fetchContracts = async () => {
    setContractsLoading(true);
    setContractsError('');
    try {
      const response = await axios.get(`${API_URL}/blockchain/contracts`);
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
        response = await axios.get(`${API_URL}/blockchain/db-records`, {
          params: { limit: 50 }
        });
      } catch (error) {
        if (error.response?.status !== 404) {
          throw error;
        }
        response = await axios.get(`${API_URL}/blockchain/thesis/db-records`, {
          params: { limit: 50 }
        });
      }
      setDbRecords(response.data);
    } catch (error) {
      const message = error.response?.status === 404
        ? 'Backend chua co route doc du lieu tong hop. Hay restart backend de nap route /api/blockchain/db-records.'
        : (error.response?.data?.error || error.message);
      setDbRecordsError(message);
    } finally {
      setDbRecordsLoading(false);
    }
  };

  const fetchTopic = async ({ topicId }) => {
    setTopicLoading(true);
    setTopicError('');
    setTopic(null);
    try {
      const response = await axios.get(`${API_URL}/blockchain/thesis/topic/${topicId}`);
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
      const response = await axios.get(`${API_URL}/blockchain/thesis/submissions`, {
        params: { studentId, topicId }
      });
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
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.topic?.title || '-'}</Text>
          <Text type="secondary">{record.report?.title || '-'}</Text>
          <Text copyable type="secondary">CID: {record.report?.ipfsCID}</Text>
        </Space>
      )
    },
    {
      title: 'DB',
      key: 'database',
      width: 190,
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Tag color={record.report?.submitTxHash ? 'green' : 'default'}>
            Nộp: {record.report?.submitTxHash ? 'Có tx' : 'Chưa có tx'}
          </Tag>
          <Tag color={record.grade?.blockchainStatus === 'DaGhi' ? 'green' : 'orange'}>
            Chấm: {record.grade?.blockchainStatus || 'Chưa chấm'}
          </Tag>
          {record.grade?.txHash && <Text copyable type="secondary">Tx: {record.grade.txHash}</Text>}
        </Space>
      )
    },
    {
      title: 'On-chain',
      key: 'chain',
      width: 180,
      render: (_, record) => {
        const statusColor = record.chain?.status === 'found'
          ? 'green'
          : record.chain?.status === 'error'
            ? 'red'
            : 'default';
        return (
          <Space direction="vertical" size={4}>
            <Space wrap>
              <Tag color={statusColor}>{record.chain?.status}</Tag>
              <Tag color={record.chain?.matchedByCid ? 'green' : 'orange'}>
                CID {record.chain?.matchedByCid ? 'khớp' : 'chưa khớp'}
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
      width: 360,
      render: (_, record) => {
        const data = record.chain?.data || [];
        if (!data.length) return <Text type="secondary">Chưa có dữ liệu on-chain</Text>;
        return (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {data.map((item, index) => (
              <div
                key={`${item.timestamp}-${index}`}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: 10,
                  background: '#fafafa'
                }}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color="blue">Submission #{index}</Tag>
                    <Tag color={item.graded ? 'green' : 'orange'}>
                      {item.graded ? 'Đã chấm' : 'Chưa chấm'}
                    </Tag>
                  </Space>
                  <Text>Điểm: <Text strong>{item.grade}</Text> / 10</Text>
                  <Text type="secondary">Raw grade: {item.rawGrade}</Text>
                  <Text type="secondary">Thời điểm: {formatTimestamp(item.timestamp)}</Text>
                  <Text copyable type="secondary">Student DID: {item.studentDID}</Text>
                  <Text copyable type="secondary">Topic ID: {item.topicId}</Text>
                  <Text copyable type="secondary">IPFS CID: {item.ipfsCID}</Text>
                  <Text>Feedback: {item.feedback || '-'}</Text>
                </Space>
              </div>
            ))}
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f8', padding: 28 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <Space direction="vertical" size={22} style={{ width: '100%' }}>
          <div>
            <Title level={2} style={{ marginBottom: 4 }}>Blockchain</Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Trang kiểm tra dữ liệu contract độc lập, không được gắn vào menu của ứng dụng chính.
            </Paragraph>
          </div>

          <Card
            title={
              <Space>
                <Database size={18} />
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
                      <Space wrap>
                        <Text copyable>{contracts.contracts?.thesis?.address}</Text>
                        <Tag color="blue">{contracts.contracts?.thesis?.version}</Tag>
                        <Tag color={contracts.contracts?.thesis?.hasCode ? 'green' : 'red'}>
                          {contracts.contracts?.thesis?.hasCode ? 'Có bytecode' : 'Không có bytecode'}
                        </Tag>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="HR Payroll">
                      <Text copyable>{contracts.contracts?.hrPayroll?.address || '-'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Token">
                      <Text copyable>{contracts.contracts?.token?.address || '-'}</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Space>
              )}
            </Spin>
          </Card>

          <Card
            title={
              <Space>
                <Database size={18} />
                <span>Dữ liệu DB đã đối chiếu Blockchain</span>
              </Space>
            }
            extra={
              <Button icon={<RefreshCw size={16} />} onClick={fetchDbRecords} loading={dbRecordsLoading}>
                Tải lại
              </Button>
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
                  </Space>
                  <Table
                    rowKey={(record) => record.report?.id}
                    columns={dbRecordColumns}
                    dataSource={dbRecords.records || []}
                    pagination={{ pageSize: 8 }}
                    size="small"
                    scroll={{ x: 1100 }}
                    expandable={{
                      expandedRowRender: (record) => (
                        <Space direction="vertical" size={10} style={{ width: '100%' }}>
                          <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                            <Descriptions.Item label="Student ID">
                              <Text copyable>{record.student?.id}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Topic ID">
                              <Text copyable>{record.topic?.id}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Report ID">
                              <Text copyable>{record.report?.id}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Grade ID">
                              <Text copyable>{record.grade?.id || '-'}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Submit tx">
                              <Text copyable>{record.report?.submitTxHash || '-'}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Grade tx">
                              <Text copyable>{record.grade?.txHash || '-'}</Text>
                            </Descriptions.Item>
                          </Descriptions>
                          <Table
                            rowKey={(item, index) => `${item.timestamp}-${index}`}
                            columns={submissionColumns}
                            dataSource={record.chain?.data || []}
                            pagination={false}
                            size="small"
                            scroll={{ x: 900 }}
                          />
                        </Space>
                      )
                    }}
                  />
                </Space>
              )}
            </Spin>
          </Card>

          <Row gutter={[18, 18]}>
            <Col xs={24} lg={10}>
              <Card
                title={
                  <Space>
                    <FileSearch size={18} />
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
                          <Text copyable>{topic.contract?.address}</Text>
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
                    <Search size={18} />
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
        </Space>
      </div>
    </div>
  );
};

export default BlockchainDebugPage;
