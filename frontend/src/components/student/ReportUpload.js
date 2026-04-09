import React, { useState, useEffect } from 'react';
import { Upload, message, Typography, Card, Progress, Button, Alert, Skeleton, Tag, Space, Modal, Descriptions } from 'antd';
import { UploadCloud, BookOpen, Trash2, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;

const ReportUpload = () => {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [registration, setRegistration] = useState(null);
  const [existingBaoCao, setExistingBaoCao] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isGraded, setIsGraded] = useState(false);

  const user = authService.getCurrentUser();

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoadingData(true);
      const [regRes, bcRes] = await Promise.all([
        aiApiService.getMyRegistration(user.id),
        aiApiService.getMyBaoCao(user.id)
      ]);
      setRegistration(regRes.registration);
      setExistingBaoCao(bcRes.baocao);

      // Kiểm tra đã chấm điểm chưa
      if (bcRes.baocao) {
        try {
          const diemRes = await aiApiService.getDiemBySinhVien(user.id);
          const graded = Array.isArray(diemRes) && diemRes.some(d =>
            d.BaoCao && (d.BaoCao._id || d.BaoCao).toString() === bcRes.baocao._id.toString()
          );
          setIsGraded(graded);
        } catch (e) {
          setIsGraded(false);
        }
      }
    } catch (e) {
      console.error('Lỗi:', e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const topicName = registration?.DeTai?.TenDeTai || 'Chưa xác định';
  const topicRequires = registration?.DeTai?.YeuCau || [];
  const isApproved = registration?.TrangThai === 'DaDuyet';
  const hasSubmission = !!existingBaoCao;

  const isLeader = registration ? (
    (registration.SinhVien && registration.SinhVien._id === user.id) ||
    registration.SinhVien === user.id
  ) : false;
  const isGroupTopic = registration?.DeTai?.SoLuongSinhVien > 1;

  const props = {
    name: 'file',
    multiple: false,
    fileList,
    beforeUpload: (file) => {
      const isPDF = file.type === 'application/pdf';
      if (!isPDF) {
        message.error(`${file.name} không phải là file PDF!`);
        return Upload.LIST_IGNORE;
      }
      setFileList([file]);
      return false;
    },
    onRemove: () => { setFileList([]); },
  };

  const handleUpload = async () => {
    if (isGroupTopic && !isLeader) {
      message.warning('Chỉ trưởng nhóm mới có quyền nộp báo cáo chung cho đề tài này.');
      return;
    }
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn một file PDF để tải lên.');
      return;
    }

    setUploading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) { clearInterval(interval); return 90; }
        return prev + 15;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append('file', fileList[0]);
      formData.append('deTaiId', registration?.DeTai?._id || registration?.DeTai);
      formData.append('sinhVienId', user.id);
      formData.append('tieuDe', `Báo cáo: ${topicName}`);

      const result = await aiApiService.uploadBaoCao(formData);
      clearInterval(interval);
      setProgress(100);
      setExistingBaoCao(result.data);
      setFileList([]);
      message.success('Nộp báo cáo thành công! File đã được lưu lên hệ thống.');
    } catch (err) {
      clearInterval(interval);
      setProgress(0);
      const errMsg = err.response?.data?.error || 'Nộp báo cáo thất bại';
      message.error(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleUnsubmit = () => {
    Modal.confirm({
      title: 'Hủy nộp báo cáo',
      content: 'Bạn chắc chắn muốn hủy nộp và xóa file đã gửi? Bạn có thể nộp lại file mới sau.',
      okText: 'Xác nhận hủy nộp',
      okType: 'danger',
      cancelText: 'Giữ lại',
      onOk: async () => {
        setDeleting(true);
        try {
          await aiApiService.deleteBaoCao(existingBaoCao._id);
          setExistingBaoCao(null);
          setProgress(0);
          message.success('Đã hủy nộp. Bạn có thể nộp file mới.');
        } catch (e) {
          const errMsg = e.response?.data?.error || 'Hủy nộp thất bại';
          message.error(errMsg);
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const getIpfsUrl = (cid) => `https://gateway.pinata.cloud/ipfs/${cid}`;

  if (loadingData) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Card><Skeleton active paragraph={{ rows: 4 }} /></Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Typography>
        <Title level={2}>Nộp Báo Cáo Đồ Án</Title>
        <Paragraph>
          Tải lên báo cáo của bạn dưới định dạng PDF. Hệ thống sẽ tự động băm tài liệu của bạn (Hashing) và lưu trữ phi tập trung trên mạng <strong>IPFS / Filecoin</strong>.
        </Paragraph>
      </Typography>

      {registration ? (
        <Card style={{ marginBottom: 16, borderLeft: isApproved ? '4px solid #52c41a' : '4px solid #faad14', background: isApproved ? '#f6ffed' : '#fffbe6' }}>
          <Space direction="vertical" size={4}>
            <Space>
              <BookOpen size={18} color={isApproved ? '#52c41a' : '#faad14'} />
              <Text strong style={{ fontSize: 16 }}>Đề tài: {topicName}</Text>
              <Tag color={isApproved ? 'success' : 'warning'}>
                {isApproved ? 'Đã Duyệt' : 'Chờ Duyệt'}
              </Tag>
            </Space>
            {topicRequires.length > 0 && (
              <div>
                <Text type="secondary">Yêu cầu: </Text>
                {topicRequires.map((tag, i) => <Tag key={i} color="blue">{tag}</Tag>)}
              </div>
            )}
          </Space>
        </Card>
      ) : (
        <Alert message="Chưa đăng ký đề tài" description="Bạn cần đăng ký và được duyệt đề tài trước khi nộp báo cáo." type="warning" showIcon style={{ marginBottom: 16 }} />
      )}

      {hasSubmission ? (
        <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '2px solid #52c41a' }}>
          <Alert
            message="Bạn đã nộp báo cáo thành công!"
            description="File báo cáo đã được ghi nhận. Giảng viên sẽ xem và chấm điểm."
            type="success" showIcon icon={<CheckCircle size={20} />}
            style={{ marginBottom: 16 }}
          />

          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Tiêu đề">{existingBaoCao.TieuDe}</Descriptions.Item>
            <Descriptions.Item label="Mã IPFS (CID)">
              <Space>
                <Tag color="cyan">{existingBaoCao.IPFS_CID}</Tag>
                <Button type="link" size="small" icon={<ExternalLink size={14} />}
                  onClick={() => window.open(getIpfsUrl(existingBaoCao.IPFS_CID), '_blank')}>
                  Xem file gốc trên IPFS
                </Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Đề tài">{existingBaoCao.DeTai?.TenDeTai || topicName}</Descriptions.Item>
            <Descriptions.Item label="Thời gian nộp">{new Date(existingBaoCao.NgayNop || existingBaoCao.createdAt).toLocaleString('vi-VN')}</Descriptions.Item>
          </Descriptions>

          {isGraded ? (
            <Alert
              message="Bài đã được chấm điểm và ghi lên Blockchain"
              description="Điểm số đã bất biến trên Blockchain. Không thể hủy nộp bài."
              type="success" showIcon icon={<ShieldCheck size={18} />}
              style={{ marginTop: 16 }}
            />
          ) : (isGroupTopic && !isLeader) ? (
            <Alert
              message="Bài nộp thuộc nhóm"
              description="Chỉ trưởng nhóm mới có quyền hủy và nộp lại báo cáo chung của cả nhóm."
              type="info" showIcon
              style={{ marginTop: 16 }}
            />
          ) : (
            <Button danger size="large" icon={<Trash2 size={16} />}
              onClick={handleUnsubmit} loading={deleting}
              style={{ marginTop: 24, width: '100%' }}>
              Hủy Nộp (Xóa bài & Nộp lại)
            </Button>
          )}
        </Card>
      ) : (
        <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          {!isApproved && registration && (
            <Alert message="Đề tài chưa được duyệt" description="Bạn cần chờ Giảng viên duyệt đề tài trước khi nộp báo cáo." type="warning" showIcon style={{ marginBottom: 16 }} />
          )}

          {isGroupTopic && !isLeader ? (
            <Alert message="Đợi trưởng nhóm nộp bài" description="Đề tài này là đề tài nhóm. Chỉ trưởng nhóm mới có quyền tải lên báo cáo chung cho cả nhóm." type="info" showIcon style={{ marginBottom: 16 }} />
          ) : (
            <>
              {isGroupTopic && (
                <Alert message="Trưởng nhóm nộp cho cả nhóm" description="File báo cáo bạn nộp sẽ được dùng chung cho tất cả các thành viên trong nhóm." type="info" showIcon style={{ marginBottom: 16 }} />
              )}
              <Dragger {...props} height={250} style={{ padding: 24, background: '#fafafa' }} disabled={!isApproved}>
                <p className="ant-upload-drag-icon" style={{ marginBottom: 16 }}>
                  <UploadCloud size={64} color={isApproved ? "#1677ff" : "#d9d9d9"} style={{ opacity: 0.8 }} />
                </p>
                <Text strong style={{ fontSize: 18, display: 'block', marginBottom: 8 }}>
                  {isApproved ? 'Kéo thả hoặc Nhấp để chọn File Báo Cáo' : 'Chờ duyệt đề tài để mở khóa nộp bài'}
                </Text>
                <Text type="secondary">Chỉ hỗ trợ định dạng PDF. Dung lượng tối đa 20MB.</Text>
              </Dragger>

              {uploading && (
                <div style={{ marginTop: 24 }}>
                  <Text strong>Đang mã hóa & Upload lên IPFS...</Text>
                  <Progress percent={progress} status="active" strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} />
                </div>
              )}

              <Button type="primary" size="large" onClick={handleUpload}
                disabled={fileList.length === 0 || uploading || !isApproved}
                loading={uploading} style={{ marginTop: 24, width: '100%' }}>
                {uploading ? 'Đang thực thi...' : 'Xác Nhận Nộp Bài'}
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default ReportUpload;
