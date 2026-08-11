import apiClient from './client';

export const login = (username, password) =>
  apiClient.post('/auth/login', { username, password });

export const logout = () => apiClient.post('/auth/logout');