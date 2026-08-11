import apiClient from './client';

export const fetchVersion = () => apiClient.get('/meta/version');