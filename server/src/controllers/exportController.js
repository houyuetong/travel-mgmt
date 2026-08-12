const requestService = require('../services/requestService');
const reviewService = require('../services/reviewService');
const statsService = require('../services/statsService');
const csvService = require('../services/csvService');
const userRepository = require('../repositories/userRepository');
const BusinessError = require('../errors/BusinessError');
const errorCodes = require('../constants/errorCodes');

const MAX_EXPORT = 5000;
const ALLOWED_LANGS = ['zh-CN', 'en-US'];

function normalizeLang(value) {
  return ALLOWED_LANGS.includes(value) ? value : 'zh-CN';
}

function assertWithinLimit(count) {
  if (count > MAX_EXPORT) {
    throw new BusinessError(errorCodes.EXPORT_TOO_LARGE, '数据量过大，请缩小筛选范围后重试', 400);
  }
}

function exportFilename(prefix, ext = 'csv') {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}-${ts}.${ext}`;
}

function getSubmitterName(request) {
  const user = userRepository.findByUsername(request.submitterUsername);
  return user ? user.name : request.submitterUsername;
}

function attachExportFields(requests) {
  return requests.map(r => {
    const submitter = userRepository.findByUsername(r.submitterUsername);
    const reviewer = r.reviewerUsername ? userRepository.findByUsername(r.reviewerUsername) : null;
    return {
      ...r,
      submitterName: submitter ? submitter.name : r.submitterUsername,
      reviewerName: r.reviewerUsername ? (reviewer ? reviewer.name : r.reviewerUsername) : undefined,
      totalCost: r.expenseItems && r.expenseItems.length > 0
        ? Math.round(r.expenseItems.reduce((acc, item) => acc + Number(item.amount || 0), 0) * 100) / 100
        : r.estimatedCost,
    };
  });
}

function exportMyRequests(req, res, next) {
  try {
    const lang = normalizeLang(req.query.lang);
    const result = requestService.listMyRequests(req.user.username, {
      status: req.query.status,
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
    });
    assertWithinLimit(result.total);
    const enriched = attachExportFields(result.list);
    const csv = csvService.buildRequestExportCsv(enriched, { lang });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exportFilename('travel-requests')}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

function exportAdminRequests(req, res, next) {
  try {
    const lang = normalizeLang(req.query.lang);
    const result = reviewService.listAllRequests({
      status: req.query.status,
      page: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
    });
    assertWithinLimit(result.total);
    const enriched = attachExportFields(result.list);
    const csv = csvService.buildRequestExportCsv(enriched, { lang });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exportFilename('travel-requests')}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

function exportAdminStats(req, res, next) {
  try {
    const lang = normalizeLang(req.query.lang);
    const stats = statsService.getAdminDashboard(6);
    const csv = csvService.buildStatsSnapshotCsv(stats, { lang });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${exportFilename('travel-stats')}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { exportMyRequests, exportAdminRequests, exportAdminStats, getSubmitterName };