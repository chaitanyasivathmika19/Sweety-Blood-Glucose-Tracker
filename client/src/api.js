const rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
const API_BASE = rawBase === '/api' ? '/api' : (rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api`);

export function getMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const base = import.meta.env.VITE_API_BASE_URL || '';
  if (base.startsWith('http://') || base.startsWith('https://')) {
    try {
      const origin = new URL(base).origin;
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      return `${origin}${cleanPath}`;
    } catch {
      // fallback to relative path
    }
  }
  return url.startsWith('/') ? url : `/${url}`;
}

function getToken() {
  return localStorage.getItem('sweety_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('sweety_token', token);
  } else {
    localStorage.removeItem('sweety_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getToken();

  // Don't set Content-Type for FormData — browser must set it with boundary
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  getMediaUrl,
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => {
    setToken(null);
    return request('/auth/logout', { method: 'POST' });
  },
  getMe: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),

  // Readings
  getReadings: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/readings${query ? `?${query}` : ''}`);
  },
  addReading: (body) => request('/readings', { method: 'POST', body: JSON.stringify(body) }),
  updateReading: (id, body) => request(`/readings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteReading: (id) => request(`/readings/${id}`, { method: 'DELETE' }),
  getReports: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/readings/reports${query ? `?${query}` : ''}`);
  },
  exportCsv: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const blob = await request(`/readings/export-csv${query ? `?${query}` : ''}`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sweety-glucose-report.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // Doctors
  getDoctors: () => request('/doctors'),
  getDoctor: (id) => request(`/doctors/${id}`),

  // Doctor QR Code management
  uploadDoctorQr: (formData) => request('/doctors/me/qr', { method: 'POST', body: formData, headers: {} }),
  deleteDoctorQr: () => request('/doctors/me/qr', { method: 'DELETE' }),
  getAuthorizedPatients: () => request('/doctors/portal/patients'),
  getPatientReadings: (patientId) => request(`/doctors/portal/patients/${patientId}/readings`),

  // Subscriptions & Payments
  getPlans: () => request('/subscriptions/plans'),
  getMySubscription: () => request('/subscriptions/my'),
  submitPayment: (body) => request('/subscriptions/submit-payment', { method: 'POST', body: JSON.stringify(body) }),
  getPendingPayments: () => request('/subscriptions/pending-payments'),
  verifyPayment: (body) => request('/subscriptions/verify-payment', { method: 'POST', body: JSON.stringify(body) }),

  // Chat & Follow-ups
  getConversations: () => request('/chat/conversations'),
  getMessages: (partnerId) => request(`/chat/messages/${partnerId}`),
  sendMessage: (body) => request('/chat/messages', { method: 'POST', body: JSON.stringify(body) }),
  submitFollowup: (body) => request('/chat/follow-up', { method: 'POST', body: JSON.stringify(body) }),
  reviewFollowup: (body) => request('/chat/follow-up/review', { method: 'POST', body: JSON.stringify(body) }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/mark-all-read', { method: 'PUT' })
};
