import apiClient from './client';

export const getAdminDashboard = (months = 6) =>
  apiClient.get('/stats/dashboard', { params: { months } });

export const getEmployeeStats = (months = 6) =>
  apiClient.get('/stats/me', { params: { months } });

export const getPendingCount = () =>
  apiClient.get('/stats/pending-count');

export const statsApi = { getAdminDashboard, getEmployeeStats, getPendingCount };