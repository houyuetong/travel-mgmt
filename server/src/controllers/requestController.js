const requestService = require('../services/requestService');
const { success } = require('../utils/response');

async function createRequest(req, res, next) {
  try {
    const request = await requestService.createRequest(req.user.username, req.body);
    res.json(success(request));
  } catch (err) {
    next(err);
  }
}

async function listMyRequests(req, res, next) {
  try {
    const { status, page, pageSize } = req.query;
    const result = requestService.listMyRequests(req.user.username, { status, page, pageSize });
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

async function getMyRequest(req, res, next) {
  try {
    const request = requestService.getMyRequest(req.user.username, req.params.id);
    res.json(success(request));
  } catch (err) {
    next(err);
  }
}

async function withdrawRequest(req, res, next) {
  try {
    const request = await requestService.withdrawRequest(req.user.username, req.params.id);
    res.json(success(request));
  } catch (err) {
    next(err);
  }
}

async function resubmitRequest(req, res, next) {
  try {
    const request = await requestService.resubmitRequest(req.user.username, req.params.id, req.body);
    res.json(success(request));
  } catch (err) {
    next(err);
  }
}

module.exports = { createRequest, listMyRequests, getMyRequest, withdrawRequest, resubmitRequest };