import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell } from 'lucide-react';

const PAGE_TITLES = {
  '/': 'Patient dashboard',
  '/tracking': 'Glucose tracking',
  '/calendar': 'Tracking calendar',
  '/analytics': 'Charts & statistics',
  '/reports': 'Reports & exports',
  '/doctors': 'Find a doctor',
  '/subscriptions': 'My consultation',
  '/chat': 'Care messages',
  '/notifications': 'Notifications',
  '/profile': 'Profile settings',
  '/doctor': 'Doctor dashboard',
  '/doctor/patients': 'Authorized patients',
  '/doctor/requests': 'Requests & payments'
};

export default function TopBar() {
  const { user, switchRole, unreadCount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const title = PAGE_TITLES[location.pathname] || 'Workspace';
  const isDoctor = user?.role === 'doctor';

  const initials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const handleRoleToggle = async (role) => {
    if ((role === 'doctor' && !isDoctor) || (role === 'patient' && isDoctor)) {
      await switchRole(role);
      navigate(role === 'doctor' ? '/doctor' : '/');
    }
  };

  return (
    <header className="topbar">
      <div>
        <div className="crumb">Workspace / {title}</div>
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="top-actions">
        {/* Quick Demo Role Switcher */}
        <div className="role-pill" title="Quick switch between demo patient and doctor accounts">
          <button
            onClick={() => handleRoleToggle('patient')}
            className={`role-btn ${!isDoctor ? 'active' : ''}`}
          >
            Patient view
          </button>
          <button
            onClick={() => handleRoleToggle('doctor')}
            className={`role-btn ${isDoctor ? 'active' : ''}`}
          >
            Doctor view
          </button>
        </div>

        {/* Notifications Icon Button */}
        <button
          className="icon-btn"
          onClick={() => navigate('/notifications')}
          title="Notifications"
          aria-label="View notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className="dot-badge" />}
        </button>

        {/* Avatar */}
        <div
          className={`avatar ${isDoctor ? 'coral' : 'teal'}`}
          onClick={() => navigate('/profile')}
          style={{ cursor: 'pointer' }}
          title="Profile settings"
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
