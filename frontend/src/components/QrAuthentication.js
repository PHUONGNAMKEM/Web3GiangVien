import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Spin, Alert, Divider, Tooltip, Row, Col, Space } from 'antd';
import { QrCode, RefreshCw, Copy, Download } from 'lucide-react';
import QRCode from 'qrcode';
import apiService from '../services/apiService';

const { Title, Text, Paragraph } = Typography;

function QrAuthentication({ user }) {
  const [qrCodeData, setQrCodeData] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchQrCode();
  }, []);

  const fetchQrCode = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getQrCode();
      if (response && response.success && response.data) {
        setQrCodeData(response.data);
        await generateQrImage(response.data);
      } else {
        setQrCodeData(null);
      }
    } catch (err) {
      console.error('Error fetching QR code:', err);
      setError('Không thể tải mã QR. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const generateNewQr = async () => {
    try {
      setGenerating(true);
      setError('');
      setSuccess('');
      
      const response = await apiService.generateNewQrCode();
      if (response && response.success && response.data) {
        setQrCodeData(response.data);
        await generateQrImage(response.data);
      }
    } catch (err) {
      console.error('Error generating new QR code:', err);
      setError('Không thể tạo mã QR mới. Vui lòng thử lại.');
    } finally {
      setGenerating(false);
    }
  };

  const generateQrImage = async (data) => {
    try {
      const payload = {
        qr_code_id: data._id,
        qr_hash: data.qr_hash,
        user_id: data.user_id,
        role: data.role,
        walletAddress: data.wallet_address
      };
      
      const payloadString = JSON.stringify(payload);
      
      const dataUrl = await QRCode.toDataURL(payloadString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1a1a2e',
          light: '#ffffff'
        }
      });
      setQrImageUrl(dataUrl);
    } catch (err) {
      console.error('Error generating QR image:', err);
      setError('Lỗi khi render mã QR.');
    }
  };

  const handleDownload = () => {
    if (!qrImageUrl) return;
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `Web3_Auth_Card_${user?.walletAddress ? user.walletAddress.slice(0, 6) : 'User'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyWallet = () => {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress);
      setSuccess('Đã sao chép địa chỉ ví!');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  if (loading) {
    return (
      <Card style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </Card>
    );
  }

  return (
    <Card 
      style={{ height: '100%', borderRadius: 8, border: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      bodyStyle={{ padding: 24 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <QrCode color="#1677ff" size={28} style={{ marginRight: 8 }} />
        <Title level={4} style={{ margin: 0 }}>
          Thẻ QR Xác Thực Blockchain
        </Title>
      </div>
      <Divider style={{ margin: '0 0 24px 0' }} />

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      {success && <Alert message={success} type="success" showIcon style={{ marginBottom: 16 }} />}

      <Row gutter={[32, 32]}>
        {/* Left side: QR Code Display */}
        <Col xs={24} md={10} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ 
            width: '100%',
            maxWidth: 280,
            minHeight: 280,
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            border: '1px dashed #d9d9d9',
            borderRadius: 8,
            backgroundColor: '#fafafa',
            position: 'relative'
          }}>
            {generating ? (
              <Space direction="vertical" align="center">
                <Spin size="large" />
                <Text type="secondary">Đang tạo mã QR mới...</Text>
              </Space>
            ) : qrImageUrl ? (
              <>
                <img 
                  src={qrImageUrl} 
                  alt="Thẻ QR Xác Thực" 
                  style={{ 
                    width: '100%', 
                    maxWidth: 220, 
                    height: 'auto',
                    marginBottom: 16,
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }} 
                />
                <Button 
                  icon={<Download size={16} />} 
                  onClick={handleDownload}
                >
                  Tải Thẻ QR
                </Button>
              </>
            ) : (
              <Text type="secondary">
                Bạn chưa có thẻ QR xác thực nào.
              </Text>
            )}
          </div>
        </Col>

        {/* Right side: Controls & Info */}
        <Col xs={24} md={14} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Title level={5} style={{ marginBottom: 8 }}>
            Quản lý truy cập
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 24 }}>
            Sử dụng Thẻ QR này cùng với camera để đăng nhập vào hệ thống một cách nhanh chóng mà không cần kết nối ví thủ công nhiều lần.
          </Paragraph>

          <div style={{ 
            marginBottom: 24
          }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Ví Blockchain Liên Kết:
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
              <Text strong style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: 14 }}>
                {user?.walletAddress || 'Chưa liên kết ví'}
              </Text>
              <Tooltip title="Sao chép">
                <Button 
                  type="text" 
                  icon={<Copy size={16} />} 
                  onClick={handleCopyWallet}
                  style={{ marginLeft: 8, color: '#8c8c8c' }}
                />
              </Tooltip>
            </div>
          </div>

        </Col>
      </Row>

      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: 24, paddingTop: 24, borderTop: '1px solid #f0f0f0' }}>
        <Button
          type={qrImageUrl ? "default" : "primary"}
          icon={generating ? null : <RefreshCw size={16} />}
          onClick={generateNewQr}
          loading={generating}
          size="large"
          style={{ 
            fontWeight: 500,
            fontSize: 16,
            width: '100%',
            maxWidth: 350,
            ...(qrImageUrl ? {
              color: '#722ed1',
              borderColor: '#d3adf7',
              backgroundColor: '#f9f0ff'
            } : {})
          }}
        >
          {generating ? 'Đang tạo...' : (qrImageUrl ? 'Tạo QR Mới (Vô hiệu hóa mã cũ)' : 'Tạo Thẻ QR Xác Thực')}
        </Button>
      </div>
    </Card>
  );
}

export default QrAuthentication;
