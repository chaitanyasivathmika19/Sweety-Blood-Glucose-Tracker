import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Calendar, 
  LineChart, 
  FileText, 
  UserPlus, 
  CreditCard, 
  MessageSquare, 
  Bell, 
  Settings, 
  LogOut, 
  Users, 
  Clock 
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isDoctor = user?.role === 'doctor';

  const patientLinks = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/tracking', label: 'Glucose tracking', icon: PlusCircle },
    { to: '/calendar', label: 'Calendar', icon: Calendar },
    { to: '/analytics', label: 'Charts & statistics', icon: LineChart },
    { to: '/reports', label: 'Reports & exports', icon: FileText },
    { to: '/doctors', label: 'Find a doctor', icon: UserPlus },
    { to: '/subscriptions', label: 'My consultation', icon: CreditCard },
    { to: '/chat', label: 'Messages', icon: MessageSquare },
    { to: '/notifications', label: 'Notifications', icon: Bell }
  ];

  const doctorLinks = [
    { to: '/doctor', label: 'Overview', icon: LayoutDashboard },
    { to: '/doctor/patients', label: 'Authorized patients', icon: Users },
    { to: '/doctor/requests', label: 'Requests & payments', icon: Clock },
    { to: '/chat', label: 'Messages', icon: MessageSquare },
    { to: '/notifications', label: 'Notifications', icon: Bell }
  ];

  const links = isDoctor ? doctorLinks : patientLinks;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo-icon">♥</div>
        <span className="brand-text">sweety<span style={{ color: 'var(--teal)' }}>.</span></span>
      </div>

      <div className="nav-label">WORKSPACE</div>
      <nav className="nav-list">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/doctor'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="nav-label">ACCOUNT</div>
        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={18} />
          <span>Profile settings</span>
        </NavLink>
        <button onClick={handleLogout} className="nav-item" style={{ color: '#b65e4c', width: '100%' }}>
          <LogOut size={18} />
          <span>Sign out</span>
        </button>

        <div className="user-mini-card">
          <div className={`avatar ${isDoctor ? 'coral' : 'teal'}`}>{initials}</div>
          <div className="user-text" style={{ minWidth: 0, overflow: 'hidden' }}>
            <b style={{ fontSize: 13, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {user?.name}
            </b>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>
              {user?.role} account
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
