import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pulse_api_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401s to handle expired tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthUrl = error.config.url.includes('/auth/login') || error.config.url.includes('/auth/register');
      if (!isAuthUrl) {
        localStorage.removeItem('pulse_api_token');
        localStorage.removeItem('pulse_api_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

// Monitors Service
export const monitorService = {
  getMonitors: (params) => api.get('/monitors', { params }),
  getMonitorById: (id) => api.get(`/monitors/${id}`),
  createMonitor: (data) => api.post('/monitors', data),
  updateMonitor: (id, data) => api.put(`/monitors/${id}`, data),
  deleteMonitor: (id) => api.delete(`/monitors/${id}`),
  toggleMonitor: (id) => api.patch(`/monitors/${id}/toggle`),
  checkNow: (id) => api.post(`/monitors/${id}/check`),
};

// Metrics & History Service
export const metricsService = {
  getDashboardOverview: () => api.get('/metrics/dashboard'),
  getApiHistory: (id, params) => api.get(`/metrics/apis/${id}/history`, { params }),
  getApiMetrics: (id, params) => api.get(`/metrics/apis/${id}/metrics`, { params }),
};

// Admin Service
export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  getAllApis: () => api.get('/admin/apis'),
  updateUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export default api;
