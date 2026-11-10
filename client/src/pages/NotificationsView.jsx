import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Bell, Check, CheckCheck, Clock, ShieldAlert, CreditCard, MessageSquare, Activity } from 'lucide-react';

export default function NotificationsView() {
  const { showToast, refreshUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      showToast('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      refreshUser();
    } catch (err) {
      showToast('Failed to mark notification.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      refreshUser();
      showToast('All notifications marked as read.');
    } catch (err) {
      showToast('Failed to mark all as read.');
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'reading': return <Activity size={18} color="var(--teal)" />;
      case 'payment': return <CreditCard size={18} color="var(--purple)" />;
      case 'message': return <MessageSquare size={18} color="var(--coral)" />;
      case 'reminder': return <Clock size={18} color="var(--gold)" />;
      default: return <Bell size={18} color="var(--teal)" />;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>
            Notifications & Reminders
          </h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
            Two-way clinical updates, reading reminders, consultation schedules, and payment decisions.
          </p>
        </div>

        <button className="btn-secondary" onClick={handleMarkAllRead}>
          <CheckCheck size={16} /> Mark all as read
        </button>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3>Recent Activity</h3>
            <p>Chronological feed of database alerts</p>
          </div>
          <span className="badge badge-success">
            {notifications.filter(n => !n.is_read).length} Unread
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '16px 0',
                  borderBottom: '1px solid #f0f2f5',
                  alignItems: 'flex-start'
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: '#f1f5f9',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0
                  }}
                >
                  {getCategoryIcon(n.category)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontSize: 13.5 }}>{n.title}</b>
                    {!n.is_read && (
                      <span className="badge badge-success" style={{ fontSize: 9, padding: '2px 6px' }}>
                        NEW
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#596878', lineHeight: 1.5 }}>
                    {n.message}
                  </p>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString('en-IN')}
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    className="btn-text"
                    onClick={() => handleMarkRead(n.id)}
                    style={{ fontSize: 12 }}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: 36, color: 'var(--muted)', fontSize: 13 }}>
              No notifications yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
