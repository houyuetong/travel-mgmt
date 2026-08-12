import i18n from '../i18n/index.js';

async function requestExport(pathname, params) {
  const token = localStorage.getItem('token');
  const query = new URLSearchParams({ ...params, lang: i18n.language }).toString();
  const res = await fetch(`${pathname}?${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      // 忽略非 JSON 错误体
    }
    throw body || { code: 'UNKNOWN', message: '导出失败' };
  }
  return res.blob();
}

export const exportMyRequests = (params = {}) =>
  requestExport('/api/requests/export', params);

export const exportAdminRequests = (params = {}) =>
  requestExport('/api/admin/requests/export', params);

export const exportAdminStats = (params = {}) =>
  requestExport('/api/admin/stats/export', params);

export const exportApi = { exportMyRequests, exportAdminRequests, exportAdminStats };