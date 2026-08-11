import { test, expect } from '@playwright/test';
import { loginAs, apiCall, ADMIN } from './helpers';

test.describe('认证流程 E2E 测试', () => {
  test('初始管理员可登录成功', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    expect(ctx.user.role).toBe('管理员');
    expect(ctx.token).toBeTruthy();
  });


  test('错误密码应返回401', async () => {
    const { request } = await import('@playwright/test');
    const ctx = await request.newContext();
    const res = await ctx.post('http://localhost:3001/api/auth/login', {
      data: { username: ADMIN.username, password: 'wrongpassword' },
    });
    const body = await res.json();
    expect(res.status()).toBe(401);
    expect(body.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  test('登出后 token 失效', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const logoutRes = await apiCall(ctx, 'post', '/auth/logout');
    expect(logoutRes.body.code).toBe(0);
    const afterLogout = await apiCall(ctx, 'get', '/admin/users');
    expect(afterLogout.status).toBe(401);
  });
});