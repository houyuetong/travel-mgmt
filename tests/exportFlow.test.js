import { test, expect, request } from '@playwright/test';
import { loginAs, apiCall, createEmployee, submitRequest, ADMIN, sampleRequest } from './helpers';

const CN = 'zh-CN';
const API_BASE = 'http://localhost:3001/api';

async function injectAuth(page, ctx, lang) {
  await page.addInitScript(({ token, user, lang }) => {
    if (lang) localStorage.setItem('i18nLanguage', lang);
    if (token) localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
  }, { token: ctx?.token ?? null, user: ctx?.user ?? null, lang: lang ?? null });
}

async function getCsvText(ctx, path, params) {
  const q = new URLSearchParams({ ...params, lang: CN }).toString();
  const res = await ctx.get(`${API_BASE}${path}?${q}`, { headers: ctx.token ? { Authorization: `Bearer ${ctx.token}` } : {} });
  return { status: res.status(), text: await res.text() };
}

test.describe('导出流程 E2E 测试', () => {
  test('员工导出 CSV 仅含本人记录（7D-1）', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const destA = `导出A_${Date.now()}`;
    const destB = `导出B_${Date.now()}`;
    const u1 = `expA_${Date.now()}`;
    const u2 = `expB_${Date.now()}`;
    await createEmployee(ctx, u1, '导出员工A', 'pass123456');
    await createEmployee(ctx, u2, '导出员工B', 'pass123456');
    const c1 = await loginAs(u1, 'pass123456');
    const c2 = await loginAs(u2, 'pass123456');
    await submitRequest(c1, { ...sampleRequest, destination: destA });
    await submitRequest(c2, { ...sampleRequest, destination: destB });

    const res = await getCsvText(c1, '/requests/export', { status: '全部' });
    expect(res.status).toBe(200);
    expect(res.text.includes(destA)).toBe(true);
    expect(res.text.includes(destB)).toBe(false);
  });

  test('管理员导出按当前状态筛选（7D-2/4）', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const destPending = `筛待审_${Date.now()}`;
    const destApproved = `筛通过_${Date.now()}`;
    const u = `expF_${Date.now()}`;
    await createEmployee(ctx, u, '筛选员工', 'pass123456');
    const empCtx = await loginAs(u, 'pass123456');
    const p = await submitRequest(empCtx, { ...sampleRequest, destination: destPending });
    const p2 = await submitRequest(empCtx, { ...sampleRequest, destination: destApproved });
    await apiCall(ctx, 'post', `/admin/requests/${p2.body.data.id}/approve`, {});

    const res = await getCsvText(ctx, '/admin/requests/export', { status: '待审核' });
    expect(res.status).toBe(200);
    expect(res.text.includes(destPending)).toBe(true);
    expect(res.text.includes(destApproved)).toBe(false);
  });

  test('管理员驾驶舱导出统计快照含区块标题（7D-5）', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const res = await getCsvText(ctx, '/admin/stats/export', {});
    expect(res.status).toBe(200);
    expect(res.text.includes('核心指标')).toBe(true);
    expect(res.text.includes('月度趋势')).toBe(true);
    expect(res.text.includes('部门排行')).toBe(true);
  });

  test('下载文件以 BOM 开头且含中文列名（7D-6）', async () => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const u = `expBom_${Date.now()}`;
    await createEmployee(ctx, u, 'BOM员工', 'pass123456');
    const empCtx = await loginAs(u, 'pass123456');
    await submitRequest(empCtx, { ...sampleRequest, destination: '北京' });

    const res = await getCsvText(empCtx, '/requests/export', { status: '全部' });
    expect(res.status).toBe(200);
    expect(res.text.charCodeAt(0)).toBe(0xfeff);
    expect(res.text.includes('目的地')).toBe(true);
    expect(res.text.includes('提交人')).toBe(true);
    expect(res.text.includes('审核人')).toBe(true);
  });

  test('导出接口未认证返回 401（7D-7）', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${API_BASE}/requests/export?status=全部&lang=${CN}`);
    expect(res.status()).toBe(401);
  });

  test('导出失败前端明确提示且不产生下载（7D-8）', async ({ page }) => {
    const adminCtx = await loginAs(ADMIN.username, ADMIN.password);
    const u = `expFail${Date.now()}`;
    await createEmployee(adminCtx, u, '导出失败员工', 'pass123456');
    const ctx = await loginAs(u, 'pass123456');
    await page.route('**/api/requests/export*', route => route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'EXPORT_TOO_LARGE', message: '数据量过大，请缩小筛选范围后重试' }),
    }));
    await injectAuth(page, ctx, CN);
    let downloadTriggered = false;
    page.on('download', () => { downloadTriggered = true; });
    await page.goto('/employee/requests');
    await page.getByRole('button', { name: /导\s*出 CSV/ }).click();
    await expect(page.locator('.ant-message')).toContainText('数据量过大');
    expect(downloadTriggered).toBe(false);
  });
});