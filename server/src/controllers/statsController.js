const statsService = require('../services/statsService');
const { success } = require('../utils/response');

const ALLOWED_MONTHS = [3, 6, 12];

function normalizeMonths(value) {
  const num = Number(value);
  if (ALLOWED_MONTHS.includes(num)) return num;
  return 6;
}

function getDashboard(req, res, next) {
  try {
    const months = normalizeMonths(req.query.months);
    res.json(success(statsService.getAdminDashboard(months)));
  } catch (err) {
    next(err);
  }
}

function getMe(req, res, next) {
  try {
    const months = normalizeMonths(req.query.months);
    res.json(success(statsService.getEmployeeStats(req.user.username, months)));
  } catch (err) {
    next(err);
  }
}

function getPendingCount(req, res, next) {
  try {
    res.json(success({ count: statsService.getPendingCount() }));
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard, getMe, getPendingCount };