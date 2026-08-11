import { test, expect } from '@playwright/test';
import { loginAs, apiCall, createEmployee, submitRequest, ADMIN, sampleRequest } from './helpers';

test.describe('权限隔离 E2E 测试', () => {
  test('员工访问 /api/admin/* 接口全部返回 403', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `perm_${Date.now()}`;
    await createEmployee(ctx, username, '权限测试', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const endpoints = [
      ['get', '/admin/users'],
      ['get', '/admin/requests'],
    ];
    for (const [method, path] of endpoints) {
      const res = await apiCall(empCtx, method, path);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    }
  });

  test('员工访问他人申请返回 403', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const u1 = `perm1_${Date.now()}`;
    const u2 = `perm2_${Date.now()}`;
    await createEmployee(ctx, u1, '员工1', 'pass123456');
    await createEmployee(ctx, u2, '员工2', 'pass123456');
    const ctx1 = await loginAs(u1, 'pass123456');
    const ctx2 = await loginAs(u2, 'pass123456');
    const submitRes = await submitRequest(ctx1, sampleRequest);
    const reqId = submitRes.body.data.id;
    const detailRes = await apiCall(ctx2, 'get', `/requests/${reqId}`);
    expect(detailRes.status).toBe(403);
    const withdrawRes = await apiCall(ctx2, 'post', `/requests/${reqId}/withdraw`);
    expect(withdrawRes.status).toBe(403);
    const resubmitRes = await apiCall(ctx2, 'post', `/requests/${reqId}/resubmit`, sampleRequest);
    expect(resubmitRes.status).toBe(403);
  });

  test('未认证访问业务接口返回 401', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext();
    const res = await ctx.get('http://localhost:3001/api/admin/users');
    expect(res.status()).toBe(401);
    const res2 = await ctx.get('http://localhost:3001/api/requests');
    expect(res2.status()).toBe(401);
  });
});