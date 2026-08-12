import apiClient from './client';

export const listUsers = () => apiClient.get('/admin/users');

export const createUser = (username, name, password, department) =>
  apiClient.post('/admin/users', { username, name, password, department });

export const updateUser = (id, data) =>
  apiClient.put(`/admin/users/${id}`, data);

export const updateUserStatus = (id, status) =>
  apiClient.patch(`/admin/users/${id}/status`, { status });

export const resetPassword = (id, newPassword) =>
  apiClient.post(`/admin/users/${id}/reset-password`, { newPassword });

export const userApi = { listUsers, createUser, updateUser, updateUserStatus, resetPassword };