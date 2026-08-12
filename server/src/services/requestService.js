const requestRepository = require('../repositories/requestRepository');
const userRepository = require('../repositories/userRepository');
const { validateRequestFields, validateExpenseItems } = require('../utils/validator');
const requestStatus = require('../constants/requestStatus');
const BusinessError = require('../errors/BusinessError');
const errorCodes = require('../constants/errorCodes');

function getTotalCost(request) {
  if (request.expenseItems && request.expenseItems.length > 0) {
    const sum = request.expenseItems.reduce((acc, item) => acc + Number(item.amount || 0), 0);
    return Math.round(sum * 100) / 100;
  }
  return request.estimatedCost;
}

function attachDerivedFields(request) {
  const reviewer = request.reviewerUsername ? userRepository.findByUsername(request.reviewerUsername) : null;
  return {
    ...request,
    totalCost: getTotalCost(request),
    reviewerName: request.reviewerUsername
      ? (reviewer ? reviewer.name : request.reviewerUsername)
      : undefined,
  };
}

async function createRequest(username, payload) {
  validateRequestFields(payload);
  validateExpenseItems(payload);
  const now = new Date().toISOString();
  const requestObj = {
    submitterUsername: username,
    destination: payload.destination,
    startDate: payload.startDate,
    endDate: payload.endDate,
    purpose: payload.purpose,
    transport: payload.transport,
    estimatedCost: parseFloat(payload.estimatedCost),
    status: requestStatus.PENDING,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  if (payload.expenseItems && payload.expenseItems.length > 0) {
    requestObj.expenseItems = payload.expenseItems.map(item => ({
      category: item.category,
      amount: parseFloat(item.amount),
      ...(item.description !== undefined && item.description !== null && item.description !== '' ? { description: item.description } : {}),
    }));
  }
  const request = await requestRepository.create(requestObj);
  return request;
}

function listMyRequests(username, { status, page = 1, pageSize = 100 } = {}) {
  let list = requestRepository.findAll().filter(r => r.submitterUsername === username);
  if (status && status !== '全部') {
    list = list.filter(r => r.status === status);
  }
  list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const total = list.length;
  const startIdx = (page - 1) * pageSize;
  const paged = list.slice(startIdx, startIdx + pageSize).map(attachDerivedFields);
  return { list: paged, total, page: parseInt(page), pageSize: parseInt(pageSize) };
}

function getMyRequest(username, id) {
  const request = requestRepository.findById(id);
  if (!request) {
    throw new BusinessError(errorCodes.REQUEST_NOT_FOUND, '申请不存在', 404);
  }
  if (request.submitterUsername !== username) {
    throw new BusinessError(errorCodes.FORBIDDEN, '无权查看他人申请', 403);
  }
  return attachDerivedFields(request);
}

async function withdrawRequest(username, id) {
  const request = getMyRequest(username, id);
  if (request.status !== requestStatus.PENDING) {
    throw new BusinessError(errorCodes.STATE_CONFLICT, '只能撤回待审核状态的申请', 409);
  }
  const updated = await requestRepository.update(id, { status: requestStatus.WITHDRAWN });
  return updated;
}

async function resubmitRequest(username, id, payload) {
  const request = getMyRequest(username, id);
  if (request.status !== requestStatus.REJECTED) {
    throw new BusinessError(errorCodes.STATE_CONFLICT, '只能重新提交已拒绝的申请', 409);
  }
  validateRequestFields(payload);
  validateExpenseItems(payload);
  const now = new Date().toISOString();
  const newRequestObj = {
    submitterUsername: username,
    destination: payload.destination,
    startDate: payload.startDate,
    endDate: payload.endDate,
    purpose: payload.purpose,
    transport: payload.transport,
    estimatedCost: parseFloat(payload.estimatedCost),
    status: requestStatus.PENDING,
    submittedAt: now,
    resubmittedFrom: id,
    createdAt: now,
    updatedAt: now,
  };
  if (payload.expenseItems && payload.expenseItems.length > 0) {
    newRequestObj.expenseItems = payload.expenseItems.map(item => ({
      category: item.category,
      amount: parseFloat(item.amount),
      ...(item.description !== undefined && item.description !== null && item.description !== '' ? { description: item.description } : {}),
    }));
  }
  const newRequest = await requestRepository.create(newRequestObj);
  return newRequest;
}

module.exports = { createRequest, listMyRequests, getMyRequest, withdrawRequest, resubmitRequest, getTotalCost, attachDerivedFields };