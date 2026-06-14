import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import authService from './services/authService';
import LoginPage from './components/LoginPage';
import MainLayout from './components/layout/MainLayout';
import LecturerDashboard from './components/lecturer/LecturerDashboard';
import TopicManagement from './components/lecturer/TopicManagement';
import SubmissionReview from './components/lecturer/SubmissionReview';
import RubricsManagement from './components/lecturer/RubricsManagement';
import ScoreComparison from './components/lecturer/ScoreComparison';
import EntranceTestManager from './components/lecturer/EntranceTestManager';
import CourseManagement from './components/lecturer/CourseManagement';
import ClassManagement from './components/lecturer/ClassManagement';
import StudentManagement from './components/lecturer/StudentManagement';
import StudentDashboard from './components/student/StudentDashboard';
import TopicRegistration from './components/student/TopicRegistration';
import ReportUpload from './components/student/ReportUpload';
import ProgressTracking from './components/student/ProgressTracking';
import ProgressLog from './components/student/ProgressLog';
import EntranceTest from './components/student/EntranceTest';
import BlockchainDebugPage from './components/debug/BlockchainDebugPage';
import StudentBlockchain from './components/student/StudentBlockchain';
import GroupManagement from './components/student/GroupManagement';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminRequests from './components/admin/AdminRequests';
import PendingApproval from './components/PendingApproval';
import { ClassProvider } from './contexts/ClassContext';
import { LecturerClassProvider } from './contexts/LecturerClassContext';

// Protected Route component
function ProtectedRoute({ children, allowedRoles }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
    setCurrentUser(authService.getCurrentUser());
  }, []);

  if (!isAuthenticated) return <Navigate to="/" replace />;

  if (allowedRoles && currentUser) {
    if (!allowedRoles.includes(currentUser.role_id)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

// Public Route component (redirect to dashboard if already authenticated)
function PublicRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
    setCurrentUser(authService.getCurrentUser());
  }, []);

  if (isAuthenticated && currentUser) {
    if (currentUser.role_id === 'ADMIN_ROLE') return <Navigate to="/admin" replace />;
    if (currentUser.role_id === 'LECTURER_ROLE') return <Navigate to="/lecturer" replace />;
    return <Navigate to="/student" replace />;
  }
  return children;
}

// Helper to handle raw /dashboard fallback
function RoleRedirect() {
  const user = authService.getCurrentUser();
  if (!user) return <Navigate to="/" replace />;
  if (user.role_id === 'ADMIN_ROLE') return <Navigate to="/admin" replace />;
  if (user.role_id === 'LECTURER_ROLE') return <Navigate to="/lecturer" replace />;
  return <Navigate to="/student" replace />;
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/dashboard" element={<RoleRedirect />} />
        <Route path="/pending-approval" element={<PendingApproval />} />

        {/* Nested User Routes under MainLayout */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['ADMIN_ROLE']}>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="requests" element={<AdminRequests />} />
        </Route>

        <Route path="/lecturer" element={
          <ProtectedRoute allowedRoles={['LECTURER_ROLE']}>
            <LecturerClassProvider>
              <MainLayout />
            </LecturerClassProvider>
          </ProtectedRoute>
        }>
          <Route index element={<LecturerDashboard />} />
          <Route path="topics" element={<TopicManagement />} />
          <Route path="review" element={<SubmissionReview />} />
          <Route path="rubrics" element={<RubricsManagement />} />
          <Route path="comparison" element={<ScoreComparison />} />
          <Route path="entrance-test/:deTaiId" element={<EntranceTestManager />} />
          <Route path="courses" element={<CourseManagement />} />
          <Route path="classes" element={<ClassManagement />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="blockchain" element={<BlockchainDebugPage />} />
        </Route>

        <Route path="/student" element={
          <ProtectedRoute allowedRoles={['STUDENT_ROLE']}>
            <ClassProvider>
              <MainLayout />
            </ClassProvider>
          </ProtectedRoute>
        }>
          <Route index element={<StudentDashboard />} />
          <Route path="register" element={<TopicRegistration />} />
          <Route path="upload" element={<ReportUpload />} />
          <Route path="progress-log" element={<ProgressLog />} />
          <Route path="progress" element={<ProgressTracking />} />
          <Route path="blockchain" element={<StudentBlockchain />} />
          <Route path="group" element={<GroupManagement />} />
          <Route path="entrance-test/:deTaiId" element={<EntranceTest />} />
        </Route>

        {/* Unknown */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
