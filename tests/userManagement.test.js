import { test, expect } from '@playwright/test';
import { loginAs, apiCall, createEmployee, ADMIN } from './helpers';

test.describe('员工管理 E2E 测试', () => {
  test('管理员创建员工成功', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const res = await createEmployee(ctx, `emp_${Date.now()}`, '测试员工', 'pass123456');
    expect(res.body.code).toBe(0);
    expect(res.body.data.role).toBe('普通员工');
    expect(res.body.data.status).toBe('启用');
  });

  test('用户名冲突返回 USER_NAME_CONFLICT', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `dup_${Date.now()}`;
    await createEmployee(ctx, username, '员工1', 'pass123456');
    const res = await createEmployee(ctx, username, '员工2', 'pass123456');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('USER_NAME_CONFLICT');
  });

  test('编辑员工后信息更新', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const createRes = await createEmployee(ctx, `edit_${Date.now()}`, '原名', 'pass123456');
    const id = createRes.body.data.id;
    const updateRes = await apiCall(ctx, 'put', `/admin/users/${id}`, { name: '新名' });
    expect(updateRes.body.code).toBe(0);
    expect(updateRes.body.data.name).toBe('新名');
  });

  test('禁用/启用员工', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const createRes = await createEmployee(ctx, `status_${Date.now()}`, '状态测试', 'pass123456');
    const id = createRes.body.data.id;
    const disableRes = await apiCall(ctx, 'patch', `/admin/users/${id}/status`, { status: '禁用' });
    expect(disableRes.body.code).toBe(0);
    expect(disableRes.body.data.status).toBe('禁用');
    const enableRes = await apiCall(ctx, 'patch', `/admin/users/${id}/status`, { status: '启用' });
    expect(enableRes.body.data.status).toBe('启用');
  });

  test('重置密码后员工可用新密码登录', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `reset_${Date.now()}`;
    const createRes = await createEmployee(ctx, username, '重置测试', 'pass123456');
    const id = createRes.body.data.id;
    await apiCall(ctx, 'post', `/admin/users/${id}/reset-password`, { newPassword: 'newpass123' });
    const empCtx = await loginAs(username, 'newpass123');
    expect(empCtx.user.role).toBe('普通员工');
  });

  test('普通员工访问 /api/admin/users 返回 403', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `forbid_${Date.now()}`;
    await createEmployee(ctx, username, '权限测试', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const res = await apiCall(empCtx, 'get', '/admin/users');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});