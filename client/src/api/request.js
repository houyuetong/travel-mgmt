import apiClient from './client';

export const createRequest = (data) =>
  apiClient.post('/requests', data);

export const listMyRequests = (params) =>
  apiClient.get('/requests', { params });

export const getMyRequest = (id) =>
  apiClient.get(`/requests/${id}`);

export const withdrawRequest = (id) =>
  apiClient.post(`/requests/${id}/withdraw`);

export const resubmitRequest = (id, data) =>
  apiClient.post(`/requests/${id}/resubmit`, data);

export const requestApi = { createRequest, listMyRequests, getMyRequest, withdrawRequest, resubmitRequest };