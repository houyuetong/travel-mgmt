import { test, expect } from '@playwright/test';
import { loginAs, apiCall, createEmployee, submitRequest, ADMIN, sampleRequest } from './helpers';

const CN = 'zh-CN';
const EN = 'en-US';

async function injectAuth(page, ctx, lang) {
  await page.addInitScript(({ token, user, lang }) => {
    if (lang) localStorage.setItem('i18nLanguage', lang);
    if (token) localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
  }, { token: ctx?.token ?? null, user: ctx?.user ?? null, lang: lang ?? null });
}

async function createEmployeeWithRequest(adminCtx, prefix, department) {
  const username = `${prefix}_${Date.now()}`;
  await apiCall(adminCtx, 'post', '/admin/users', { username, name: `员工${prefix}`, password: 'pass123456', department });
  const empCtx = await loginAs(username, 'pass123456');
  await submitRequest(empCtx, { ...sampleRequest, estimatedCost: 5000 });
  return { username, empCtx };
}

test.describe('Dashboard 驾驶舱 E2E 测试', () => {
  test('管理员驾驶舱展示六项指标卡片且数值与列表一致（7A-4/5）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    await createEmployeeWithRequest(ctx, 'dash');

    const dash = await apiCall(ctx, 'get', '/stats/dashboard');
    expect(dash.body.code).toBe(0);
    const core = dash.body.data.core;
    expect(core.total).toBeGreaterThanOrEqual(1);
    expect(core.pending).toBeGreaterThanOrEqual(1);
    expect(typeof core.approvalRate).toBe('string');

    const list = await apiCall(ctx, 'get', '/admin/requests?page=1&pageSize=1');
    expect(list.body.data.total).toBe(core.total);

    await injectAuth(page, ctx, CN);
    await page.goto('/admin/dashboard');
    await expect(page.locator('body')).toContainText('申请总数');
    await expect(page.locator('body')).toContainText('审批通过率');
    await expect(page.locator('body')).toContainText('待审核');
    await expect(page.locator('body')).toContainText('总预计费用');
    await expect(page.locator('body')).toContainText('月度趋势');
    await expect(page.locator('body')).toContainText('部门排行');
    await expect(page.locator('body')).toContainText('员工排行');
  });

  test('状态分布数量之和等于总申请数（7A-9）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    await createEmployeeWithRequest(ctx, 'dist');
    const dash = await apiCall(ctx, 'get', '/stats/dashboard');
    const sd = dash.body.data.statusDistribution;
    const sum = sd.reduce((s, d) => s + d.count, 0);
    expect(sum).toBe(dash.body.data.core.total);
  });

  test('切换时间范围后趋势刷新且 months=3 生效（7A-8）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const dash3 = await apiCall(ctx, 'get', '/stats/dashboard?months=3');
    expect(dash3.body.data.trend.months.length).toBe(3);

    await injectAuth(page, ctx, CN);
    await page.goto('/admin/dashboard');
    await expect(page.locator('body')).toContainText('月度趋势');
    await page.locator('.ant-select').first().click();
    await page.locator('.ant-select-item-option').filter({ hasText: '近 3 月' }).click();
    await expect(page.locator('body')).toContainText('月度趋势');
    await expect(page.locator('body')).not.toContainText('统计加载失败');
  });

  test('部门排行含"未分配"分组（7A-11）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    await createEmployeeWithRequest(ctx, 'noDept', '');
    const dash = await apiCall(ctx, 'get', '/stats/dashboard');
    const deptNames = dash.body.data.departmentRanking.map(d => d.department);
    expect(deptNames).toContain('未分配');

    await injectAuth(page, ctx, CN);
    await page.goto('/admin/dashboard');
    await expect(page.locator('body')).toContainText('未分配');
  });

  test('员工访问 /admin/dashboard 被重定向到 /employee/requests（7A-3）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const emp = await createEmployeeWithRequest(ctx, 'rdr');
    const empCtx = await loginAs(emp.username, 'pass123456');
    await injectAuth(page, empCtx, CN);
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/employee\/requests$/);
  });

  test('统计接口失败展示错误提示与重试、不白屏（7A-16）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    let fail = true;
    await page.route('**/api/stats/dashboard*', async route => {
      if (fail) {
        fail = false;
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL', message: '统计加载失败' }) });
      } else {
        await route.continue();
      }
    });
    await injectAuth(page, ctx, CN);
    await page.goto('/admin/dashboard');
    await expect(page.locator('.ant-alert-error')).toContainText('统计加载失败');
    await page.getByRole('button', { name: /重\s*试/ }).click();
    await expect(page.locator('body')).toContainText('申请总数');
    await expect(page.locator('.ant-alert-error')).toHaveCount(0);
  });

  test('en-US 下图表标题/指标名为英文（7A-15）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    await injectAuth(page, ctx, EN);
    await page.goto('/admin/dashboard');
    await expect(page.locator('body')).toContainText('Dashboard');
    await expect(page.locator('body')).toContainText('Total Requests');
    await expect(page.locator('body')).toContainText('Approval Rate');
    await expect(page.locator('body')).toContainText('Monthly Trend');
    await expect(page.locator('body')).toContainText('Department Ranking');
  });

  test('员工个人驾驶舱仅含本人数据（7A-13）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const u1 = await createEmployeeWithRequest(ctx, 'mine1');
    await createEmployeeWithRequest(ctx, 'mine2');
    const u1Ctx = await loginAs(u1.username, 'pass123456');

    const mine = await apiCall(u1Ctx, 'get', '/stats/me');
    expect(mine.body.data.core.total).toBe(1);

    const all = await apiCall(ctx, 'get', '/stats/dashboard');
    expect(all.body.data.core.total).toBeGreaterThan(1);

    await injectAuth(page, u1Ctx, CN);
    await page.goto('/employee/dashboard');
    await expect(page.locator('body')).toContainText('我的统计');
    await expect(page.locator('body')).toContainText('申请总数');
    await expect(page.locator('body')).not.toContainText('部门排行');
  });
});