import { test, expect } from '@playwright/test';
import { loginAs, apiCall, createEmployee, ADMIN } from './helpers';

test.describe('V1.1 加固回归 E2E 测试', () => {
  test('创建重名员工仍返回 409（串行回归）', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `hdup_${Date.now()}`;
    const first = await createEmployee(ctx, username, '员工1', 'pass123456');
    expect(first.body.code).toBe(0);

    const second = await createEmployee(ctx, username, '员工2', 'pass123456');
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('USER_NAME_CONFLICT');
    expect(second.body.message).toBe('用户名已存在');
  });

  test('登出后令牌失效且登出流程不受清理影响', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const logoutRes = await apiCall(ctx, 'post', '/auth/logout');
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.code).toBe(0);

    const afterLogout = await apiCall(ctx, 'get', '/admin/users');
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body.code).toBe('AUTH_TOKEN_INVALID');
  });

  test('登录/登出主流程冒烟回归（覆盖三时机清理触发路径）', async () => {
    await new Promise(resolve => setTimeout(resolve, 1100));
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const logoutRes = await apiCall(ctx, 'post', '/auth/logout');
    expect(logoutRes.body.code).toBe(0);

    await new Promise(resolve => setTimeout(resolve, 1100));
    const ctx2 = await loginAs(ADMIN.username, ADMIN.password);
    const username = `hsmoke_${Date.now()}`;
    const createRes = await createEmployee(ctx2, username, '冒烟测试', 'pass123456');
    expect(createRes.status).toBe(200);
    expect(createRes.body.code).toBe(0);
  });
});