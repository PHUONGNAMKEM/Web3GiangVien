import React, { useState, useEffect, useMemo } from 'react';
import { Card, Typography, List, Tag, Button, Spin, Modal, Form, Input, InputNumber, message, AutoComplete, DatePicker, Collapse, Alert, Divider, Space } from 'antd';
import { PlusCircle, Clock, CheckCircle } from 'lucide-react';
import aiApiService from '../../services/aiService';
import authService from '../../services/authService';
import { useIsMobile } from '../../hooks/useResponsive';
import { useClassContext } from '../../contexts/ClassContext';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

const WARNING_LABELS = {
    GIAM_PHAN_TRAM: 'Tiến độ giảm so với tuần trước',
    TANG_BAT_THUONG: 'Tiến độ tăng bất thường',
    KHONG_MINH_CHUNG_NHUNG_CAO: 'Không có minh chứng nhưng tiến độ cao',
    NOI_DUNG_NGAN: 'Nội dung đã làm còn ngắn',
    NOP_DON: 'Nộp quá nhiều lần trong thời gian ngắn',
    THIEU_KE_HOACH: 'Thiếu kế hoạch tuần sau'
};

const formatWarningLabel = (warning) => WARNING_LABELS[warning] || warning;

const ProgressLog = () => {
    const isMobile = useIsMobile();
    const { selectedClassId } = useClassContext();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [registration, setRegistration] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingLog, setEditingLog] = useState(null);
    const [form] = Form.useForm();

    const user = authService.getCurrentUser();

    const fetchData = async () => {
        if (!user) return;
        try {
            setLoading(true);
            if (!selectedClassId) {
                setRegistration(null);
                setLogs([]);
                return;
            }
            const regRes = await aiApiService.getMyRegistration(user.id, selectedClassId);
            setRegistration(regRes.registration);
            
            if (regRes.registration) {
                const deTaiId = regRes.registration.DeTai?._id || regRes.registration.DeTai;
                const logsRes = await aiApiService.getProgressBySinhVien(user.id, deTaiId);
                setLogs(logsRes.data || []);
            } else {
                setLogs([]);
            }
        } catch (e) {
            console.error(e);
            message.error('Không thể lấy dữ liệu tiến độ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedClassId]);

    const handleCreateLog = async (values) => {
        if (!registration || registration.TrangThai !== 'DaDuyet') {
            message.warning('Bạn cần có đề tài đã được duyệt để cập nhật tiến độ.');
            return;
        }

        try {
            setSubmitting(true);
            const previousPercent = getPreviousPercent(values.tuanSo);
            const isLowerPercent = Number.isFinite(previousPercent?.value) && values.phanTramHoanThanh < previousPercent.value;

            const submitPayload = {
                deTaiId: registration.DeTai._id || registration.DeTai,
                sinhVienId: user.id,
                noiDung: values.noiDung,
                phanTramHoanThanh: values.phanTramHoanThanh,
                loaiCapNhat: values.loaiCapNhat,
                fileDinhKem: values.fileDinhKem,
                tuanSo: values.tuanSo,
                ngayBatDauTuan: values.tuanThoiGian?.[0]?.toISOString(),
                ngayKetThucTuan: values.tuanThoiGian?.[1]?.toISOString(),
                mucTieuTuan: values.mucTieuTuan,
                noiDungDaLam: values.noiDungDaLam,
                khoKhan: values.khoKhan,
                keHoachTuanSau: values.keHoachTuanSau,
                minhChung: values.minhChung || [],
                confirmGiam: false
            };

            const submitAction = async (confirmGiam) => {
                const payload = { ...submitPayload, confirmGiam: !!confirmGiam };
                if (editingLog) {
                    await aiApiService.updateProgressEntry(editingLog._id, payload);
                } else {
                    await aiApiService.createProgressEntry(payload);
                }
            };

            const finalizeSubmit = async (confirmGiam) => {
                await submitAction(confirmGiam);
                message.success('Cập nhật tiến độ thành công!');
                setIsModalVisible(false);
                form.resetFields();
                setEditingLog(null);
                fetchData();
            };

            if (isLowerPercent) {
                Modal.confirm({
                    title: 'Tiến độ thấp hơn tuần trước',
                    content: `Bạn nhập thấp hơn Tuần ${previousPercent?.week || ''}. Bạn chắc chắn muốn gửi?`,
                    okText: 'Xác nhận',
                    cancelText: 'Hủy',
                    onOk: async () => {
                        try {
                            await finalizeSubmit(true);
                        } catch (error) {
                            message.error(error?.response?.data?.error || 'Lỗi khi cập nhật tiến độ');
                        }
                    }
                });
                return;
            }

            await finalizeSubmit(false);
        } catch (e) {
            message.error(e.response?.data?.error || 'Lỗi khi cập nhật tiến độ');
        } finally {
            setSubmitting(false);
        }
    };

    const getPreviousPercent = (tuanSo) => {
        if (!Number.isFinite(Number(tuanSo))) {
            return null;
        }

        const weeklyLogs = logs.filter(item => Number.isFinite(Number(item.TuanSo)));
        const previous = weeklyLogs
            .filter(item => Number(item.TuanSo) < Number(tuanSo))
            .sort((a, b) => (Number(b.TuanSo) || 0) - (Number(a.TuanSo) || 0))[0];

        if (!previous) {
            return null;
        }

        return { value: previous.PhanTramHoanThanh, week: previous.TuanSo };
    };

    const groupedLogs = useMemo(() => {
        const weekly = [];
        const legacy = [];

        logs.forEach(item => {
            if (Number.isFinite(Number(item.TuanSo))) {
                weekly.push(item);
            } else {
                legacy.push(item);
            }
        });

        weekly.sort((a, b) => (Number(a.TuanSo) || 0) - (Number(b.TuanSo) || 0));
        return { weekly, legacy };
    }, [logs]);

    const weeklyGroups = useMemo(() => {
        const groups = {};
        groupedLogs.weekly.forEach(item => {
            const key = Number(item.TuanSo);
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
        });

        return Object.keys(groups)
            .map(key => ({ label: `Tuần ${key}`, items: groups[key] }))
            .sort((a, b) => Number(a.label.replace('Tuần ', '')) - Number(b.label.replace('Tuần ', '')));
    }, [groupedLogs.weekly]);

    const getStatusColor = (status) => {
        const colors = {
            ChoDanhGia: 'default',
            Dat: 'success',
            CanBoSung: 'warning',
            KhongDat: 'error'
        };
        return colors[status] || 'default';
    };

    const getStatusLabel = (status) => {
        const labels = {
            ChoDanhGia: 'Chờ đánh giá',
            Dat: 'Đạt',
            CanBoSung: 'Cần bổ sung',
            KhongDat: 'Không đạt'
        };
        return labels[status] || status;
    };

    const openCreateModal = () => {
        setEditingLog(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const openResubmitModal = (log) => {
        setEditingLog(null);
        form.resetFields();
        form.setFieldsValue({ tuanSo: log.TuanSo });
        setIsModalVisible(true);
    };

    const openEditModal = (log) => {
        setEditingLog(log);
        form.resetFields();
        form.setFieldsValue({
            loaiCapNhat: log.LoaiCapNhat,
            phanTramHoanThanh: log.PhanTramHoanThanh,
            noiDung: log.NoiDung,
            fileDinhKem: log.FileDinhKem,
            tuanSo: log.TuanSo,
            mucTieuTuan: log.MucTieuTuan,
            noiDungDaLam: log.NoiDungDaLam,
            khoKhan: log.KhoKhan,
            keHoachTuanSau: log.KeHoachTuanSau,
            minhChung: (log.MinhChung || []).map(m => {
                if (typeof m === 'string') {
                    return { tenFile: '', url: m, ghiChu: '' };
                }

                return {
                    tenFile: m?.TenFile || '',
                    url: m?.Url || '',
                    ghiChu: m?.GhiChu || ''
                };
            })
        });
        setIsModalVisible(true);
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
                    onClick={openCreateModal}
                >
                    Cập Nhật Tiến Độ
                </Button>
            </div>

            {!isApproved && (
                <Card style={{ marginBottom: 24, borderLeft: '4px solid #faad14', background: '#fffbe6' }}>
                    <Text>Bạn chưa có đề tài được duyệt. Hãy đăng ký đề tài để bắt đầu cập nhật tiến độ.</Text>
                </Card>
            )}

            {logs.length === 0 && (
                <Card style={{ marginBottom: 16 }}>
                    <Text>Chưa có nhật ký tiến độ nào.</Text>
                </Card>
            )}

            {weeklyGroups.map(group => (
                <div key={group.label} style={{ marginBottom: 24 }}>
                    <Divider orientation="left">{group.label}</Divider>
                    <List
                        itemLayout="vertical"
                        dataSource={group.items}
                        renderItem={item => (
                            <Card style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <Space size={[8, 6]} wrap>
                                {Number.isFinite(Number(item.TuanSo)) ? (
                                    <Tag color="blue">Tuần {item.TuanSo}</Tag>
                                ) : (
                                    <Tag color={getTagColor(item.LoaiCapNhat)}>{item.LoaiCapNhat}</Tag>
                                )}
                                <Tag color={item.PhanTramHoanThanh === 100 ? 'success' : 'processing'}>
                                    {item.PhanTramHoanThanh}% Hoàn thành
                                </Tag>
                                {item.TrangThaiDanhGia && (
                                    <Tag color={getStatusColor(item.TrangThaiDanhGia)}>{getStatusLabel(item.TrangThaiDanhGia)}</Tag>
                                )}
                                {Number.isFinite(Number(item.DiemTienDo)) && (
                                    <Tag color="gold">Điểm tuần: {item.DiemTienDo}</Tag>
                                )}
                            </Space>
                            <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={14} /> {new Date(item.createdAt).toLocaleString('vi-VN')}
                            </Text>
                        </div>

                        {item.MucTieuTuan && (
                            <Paragraph><Text strong>Mục tiêu tuần:</Text> {item.MucTieuTuan}</Paragraph>
                        )}
                        {item.NoiDungDaLam ? (
                            <Paragraph><Text strong>Nội dung đã làm:</Text> {item.NoiDungDaLam}</Paragraph>
                        ) : (
                            <Paragraph style={{ fontSize: 16 }}>{item.NoiDung}</Paragraph>
                        )}
                        {item.KhoKhan && (
                            <Paragraph><Text strong>Khó khăn:</Text> {item.KhoKhan}</Paragraph>
                        )}
                        {item.KeHoachTuanSau && (
                            <Paragraph><Text strong>Kế hoạch tuần sau:</Text> {item.KeHoachTuanSau}</Paragraph>
                        )}

                        {Array.isArray(item.MinhChung) && item.MinhChung.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                                <Text strong>Minh chứng:</Text>
                                <List
                                    size="small"
                                    dataSource={item.MinhChung}
                                    renderItem={(minhChung) => (
                                        <List.Item>
                                            <a href={minhChung.Url} target="_blank" rel="noreferrer">{minhChung.TenFile || minhChung.Url}</a>
                                            {minhChung.GhiChu && <Text type="secondary"> — {minhChung.GhiChu}</Text>}
                                        </List.Item>
                                    )}
                                />
                            </div>
                        )}

                        {item.FileDinhKem && (
                            <Paragraph>Luôn lưu: <a href={item.FileDinhKem} target="_blank" rel="noreferrer">Liên kết đính kèm</a></Paragraph>
                        )}

                        {Array.isArray(item.CanhBaoTienDo) && item.CanhBaoTienDo.length > 0 && (
                            <Alert
                                style={{ marginTop: 12 }}
                                type="warning"
                                showIcon
                                message="Cảnh báo tiến độ"
                                description={item.CanhBaoTienDo.map(formatWarningLabel).join(', ')}
                            />
                        )}

                        {Array.isArray(item.RubricsTuan) && item.RubricsTuan.length > 0 && (
                            <Collapse style={{ marginTop: 12 }}>
                                <Panel header="Chi tiết rubrics tuần" key="rubrics">
                                    <List
                                        size="small"
                                        dataSource={item.RubricsTuan}
                                        renderItem={(rubric) => (
                                            <List.Item>
                                                <Text strong>{rubric.TenTieuChi}</Text>
                                                <Text type="secondary">
                                                    {' '}({rubric.DiemGV}/{rubric.DiemToiDa}) — {rubric.NhanXetTieuChi || 'Không có nhận xét'}
                                                </Text>
                                            </List.Item>
                                        )}
                                    />
                                </Panel>
                            </Collapse>
                        )}

                        {item.NhanXetGV && (
                            <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 6, borderLeft: '4px solid #52c41a' }}>
                                <Text strong style={{ color: '#389e0d' }}>Giảng viên nhận xét:</Text>
                                <Paragraph style={{ margin: '8px 0 0 0' }}>{item.NhanXetGV}</Paragraph>
                            </div>
                        )}

                        {item.TrangThaiDanhGia === 'CanBoSung' && (
                            <div style={{ marginTop: 12 }}>
                                <Button type="primary" icon={<CheckCircle size={14} />} onClick={() => openEditModal(item)}>
                                    Sửa & nộp lại
                                </Button>
                            </div>
                        )}
                        {item.TrangThaiDanhGia === 'KhongDat' && (
                            <div style={{ marginTop: 12 }}>
                                <Button danger onClick={() => openResubmitModal(item)}>
                                    Nộp lại tuần {item.TuanSo}
                                </Button>
                            </div>
                        )}
                            </Card>
                        )}
                    />
                </div>
            ))}

            {groupedLogs.legacy.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <Divider orientation="left">Cập nhật khác</Divider>
                    <List
                        itemLayout="vertical"
                        dataSource={groupedLogs.legacy}
                        renderItem={item => (
                            <Card style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <Space size={[8, 6]} wrap>
                                        <Tag color={getTagColor(item.LoaiCapNhat)}>{item.LoaiCapNhat}</Tag>
                                        <Tag color={item.PhanTramHoanThanh === 100 ? 'success' : 'processing'}>
                                            {item.PhanTramHoanThanh}% Hoàn thành
                                        </Tag>
                                    </Space>
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
                </div>
            )}

            <Modal
                title="Cập Nhật Tiến Độ"
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    setEditingLog(null);
                }}
                footer={null}
                destroyOnClose
                width={isMobile ? '95vw' : 600}
            >
                <Form form={form} layout="vertical" onFinish={handleCreateLog}>
                    <Divider orientation="left">Báo cáo tuần</Divider>
                    <Form.Item
                        name="tuanSo"
                        label="Tuần số"
                    >
                        <InputNumber min={1} max={30} style={{ width: '100%' }} placeholder="Nhập tuần (1-30)" />
                    </Form.Item>

                    <Form.Item
                        name="tuanThoiGian"
                        label="Thời gian tuần"
                    >
                        <RangePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="mucTieuTuan"
                        label="Mục tiêu tuần"
                    >
                        <TextArea rows={2} placeholder="Ví dụ: Hoàn thành module đăng nhập" />
                    </Form.Item>

                    <Form.Item
                        name="noiDungDaLam"
                        label="Nội dung đã làm"
                    >
                        <TextArea rows={3} placeholder="Mô tả công việc đã hoàn thành" />
                    </Form.Item>

                    <Form.Item
                        name="khoKhan"
                        label="Khó khăn"
                    >
                        <TextArea rows={2} placeholder="Ghi chú khó khăn nếu có" />
                    </Form.Item>

                    <Form.Item
                        name="keHoachTuanSau"
                        label="Kế hoạch tuần sau"
                    >
                        <TextArea rows={2} placeholder="Kế hoạch cho tuần tiếp theo" />
                    </Form.Item>

                    <Form.List name="minhChung">
                        {(fields, { add, remove }) => (
                            <div style={{ marginBottom: 16 }}>
                                <Text strong>Minh chứng</Text>
                                {fields.map((field) => (
                                    <div key={field.key} style={{ marginTop: 8 }}>
                                        <Form.Item
                                            {...field}
                                            name={[field.name, 'tenFile']}
                                            fieldKey={[field.fieldKey, 'tenFile']}
                                            label="Tên file"
                                        >
                                            <Input placeholder="demo.png" />
                                        </Form.Item>
                                        <Form.Item
                                            {...field}
                                            name={[field.name, 'url']}
                                            fieldKey={[field.fieldKey, 'url']}
                                            label="URL"
                                            rules={[{ required: true, message: 'Vui lòng nhập URL minh chứng' }]}
                                        >
                                            <Input placeholder="https://..." />
                                        </Form.Item>
                                        <Form.Item
                                            {...field}
                                            name={[field.name, 'ghiChu']}
                                            fieldKey={[field.fieldKey, 'ghiChu']}
                                            label="Ghi chú"
                                        >
                                            <Input placeholder="Screenshot giao diện" />
                                        </Form.Item>
                                        <Button danger onClick={() => remove(field.name)}>
                                            Xóa minh chứng
                                        </Button>
                                        <Divider />
                                    </div>
                                ))}
                                <Button type="dashed" onClick={() => add()} block>
                                    Thêm minh chứng
                                </Button>
                            </div>
                        )}
                    </Form.List>

                    <Divider orientation="left">Cập nhật ngắn (không theo tuần)</Divider>
                    <Form.Item
                        name="loaiCapNhat"
                        label="Loại Công Việc (Có thể chọn hoặc tự nhập thêm)"
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
