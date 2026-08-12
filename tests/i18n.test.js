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

async function switchToEn(page) {
  await page.getByRole('button', { name: '中文/EN' }).click();
  await page.getByRole('menuitem', { name: 'EN' }).click();
}

async function switchToZh(page) {
  await page.getByRole('button', { name: '中文/EN' }).click();
  await page.getByRole('menuitem', { name: '中文' }).click();
}

test.describe('V1.3 i18n 双语 E2E 测试', () => {
  test('1. 默认语言 zh-CN（6B-11）', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('i18nLanguage'));
    await page.goto('/login');
    await expect(page.locator('body')).toContainText('企业差旅管理');
    await expect(page.getByPlaceholder('用户名')).toBeVisible();
    await expect(page.locator('body')).toContainText('登 录');
  });

  test('2. 语言切换立即生效（6B-2）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    await injectAuth(page, ctx, CN);
    await page.goto('/admin/users');
    await expect(page.locator('.ant-menu')).toContainText('员工管理');
    await expect(page.locator('.ant-layout-header')).toContainText('员工管理');
    await switchToEn(page);
    await expect(page.locator('.ant-menu')).toContainText('Employee Management');
    await expect(page.locator('.ant-layout-header')).toContainText('Employee Management');
    await expect(page.locator('.ant-table')).toContainText('Username');
    await expect(page.locator('body')).toContainText('Create Employee');
  });

  test('3. 语言持久化（6B-3）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    await injectAuth(page, ctx, EN);
    await page.goto('/admin/users');
    await expect(page.locator('.ant-menu')).toContainText('Employee Management');
    await page.reload();
    await expect(page.locator('.ant-menu')).toContainText('Employee Management');
    const lang = await page.evaluate(() => localStorage.getItem('i18nLanguage'));
    expect(lang).toBe(EN);
  });

  test('4. 英文页无中文残留（6B-9）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    await injectAuth(page, ctx, EN);
    for (const path of ['/admin/requests', '/admin/users']) {
      await page.goto(path);
      const pageTitle = await page.locator('.page-title').first().innerText();
      expect(pageTitle).not.toMatch(/[\u4e00-\u9fa5]/);
      const menuText = await page.locator('.ant-menu').first().innerText();
      expect(menuText).not.toMatch(/[\u4e00-\u9fa5]/);
      const theadText = await page.locator('.ant-table-thead').first().innerText();
      expect(theadText).not.toMatch(/[\u4e00-\u9fa5]/);
    }
    await page.goto('/login');
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/[\u4e00-\u9fa5]/);
  });

  test('5. 业务值英文映射（6B-5）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `m${Date.now()}`;
    await createEmployee(ctx, username, 'Alice', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const submitRes = await submitRequest(empCtx, { ...sampleRequest, transport: '飞机' });
    const reqId = submitRes.body.data.id;
    await apiCall(ctx, 'post', `/admin/requests/${reqId}/approve`, { comment: 'ok' });

    await injectAuth(page, empCtx, EN);
    await page.goto('/employee/requests');
    await expect(page.locator('.ant-table')).toContainText('Approved');
    await expect(page.locator('.ant-table')).toContainText('Flight');
    await expect(page.locator('.ant-table')).toContainText('北京');

    const adminCtx = await loginAs(ADMIN.username, ADMIN.password);
    const disUser = `dis_${Date.now()}`;
    const disRes = await createEmployee(adminCtx, disUser, 'DisabledUser', 'pass123456');
    await apiCall(adminCtx, 'patch', `/admin/users/${disRes.body.data.id}/status`, { status: '禁用' });
    await injectAuth(page, adminCtx, EN);
    await page.goto('/admin/users');
    await expect(page.locator('.ant-table')).toContainText('Administrator');
    await expect(page.locator('.ant-table')).toContainText('Employee');
    await expect(page.locator('.ant-table')).toContainText('Active');
    await expect(page.locator('.ant-table')).toContainText('Disabled');
  });

  test('6. API 仍发送中文业务值（6B-6）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `n${Date.now()}`;
    await createEmployee(ctx, username, 'ApiTester', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const submitRes = await submitRequest(empCtx, sampleRequest);
    const reqId = submitRes.body.data.id;

    await injectAuth(page, empCtx, EN);
    const statusRequests = [];
    page.on('request', r => {
      if (r.url().includes('/api/requests') && r.url().includes('status=')) {
        statusRequests.push(r.url());
      }
    });
    await page.goto('/employee/requests');
    await page.locator('.ant-select').first().click();
    await page.locator('.ant-select-item-option').filter({ hasText: 'Pending' }).click();
    await expect.poll(() => statusRequests.length).toBeGreaterThan(0);
    expect(statusRequests[statusRequests.length - 1]).toContain('status=' + encodeURIComponent('待审核'));

    await injectAuth(page, ctx, EN);
    await page.goto(`/admin/requests/${reqId}`);
    await page.locator('textarea').fill('ok comment');
    const approveBody = [];
    page.on('request', r => {
      if (r.url().includes(`/admin/requests/${reqId}/approve`) && r.method() === 'POST') {
        approveBody.push(r.postData());
      }
    });
    await page.getByRole('button', { name: 'Approve' }).click();
    await expect.poll(() => approveBody.length).toBeGreaterThan(0);
    expect(JSON.parse(approveBody[0])).toEqual({ comment: 'ok comment' });
  });

  test('7. 日期/金额本地化（6B-7/6B-8）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `d${Date.now()}`;
    await createEmployee(ctx, username, 'DateTester', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    const submitRes = await submitRequest(empCtx, { ...sampleRequest, estimatedCost: 1234.5 });
    const reqId = submitRes.body.data.id;

    await injectAuth(page, empCtx, EN);
    await page.goto(`/employee/requests/${reqId}`);
    await expect(page.locator('body')).toContainText('Sep 1, 2026');
    await expect(page.locator('body')).toContainText('1,234.50');

    await injectAuth(page, empCtx, CN);
    await page.goto(`/employee/requests/${reqId}`);
    await expect(page.locator('body')).toContainText('2026-09-01');
    await expect(page.locator('body')).toContainText('1,234.50');
  });

  test('8. 组件内置语言同步（6B-10）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const empName = `q${Date.now()}`;
    await createEmployee(ctx, empName, 'PickerTester', 'pass123456');
    const empCtx = await loginAs(empName, 'pass123456');
    await injectAuth(page, empCtx, CN);
    await page.goto('/employee/requests/new');
    await page.locator('.ant-picker-input').first().click();
    await expect(page.locator('.ant-picker-dropdown')).toContainText('2026年');
    await page.keyboard.press('Escape');

    await switchToEn(page);
    await page.locator('.ant-picker-input').first().click();
    await expect(page.locator('.ant-picker-dropdown')).toContainText('2026');
    await page.keyboard.press('Escape');
  });

  test('9. 错误/校验提示双语（6B-12）', async ({ page }) => {
    await page.addInitScript((lang) => localStorage.setItem('i18nLanguage', lang), EN);
    await page.goto('/login');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page.locator('.ant-form-item-explain-error').first()).toContainText('Please enter your username');

    await page.getByPlaceholder('Username').fill('admin');
    await page.getByPlaceholder('Password').fill('wrongpass');
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page.locator('.ant-message')).toContainText('Incorrect username or password');
  });

  test('10. 管理员全流程（中英各一遍）', async ({ page }) => {
    const suffix = Date.now();
    for (const lang of [CN, EN]) {
      const empName = `a${lang[0]}_${suffix}`;
      const ctx = await loginAs(ADMIN.username, ADMIN.password);
      await createEmployee(ctx, empName, `Employee${lang}`, 'pass123456');
      const empCtx = await loginAs(empName, 'pass123456');
      const submitRes = await submitRequest(empCtx, { ...sampleRequest, destination: `Dest${lang}` });
      const reqId = submitRes.body.data.id;

      await injectAuth(page, ctx, lang);
      await page.goto(`/admin/requests/${reqId}`);
      await expect(page.locator('body')).toContainText(lang === CN ? '待审核' : 'Pending');
      await page.locator('textarea').fill('approve comment');
      await page.getByRole('button', { name: lang === CN ? '通 过' : 'Approve' }).click();
      await expect(page.locator('body')).toContainText(lang === CN ? '已通过' : 'Approved');
    }
  });

  test('11. 员工全流程（中英各一遍）', async ({ page }) => {
    const suffix = Date.now();
    for (const lang of [CN, EN]) {
      const empName = `f${lang[0]}_${suffix}`;
      const ctx = await loginAs(ADMIN.username, ADMIN.password);
      await createEmployee(ctx, empName, `FlowUser${lang}`, 'pass123456');
      const empCtx = await loginAs(empName, 'pass123456');

      await injectAuth(page, empCtx, lang);
      await page.goto('/employee/requests/new');
      await expect(page.locator('body')).toContainText(lang === CN ? '新建差旅申请' : 'New Travel Request');
      await page.getByLabel(lang === CN ? '出差目的地' : 'Destination').fill(`Trip${lang}`);
      const startInput = page.locator('.ant-picker-input').nth(0).locator('input');
      await startInput.click();
      await startInput.fill('2026-08-15');
      await startInput.press('Enter');
      const endInput = page.locator('.ant-picker-input').nth(1).locator('input');
      await endInput.click();
      await endInput.fill('2026-08-20');
      await endInput.press('Enter');
      await page.getByLabel(lang === CN ? '出差事由' : 'Purpose').fill('client visit');
      await page.locator('.ant-select').first().click();
      await page.locator('.ant-select-item-option').filter({ hasText: lang === CN ? '飞机' : 'Flight' }).click();
      await page.getByLabel(lang === CN ? '预计费用（元）' : 'Estimated Cost (CNY)').fill('800');
      await page.getByRole('button', { name: lang === CN ? '提交申请' : 'Submit Request' }).click();
      await expect(page.locator('body')).toContainText(lang === CN ? '我的差旅申请' : 'My Travel Requests');
      await expect(page.locator('.ant-table')).toContainText(lang === CN ? '待审核' : 'Pending');
    }
  });

  test('12. 权限边界英文态（6A-13）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const username = `p${Date.now()}`;
    await createEmployee(ctx, username, 'PermTester', 'pass123456');
    const empCtx = await loginAs(username, 'pass123456');
    await injectAuth(page, empCtx, EN);
    await page.goto('/admin/users');
    await page.waitForURL('**/employee/requests');
    await expect(page.locator('.ant-menu')).toContainText('My Requests');
  });

  test('13. 既有版本展示回归（en-US）', async ({ page }) => {
    await page.addInitScript((lang) => localStorage.setItem('i18nLanguage', lang), EN);
    await page.goto('/login');
    await expect(page.locator('body')).toContainText('v1.4.0');

    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    await injectAuth(page, ctx, EN);
    await page.goto('/admin/users');
    await expect(page.locator('body')).toContainText('v1.4.0');
  });
});