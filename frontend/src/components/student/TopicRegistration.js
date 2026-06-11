import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Tag, Badge, message, Row, Col, Modal, Skeleton, Alert, Input, Space, List, Divider, Tooltip, Select } from 'antd';
import { CheckCircle, Code, Zap, Lock, ListChecks, Users, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import aiApiService from '../../services/aiService';
import nhomService from '../../services/nhomService';
import authService from '../../services/authService';
import { useClassContext } from '../../contexts/ClassContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DeadlineBadge from '../common/DeadlineBadge';
import { getEffectiveDeadline, getDeadlineStatus } from '../../utils/deadlineUtils';
const { Title, Paragraph, Text } = Typography;

const TopicRegistration = () => {
  const navigate = useNavigate();
  const { selectedClassId, selectedClass } = useClassContext();
  const [loadingId, setLoadingId] = useState(null);
  const [inviteMaSV, setInviteMaSV] = useState('');
  const [inviting, setInviting] = useState(false);

  const user = authService.getCurrentUser();
  const queryClient = useQueryClient();

  const { data = {}, isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['topic-registration', user?.id, selectedClassId],
    queryFn: async () => {
      let result = {
        topics: [],
        registeredTopicId: null,
        registrationStatus: null,
        activeRegistrations: [],
        registrationId: null,
        fullRegistration: null,
        testSubmitted: false,
        myNhom: null
      };

      if (!user || !selectedClassId) return result;

      // 0. Lấy nhóm của SV
      try {
        const nhomRes = await nhomService.getNhomBySinhVien(user.id, selectedClassId);
        result.myNhom = nhomRes.nhom;
      } catch (e) {
        console.warn('Không lấy được thông tin nhóm');
      }

      // 1. Kiểm tra SV đã đăng ký đề tài nào chưa
      if (selectedClassId === 'KHOA_LUAN') {
        const regsRes = await aiApiService.getMyRegistrations(user.id);
        const klRegs = (regsRes.registrations || []).filter(r => r.DeTai?.LoaiDeTai === 'KhoaLuan');
        result.activeRegistrations = klRegs;
        
        // Kiểm tra xem có cái nào đã DaDuyet (thắng) không
        const won = klRegs.find(r => r.TrangThai === 'DaDuyet');
        if (won) {
          result.registeredTopicId = won.DeTai?._id || won.DeTai;
          result.registrationStatus = won.TrangThai;
          result.registrationId = won._id;
          result.fullRegistration = won;
        }
      } else {
        const regRes = await aiApiService.getMyRegistration(user.id, selectedClassId);
        if (regRes.registration) {
          result.registeredTopicId = regRes.registration.DeTai?._id || regRes.registration.DeTai;
          result.registrationStatus = regRes.registration.TrangThai;
          result.registrationId = regRes.registration._id;
          result.fullRegistration = regRes.registration;

          // Kiểm tra đã nộp bài test chưa
          if (regRes.registration.TrangThai === 'ChoTest') {
            const deTaiIdForTest = regRes.registration.DeTai?._id || regRes.registration.DeTai;
            try {
              const checkTest = await aiApiService.checkTestSubmitted(deTaiIdForTest, user.id);
              if (checkTest.submitted) {
                result.testSubmitted = true;
              }
            } catch (e) {
              console.warn('Không kiểm tra được trạng thái test');
            }
          }
        }
      }

      // 2. Lấy danh sách đề tài theo lớp đã chọn
      const dbRes = await aiApiService.getTopics(selectedClassId);
      const topicList = Array.isArray(dbRes) ? dbRes : (dbRes.data || []);

      if (topicList.length === 0) {
        return result;
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

      result.topics = enriched.sort((a, b) => parseFloat(b.ai_score) - parseFloat(a.ai_score));
      return result;
    },
    enabled: !!(user?.id),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const {
    topics = [],
    registeredTopicId,
    registrationStatus,
    activeRegistrations = [],
    registrationId,
    fullRegistration,
    testSubmitted,
    myNhom
  } = data;

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
      width: '60%',
      maskClosable: true,
      content: (
        <div>
          <Paragraph>
            Nhóm <strong>{myNhom.TenNhom || 'Nhóm của bạn'}</strong> sẽ đăng ký đề tài <strong>{topic.TenDeTai}</strong>.
            {topic.CoBaiTest && <span style={{ color: '#faad14' }}> Trưởng nhóm sẽ cần làm bài test cạnh tranh.</span>}
          </Paragraph>
          <Divider style={{ margin: '12px 0' }} />

          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">GV Hướng dẫn:</Text>
            <Text strong style={{ marginLeft: 8 }}>{topic.GiangVienHuongDan?.HoTen || 'N/A'}</Text>
            <br />
            <Text type="secondary">Sinh viên tối đa:</Text>
            <Tag color="geekblue" style={{ marginLeft: 8, marginTop: 4 }}>{topic.SoLuongSinhVien || 1} SV</Tag>
            <br />
            <Text type="secondary">Môn học:</Text>
            <Space size={2} wrap style={{ marginLeft: 8, marginTop: 4 }}>
              {(() => {
                const monHocSet = new Map();
                (topic.LopHoc || []).forEach(lh => {
                  if (lh.MonHoc && lh.MonHoc._id) {
                    monHocSet.set(lh.MonHoc._id, lh.MonHoc);
                  }
                });
                if (monHocSet.size === 0 && topic.MonHoc) {
                  const mh = topic.MonHoc;
                  return <Tag color="geekblue">{mh.TenMonHoc || mh.MaMonHoc || '—'}</Tag>;
                }
                return Array.from(monHocSet.values()).map(mh => (
                  <Tag key={mh._id} color="geekblue">{mh.TenMonHoc || mh.MaMonHoc}</Tag>
                ));
              })()}
            </Space>
            <br />
            {topic.CoBaiTest && <Tag color="volcano" style={{ marginTop: 4 }}>🏆 Có bài test</Tag>}
            {topic.SoDangKy > 0 && (
              <Tag color="magenta" style={{ marginLeft: 4, marginTop: 4 }}>
                <Users size={12} style={{ marginRight: 4 }} />
                {topic.SoDangKy} nhóm đang cạnh tranh
              </Tag>
            )}
            {topic.DaChotNhom && <Tag color="red" style={{ marginLeft: 4, marginTop: 4 }}>Đã chốt</Tag>}
            <br />
            <br />
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Hạn đăng ký:</Text>
            <DeadlineBadge deadline={getEffectiveDeadline(topic, 'dangKy')} label="Hạn đăng ký" />
            <br />
            <Text type="secondary" style={{ display: 'block', marginTop: 8, marginBottom: 4 }}>Hạn nộp báo cáo:</Text>
            <DeadlineBadge deadline={getEffectiveDeadline(topic, 'baoCao')} label="Hạn nộp báo cáo" />
            <br />
            <br />
            <Text type="secondary">Độ Tương Thích (AI SBERT Match):</Text>
            <Tag color={topic.isRecommended ? 'success' : 'warning'} style={{ marginLeft: 8 }}>
              <Zap size={12} style={{ marginRight: 4 }} />
              {topic.ai_score} / 10
            </Tag>
          </div>

          <Divider style={{ margin: '12px 0' }} />
          <Text strong>Mô tả cốt lõi:</Text>
          <Paragraph style={{ marginTop: 4 }}>{topic.MoTa}</Paragraph>

          <div style={{ marginBottom: 12 }}>
            <Text strong>Mô tả chi tiết:</Text>
            <Paragraph style={{ marginTop: 4, whiteSpace: 'pre-line', color: topic.MoTaChiTiet ? 'inherit' : '#bfbfbf' }}>
              {topic.MoTaChiTiet || 'Không có mô tả chi tiết.'}
            </Paragraph>
          </div>

          {topic.ChiTietBoSung && topic.ChiTietBoSung.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {topic.ChiTietBoSung.map((item, idx) => (
                <div key={idx} style={{ marginBottom: 4 }}>
                  <Text strong>{item.TieuDe}: </Text>
                  <Text style={{ whiteSpace: 'pre-line' }}>{item.NoiDung}</Text>
                </div>
              ))}
            </div>
          )}

          <div>
            <Text strong>Yêu cầu công nghệ: </Text>
            <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {topic.YeuCau && topic.YeuCau.map((tech, idx) => (
                <Tag key={idx} style={{ margin: 0 }}>{tech}</Tag>
              ))}
            </div>
          </div>
        </div>
      ),
      okText: 'Xác Nhận Đăng Ký',
      cancelText: 'Hủy',
      onOk: async () => {
        setLoadingId(topic._id);
        try {
          await aiApiService.registerTopic(topic._id, user.id, myNhom._id);
          queryClient.invalidateQueries({ queryKey: ['topic-registration'] });
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
          queryClient.invalidateQueries({ queryKey: ['topic-registration'] });
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
      queryClient.invalidateQueries({ queryKey: ['topic-registration'] });
    } catch (err) {
      message.error(err.response?.data?.error || 'Gửi lời mời thất bại');
    } finally {
      setInviting(false);
    }
  };

  const isRegistered = (topicId) => {
    if (selectedClassId === 'KHOA_LUAN') {
      return activeRegistrations.some(r => (r.DeTai?._id || r.DeTai || '').toString() === topicId.toString());
    }
    return registeredTopicId && registeredTopicId.toString() === topicId.toString();
  };

  const hasAnyRegistration = selectedClassId === 'KHOA_LUAN'
    ? activeRegistrations.some(r => r.TrangThai === 'DaDuyet')
    : !!registeredTopicId;

  return (
    <div>
      <style>
        {`
          .topic-row {
            display: flex;
            flex-wrap: wrap;
            align-items: stretch;
          }
          .topic-col {
            display: flex;
            flex-direction: column;
          }
          .topic-col .ant-ribbon-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .topic-col .ant-card {
            flex: 1;
          }
        `}
      </style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <Typography>
          <Title level={2}>Đăng Ký Đề Tài</Title>
          <Paragraph>
            Hệ thống AI NLP SBERT (Local FastAPI) phân tích hồ sơ chuyên môn của bạn để đối chiếu với yêu cầu kỹ thuật của từng Đề tài, từ đó xếp hạng Topic phù hợp nhất!
          </Paragraph>
        </Typography>
        <Button
          icon={<RefreshCw size={16} />}
          loading={isFetching}
          onClick={async () => {
            await refetch();
            message.success('Đã làm mới danh sách đề tài');
          }}
        >
          Làm mới
        </Button>
      </div>

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
                <Users size={14} style={{ marginRight: 4 }} />Nhóm
              </Button>
            </span>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {selectedClassId === 'KHOA_LUAN' && activeRegistrations.length > 0 && !registeredTopicId && (
        <Card title="🏆 Các đề tài khóa luận bạn đang cạnh tranh" style={{ marginBottom: 24, border: '1px solid #1677ff', background: 'var(--bg-primary-tint-2)' }}>
          <List
            dataSource={activeRegistrations}
            renderItem={reg => (
              <List.Item
                actions={[
                  reg.TrangThai === 'ChoTest' && (
                    <Button type="primary" size="small" style={{ background: '#722ed1', borderColor: '#722ed1' }}
                      onClick={() => navigate(`/student/entrance-test/${reg.DeTai?._id || reg.DeTai}`)}>
                      Làm bài test
                    </Button>
                  ),
                  ['ChoDuyet', 'ChoTest', 'DangLamTest'].includes(reg.TrangThai) && (
                    <Button size="small" type="primary" danger onClick={() => {
                      Modal.confirm({
                        title: 'Hủy Đăng Ký Đề Tài',
                        content: `Bạn có chắc muốn hủy đăng ký đề tài "${reg.DeTai?.TenDeTai}" không?`,
                        okText: 'Xác Nhận Hủy',
                        okButtonProps: { danger: true },
                        cancelText: 'Quay lại',
                        onOk: async () => {
                          try {
                            await aiApiService.cancelRegistration(reg._id);
                            message.success('Đã hủy đăng ký thành công!');
                            queryClient.invalidateQueries({ queryKey: ['topic-registration'] });
                          } catch (err) {
                            message.error(err.response?.data?.error || 'Hủy thất bại');
                          }
                        }
                      });
                    }}>
                      Hủy Đăng Ký
                    </Button>
                  )
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  title={<Text strong style={{ fontSize: 15 }}>{reg.DeTai?.TenDeTai}</Text>}
                  description={
                    <div style={{ marginTop: 4 }}>
                      <span>GV: {reg.DeTai?.GiangVienHuongDan?.HoTen || 'N/A'} • </span>
                      <span>Trạng thái: </span>
                      {reg.TrangThai === 'ChoTest' && <Tag color="volcano">Cần làm test</Tag>}
                      {reg.TrangThai === 'DangLamTest' && <Tag color="purple">Đang làm test</Tag>}
                      {reg.TrangThai === 'DaSubmit' && <Tag color="blue">Đã submit test</Tag>}
                      {reg.TrangThai === 'ChoDuyet' && <Tag color="orange">Chờ duyệt</Tag>}
                      {reg.TrangThai === 'ChoDoi' && <Tag color="geekblue">Chờ đối thủ</Tag>}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {hasAnyRegistration && fullRegistration && (
        <Card style={{ marginBottom: 24, border: '1px solid var(--border-primary)', background: 'var(--bg-primary-tint)' }}>
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
                  ? "Hãy xem lại kết quả test hoặc làm lại nếu chưa đạt."
                  : "Giảng viên đã tạo bài test đầu vào. Bạn cần hoàn thành bài test để được duyệt đề tài."
                }
                type={testSubmitted ? 'info' : 'warning'}
                showIcon
                icon={<ListChecks size={20} />}
                action={
                  <Button type="primary" size="small"
                    style={!testSubmitted ? { background: '#722ed1', borderColor: '#722ed1' } : {}}
                    onClick={() => navigate(`/student/entrance-test/${registeredTopicId}`)}>
                    {!testSubmitted ? 'Bắt Đầu Làm Bài Test' : 'Xem Kết Quả / Làm Lại'}
                  </Button>
                }
              />
            )}

            {/* Thông tin nhóm sinh viên */}
            {fullRegistration.DeTai?.SoLuongSinhVien > 1 && (
              <div style={{ marginTop: 16, background: 'var(--bg-container)', padding: 16, borderRadius: 8 }}>
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
        <Row gutter={[24, 24]} className="topic-row" style={{ marginTop: 24 }}>
          {[1, 2, 3].map(i => (
            <Col xs={24} md={12} lg={8} key={i}>
              <Card><Skeleton active /></Card>
            </Col>
          ))}
        </Row>
      ) : (
        <div>
          <Row gutter={[24, 24]} className="topic-row">
            {topics.filter(topic => {
              if (!selectedClassId) return false;
              if (selectedClassId === 'KHOA_LUAN') {
                return topic.LoaiDeTai === 'KhoaLuan';
              }
              if (topic.LoaiDeTai === 'KhoaLuan') return false; // Không hiện đề tài KL ở luồng lớp học
              if (!topic.LopHoc || topic.LopHoc.length === 0) return true;
              return topic.LopHoc.some(lh => (lh._id || lh).toString() === selectedClassId.toString());
            }).map(topic => {
              const thisRegistered = isRegistered(topic._id);
              const dangKyDeadline = getEffectiveDeadline(topic, 'dangKy');
              const dangKyStatus = getDeadlineStatus(dangKyDeadline);
              const isDangKyExpired = dangKyStatus === 'expired';
              const disabled = hasAnyRegistration || !myNhom || !myNhom.DaChot || topic.DaChotNhom || isDangKyExpired;
              const sizeMismatch = myNhom && myNhom.DaChot && (topic.SoLuongSinhVien || 1) !== (myNhom.ThanhVien?.filter(tv => tv.TrangThai === 'DaChapNhan').length || 0);

              const thisRegRecord = selectedClassId === 'KHOA_LUAN'
                ? activeRegistrations.find(r => (r.DeTai?._id || r.DeTai || '').toString() === topic._id.toString())
                : null;
              const thisRegStatus = thisRegRecord ? thisRegRecord.TrangThai : registrationStatus;

            const cardContent = (
              <Card
                title={<div style={{ paddingRight: (topic.isRecommended || thisRegistered) ? '13%' : 0 }}><Text strong style={{ fontSize: 16, whiteSpace: 'normal' }}>{topic.TenDeTai}</Text></div>}
                hoverable={!disabled && !sizeMismatch}
                actions={[
                  <div key="action" style={{ padding: '0 6%' }}>
                    {thisRegistered ? (
                      <Button
                        type="primary"
                        icon={<Lock size={16} />}
                        disabled
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: thisRegStatus === 'DaDuyet' ? '#52c41a' : '#1677ff', borderColor: thisRegStatus === 'DaDuyet' ? '#52c41a' : '#1677ff', color: '#fff', opacity: 0.8 }}
                      >
                        {thisRegStatus === 'DaDuyet' ? 'Đã Được Duyệt' : 'Đã Đăng Ký'}
                      </Button>
                    ) : (topic.DaChotNhom && !thisRegistered) ? (
                      <Button disabled style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                        Đã chốt cho nhóm khác
                      </Button>
                    ) : (
                      <Tooltip title={sizeMismatch ? `Đề tài cần ${topic.SoLuongSinhVien} SV, nhóm bạn có ${myNhom?.ThanhVien?.filter(tv => tv.TrangThai === 'DaChapNhan').length || 0}` : isDangKyExpired ? 'Đã hết hạn đăng ký đề tài này' : ''}>
                        <Button
                          type={topic.isRecommended && !isDangKyExpired ? 'primary' : 'default'}
                          icon={<CheckCircle size={16} />}
                          onClick={() => handleRegister(topic)}
                          loading={loadingId === topic._id}
                          disabled={disabled || sizeMismatch}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}
                        >
                          {!myNhom ? 'Cần tạo nhóm' : sizeMismatch ? 'Số SV không khớp' : isDangKyExpired ? 'Hết hạn' : disabled ? 'Không khả dụng' : 'Đăng Ký'}
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                ]}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: thisRegistered ? '2px solid #52c41a' : (topic.isRecommended ? '2px solid #1677ff' : '1px solid var(--border-subtle)'),
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
                  <br />
                  {topic.LoaiDeTai === 'KhoaLuan' ? (
                    <>
                      <Text type="secondary">Loại đề tài:</Text>
                      <Tag color="gold" style={{ marginLeft: 8, marginTop: 4 }}>📝 Khóa Luận</Tag>
                    </>
                  ) : (
                    <>
                      <Text type="secondary">Lớp học áp dụng:</Text>
                      <Space size={2} wrap style={{ marginLeft: 8, marginTop: 4 }}>
                        {(topic.LopHoc || []).length > 0 ? (
                          topic.LopHoc.map(lh => (
                            <Tag key={lh._id || lh} color="cyan">{lh.MaLopHoc || lh.TenLopHoc || lh}</Tag>
                          ))
                        ) : (
                          <Tag color="default">Tất cả lớp</Tag>
                        )}
                      </Space>
                      <br />
                      <Text type="secondary">Môn học:</Text>
                      <Space size={2} wrap style={{ marginLeft: 8, marginTop: 4 }}>
                        {(() => {
                          const monHocSet = new Map();
                          (topic.LopHoc || []).forEach(lh => {
                            if (lh.MonHoc && lh.MonHoc._id) {
                              monHocSet.set(lh.MonHoc._id, lh.MonHoc);
                            }
                          });
                          if (monHocSet.size === 0 && topic.MonHoc) {
                            const mh = topic.MonHoc;
                            return <Tag color="geekblue">{mh.TenMonHoc || mh.MaMonHoc || '—'}</Tag>;
                          }
                          return Array.from(monHocSet.values()).map(mh => (
                            <Tag key={mh._id} color="geekblue">{mh.TenMonHoc || mh.MaMonHoc}</Tag>
                          ));
                        })()}
                      </Space>
                    </>
                  )}
                  {topic.CoBaiTest && <br />}
                  {topic.CoBaiTest && <Tag color="volcano" style={{ marginTop: 4 }}>🏆 Có bài test</Tag>}
                  {topic.SoDangKy > 0 && (
                    <Tag color="magenta" style={{ marginLeft: 4, marginTop: 4 }}>
                      <Users size={12} style={{ marginRight: 4 }} />
                      {topic.SoDangKy} nhóm đang cạnh tranh
                    </Tag>
                  )}
                  {topic.DaChotNhom && <Tag color="red" style={{ marginLeft: 4, marginTop: 4 }}>Đã chốt</Tag>}
                  <br />
                  <div style={{ marginBottom: 12, marginTop: 12 }}>
                    {!(topic.DaChotNhom || thisRegStatus === 'DaDuyet') && (
                      <DeadlineBadge deadline={getEffectiveDeadline(topic, 'dangKy')} label="Hạn đăng ký" />
                    )}
                  </div>
                  <Text type="secondary">Mô tả cốt lõi:</Text>
                  <Paragraph ellipsis={{ rows: 2, expandable: false }} style={{ marginTop: 4, marginBottom: 12 }}>
                    {topic.MoTa}
                  </Paragraph>

                  <Text type="secondary">Yêu cầu công nghệ:</Text>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {topic.YeuCau && Array.from(new Set(topic.YeuCau.flatMap(tech => tech.split(',').map(s => s.trim()).filter(Boolean)))).map((tech, idx) => (
                      <Tag key={idx} style={{ margin: 0 }}>
                        {tech}
                      </Tag>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
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
              <Col xs={24} md={12} lg={8} key={topic._id} className="topic-col">
                {topic.isRecommended && !thisRegistered ? (
                  <Badge.Ribbon text="AI Gợi ý" color="blue">
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
        </div>
      )}
    </div>
  );
};

export default TopicRegistration;
