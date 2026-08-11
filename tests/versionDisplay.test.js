import { test, expect } from '@playwright/test';
import { loginAs, ADMIN } from './helpers';

test.describe('V1.2 版本号展示 E2E 测试', () => {
  test('登录页展示版本号', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toContainText('v1.3.0');
  });

  test('主界面顶栏展示版本号且与登录页一致', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, { token: ctx.token, user: ctx.user });
    await page.goto('/admin/users');
    await expect(page.locator('body')).toContainText('v1.3.0');
  });

  test('接口失败时登录页隐藏版本号且页面可用', async ({ page }) => {
    await page.route('**/api/meta/version', route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'VERSION_UNAVAILABLE', message: '版本信息不可用' }) })
    );
    await page.goto('/login');
    await expect(page.locator('body')).not.toContainText('v1.3.0');
    await expect(page.getByPlaceholder('用户名')).toBeVisible();
    await expect(page.getByPlaceholder('密码')).toBeVisible();
  });

  test('接口失败时主界面隐藏版本号且页面正常', async ({ page }) => {
    const ctx = await loginAs(ADMIN.username, ADMIN.password);
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, { token: ctx.token, user: ctx.user });
    await page.route('**/api/meta/version', route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'VERSION_UNAVAILABLE', message: '版本信息不可用' }) })
    );
    await page.goto('/admin/users');
    await expect(page.locator('body')).not.toContainText('v1.3.0');
    await expect(page.locator('body')).not.toContainText('版本信息不可用');
  });
});