import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import managementService from '../services/managementService';

const ClassContext = createContext();

export const ClassProvider = ({ children }) => {
  const [user] = useState(() => authService.getCurrentUser());
  const [myClasses, setMyClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchClasses = async () => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const classesRes = await managementService.getLopHocBySinhVien(user.id);
      const classes = classesRes.data || [];
      setMyClasses(classes);
      
      if (classes.length > 0) {
        // Try reading from localStorage first
        const savedId = localStorage.getItem(`selectedClassId_${user.id}`);
        const found = classes.find(c => c._id === savedId);
        if (found) {
          setSelectedClassId(found._id);
          setSelectedClass(found);
        } else if (savedId === 'KHOA_LUAN') {
          setSelectedClassId('KHOA_LUAN');
          setSelectedClass(null);
        } else {
          setSelectedClassId(classes[0]._id);
          setSelectedClass(classes[0]);
          localStorage.setItem(`selectedClassId_${user.id}`, classes[0]._id);
        }
      } else {
        const savedId = localStorage.getItem(`selectedClassId_${user.id}`);
        if (savedId === 'KHOA_LUAN') {
          setSelectedClassId('KHOA_LUAN');
        } else {
          setSelectedClassId(null);
        }
        setSelectedClass(null);
      }
    } catch (error) {
      console.error('Error fetching student classes in ClassContext:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const handleSelectClassId = (id) => {
    setSelectedClassId(id);
    if (id === 'KHOA_LUAN') {
      setSelectedClass(null);
    } else {
      const found = myClasses.find(c => c._id === id);
      setSelectedClass(found || null);
    }
    if (user && user.id) {
      localStorage.setItem(`selectedClassId_${user.id}`, id);
    }
  };

  const isKhoaLuanMode = selectedClassId === 'KHOA_LUAN';

  return (
    <ClassContext.Provider value={{
      myClasses,
      selectedClassId,
      selectedClass,
      isKhoaLuanMode,
      loading,
      setSelectedClassId: handleSelectClassId,
      refreshClasses: fetchClasses
    }}>
      {children}
    </ClassContext.Provider>
  );
};

export const useClassContext = () => {
  const context = useContext(ClassContext);
  if (!context) {
    throw new Error('useClassContext must be used within a ClassProvider');
  }
  return context;
};
