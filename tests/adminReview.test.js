import { test, expect } from '@playwright/test';
import { loginAs, apiCall, createEmployee, submitRequest, ADMIN, sampleRequest } from './helpers';

test.describe('管理员审核 E2E 测试', () => {
  test('全量列表展示所有员工申请', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const u1 = `rev1_${Date.now()}`;
    const u2 = `rev2_${Date.now()}`;
    await createEmployee(ctx, u1, '员工1', 'pass123456');
    await createEmployee(ctx, u2, '员工2', 'pass123456');
    const ctx1 = await loginAs(u1, 'pass123456');
    const ctx2 = await loginAs(u2, 'pass123456');
    await submitRequest(ctx1, sampleRequest);
    await submitRequest(ctx2, sampleRequest);
    const res = await apiCall(ctx, 'get', '/admin/requests');
    expect(res.body.code).toBe(0);
    expect(res.body.data.list.length).toBeGreaterThanOrEqual(2);
  });

  test('通过待审核申请成功且状态变已通过', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `approve_${Date.now()}`;
    await createEmployee(ctx, username, '通过测试', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const submitRes = await submitRequest(empCtx, sampleRequest);
    const reqId = submitRes.body.data.id;
    const res = await apiCall(ctx, 'post', `/admin/requests/${reqId}/approve`, { comment: '同意' });
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('已通过');
  });

  test('通过时审核意见可选', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `approve2_${Date.now()}`;
    await createEmployee(ctx, username, '通过无意见', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const submitRes = await submitRequest(empCtx, sampleRequest);
    const reqId = submitRes.body.data.id;
    const res = await apiCall(ctx, 'post', `/admin/requests/${reqId}/approve`, {});
    expect(res.body.code).toBe(0);
  });

  test('拒绝待审核申请（意见必填）成功', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `reject_${Date.now()}`;
    await createEmployee(ctx, username, '拒绝测试', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const submitRes = await submitRequest(empCtx, sampleRequest);
    const reqId = submitRes.body.data.id;
    const res = await apiCall(ctx, 'post', `/admin/requests/${reqId}/reject`, { comment: '预算超标' });
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('已拒绝');
  });

  test('拒绝未填意见返回 VALIDATION_ERROR', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `reject2_${Date.now()}`;
    await createEmployee(ctx, username, '拒绝无意见', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const submitRes = await submitRequest(empCtx, sampleRequest);
    const reqId = submitRes.body.data.id;
    const res = await apiCall(ctx, 'post', `/admin/requests/${reqId}/reject`, {});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('审核非待审核申请返回 STATE_CONFLICT', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `conflict_${Date.now()}`;
    await createEmployee(ctx, username, '冲突测试', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const submitRes = await submitRequest(empCtx, sampleRequest);
    const reqId = submitRes.body.data.id;
    await apiCall(ctx, 'post', `/admin/requests/${reqId}/approve`, {});
    const res = await apiCall(ctx, 'post', `/admin/requests/${reqId}/approve`, {});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('STATE_CONFLICT');
  });
});