import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Tag, Badge, message, Row, Col, Modal, Skeleton, Alert, Input, Space, List, Divider, Tooltip } from 'antd';
import { CheckCircle, Code, Zap, Lock, ListChecks, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import aiApiService from '../../services/aiService';
import nhomService from '../../services/nhomService';
import authService from '../../services/authService';

const { Title, Paragraph, Text } = Typography;

const TopicRegistration = () => {
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeredTopicId, setRegisteredTopicId] = useState(null); // ID đề tài đã đăng ký
  const [registrationStatus, setRegistrationStatus] = useState(null); // 'ChoDuyet' | 'DaDuyet' | 'TuChoi'
  const [registrationId, setRegistrationId] = useState(null);
  const [fullRegistration, setFullRegistration] = useState(null);
  const [inviteMaSV, setInviteMaSV] = useState('');
  const [inviting, setInviting] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [myNhom, setMyNhom] = useState(null); // Nhóm của SV

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const user = authService.getCurrentUser();
        if (!user) return;

        // 0. Lấy nhóm của SV
        try {
          const nhomRes = await nhomService.getNhomBySinhVien(user.id);
          setMyNhom(nhomRes.nhom);
        } catch (e) {
          console.warn('Không lấy được thông tin nhóm');
        }

        // 1. Kiểm tra SV đã đăng ký đề tài nào chưa
        const regRes = await aiApiService.getMyRegistration(user.id);
        if (regRes.registration) {
          setRegisteredTopicId(regRes.registration.DeTai?._id || regRes.registration.DeTai);
          setRegistrationStatus(regRes.registration.TrangThai);
          setRegistrationId(regRes.registration._id);
          setFullRegistration(regRes.registration);

          // Kiểm tra đã nộp bài test chưa
          if (regRes.registration.TrangThai === 'ChoTest') {
            const deTaiIdForTest = regRes.registration.DeTai?._id || regRes.registration.DeTai;
            try {
              const checkTest = await aiApiService.checkTestSubmitted(deTaiIdForTest, user.id);
              if (checkTest.submitted) {
                setTestSubmitted(true);
              }
            } catch (e) {
              console.warn('Không kiểm tra được trạng thái test');
            }
          }
        }

        // 2. Lấy danh sách đề tài từ DB
        const dbRes = await aiApiService.getTopics();
        const topicList = Array.isArray(dbRes) ? dbRes : (dbRes.data || []);

        if (topicList.length === 0) {
          setLoading(false);
          return;
        }

        // 3. Lấy profile SV thật từ DB
        let studentProfile = { chuyen_nganh: '', ky_nang: [] };
        try {
          const svProfile = await aiApiService.getStudentProfile(user.id);
          studentProfile = {
            chuyen_nganh: svProfile.ChuyenNganh || '',
            ky_nang: svProfile.KyNang || [],
            gpa: svProfile.GPA || 0
          };
        } catch (e) {
          console.warn('Không lấy được profile SV, dùng default');
        }

        // 4. Gọi SBERT matching với profile thật
        let enriched = topicList.map(t => ({ ...t, ai_score: '0.0', isRecommended: false }));

        try {
          const matchRes = await aiApiService.matchTopicsAI(studentProfile, topicList);
          if (matchRes.status === "success" && matchRes.recommendations) {
            const recs = matchRes.recommendations;
            enriched = topicList.map(t => {
              const rec = recs.find(r => r.topicId === (t._id || '').toString());
              const score = rec ? rec.matchScore : 0;
              return {
                ...t,
                ai_score: (score * 10).toFixed(1),
                isRecommended: score > 0.3
              };
            });
          }
        } catch (e) {
          console.warn('SBERT matching failed, hiển thị không có điểm AI');
        }

        setTopics(enriched
          .sort((a, b) => parseFloat(b.ai_score) - parseFloat(a.ai_score))
        );
      } catch (error) {
        console.error("Lỗi lấy đề tài:", error);
        message.warning("Có lỗi khi tải dữ liệu đề tài.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRegister = (topic) => {
    const user = authService.getCurrentUser();
    if (!user) {
      message.error('Vui lòng đăng nhập lại.');
      return;
    }

    if (registeredTopicId) {
      message.warning('Nhóm của bạn đã đăng ký một đề tài rồi.');
      return;
    }

    if (!myNhom || !myNhom.DaChot) {
      message.warning('Bạn cần tạo và chốt nhóm trước khi đăng ký đề tài.');
      return;
    }

    Modal.confirm({
      title: 'Xác nhận Đăng ký Đề tài',
      content: `Nhóm "${myNhom.TenNhom || 'Nhóm của bạn'}" sẽ đăng ký đề tài "${topic.TenDeTai}". ${topic.CoBaiTest ? 'Trưởng nhóm sẽ cần làm bài test cạnh tranh.' : ''}`,
      okText: 'Xác Nhận Đăng Ký',
      cancelText: 'Hủy',
      onOk: async () => {
        setLoadingId(topic._id);
         try {
          await aiApiService.registerTopic(topic._id, user.id, myNhom._id);
          // Reload đầy đủ state đăng ký
          const regRes = await aiApiService.getMyRegistration(user.id);
          if (regRes.registration) {
            setRegisteredTopicId(regRes.registration.DeTai?._id || regRes.registration.DeTai);
            setRegistrationStatus(regRes.registration.TrangThai);
            setRegistrationId(regRes.registration._id);
            setFullRegistration(regRes.registration);
          } else {
            setRegisteredTopicId(topic._id);
          }
          const msg = topic.CoBaiTest
            ? 'Đăng ký thành công! Trưởng nhóm cần hoàn thành bài test đầu vào.'
            : 'Đã gửi yêu cầu đăng ký đề tài thành công! Chờ Giảng viên duyệt.';
          message.success(msg);
          if (topic.CoBaiTest) {
            setTimeout(() => navigate(`/student/entrance-test/${topic._id}`), 1500);
          }
        } catch (err) {
          const errMsg = err.response?.data?.error || 'Đăng ký thất bại';
          message.error(errMsg);
        } finally {
          setLoadingId(null);
        }
      }
    });
  };

  const handleCancelRegistration = () => {
    Modal.confirm({
      title: 'Hủy Đăng Ký Đề Tài',
      content: 'Bạn có chắc chắn muốn hủy đăng ký đề tài này không?',
      okText: 'Xác Nhận Hủy',
      okButtonProps: { danger: true },
      cancelText: 'Quay lại',
      onOk: async () => {
        try {
          if (!registrationId) return;
          await aiApiService.cancelRegistration(registrationId);
          message.success('Đã hủy đăng ký thành công!');
          setRegisteredTopicId(null);
          setRegistrationStatus(null);
          setRegistrationId(null);
          setFullRegistration(null);
          setTimeout(() => window.location.reload(), 1000); // Tải lại trang cho chắc ăn
        } catch (err) {
          message.error(err.response?.data?.error || 'Hủy đăng ký thất bại');
        }
      }
    });
  };

  const handleInviteMember = async () => {
    if (!inviteMaSV) {
      message.warning('Vui lòng nhập Mã Sinh viên cần mời.');
      return;
    }
    setInviting(true);
    try {
      const deTaiId = fullRegistration.DeTai?._id || fullRegistration.DeTai;
      await aiApiService.inviteMember(deTaiId, inviteMaSV);
      message.success(`Đã gửi lời mời đến sinh viên có mã ${inviteMaSV}`);
      setInviteMaSV('');
      // Refresh thì tải lại or setup function
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
       message.error(err.response?.data?.error || 'Gửi lời mời thất bại');
    } finally {
      setInviting(false);
    }
  };

  const isRegistered = (topicId) => {
    return registeredTopicId && registeredTopicId.toString() === topicId.toString();
  };

  const hasAnyRegistration = !!registeredTopicId;

  return (
    <div>
      <Typography>
        <Title level={2}>Đăng Ký Đề Tài</Title>
        <Paragraph>
          Hệ thống AI NLP SBERT (Local FastAPI) phân tích hồ sơ chuyên môn của bạn để đối chiếu với yêu cầu kỹ thuật của từng Đề tài, từ đó xếp hạng Topic phù hợp nhất!
        </Paragraph>
      </Typography>

      {/* Alert khi chưa có nhóm hoặc nhóm chưa chốt */}
      {!hasAnyRegistration && (!myNhom || !myNhom.DaChot) && (
        <Alert
          message={!myNhom ? 'Bạn chưa có nhóm' : 'Nhóm chưa được chốt'}
          description={
            <span>
              {!myNhom 
                ? 'Hãy tạo nhóm trước khi đăng ký đề tài. '
                : 'Nhóm cần được chốt (đủ thành viên) trước khi đăng ký đề tài. '
              }
              <Button type="link" size="small" onClick={() => navigate('/student/group')} style={{ padding: 0 }}>
                <Users size={14} style={{ marginRight: 4 }} />Quản lý nhóm
              </Button>
            </span>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {hasAnyRegistration && fullRegistration && (
        <Card style={{ marginBottom: 24, border: '1px solid #91caff', background: '#e6f4ff' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message={registrationStatus === 'DaDuyet' ? 'Đề tài đã được Giảng viên Duyệt!' : 'Bạn đã đăng ký đề tài'}
              description={registrationStatus === 'DaDuyet'
                ? 'Giảng viên đã phê duyệt đề tài của bạn. Bạn có thể tiến hành Nộp Báo Cáo.'
                : 'Đề tài báo cáo của bạn đang chờ Giảng viên duyệt.'
              }
              type={registrationStatus === 'DaDuyet' ? 'success' : 'info'}
              showIcon
              action={
                registrationStatus === 'ChoDuyet' || registrationStatus === 'ChoTest' ? (
                  <Button size="small" type="primary" danger onClick={handleCancelRegistration}>
                    Hủy Đăng Ký
                  </Button>
                ) : null
              }
            />

            {/* Alert khi cần làm bài test cạnh tranh */}
            {registrationStatus === 'ChoTest' && (
              <Alert
                message={testSubmitted ? "Bạn đã hoàn thành bài test" : "Đề tài yêu cầu Bài Test Đầu Vào"}
                description={testSubmitted
                  ? "Kết quả bài test của bạn đang được xử lý. Vui lòng chờ hệ thống duyệt tự động."
                  : "Giảng viên đã tạo bài test đầu vào. Bạn cần hoàn thành bài test để được duyệt đề tài."
                }
                type={testSubmitted ? 'info' : 'warning'}
                showIcon
                icon={<ListChecks size={20} />}
                action={
                  !testSubmitted ? (
                    <Button type="primary" size="small"
                      style={{ background: '#722ed1', borderColor: '#722ed1' }}
                      onClick={() => navigate(`/student/entrance-test/${registeredTopicId}`)}>
                      Bắt Đầu Làm Bài Test
                    </Button>
                  ) : null
                }
              />
            )}

            {/* Thông tin nhóm sinh viên */}
            {fullRegistration.DeTai?.SoLuongSinhVien > 1 && (
              <div style={{ marginTop: 16, background: '#fff', padding: 16, borderRadius: 8 }}>
                 <Title level={5}>Thành Viên Nhóm ({fullRegistration.ThanhVien?.length || 1} / {fullRegistration.DeTai.SoLuongSinhVien})</Title>
                 <List
                   itemLayout="horizontal"
                   dataSource={fullRegistration.ThanhVien || []}
                   renderItem={item => (
                     <List.Item>
                       <List.Item.Meta
                         avatar={<div style={{ fontSize: 24 }}>{item.VaiTro === 'TruongNhom' ? '👑' : '👤'}</div>}
                         title={<Text strong>{item.SinhVien?.HoTen || 'Đang tải...'} ({item.SinhVien?.MaSV})</Text>}
                         description={
                           <Tag color={
                             item.TrangThaiTV === 'DaChapNhan' ? 'green' : 
                             item.TrangThaiTV === 'DaMoi' ? 'orange' : 'red'
                           }>
                             {item.TrangThaiTV === 'DaChapNhan' ? 'Đã tham gia' : 
                              item.TrangThaiTV === 'DaMoi' ? 'Đang chờ xác nhận' : 'Từ chối'}
                           </Tag>
                         }
                       />
                     </List.Item>
                   )}
                 />

                 {/* Form mời thành viên - Chỉ hiển thị nếu chưa full và là Trưởng nhóm */}
                 {fullRegistration.ThanhVien?.length < fullRegistration.DeTai.SoLuongSinhVien && 
                  fullRegistration.ThanhVien?.find(tv => tv.SinhVien?._id === authService.getCurrentUser().id)?.VaiTro === 'TruongNhom' && (
                   <>
                     <Divider style={{ margin: '12px 0' }} />
                     <Space>
                       <Input 
                         placeholder="Nhập Mã Sinh Viên để mời" 
                         value={inviteMaSV}
                         onChange={e => setInviteMaSV(e.target.value)}
                         style={{ width: 250 }}
                       />
                       <Button type="primary" onClick={handleInviteMember} loading={inviting}>
                         Gửi Lời Mời
                       </Button>
                     </Space>
                   </>
                 )}
              </div>
            )}
          </Space>
        </Card>
      )}

      {loading ? (
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          {[1, 2, 3].map(i => (
            <Col xs={24} md={12} lg={8} key={i}>
              <Card><Skeleton active /></Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          {topics.map(topic => {
            const thisRegistered = isRegistered(topic._id);
            const disabled = hasAnyRegistration || !myNhom || !myNhom.DaChot || topic.DaChotNhom;
            const sizeMismatch = myNhom && myNhom.DaChot && (topic.SoLuongSinhVien || 1) !== (myNhom.ThanhVien?.filter(tv => tv.TrangThai === 'DaChapNhan').length || 0);

            const cardContent = (
              <Card
                title={<Text strong style={{ fontSize: 16, whiteSpace: 'normal' }}>{topic.TenDeTai}</Text>}
                hoverable={!disabled && !sizeMismatch}
                actions={[
                  thisRegistered ? (
                    <Button
                      type="primary"
                      icon={<Lock size={16} />}
                      disabled
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: registrationStatus === 'DaDuyet' ? '#52c41a' : '#1677ff', borderColor: registrationStatus === 'DaDuyet' ? '#52c41a' : '#1677ff', color: '#fff', opacity: 0.8 }}
                    >
                      {registrationStatus === 'DaDuyet' ? 'Đã Được Duyệt' : 'Đã Đăng Ký'}
                    </Button>
                  ) : topic.DaChotNhom ? (
                    <Button disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                      Đã chốt cho nhóm khác
                    </Button>
                  ) : (
                    <Tooltip title={sizeMismatch ? `Đề tài cần ${topic.SoLuongSinhVien} SV, nhóm bạn có ${myNhom?.ThanhVien?.filter(tv => tv.TrangThai === 'DaChapNhan').length || 0}` : ''}>
                      <Button
                        type={topic.isRecommended ? 'primary' : 'default'}
                        icon={<CheckCircle size={16} />}
                        onClick={() => handleRegister(topic)}
                        loading={loadingId === topic._id}
                        disabled={disabled || sizeMismatch}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}
                      >
                        {!myNhom ? 'Cần tạo nhóm' : sizeMismatch ? 'Số SV không khớp' : disabled ? 'Không khả dụng' : 'Đăng Ký'}
                      </Button>
                    </Tooltip>
                  )
                ]}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: thisRegistered ? '2px solid #52c41a' : (topic.isRecommended ? '2px solid #1677ff' : '1px solid #f0f0f0'),
                  boxShadow: thisRegistered ? '0 4px 12px rgba(82, 196, 26, 0.2)' : (topic.isRecommended ? '0 4px 12px rgba(22, 119, 255, 0.15)' : 'none'),
                  opacity: (disabled && !thisRegistered) || sizeMismatch ? 0.6 : 1
                }}
                headStyle={{ minHeight: 80 }}
                bodyStyle={{ flexGrow: 1 }}
              >
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary">GV Hướng dẫn:</Text>
                  <Text strong style={{ marginLeft: 8 }}>{topic.GiangVienHuongDan?.HoTen || 'N/A'}</Text>
                  <br />
                  <Text type="secondary">Sinh viên tối đa:</Text>
                  <Tag color="geekblue" style={{ marginLeft: 8, marginTop: 4 }}>{topic.SoLuongSinhVien || 1} SV</Tag>
                  {topic.CoBaiTest && <Tag color="volcano" style={{ marginLeft: 4, marginTop: 4 }}>🏆 Có bài test</Tag>}
                  {topic.SoDangKy > 0 && (
                    <Tag color="magenta" style={{ marginLeft: 4, marginTop: 4 }}>
                      <Users size={12} style={{ marginRight: 4 }} />
                      {topic.SoDangKy} nhóm đang cạnh tranh
                    </Tag>
                  )}
                  {topic.DaChotNhom && <Tag color="red" style={{ marginLeft: 4, marginTop: 4 }}>Đã chốt</Tag>}
                  <br />
                  <br />
                  <Text type="secondary">Mô tả cốt lõi:</Text>
                  <Paragraph ellipsis={{ rows: 2, expandable: false }} style={{ marginTop: 4, marginBottom: 12 }}>
                    {topic.MoTa}
                  </Paragraph>
                  
                  {topic.MoTaChiTiet && (
                    <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'Xem thêm' }} style={{ marginTop: 4, marginBottom: 12 }}>
                      <Text type="secondary">Chi tiết: </Text>
                      {topic.MoTaChiTiet}
                    </Paragraph>
                  )}

                  {topic.ChiTietBoSung && topic.ChiTietBoSung.length > 0 && (
                     <div style={{ marginBottom: 12 }}>
                       {topic.ChiTietBoSung.map((item, idx) => (
                         <div key={idx} style={{ marginBottom: 4 }}>
                           <Text type="secondary">{item.TieuDe}: </Text>
                           <Text>{item.NoiDung}</Text>
                         </div>
                       ))}
                     </div>
                  )}

                  <Text type="secondary">Yêu cầu công nghệ:</Text>
                  <div style={{ marginTop: 8 }}>
                    {topic.YeuCau && topic.YeuCau.map((tech, idx) => (
                      <Tag key={idx} icon={<Code size={12} />} style={{ marginBottom: 8 }}>
                        {tech}
                      </Tag>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                  <Text strong>
                    Độ Tương Thích (AI SBERT Match):
                    <Tag color={topic.isRecommended ? 'success' : 'warning'} style={{ marginLeft: 8 }}>
                      <Zap size={12} style={{ marginRight: 4 }} />
                      {topic.ai_score} / 10
                    </Tag>
                  </Text>
                </div>
              </Card>
            );

            return (
              <Col xs={24} md={12} lg={8} key={topic._id}>
                {topic.isRecommended && !thisRegistered ? (
                  <Badge.Ribbon text="AI Khuyên Chọn" color="blue">
                    {cardContent}
                  </Badge.Ribbon>
                ) : thisRegistered ? (
                  <Badge.Ribbon text="Đề Tài Của Bạn" color="green">
                    {cardContent}
                  </Badge.Ribbon>
                ) : cardContent}
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default TopicRegistration;
