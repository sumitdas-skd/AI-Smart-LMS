import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

// ... (imports remain the same)
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute';
import ChatbotWidget from './ChatbotWidget';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Subjects from './pages/Subjects';
import SubjectDetail from './pages/SubjectDetail';
import Search from './pages/Search';
import Upload from './pages/Upload';
import AdminDashboard from './pages/AdminDashboard';
import ClassChatDashboard from './pages/ClassChatDashboard';
import ClassChatRoom from './pages/ClassChatRoom';
import Notices from './pages/Notices';
import Results from './pages/Results';
import NotFound from './pages/NotFound';

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    className="w-full h-full"
  >
    {children}
  </motion.div>
);

function App() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.split('/')[1] || 'Home';
    const titles = {
      '': 'Home | ABIT College AI LMS',
      'dashboard': 'Dashboard | AI Smart LMS',
      'subjects': 'Academic Resources | AI Smart LMS',
      'class-chat': 'Class Chat | Doubts & Discussion',
      'chat': 'AI Tutor | Personal Assistant',
      'notices': 'Notice Board | ABIT College',
      'results': 'Academic Results | Transcript',
      'login': 'Login | AI Smart LMS',
      'register': 'Sign Up | AI Smart LMS'
    };
    document.title = titles[location.pathname.split('/')[1]] || 'AI Smart LMS';
  }, [location]);

  return (
    <>
      <Toaster position="top-right" />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
            <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
            <Route path="/forgot-password" element={<PageWrapper><ForgotPassword /></PageWrapper>} />
            <Route path="/reset-password/:token" element={<PageWrapper><ResetPassword /></PageWrapper>} />
          </Route>

          {/* Protected Dashboard Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
              <Route path="/profile" element={<PageWrapper><Profile /></PageWrapper>} />
              <Route path="/subjects" element={<PageWrapper><Subjects /></PageWrapper>} />
              <Route path="/subjects/:id" element={<PageWrapper><SubjectDetail /></PageWrapper>} />
              <Route path="/search" element={<PageWrapper><Search /></PageWrapper>} />
              <Route path="/class-chat" element={<PageWrapper><ClassChatDashboard /></PageWrapper>} />
              <Route path="/class-chat/:threadId" element={<PageWrapper><ClassChatRoom /></PageWrapper>} />
              
              <Route path="/notices" element={<PageWrapper><Notices /></PageWrapper>} />
              <Route path="/results" element={<PageWrapper><Results /></PageWrapper>} />
              
              {/* Teacher + Admin Routes */}
              <Route element={<RoleRoute allowedRoles={['teacher', 'admin']} />}>
                <Route path="/upload" element={<PageWrapper><Upload /></PageWrapper>} />
              </Route>

              {/* Admin Only Routes */}
              <Route element={<RoleRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
                <Route path="/admin/import" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all 404 */}
          <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
        </Routes>
      </AnimatePresence>
      <ChatbotWidget />
    </>
  );
}

export default App;
