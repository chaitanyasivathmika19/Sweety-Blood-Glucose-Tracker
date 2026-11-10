import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Toast from './components/Toast';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tracking from './pages/Tracking';
import CalendarView from './pages/CalendarView';
import Analytics from './pages/Analytics';
import ReportsView from './pages/ReportsView';
import DoctorsView from './pages/DoctorsView';
import SubscriptionsView from './pages/SubscriptionsView';
import ChatView from './pages/ChatView';
import NotificationsView from './pages/NotificationsView';
import ProfileView from './pages/ProfileView';

import DoctorDashboard from './pages/DoctorDashboard';
import DoctorPatients from './pages/DoctorPatients';
import DoctorRequests from './pages/DoctorRequests';

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--teal)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 20, margin: '0 auto 12px' }}>
            ♥
          </div>
          <b style={{ color: 'var(--muted)', fontSize: 13 }}>Loading Sweety Workspace...</b>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <main>{children}</main>
      </div>
      <Toast />
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedLayout>
            {user?.role === 'doctor' ? <Navigate to="/doctor" replace /> : <Dashboard />}
          </ProtectedLayout>
        }
      />
      <Route path="/tracking" element={<ProtectedLayout><Tracking /></ProtectedLayout>} />
      <Route path="/calendar" element={<ProtectedLayout><CalendarView /></ProtectedLayout>} />
      <Route path="/analytics" element={<ProtectedLayout><Analytics /></ProtectedLayout>} />
      <Route path="/reports" element={<ProtectedLayout><ReportsView /></ProtectedLayout>} />
      <Route path="/doctors" element={<ProtectedLayout><DoctorsView /></ProtectedLayout>} />
      <Route path="/subscriptions" element={<ProtectedLayout><SubscriptionsView /></ProtectedLayout>} />
      <Route path="/chat" element={<ProtectedLayout><ChatView /></ProtectedLayout>} />
      <Route path="/notifications" element={<ProtectedLayout><NotificationsView /></ProtectedLayout>} />
      <Route path="/profile" element={<ProtectedLayout><ProfileView /></ProtectedLayout>} />

      {/* Doctor Specific Routes */}
      <Route path="/doctor" element={<ProtectedLayout><DoctorDashboard /></ProtectedLayout>} />
      <Route path="/doctor/patients" element={<ProtectedLayout><DoctorPatients /></ProtectedLayout>} />
      <Route path="/doctor/requests" element={<ProtectedLayout><DoctorRequests /></ProtectedLayout>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
