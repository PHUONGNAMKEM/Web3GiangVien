import React, { useState, useEffect } from 'react';
import { Card, Typography, List, Tag, Button, Spin, Modal, Form, Input, InputNumber, Select, message, AutoComplete } from 'antd';
import { PlusCircle, Clock, CheckCircle } from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ProgressLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [registration, setRegistration] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    const user = authService.getCurrentUser();

    const fetchData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const [regRes, logsRes] = await Promise.all([
                aiApiService.getMyRegistration(user.id),
                aiApiService.getProgressBySV(user.id)
            ]);
            setRegistration(regRes.registration);
            setLogs(logsRes.data || []);
        } catch (e) {
            console.error(e);
            message.error('Không thể lấy dữ liệu tiến độ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateLog = async (values) => {
        if (!registration || registration.TrangThai !== 'DaDuyet') {
            message.warning('Bạn cần có đề tài đã được duyệt để cập nhật tiến độ.');
            return;
        }

        try {
            setSubmitting(true);
            await aiApiService.createProgressEntry({
                deTaiId: registration.DeTai._id || registration.DeTai,
                sinhVienId: user.id,
                noiDung: values.noiDung,
                phanTramHoanThanh: values.phanTramHoanThanh,
                loaiCapNhat: values.loaiCapNhat,
                fileDinhKem: values.fileDinhKem
            });
            message.success('Cập nhật tiến độ thành công!');
            setIsModalVisible(false);
            form.resetFields();
            fetchData(); // Reload
        } catch (e) {
            message.error(e.response?.data?.error || 'Lỗi khi cập nhật tiến độ');
        } finally {
            setSubmitting(false);
        }
    };

    const getTagColor = (type) => {
        const colors = {
            'Nghiên Cứu': 'blue',
            'NghienCuu': 'blue',
            'Thiết Kế': 'purple',
            'ThietKe': 'purple',
            'Lập Trình': 'cyan',
            'LapTrinh': 'cyan',
            'Kiểm Thử': 'orange',
            'KiemThu': 'orange',
            'Viết Báo Cáo': 'green',
            'VietBaoCao': 'green',
            'Khác': 'default',
            'Khac': 'default'
        };
        return colors[type] || 'geekblue';
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;

    const isApproved = registration && registration.TrangThai === 'DaDuyet';

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Nhật Ký Tiến Độ</Title>
                <Button
                    type="primary"
                    icon={<PlusCircle size={16} />}
                    size="large"
                    disabled={!isApproved}
                    onClick={() => setIsModalVisible(true)}
                >
                    Cập Nhật Tiến Độ
                </Button>
            </div>

            {!isApproved && (
                <Card style={{ marginBottom: 24, borderLeft: '4px solid #faad14', background: '#fffbe6' }}>
                    <Text>Bạn chưa có đề tài được duyệt. Hãy đăng ký đề tài để bắt đầu cập nhật tiến độ.</Text>
                </Card>
            )}

            <List
                itemLayout="vertical"
                dataSource={logs}
                locale={{ emptyText: 'Chưa có nhật ký tiến độ nào.' }}
                renderItem={item => (
                    <Card style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div>
                                <Tag color={getTagColor(item.LoaiCapNhat)}>{item.LoaiCapNhat}</Tag>
                                <Tag color={item.PhanTramHoanThanh === 100 ? 'success' : 'processing'}>
                                    {item.PhanTramHoanThanh}% Hoàn thành
                                </Tag>
                            </div>
                            <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={14} /> {new Date(item.createdAt).toLocaleString('vi-VN')}
                            </Text>
                        </div>

                        <Paragraph style={{ fontSize: 16 }}>{item.NoiDung}</Paragraph>

                        {item.FileDinhKem && (
                            <Paragraph>Luôn lưu: <a href={item.FileDinhKem} target="_blank" rel="noreferrer">Liên kết đính kèm</a></Paragraph>
                        )}

                        {item.NhanXetGV && (
                            <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 6, borderLeft: '4px solid #52c41a' }}>
                                <Text strong style={{ color: '#389e0d' }}>Giảng viên nhận xét:</Text>
                                <Paragraph style={{ margin: '8px 0 0 0' }}>{item.NhanXetGV}</Paragraph>
                            </div>
                        )}
                    </Card>
                )}
            />

            <Modal
                title="Cập Nhật Tiến Độ"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleCreateLog}>
                    <Form.Item
                        name="loaiCapNhat"
                        label="Loại Công Việc (Có thể chọn hoặc tự nhập thêm)"
                        rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập loại công việc' }]}
                    >
                        <AutoComplete
                            allowClear
                            options={[
                                { value: 'Nghiên Cứu' },
                                { value: 'Thiết Kế' },
                                { value: 'Lập Trình' },
                                { value: 'Kiểm Thử' },
                                { value: 'Viết Báo Cáo' },
                                { value: 'Viết Tài Liệu' },
                                { value: 'Khác' },
                            ]}
                            filterOption={(inputValue, option) =>
                                option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                            }
                            placeholder="Ví dụ: Nghiên cứu, Cắm mạch..."
                        />
                    </Form.Item>

                    <Form.Item
                        name="phanTramHoanThanh"
                        label="Mức Độ Hoàn Thành (%)"
                        rules={[{ required: true, message: 'Vui lòng nhập phần trăm tiến độ' }]}
                    >
                        <InputNumber min={0} max={100} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="noiDung"
                        label="Nội Dung Chi Tiết"
                        rules={[{ required: true, message: 'Vui lòng nhập nội dung chi tiết công việc đã làm' }]}
                    >
                        <TextArea rows={4} placeholder="Ví dụ: Đã hoàn thành thiết kế database và API đăng nhập..." />
                    </Form.Item>

                    <Form.Item
                        name="fileDinhKem"
                        label="Liên Kết Đính Kèm (Không bắt buộc)"
                    >
                        <Input placeholder="Link GitHub, Google Drive, hình ảnh..." />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Button onClick={() => setIsModalVisible(false)} style={{ marginRight: 8 }}>Hủy</Button>
                        <Button type="primary" htmlType="submit" loading={submitting}>Cập Nhật</Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ProgressLog;