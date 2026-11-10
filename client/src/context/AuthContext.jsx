import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  const clearToast = () => {
    setToastMessage(null);
  };

  const fetchCurrentUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      // Fetch unread notification count
      const notifs = await api.getNotifications().catch(() => ({ unreadCount: 0 }));
      setUnreadCount(notifs.unreadCount || 0);
    } catch (err) {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    setToken(data.token);
    setUser(data.user);
    showToast(`Welcome back, ${data.user.name}!`);
    return data;
  };

  const register = async (name, email, password, role) => {
    const data = await api.register({ name, email, password, role });
    setToken(data.token);
    setUser(data.user);
    showToast(`Account created successfully! Welcome to Sweety.`);
    return data;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    }
    setToken(null);
    setUser(null);
    showToast('Logged out successfully.');
  };

  const switchRole = async (targetRole) => {
    if (targetRole === 'doctor') {
      await login('doctor@sweety.com', 'Password123!');
    } else {
      await login('patient@sweety.com', 'Password123!');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        switchRole,
        showToast,
        toastMessage,
        clearToast,
        unreadCount,
        refreshUser: fetchCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
