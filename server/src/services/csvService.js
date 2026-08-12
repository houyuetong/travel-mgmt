const requestStatus = require('../constants/requestStatus');
const transports = require('../constants/transports');
const expenseCategories = require('../constants/expenseCategories');

const STATUS_LABELS = {
  [requestStatus.PENDING]: { zh: '待审核', en: 'Pending' },
  [requestStatus.APPROVED]: { zh: '已通过', en: 'Approved' },
  [requestStatus.REJECTED]: { zh: '已拒绝', en: 'Rejected' },
  [requestStatus.WITHDRAWN]: { zh: '已撤回', en: 'Withdrawn' },
};

const TRANSPORT_LABELS = {};
for (const t of transports) {
  const en = {
    '火车': 'Train',
    '飞机': 'Flight',
    '汽车': 'Car/Bus',
    '高铁': 'High-speed Rail',
    '轮船': 'Ship',
    '其他': 'Other',
  }[t] || t;
  TRANSPORT_LABELS[t] = { zh: t, en };
}

const CATEGORY_LABELS = {};
for (const c of expenseCategories) {
  const en = {
    '交通': 'Transportation',
    '住宿': 'Accommodation',
    '餐饮': 'Meals',
    '其他': 'Other',
  }[c] || c;
  CATEGORY_LABELS[c] = { zh: c, en };
}

const REQUEST_COLUMN_LABELS = {
  zh: ['提交人', '目的地', '出发日期', '返回日期', '事由', '交通工具', '总费用', '状态', '提交时间', '审核人', '审核时间', '审核意见'],
  en: ['Submitter', 'Destination', 'Start Date', 'End Date', 'Purpose', 'Transport', 'Total Cost', 'Status', 'Submitted At', 'Reviewer', 'Reviewed At', 'Review Comment'],
};

const STATS_SECTION_LABELS = {
  core: { zh: '核心指标', en: 'Core Metrics' },
  trend: { zh: '月度趋势', en: 'Monthly Trend' },
  statusDistribution: { zh: '状态分布', en: 'Status Distribution' },
  transportDistribution: { zh: '交通工具分布', en: 'Transport Distribution' },
  departmentRanking: { zh: '部门排行', en: 'Department Ranking' },
  employeeRanking: { zh: '员工排行', en: 'Employee Ranking' },
};

const STATS_COLUMN_LABELS = {
  core: { zh: ['指标', '数值'], en: ['Metric', 'Value'] },
  trend: { zh: ['月份', '申请数量', '费用'], en: ['Month', 'Request Count', 'Cost'] },
  statusDistribution: { zh: ['状态', '数量', '占比'], en: ['Status', 'Count', 'Percent'] },
  transportDistribution: { zh: ['交通工具', '数量'], en: ['Transport', 'Count'] },
  departmentRanking: { zh: ['部门', '申请数', '费用'], en: ['Department', 'Request Count', 'Cost'] },
  employeeRanking: { zh: ['员工', '申请数', '费用'], en: ['Employee', 'Request Count', 'Cost'] },
};

function pickLabel(map, key, lang) {
  const entry = map[key];
  if (!entry) return key;
  return lang === 'en-US' ? entry.en : entry.zh;
}

function escapeField(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r\t]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return '';
  return n.toFixed(2);
}

function toCsv(headers, rows, { lang = 'zh-CN' } = {}) {
  const headerRow = headers.map(escapeField).join(',');
  const bodyRows = rows.map(row => row.map(escapeField).join(','));
  return `\uFEFF${[headerRow, ...bodyRows].join('\r\n')}\r\n`;
}

function buildRequestExportCsv(requests, { lang = 'zh-CN' } = {}) {
  const labels = lang === 'en-US' ? REQUEST_COLUMN_LABELS.en : REQUEST_COLUMN_LABELS.zh;
  const rows = requests.map(r => [
    r.submitterName ? `${r.submitterName}(${r.submitterUsername})` : r.submitterUsername,
    r.destination,
    r.startDate,
    r.endDate,
    r.purpose,
    pickLabel(TRANSPORT_LABELS, r.transport, lang),
    formatMoney(r.totalCost !== undefined ? r.totalCost : r.estimatedCost),
    pickLabel(STATUS_LABELS, r.status, lang),
    r.submittedAt,
    r.reviewerUsername ? (r.reviewerName ? `${r.reviewerName}(${r.reviewerUsername})` : r.reviewerUsername) : '',
    r.reviewedAt || '',
    r.reviewComment || '',
  ]);
  return toCsv(labels, rows, { lang });
}

