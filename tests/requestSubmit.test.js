import { test, expect } from '@playwright/test';
import { loginAs, apiCall, createEmployee, submitRequest, ADMIN, sampleRequest } from './helpers';

test.describe('申请提交 E2E 测试', () => {
  test('员工提交合法申请成功且状态为待审核', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `submit_${Date.now()}`;
    await createEmployee(ctx, username, '提交测试', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const res = await submitRequest(empCtx, sampleRequest);
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('待审核');
  });

  test('返回日期早于出发日期返回 VALIDATION_ERROR', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `date_${Date.now()}`;
    await createEmployee(ctx, username, '日期测试', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const res = await submitRequest(empCtx, { ...sampleRequest, startDate: '2026-09-10', endDate: '2026-09-05' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('交通工具非枚举返回 VALIDATION_ERROR', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `trans_${Date.now()}`;
    await createEmployee(ctx, username, '交通测试', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const res = await submitRequest(empCtx, { ...sampleRequest, transport: '自行车' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('费用为负返回 VALIDATION_ERROR', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `cost_${Date.now()}`;
    await createEmployee(ctx, username, '费用测试', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const res = await submitRequest(empCtx, { ...sampleRequest, estimatedCost: -100 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('管理员提交申请返回 403', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const res = await submitRequest(ctx, sampleRequest);
    expect(res.status).toBe(403);
  });
});