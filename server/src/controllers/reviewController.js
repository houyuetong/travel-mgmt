const reviewService = require('../services/reviewService');
const { success } = require('../utils/response');

async function listAllRequests(req, res, next) {
  try {
    const { status, page, pageSize } = req.query;
    const result = reviewService.listAllRequests({ status, page, pageSize });
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

async function getRequestDetail(req, res, next) {
  try {
    const request = reviewService.getRequestDetail(req.params.id);
    res.json(success(request));
  } catch (err) {
    next(err);
  }
}

async function approveRequest(req, res, next) {
  try {
    const { comment } = req.body;
    const request = await reviewService.approveRequest(req.user, req.params.id, comment);
    res.json(success(request));
  } catch (err) {
    next(err);
  }
}

async function rejectRequest(req, res, next) {
  try {
    const { comment } = req.body;
    const request = await reviewService.rejectRequest(req.user, req.params.id, comment);
    res.json(success(request));
  } catch (err) {
    next(err);
  }
}

module.exports = { listAllRequests, getRequestDetail, approveRequest, rejectRequest };