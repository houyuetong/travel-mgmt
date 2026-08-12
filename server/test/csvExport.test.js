const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-csv-test-'));
process.env.DATA_DIR = tmpDir;
process.env.JWT_SECRET = 'this-is-a-strong-random-secret-at-least-32-chars-long';

const store = require('../src/store/JsonStoreEngine');
const userRepository = require('../src/repositories/userRepository');
const requestRepository = require('../src/repositories/requestRepository');
const csvService = require('../src/services/csvService');
const statsService = require('../src/services/statsService');
const jwtUtil = require('../src/utils/jwt');
const exportRoutes = require('../src/routes/export');
const requestRoutes = require('../src/routes/request');
const errorHandler = require('../src/middlewares/errorHandler');

let server;
let baseUrl;
let adminToken;
let empToken;

before(async () => {
  store.init();
  const now = new Date().toISOString();
  const admin = await userRepository.create({ username: 'admin', name: '系统管理员', role: '管理员', status: '启用', createdAt: now, updatedAt: now });
  const emp = await userRepository.create({ username: 'emp1', name: '张,三', role: '普通员工', status: '启用', department: '研发部', createdAt: now, updatedAt: now });
  await requestRepository.create({
    submitterUsername: 'emp1', destination: '北,京', startDate: '2026-09-01', endDate: '2026-09-02',
    purpose: '出差"测试"', transport: '火车', estimatedCost: 100, status: '已通过',
    reviewerUsername: 'admin', reviewedAt: now, reviewComment: '同意,通过', submittedAt: now, createdAt: now, updatedAt: now,
    expenseItems: [{ category: '交通', amount: 80, description: '高铁票' }],
  });
  adminToken = jwtUtil.sign({ userId: admin.id, username: admin.username, role: admin.role });
  empToken = jwtUtil.sign({ userId: emp.id, username: emp.username, role: emp.role });

  const app = express();
  app.use(express.json());
  app.use('/api', exportRoutes);
  app.use('/api/requests', requestRoutes);
  app.use(errorHandler);
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  if (server) server.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function get(pathname, token) {
  return fetch(`${baseUrl}${pathname}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

describe('csvService 生成', () => {
  test('输出含 UTF-8 BOM 前缀', () => {
    const csv = csvService.toCsv(['a'], [['1']], { lang: 'zh-CN' });
    assert.strictEqual(csv.charCodeAt(0), 0xFEFF);
  });

  test('含逗号/引号/换行字段正确转义', () => {
    const csv = csvService.toCsv(['col'], [['say "hi", ok\nnext']], { lang: 'zh-CN' });
    assert.ok(csv.includes('"say ""hi"", ok\nnext"'));
  });

  test('申请导出列名随 lang 双语', async () => {
    const all = requestRepository.findAll();
    const zh = csvService.buildRequestExportCsv(all, { lang: 'zh-CN' });
    const en = csvService.buildRequestExportCsv(all, { lang: 'en-US' });
    assert.ok(zh.split('\r\n')[0].includes('提交人'));
    assert.ok(en.split('\r\n')[0].includes('Submitter'));
    assert.ok(en.includes('Approved'));
  });
});

describe('导出接口', () => {
  test('员工导出仅本人数据且字段完整', async () => {
    const res = await get('/requests/export?lang=zh-CN', empToken);
    assert.strictEqual(res.status, 200);
    const buf = Buffer.from(await res.arrayBuffer());
    assert.strictEqual(buf[0], 0xEF);
    assert.strictEqual(buf[1], 0xBB);
    assert.strictEqual(buf[2], 0xBF);
    const text = buf.toString('utf-8');
    assert.ok(text.includes('张,三(emp1)'));
    assert.ok(text.includes('系统管理员(admin)'));
  });

  test('管理员导出全量', async () => {
    const res = await get('/admin/requests/export?lang=zh-CN', adminToken);
    assert.strictEqual(res.status, 200);
    const text = Buffer.from(await res.arrayBuffer()).toString('utf-8');
    assert.ok(text.includes('张,三(emp1)'));
  });

  test('未认证导出返回 401', async () => {
    const res = await get('/requests/export', null);
    assert.strictEqual(res.status, 401);
  });

  test('员工调用管理员导出返回 403', async () => {
    const res = await get('/admin/requests/export', empToken);
    assert.strictEqual(res.status, 403);
  });

  test('统计快照导出含六大区块', async () => {
    const res = await get('/admin/stats/export?lang=en-US', adminToken);
    assert.strictEqual(res.status, 200);
    const text = Buffer.from(await res.arrayBuffer()).toString('utf-8');
    assert.ok(text.includes('Core Metrics'));
    assert.ok(text.includes('Monthly Trend'));
    assert.ok(text.includes('Status Distribution'));
    assert.ok(text.includes('Transport Distribution'));
    assert.ok(text.includes('Department Ranking'));
    assert.ok(text.includes('Employee Ranking'));
  });
});

describe('导出上限', () => {
  test('超 5000 条返回 EXPORT_TOO_LARGE(400)', async () => {
    const now = new Date().toISOString();
    for (let i = 0; i < 5001; i++) {
      await requestRepository.create({
        submitterUsername: 'emp1', destination: `D${i}`, startDate: '2026-09-01', endDate: '2026-09-02',
        purpose: 'p', transport: '火车', estimatedCost: 1, status: '待审核', submittedAt: now, createdAt: now, updatedAt: now,
      });
    }
    const res = await get('/requests/export', empToken);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, 'EXPORT_TOO_LARGE');
  });
});