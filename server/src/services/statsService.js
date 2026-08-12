const requestRepository = require('../repositories/requestRepository');
const userRepository = require('../repositories/userRepository');
const requestStatus = require('../constants/requestStatus');
const transports = require('../constants/transports');

function getTotalCost(request) {
  if (request.expenseItems && request.expenseItems.length > 0) {
    const sum = request.expenseItems.reduce((acc, item) => acc + Number(item.amount || 0), 0);
    return Math.round(sum * 100) / 100;
  }
  return request.estimatedCost;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function monthKey(iso) {
  return iso ? iso.slice(0, 7) : '';
}

function buildMonthList(months) {
  const now = new Date();
  const list = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return list;
}

function aggregateStats(requests, usersById, months) {
  const monthSet = new Set(buildMonthList(months));
  const scoped = requests.filter(r => monthSet.has(monthKey(r.submittedAt)));
  const total = scoped.length;

  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let withdrawn = 0;
  for (const r of scoped) {
    if (r.status === requestStatus.PENDING) pending++;
    else if (r.status === requestStatus.APPROVED) approved++;
    else if (r.status === requestStatus.REJECTED) rejected++;
    else if (r.status === requestStatus.WITHDRAWN) withdrawn++;
  }

  let approvalRate = '0%';
  const decided = approved + rejected;
  if (decided > 0) {
    approvalRate = `${(Math.round((approved / decided) * 1000) / 10).toFixed(1)}%`;
  }

  let totalCost = 0;
  let approvedCost = 0;
  let pendingCost = 0;
  for (const r of scoped) {
    const c = getTotalCost(r) || 0;
    totalCost = round2(totalCost + c);
    if (r.status === requestStatus.APPROVED) approvedCost = round2(approvedCost + c);
    else if (r.status === requestStatus.PENDING) pendingCost = round2(pendingCost + c);
  }

  const trendMap = new Map();
  const requestCounts = [];
  const costs = [];
  for (const r of scoped) {
    const key = monthKey(r.submittedAt);
    if (!key) continue;
    if (!trendMap.has(key)) trendMap.set(key, { count: 0, cost: 0 });
    const entry = trendMap.get(key);
    entry.count += 1;
    entry.cost = round2(entry.cost + (getTotalCost(r) || 0));
  }
  for (const m of monthSet) {
    const entry = trendMap.get(m);
    requestCounts.push(entry ? entry.count : 0);
    costs.push(entry ? entry.cost : 0);
  }
  const trend = { months: [...monthSet], requestCounts, costs };

  const statusCounts = {};
  for (const r of scoped) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  }
  const statusDistribution = Object.keys(statusCounts).map(status => ({
    status,
    count: statusCounts[status],
    percent: total > 0 ? `${(Math.round((statusCounts[status] / total) * 1000) / 10).toFixed(1)}%` : '0%',
  }));

  const transportCounts = {};
  for (const r of scoped) {
    transportCounts[r.transport] = (transportCounts[r.transport] || 0) + 1;
  }
  const transportDistribution = transports.map(t => ({ transport: t, count: transportCounts[t] || 0 }));

  const deptMap = new Map();
  for (const r of scoped) {
    const user = usersById.get(r.submitterUsername);
    const dept = user && user.department ? user.department : '未分配';
    if (!deptMap.has(dept)) deptMap.set(dept, { department: dept, requestCount: 0, cost: 0 });
    const entry = deptMap.get(dept);
    entry.requestCount += 1;
    entry.cost = round2(entry.cost + (getTotalCost(r) || 0));
  }
  const departmentRanking = [...deptMap.values()]
    .sort((a, b) => b.requestCount - a.requestCount || b.cost - a.cost)
    .slice(0, 10);

  const empMap = new Map();
  for (const r of scoped) {
    if (!empMap.has(r.submitterUsername)) {
      const user = usersById.get(r.submitterUsername);
      empMap.set(r.submitterUsername, {
        username: r.submitterUsername,
        name: user ? user.name : r.submitterUsername,
        requestCount: 0,
        cost: 0,
      });
    }
    const entry = empMap.get(r.submitterUsername);
    entry.requestCount += 1;
    entry.cost = round2(entry.cost + (getTotalCost(r) || 0));
  }
  const employeeRanking = [...empMap.values()]
    .sort((a, b) => b.requestCount - a.requestCount || b.cost - a.cost)
    .slice(0, 10);

  return {
    core: { total, pending, approved, rejected, withdrawn, approvalRate },
    cost: { totalCost, approvedCost, pendingCost },
    trend,
    statusDistribution,
    transportDistribution,
    departmentRanking,
    employeeRanking,
  };
}

/**
 * 管理员驾驶舱全量统计。
 * @param {number} [months=6] - 趋势时间范围（3/6/12）
 */
function getAdminDashboard(months = 6) {
  const requests = requestRepository.findAll();
  const users = userRepository.findAll();
  const usersById = new Map(users.map(u => [u.username, u]));
  return aggregateStats(requests, usersById, months);
}

/**
 * 员工个人统计（数据范围仅本人申请）。
 * @param {string} username
 * @param {number} [months=6]
 */
function getEmployeeStats(username, months = 6) {
  const requests = requestRepository.findAll().filter(r => r.submitterUsername === username);
  const users = userRepository.findAll();
  const usersById = new Map(users.map(u => [u.username, u]));
  const full = aggregateStats(requests, usersById, months);
  const { departmentRanking, employeeRanking, transportDistribution, ...rest } = full;
  return rest;
}

/** 管理员待办申请数。@returns {number} */
function getPendingCount() {
  return requestRepository.findAll().filter(r => r.status === requestStatus.PENDING).length;
}

module.exports = { getAdminDashboard, getEmployeeStats, getPendingCount, getTotalCost };