import React from 'react';
import { Select } from 'antd';
import { BookOpen } from 'lucide-react';
import authService from '../../services/authService';
import { useClassContext } from '../../contexts/ClassContext';
import { useLecturerClassContext } from '../../contexts/LecturerClassContext';

const { Option } = Select;

// Định nghĩa CSS styles premium riêng cho Khóa Luận - Tông màu trắng đen đồng nhất
const customStyles = `
  /* Style nổi bật, premium cho Option Khóa Luận trong danh sách dropdown */
  .ant-select-dropdown .khoa-luan-option {
    font-weight: normal !important;
    color: #000000 !important;
    background-color: #ffffff !important;
    border-top: 1.5px dashed #d9d9d9 !important;
    border-bottom: 1.5px dashed #d9d9d9 !important;
    padding-top: 8px !important;
    padding-bottom: 8px !important;
    margin-bottom: 4px !important;
    transition: all 0.2s ease !important;
  }
  
  .ant-select-dropdown .khoa-luan-option:hover {
    background-color: #f5f5f5 !important;
    color: #000000 !important;
  }
`;

const ClassSelector = () => {
  const user = authService.getCurrentUser();
  const isLecturer = user?.role_id === 'LECTURER_ROLE';
  const isAdmin = user?.role_id === 'ADMIN_ROLE';
  
  if (!user || isAdmin) return null;

  return (
    <>
      <style>{customStyles}</style>
      {isLecturer ? <LecturerClassSelector /> : <StudentClassSelector />}
    </>
  );
};

const StudentClassSelector = () => {
  const { myClasses, selectedClassId, setSelectedClassId, loading } = useClassContext();

  if (loading) {
    return <Select loading disabled style={{ width: 220 }} placeholder="Đang tải lớp học..." />;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <BookOpen size={16} style={{ color: '#1890ff' }} />
      <Select
        value={selectedClassId}
        onChange={setSelectedClassId}
        style={{ width: 350 }}
        dropdownMatchSelectWidth={false}
        placeholder="Chọn lớp học hoặc khóa luận"
      >
        <Option value="KHOA_LUAN" className="khoa-luan-option">
          Khóa luận tốt nghiệp
        </Option>
        {myClasses.map((lop) => (
          <Option key={lop._id} value={lop._id}>
            {lop.MaLopHoc} - {lop.TenLopHoc} {lop.MonHoc?.TenMonHoc ? `(${lop.MonHoc.TenMonHoc})` : ''} - GV: {lop.GiangVien?.HoTen || 'N/A'}
          </Option>
        ))}
      </Select>
    </div>
  );
};

const LecturerClassSelector = () => {
  const { myClasses, selectedClassId, setSelectedClassId, loading } = useLecturerClassContext();

  if (loading) {
    return <Select loading disabled style={{ width: 220 }} placeholder="Đang tải lớp học..." />;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <BookOpen size={16} style={{ color: '#1890ff' }} />
      <Select
        value={selectedClassId}
        onChange={setSelectedClassId}
        style={{ width: 350 }}
        dropdownMatchSelectWidth={false}
      >
        <Option value="ALL">Tất cả các lớp</Option>
        <Option value="KHOA_LUAN" className="khoa-luan-option">
          Khóa luận tốt nghiệp
        </Option>
        {myClasses.map((lop) => (
          <Option key={lop._id} value={lop._id}>
            {lop.MaLopHoc} - {lop.TenLopHoc} {lop.MonHoc?.TenMonHoc ? `(${lop.MonHoc.TenMonHoc})` : ''} - GV: {lop.GiangVien?.HoTen || 'N/A'}
          </Option>
        ))}
      </Select>
    </div>
  );
};

export default ClassSelector;
