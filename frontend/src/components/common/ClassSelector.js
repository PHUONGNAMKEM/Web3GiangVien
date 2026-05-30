import React from 'react';
import { Select } from 'antd';
import { BookOpen } from 'lucide-react';
import authService from '../../services/authService';
import { useClassContext } from '../../contexts/ClassContext';
import { useLecturerClassContext } from '../../contexts/LecturerClassContext';

const { Option } = Select;

const ClassSelector = () => {
  const user = authService.getCurrentUser();
  const isLecturer = user?.role_id === 'LECTURER_ROLE';
  
  if (!user) return null;

  return isLecturer ? <LecturerClassSelector /> : <StudentClassSelector />;
};

const StudentClassSelector = () => {
  const { myClasses, selectedClassId, setSelectedClassId, loading } = useClassContext();

  if (loading) {
    return <Select loading disabled style={{ width: 220 }} placeholder="Đang tải lớp học..." />;
  }

  if (myClasses.length === 0) {
    return <Select disabled style={{ width: 220 }} placeholder="Không có lớp học" />;
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
