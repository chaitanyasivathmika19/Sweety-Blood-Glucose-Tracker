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
    ? user.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'CS';

  const handleRoleToggle = async (targetRole) => {
    if ((targetRole === 'doctor' && !isDoctor) || (targetRole === 'patient' && isDoctor)) {
      await switchRole(targetRole);
      navigate(targetRole === 'doctor' ? '/doctor' : '/');
    }
  };

  return (
    <header className="topbar">
      <div>
        <div className="crumb">Workspace / {title}</div>
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="top-actions">
        {/* Role Switcher Pill */}
        <div className="role-switch" title="Toggle role views for evaluation">
          <button
            type="button"
            onClick={() => handleRoleToggle('patient')}
            className={!isDoctor ? 'active' : ''}
          >
            Patient view
          </button>
          <button
            type="button"
            onClick={() => handleRoleToggle('doctor')}
            className={isDoctor ? 'active' : ''}
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

        {/* User Avatar */}
        <div
          className={`avatar ${isDoctor ? 'coral' : 'teal'}`}
          onClick={() => navigate('/profile')}
          style={{ cursor: 'pointer' }}
          title={`${user?.name} · Click for Profile`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
