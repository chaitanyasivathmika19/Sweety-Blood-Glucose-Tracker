import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Toast() {
  const { toastMessage, clearToast } = useAuth();

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        clearToast();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);

  if (!toastMessage) return null;

  return (
    <div className="toast" role="alert">
      {toastMessage}
    </div>
  );
}
