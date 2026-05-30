import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import managementService from '../services/managementService';

const LecturerClassContext = createContext();

export const LecturerClassProvider = ({ children }) => {
  const [user] = useState(() => authService.getCurrentUser());
  const [myClasses, setMyClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchClasses = async () => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const classesRes = await managementService.getLopHocByGV(user.id);
      const classes = classesRes.data || [];
      setMyClasses(classes);
      
      const savedId = localStorage.getItem(`selectedLecturerClassId_${user.id}`);
      if (savedId === 'ALL') {
        setSelectedClassId('ALL');
        setSelectedClass(null);
      } else if (savedId) {
        const found = classes.find(c => c._id === savedId);
        if (found) {
          setSelectedClassId(found._id);
          setSelectedClass(found);
        } else {
          setSelectedClassId('ALL');
          setSelectedClass(null);
        }
      } else {
        setSelectedClassId('ALL');
        setSelectedClass(null);
      }
    } catch (error) {
      console.error('Error fetching lecturer classes in LecturerClassContext:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const handleSelectClassId = (id) => {
    setSelectedClassId(id);
    if (id === 'ALL') {
      setSelectedClass(null);
    } else {
      const found = myClasses.find(c => c._id === id);
      setSelectedClass(found || null);
    }
    if (user && user.id) {
      localStorage.setItem(`selectedLecturerClassId_${user.id}`, id);
    }
  };

  return (
    <LecturerClassContext.Provider value={{
      myClasses,
      selectedClassId,
      selectedClass,
      loading,
      setSelectedClassId: handleSelectClassId,
      refreshClasses: fetchClasses
    }}>
      {children}
    </LecturerClassContext.Provider>
  );
};

export const useLecturerClassContext = () => {
  const context = useContext(LecturerClassContext);
  if (!context) {
    throw new Error('useLecturerClassContext must be used within a LecturerClassProvider');
  }
  return context;
};
