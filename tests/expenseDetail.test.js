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

async function createEmp(adminCtx, prefix) {
  const username = `${prefix}_${Date.now()}`;
  await apiCall(adminCtx, 'post', '/admin/users', { username, name: `明细测试${prefix}`, password: 'pass123456' });
  return loginAs(username, 'pass123456');
}

test.describe('费用明细与审批时间线 E2E 测试', () => {
  test('新建申请录入多条明细提交成功且详情页展示明细与合计（7B-6/7/9）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const empCtx = await createEmp(ctx, 'exp');

    await injectAuth(page, empCtx, CN);
    await page.goto('/employee/requests/new');
    await expect(page.locator('body')).toContainText('新建差旅申请');

    await page.getByLabel('出差目的地').fill('上海');
    await page.locator('.ant-picker-input').nth(0).locator('input').fill('2026-10-10');
    await page.locator('.ant-picker-input').nth(1).locator('input').fill('2026-10-12');
    await page.getByLabel('出差事由').fill('展会参会');
    await page.locator('.ant-select').nth(0).click();
    await page.locator('.ant-select-item-option:visible').filter({ hasText: '飞机' }).click();
    await page.locator('.ant-input-number-input').nth(0).fill('1000');

    await page.getByRole('button', { name: '新增明细' }).click();
    await page.keyboard.press('Escape');
    await page.locator('.ant-select').nth(1).click();
    await page.locator('.ant-select-item-option:visible').filter({ hasText: '餐饮' }).last().click();
    await page.locator('.ant-input-number-input').nth(1).fill('300');
    await page.getByPlaceholder('费用说明（选填）').first().fill('工作餐');
    await expect(page.locator('body')).toContainText('明细合计');
    await expect(page.locator('body')).toContainText('300.00');

    await page.getByRole('button', { name: '新增明细' }).click();
    await page.keyboard.press('Escape');
    await page.locator('.ant-select').nth(2).click();
    await page.locator('.ant-select-item-option:visible').filter({ hasText: '交通' }).last().click();
    await page.locator('.ant-input-number-input').nth(2).fill('200');
    await page.getByPlaceholder('费用说明（选填）').nth(1).fill('市内交通');
    await expect(page.locator('body')).toContainText('500.00');

    await page.getByRole('button', { name: '提交申请' }).click();
    await expect(page.locator('body')).toContainText('我的差旅申请');

    await page.locator('.ant-table').getByText('上海').click();
    await page.getByRole('button', { name: '详情' }).first().click();
    await expect(page.locator('body')).toContainText('费用明细');
    await expect(page.locator('body')).toContainText('工作餐');
    await expect(page.locator('body')).toContainText('市内交通');
    await expect(page.locator('body')).toContainText('明细合计');
    await expect(page.locator('body')).toContainText('500.00');
    await expect(page.locator('body')).toContainText('总费用');
  });

  test('不录明细提交成功且详情页显示无明细空态（7B-1）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const empCtx = await createEmp(ctx, 'nod');

    await injectAuth(page, empCtx, CN);
    await page.goto('/employee/requests/new');
    await page.getByLabel('出差目的地').fill('深圳');
    await page.locator('.ant-picker-input').nth(0).locator('input').fill('2026-11-01');
    await page.locator('.ant-picker-input').nth(1).locator('input').fill('2026-11-02');
    await page.getByLabel('出差事由').fill('拜访客户');
    await page.locator('.ant-select').nth(0).click();
    await page.locator('.ant-select-item-option:visible').filter({ hasText: '高铁' }).click();
    await page.locator('.ant-input-number-input').nth(0).fill('800');
    await page.getByRole('button', { name: '提交申请' }).click();
    await expect(page.locator('body')).toContainText('我的差旅申请');

    const list = await apiCall(empCtx, 'get', '/requests');
    const req = list.body.data.list.find(r => r.destination === '深圳');
    expect(req.expenseItems).toBeUndefined();
    await page.goto(`/employee/requests/${req.id}`);
    await expect(page.locator('body')).toContainText('无费用明细');
  });

  test('金额为 0 时表单校验拦截（7B-3）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const empCtx = await createEmp(ctx, 'zero');

    await injectAuth(page, empCtx, CN);
    await page.goto('/employee/requests/new');
    await page.getByLabel('出差目的地').fill('广州');
    await page.locator('.ant-picker-input').nth(0).locator('input').fill('2026-12-01');
    await page.locator('.ant-picker-input').nth(1).locator('input').fill('2026-12-02');
    await page.getByLabel('出差事由').fill('会议');
    await page.locator('.ant-select').nth(0).click();
    await page.locator('.ant-select-item-option:visible').filter({ hasText: '汽车' }).click();
    await page.locator('.ant-input-number-input').nth(0).fill('100');
    await page.getByRole('button', { name: '新增明细' }).click();
    await page.locator('.ant-input-number-input').nth(1).fill('0');
    await page.getByRole('button', { name: '提交申请' }).click();
    await expect(page.getByText('金额必须大于0')).toBeVisible();
  });

  test('重新提交回填原明细并修改成功（7B-6）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const empCtx = await createEmp(ctx, 'res');
    const submit = await submitRequest(empCtx, {
      ...sampleRequest,
      destination: '成都',
      expenseItems: [{ category: '餐饮', amount: 100, description: '原明细' }],
    });
    const reqId = submit.body.data.id;
    await apiCall(ctx, 'post', `/admin/requests/${reqId}/reject`, { comment: '请补充明细' });

    await injectAuth(page, empCtx, CN);
    await page.goto(`/employee/requests/${reqId}/resubmit`);
    await expect(page.locator('body')).toContainText('重新提交申请');
    await expect(page.locator('input[value="原明细"]')).toBeVisible();
    await expect(page.locator('.ant-input-number-input').nth(1)).toHaveValue('100.00');

    await page.locator('input[value="原明细"]').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('修改后明细');
    await expect(page.locator('input[value="修改后明细"]')).toBeVisible();
    await page.locator('.ant-input-number-input').nth(1).click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('200');
    await page.keyboard.press('Tab');
    await expect(page.locator('.ant-input-number-input').nth(1)).toHaveValue('200.00');
    const resubmitResp = page.waitForResponse(res => res.url().includes('/resubmit') && res.request().method() === 'POST');
    await page.getByRole('button', { name: '重新提交' }).click();
    await expect(page.locator('body')).toContainText('我的差旅申请');

    const resp = await resubmitResp;
    const newId = (await resp.json()).data.id;
    const detail = await apiCall(empCtx, 'get', `/requests/${newId}`);
    const items = detail.body.data.expenseItems;
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe('修改后明细');
    expect(items[0].amount).toBe(200);
    expect(detail.body.data.totalCost).toBe(200);
  });

  test('审批历史时间线按状态渲染且最终节点与当前状态一致（7C-1/2/7）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const empCtx = await createEmp(ctx, 'tl');
    const submit = await submitRequest(empCtx, { ...sampleRequest, destination: '杭州' });
    const reqId = submit.body.data.id;

    await injectAuth(page, empCtx, CN);
    await page.goto(`/employee/requests/${reqId}`);
    await expect(page.locator('body')).toContainText('审批历史');
    await expect(page.locator('body')).toContainText('已提交');
    await expect(page.locator('body')).toContainText('待审核');

    await apiCall(ctx, 'post', `/admin/requests/${reqId}/approve`, { comment: '同意报销' });
    await page.goto(`/employee/requests/${reqId}`);
    await expect(page.locator('body')).toContainText('审批历史');
    await expect(page.locator('body')).toContainText('已通过');
    await expect(page.locator('body')).toContainText('同意报销');
    await expect(page.locator('body')).toContainText('已提交');
  });

  test('en-US 下时间线文案为英文（7C-9）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const empCtx = await createEmp(ctx, 'enu');
    const submit = await submitRequest(empCtx, { ...sampleRequest, destination: '南京' });
    const reqId = submit.body.data.id;

    await injectAuth(page, empCtx, EN);
    await page.goto(`/employee/requests/${reqId}`);
    await expect(page.locator('body')).toContainText('Approval History');
    await expect(page.locator('body')).toContainText('Submitted');
    await expect(page.locator('body')).toContainText('Pending');
  });

  test('管理员完成审核后待办徽标数量减少（7C-5）', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    const empCtx = await createEmp(ctx, 'bdg');
    await submitRequest(empCtx, { ...sampleRequest, destination: '武汉' });

    const before = await apiCall(ctx, 'get', '/stats/pending-count');
    const pending = before.body.data.count;
    expect(pending).toBeGreaterThanOrEqual(1);

    const list = await apiCall(ctx, 'get', '/admin/requests?status=待审核&page=1&pageSize=100');
    const target = list.body.data.list.find(r => r.destination === '武汉');
    expect(target).toBeTruthy();

    await injectAuth(page, ctx, CN);
    await page.goto('/admin/requests');
    await expect(page.locator('.ant-badge-count')).toHaveText(String(pending));

    await page.goto(`/admin/requests/${target.id}`);
    await page.locator('textarea').fill('同意');
    await page.getByRole('button', { name: '通 过' }).click();
    await expect(page.locator('body')).toContainText('已通过');

    const after = await apiCall(ctx, 'get', '/stats/pending-count');
    expect(after.body.data.count).toBe(pending - 1);
  });
});