function buildStatsSnapshotCsv(stats, { lang = 'zh-CN' } = {}) {
  const sections = [];

  sections.push({ title: STATS_SECTION_LABELS.core, rows: statsCoreRows(stats, lang) });
  sections.push({ title: STATS_SECTION_LABELS.trend, rows: statsTrendRows(stats, lang) });
  sections.push({ title: STATS_SECTION_LABELS.statusDistribution, rows: statsStatusRows(stats, lang) });
  sections.push({ title: STATS_SECTION_LABELS.transportDistribution, rows: statsTransportRows(stats, lang) });
  sections.push({ title: STATS_SECTION_LABELS.departmentRanking, rows: statsDeptRows(stats, lang) });
  sections.push({ title: STATS_SECTION_LABELS.employeeRanking, rows: statsEmployeeRows(stats, lang) });

  const parts = [];
  for (const section of sections) {
    const title = lang === 'en-US' ? section.title.en : section.title.zh;
    parts.push(`\uFEFF${escapeField(title)}`);
    parts.push(toCsv(section.rows.headers, section.rows.data, { lang }).replace(/^\uFEFF/, ''));
  }
  return parts.join('\r\n');
}

function statsCoreRows(stats, lang) {
  const c = stats.core;
  const cost = stats.cost || {};
  const headers = lang === 'en-US' ? ['Metric', 'Value'] : ['指标', '数值'];
  const rows = [
    ['total', c.total],
    ['pending', c.pending],
    ['approved', c.approved],
    ['rejected', c.rejected],
    ['withdrawn', c.withdrawn],
    ['approvalRate', c.approvalRate],
    ['totalCost', cost.totalCost],
    ['approvedCost', cost.approvedCost],
    ['pendingCost', cost.pendingCost],
  ];
  return { headers, data: rows.map(r => [r[0], String(r[1])]) };
}

function statsTrendRows(stats, lang) {
  const headers = lang === 'en-US' ? ['Month', 'Request Count', 'Cost'] : ['月份', '申请数量', '费用'];
  const data = stats.trend.months.map((m, i) => [m, String(stats.trend.requestCounts[i]), formatMoney(stats.trend.costs[i])]);
  return { headers, data };
}

function statsStatusRows(stats, lang) {
  const headers = lang === 'en-US' ? ['Status', 'Count', 'Percent'] : ['状态', '数量', '占比'];
  const data = stats.statusDistribution.map(s => [pickLabel(STATUS_LABELS, s.status, lang), String(s.count), s.percent]);
  return { headers, data };
}

function statsTransportRows(stats, lang) {
  const headers = lang === 'en-US' ? ['Transport', 'Count'] : ['交通工具', '数量'];
  const data = stats.transportDistribution.map(t => [pickLabel(TRANSPORT_LABELS, t.transport, lang), String(t.count)]);
  return { headers, data };
}

function statsDeptRows(stats, lang) {
  const headers = lang === 'en-US' ? ['Department', 'Request Count', 'Cost'] : ['部门', '申请数', '费用'];
  const data = stats.departmentRanking.map(d => [d.department, String(d.requestCount), formatMoney(d.cost)]);
  return { headers, data };
}

function statsEmployeeRows(stats, lang) {
  const headers = lang === 'en-US' ? ['Employee', 'Request Count', 'Cost'] : ['员工', '申请数', '费用'];
  const data = stats.employeeRanking.map(e => [e.name ? `${e.name}(${e.username})` : e.username, String(e.requestCount), formatMoney(e.cost)]);
  return { headers, data };
}

module.exports = { toCsv, buildRequestExportCsv, buildStatsSnapshotCsv, escapeField };