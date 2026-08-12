const requestRepository = require('../repositories/requestRepository');
const userRepository = require('../repositories/userRepository');
const auditService = require('./auditService');
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

function enrichRequest(request) {
  const submitter = userRepository.findByUsername(request.submitterUsername);
  const reviewer = request.reviewerUsername ? userRepository.findByUsername(request.reviewerUsername) : null;
  return {
    ...request,
    submitterName: submitter ? submitter.name : request.submitterUsername,
    totalCost: getTotalCost(request),
    reviewerName: request.reviewerUsername
      ? (reviewer ? reviewer.name : request.reviewerUsername)
      : undefined,
  };
}

function listAllRequests({ status, page = 1, pageSize = 100 } = {}) {
  let list = requestRepository.findAll();
  if (status && status !== '全部') {
    list = list.filter(r => r.status === status);
  }
  list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const total = list.length;
  const startIdx = (page - 1) * pageSize;
  const paged = list.slice(startIdx, startIdx + pageSize).map(enrichRequest);
  return { list: paged, total, page: parseInt(page), pageSize: parseInt(pageSize) };
}

function getRequestDetail(id) {
  const request = requestRepository.findById(id);
  if (!request) {
    throw new BusinessError(errorCodes.REQUEST_NOT_FOUND, '申请不存在', 404);
  }
  return enrichRequest(request);
}

async function approveRequest(reviewer, id, comment) {
  const request = requestRepository.findById(id);
  if (!request) {
    throw new BusinessError(errorCodes.REQUEST_NOT_FOUND, '申请不存在', 404);
  }
  if (request.status !== requestStatus.PENDING) {
    throw new BusinessError(errorCodes.STATE_CONFLICT, '只能审核待审核状态的申请', 409);
  }
  if (comment && comment.length > 500) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '审核意见长度不能超过500字符', 400);
  }

  const updated = await requestRepository.update(id, {
    status: requestStatus.APPROVED,
    reviewerUsername: reviewer.username,
    reviewedAt: new Date().toISOString(),
    reviewComment: comment || '',
  });

  await auditService.record({
    operatorUsername: reviewer.username,
    operatorRole: reviewer.role,
    action: 'APPROVE_REQUEST',
    targetType: 'REQUEST',
    targetId: id,
    detail: { comment: comment || '' },
  });

  return updated;
}

async function rejectRequest(reviewer, id, comment) {
  const request = requestRepository.findById(id);
  if (!request) {
    throw new BusinessError(errorCodes.REQUEST_NOT_FOUND, '申请不存在', 404);
  }
  if (request.status !== requestStatus.PENDING) {
    throw new BusinessError(errorCodes.STATE_CONFLICT, '只能审核待审核状态的申请', 409);
  }
  if (!comment || comment.trim().length === 0) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '拒绝申请必须填写审核意见', 400);
  }
  if (comment.length > 500) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '审核意见长度不能超过500字符', 400);
  }

  const updated = await requestRepository.update(id, {
    status: requestStatus.REJECTED,
    reviewerUsername: reviewer.username,
    reviewedAt: new Date().toISOString(),
    reviewComment: comment,
  });

  await auditService.record({
    operatorUsername: reviewer.username,
    operatorRole: reviewer.role,
    action: 'REJECT_REQUEST',
    targetType: 'REQUEST',
    targetId: id,
    detail: { comment },
  });

  return updated;
}

module.exports = { listAllRequests, getRequestDetail, approveRequest, rejectRequest };