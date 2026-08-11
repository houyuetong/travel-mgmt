import { test, expect } from '@playwright/test';
import { loginAs, apiCall, createEmployee, submitRequest, ADMIN, sampleRequest } from './helpers';

test.describe('员工侧申请管理 E2E 测试', () => {
  test('本人列表按状态筛选正确', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `list_${Date.now()}`;
    await createEmployee(ctx, username, '列表测试', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    await submitRequest(empCtx, sampleRequest);
    const res = await apiCall(empCtx, 'get', '/requests?status=待审核');
    expect(res.body.code).toBe(0);
    expect(res.body.data.list.length).toBeGreaterThan(0);
    expect(res.body.data.list.every(r => r.status === '待审核')).toBe(true);
  });

  test('查看他人申请返回 403', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const u1 = `other1_${Date.now()}`;
    const u2 = `other2_${Date.now()}`;
    await createEmployee(ctx, u1, '员工1', 'pass123456');
    await createEmployee(ctx, u2, '员工2', 'pass123456');
    const ctx1 = await loginAs(u1, 'pass123456');
    const ctx2 = await loginAs(u2, 'pass123456');
    const submitRes = await submitRequest(ctx1, sampleRequest);
    const reqId = submitRes.body.data.id;
    const res = await apiCall(ctx2, 'get', `/requests/${reqId}`);
    expect(res.status).toBe(403);
  });

  test('撤回待审核申请成功', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `withdraw_${Date.now()}`;
    await createEmployee(ctx, username, '撤回测试', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const submitRes = await submitRequest(empCtx, sampleRequest);
    const reqId = submitRes.body.data.id;
    const res = await apiCall(empCtx, 'post', `/requests/${reqId}/withdraw`);
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('已撤回');
  });

  test('撤回非待审核申请返回 STATE_CONFLICT', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `withdraw2_${Date.now()}`;
    await createEmployee(ctx, username, '撤回冲突', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const submitRes = await submitRequest(empCtx, sampleRequest);
    const reqId = submitRes.body.data.id;
    await apiCall(empCtx, 'post', `/requests/${reqId}/withdraw`);
    const res = await apiCall(empCtx, 'post', `/requests/${reqId}/withdraw`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('STATE_CONFLICT');
  });

  test('重新提交已拒绝申请生成新申请且原申请不变', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `resub_${Date.now()}`;
    await createEmployee(ctx, username, '重新提交测试', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const submitRes = await submitRequest(empCtx, sampleRequest);
    const reqId = submitRes.body.data.id;
    await apiCall(ctx, 'post', `/admin/requests/${reqId}/reject`, { comment: '理由不充分' });
    const res = await apiCall(empCtx, 'post', `/requests/${reqId}/resubmit`, sampleRequest);
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('待审核');
    expect(res.body.data.resubmittedFrom).toBe(reqId);
    const original = await apiCall(empCtx, 'get', `/requests/${reqId}`);
    expect(original.body.data.status).toBe('已拒绝');
  });

  test('重新提交非已拒绝申请返回 STATE_CONFLICT', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `resub2_${Date.now()}`;
    await createEmployee(ctx, username, '重新提交冲突', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const submitRes = await submitRequest(empCtx, sampleRequest);
    const reqId = submitRes.body.data.id;
    const res = await apiCall(empCtx, 'post', `/requests/${reqId}/resubmit`, sampleRequest);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('STATE_CONFLICT');
  });
});