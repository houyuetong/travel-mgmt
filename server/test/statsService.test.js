const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-stats-test-'));
process.env.DATA_DIR = tmpDir;
process.env.JWT_SECRET = 'this-is-a-strong-random-secret-at-least-32-chars-long';

const store = require('../src/store/JsonStoreEngine');
const userRepository = require('../src/repositories/userRepository');
const requestRepository = require('../src/repositories/requestRepository');
const statsService = require('../src/services/statsService');

const now = new Date().toISOString();
const currentMonth = now.slice(0, 7);

function mkRequest(submitter, status, cost, { month = currentMonth, transport = '火车', expenseItems } = {}) {
  return {
    submitterUsername: submitter,
    destination: '北京',
    startDate: '2026-09-01',
    endDate: '2026-09-02',
    purpose: '出差',
    transport,
    estimatedCost: cost,
    status,
    submittedAt: `${month}-10T09:00:00.000Z`,
    createdAt: now,
    updatedAt: now,
    ...(expenseItems ? { expenseItems } : {}),
  };
}

before(async () => {
  store.init();
  const t = now;
  await userRepository.create({ username: 'admin', name: '系统管理员', role: '管理员', status: '启用', createdAt: t, updatedAt: t });
  await userRepository.create({ username: 'emp1', name: '张三', role: '普通员工', status: '启用', department: '研发部', createdAt: t, updatedAt: t });
  await userRepository.create({ username: 'emp2', name: '李四', role: '普通员工', status: '启用', createdAt: t, updatedAt: t });
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('getAdminDashboard', () => {
  test('空数据：通过率 0%、费用为 0、分布为空', () => {
    const dash = statsService.getAdminDashboard(6);
    assert.strictEqual(dash.core.total, 0);
    assert.strictEqual(dash.core.approvalRate, '0%');
    assert.strictEqual(dash.cost.totalCost, 0);
    assert.strictEqual(dash.statusDistribution.length, 0);
    assert.strictEqual(dash.trend.months.length, 6);
    assert.strictEqual(dash.trend.requestCounts.reduce((a, b) => a + b, 0), 0);
  });

  test('通过率公式：已通过/(已通过+已拒绝)，保留 1 位小数', async () => {
    await requestRepository.create(mkRequest('emp1', '已通过', 100));
    await requestRepository.create(mkRequest('emp1', '已通过', 200));
    await requestRepository.create(mkRequest('emp1', '已拒绝', 50));
    const dash = statsService.getAdminDashboard(6);
    assert.strictEqual(dash.core.approved, 2);
    assert.strictEqual(dash.core.rejected, 1);
    assert.strictEqual(dash.core.approvalRate, '66.7%');
  });

  test('费用口径：含明细按合计、无明细按 estimatedCost', async () => {
    await requestRepository.create(mkRequest('emp2', '待审核', 300, { expenseItems: [{ category: '交通', amount: 80.5 }, { category: '住宿', amount: 20.5 }] }));
    const dash = statsService.getAdminDashboard(6);
    assert.strictEqual(dash.cost.pendingCost, 101);

  });

  test('状态分布数量之和等于总申请数', () => {
    const dash = statsService.getAdminDashboard(6);
    const sum = dash.statusDistribution.reduce((a, s) => a + s.count, 0);
    assert.strictEqual(sum, dash.core.total);
  });

  test('部门排行：空部门归入"未分配"，降序 Top 10', () => {
    const dash = statsService.getAdminDashboard(6);
    const deptNames = dash.departmentRanking.map(d => d.department);
    assert.ok(deptNames.includes('研发部'));
    assert.ok(deptNames.includes('未分配'));
    for (let i = 1; i < dash.departmentRanking.length; i++) {
      assert.ok(dash.departmentRanking[i - 1].requestCount >= dash.departmentRanking[i].requestCount);
    }
    assert.ok(dash.departmentRanking.length <= 10);
  });

  test('员工排行：关联用户姓名，降序 Top 10', () => {
    const dash = statsService.getAdminDashboard(6);
    const empEntry = dash.employeeRanking.find(e => e.username === 'emp1');
    assert.ok(empEntry);
    assert.strictEqual(empEntry.name, '张三');
    for (let i = 1; i < dash.employeeRanking.length; i++) {
      assert.ok(dash.employeeRanking[i - 1].requestCount >= dash.employeeRanking[i].requestCount);
    }
  });

  test('趋势：按自然月聚合、months 3/12 生效', () => {
    const dash6 = statsService.getAdminDashboard(6);
    const dash3 = statsService.getAdminDashboard(3);
    const dash12 = statsService.getAdminDashboard(12);
    assert.strictEqual(dash6.trend.months.length, 6);
    assert.strictEqual(dash3.trend.months.length, 3);
    assert.strictEqual(dash12.trend.months.length, 12);
    const idx = dash6.trend.months.indexOf(currentMonth);
    assert.ok(idx >= 0);
    assert.ok(dash6.trend.requestCounts[idx] >= 4);
  });

  test('时间范围过滤所有统计维度：早于窗口的申请不计入 core/cost/分布/排行', () => {
    const now = new Date();
    const d4 = new Date(now.getFullYear(), now.getMonth() - 4, 1);
    const past = `${d4.getFullYear()}-${String(d4.getMonth() + 1).padStart(2, '0')}`;
    const inMonth3 = statsService.getAdminDashboard(3).trend.months.includes(past);
    const inMonth12 = statsService.getAdminDashboard(12).trend.months.includes(past);
    assert.strictEqual(inMonth3, false, '近3月窗口不应包含4个月前');
    assert.strictEqual(inMonth12, true, '近12月窗口应包含4个月前');

    requestRepository.create(mkRequest('emp3', '已通过', 99999, { month: past }));
    const dash3 = statsService.getAdminDashboard(3);
    const dash12 = statsService.getAdminDashboard(12);
    assert.strictEqual(dash3.core.total, dash12.core.total - 1);
    assert.ok(dash3.cost.totalCost < dash12.cost.totalCost);
    assert.strictEqual(dash12.cost.totalCost > 99999, true);
  });
});

describe('getEmployeeStats', () => {
  test('仅包含本人数据', () => {
    const me = statsService.getEmployeeStats('emp1', 6);
    const myRequests = requestRepository.findAll().filter(r => r.submitterUsername === 'emp1');
    assert.strictEqual(me.core.total, myRequests.length);
    assert.strictEqual(me.core.approved, 2);
    assert.ok(!('departmentRanking' in me));
    assert.ok(!('employeeRanking' in me));
  });

  test('员工统计不等于全量', () => {
    const me = statsService.getEmployeeStats('emp1', 6);
    const dash = statsService.getAdminDashboard(6);
    assert.notStrictEqual(me.core.total, dash.core.total);
  });
});

describe('getPendingCount', () => {
  test('等于待审核申请总数', () => {
    const count = requestRepository.findAll().filter(r => r.status === '待审核').length;
    assert.strictEqual(statsService.getPendingCount(), count);
  });
});