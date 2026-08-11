import { request, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001/api';

export async function loginAs(username, password) {
  const ctx = await request.newContext();
  const res = await ctx.post(`${API_BASE}/auth/login`, { data: { username, password } });
  const body = await res.json();
  expect(body.code).toBe(0);
  ctx.token = body.data.token;
  ctx.user = body.data.user;
  return ctx;
}

export async function apiCall(ctx, method, path, data) {
  const headers = {};
  if (ctx.token) headers.Authorization = `Bearer ${ctx.token}`;
  const res = await ctx[method](`${API_BASE}${path}`, { headers, data });
  return { status: res.status(), body: await res.json() };
}

export async function createEmployee(ctx, username, name, password) {
  return apiCall(ctx, 'post', '/admin/users', { username, name, password });
}

export async function submitRequest(ctx, data) {
  return apiCall(ctx, 'post', '/requests', data);
}

export const ADMIN = { username: 'admin', password: 'admin123456' };

export const sampleRequest = {
  destination: '北京',
  startDate: '2026-09-01',
  endDate: '2026-09-05',
  purpose: '客户拜访',
  transport: '飞机',
  estimatedCost: 5000,
};