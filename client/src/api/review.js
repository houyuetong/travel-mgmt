import apiClient from './client';

export const listAllRequests = (params) =>
  apiClient.get('/admin/requests', { params });

export const getRequestDetail = (id) =>
  apiClient.get(`/admin/requests/${id}`);

export const approveRequest = (id, comment) =>
  apiClient.post(`/admin/requests/${id}/approve`, { comment });

export const rejectRequest = (id, comment) =>
  apiClient.post(`/admin/requests/${id}/reject`, { comment });

export const reviewApi = { listAllRequests, getRequestDetail, approveRequest, rejectRequest };