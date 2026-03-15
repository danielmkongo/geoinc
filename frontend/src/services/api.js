import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password) =>
    apiClient.post('/auth/login', { username, password }),
};

export const devicesAPI = {
  getAll: () => apiClient.get('/devices'),
  getById: (deviceId) => apiClient.get(`/devices/${deviceId}`),
  getStatus: (deviceId) => apiClient.get(`/devices/${deviceId}/status`),
  resetIncubationStart: (deviceId) => apiClient.put(`/devices/${deviceId}/incubation-start`),
};

export const readingsAPI = {
  getLatest: (deviceId) => apiClient.get(`/readings/latest/${deviceId}`),
  getLast8: (deviceId, parameter) =>
    apiClient.get(`/readings/last-8/${deviceId}?parameter=${parameter}`),
  getHistorical: (deviceId, startDate, endDate, limit = 100) =>
    apiClient.get(`/readings/historical/${deviceId}`, {
      params: { startDate, endDate, limit },
    }),
};

export const commandsAPI = {
  send: (deviceId, command) =>
    apiClient.post(`/commands/send/${deviceId}`, command),
  disableOverride: (deviceId) =>
    apiClient.post(`/commands/override-off/${deviceId}`),
  getHistory: (deviceId, limit = 50) =>
    apiClient.get(`/commands/history/${deviceId}?limit=${limit}`),
};

export const alertsAPI = {
  getAll: (deviceId, limit = 50) =>
    apiClient.get(`/alerts/${deviceId}?limit=${limit}`),
  getUnreadCount: (deviceId) =>
    apiClient.get(`/alerts/count/unread/${deviceId}`),
  acknowledge: (alertId) => apiClient.post(`/alerts/${alertId}/acknowledge`),
  clearUnread: (deviceId) => apiClient.post(`/alerts/${deviceId}/clear-unread`),
};

export const exportAPI = {
  getCSV: (deviceId, startDate, endDate) =>
    apiClient.get(`/export/csv/${deviceId}`, {
      params: { startDate, endDate },
      responseType: 'blob',
    }),
  getJSON: (deviceId, startDate, endDate) =>
    apiClient.get(`/export/json/${deviceId}`, {
      params: { startDate, endDate },
    }),
};

export const healthAPI = {
  getStatus: () => apiClient.get('/health'),
};

export const adminAPI = {
  // Users
  getUsers: () => apiClient.get('/admin/users'),
  createUser: (data) => apiClient.post('/admin/users', data),
  updateUser: (id, data) => apiClient.put(`/admin/users/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
  resetPassword: (id, newPassword) => apiClient.post(`/admin/users/${id}/reset-password`, { newPassword }),
  // Devices (admin CRUD)
  createDevice: (data) => apiClient.post('/admin/devices', data),
  updateDevice: (id, data) => apiClient.put(`/admin/devices/${id}`, data),
  deleteDevice: (id) => apiClient.delete(`/admin/devices/${id}`),
  // Firmware / OTA (file upload via multipart form)
  getFirmware: () => apiClient.get('/admin/firmware'),
  pushFirmware: (formData) => apiClient.post('/admin/firmware', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deactivateFirmware: (id) => apiClient.post(`/admin/firmware/${id}/deactivate`),
  deleteFirmware: (id) => apiClient.delete(`/admin/firmware/${id}`),
  // Data Loggers (admin)
  getDataLoggers: () => apiClient.get('/admin/data-loggers'),
  createDataLogger: (data) => apiClient.post('/admin/data-loggers', data),
  updateDataLogger: (id, data) => apiClient.put(`/admin/data-loggers/${id}`, data),
  deleteDataLogger: (id) => apiClient.delete(`/admin/data-loggers/${id}`),
};

export const dataLoggersAPI = {
  getAll: () => apiClient.get('/data-loggers'),
  getById: (id) => apiClient.get(`/data-loggers/${id}`),
  getLatest: (id) => apiClient.get(`/data-loggers/${id}/latest`),
  getReadings: (id, startDate, endDate, limit = 500) =>
    apiClient.get(`/data-loggers/${id}/readings`, { params: { startDate, endDate, limit } }),
};

export const profileAPI = {
  getMe: () => apiClient.get('/auth/me'),
  updateMe: (data) => apiClient.put('/auth/me', data),
  changePassword: (currentPassword, newPassword) =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword }),
};

export default apiClient;
