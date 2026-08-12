const BusinessError = require('../errors/BusinessError');
const errorCodes = require('../constants/errorCodes');
const transports = require('../constants/transports');
const expenseCategories = require('../constants/expenseCategories');

function validateRequestFields(payload) {
  const { destination, startDate, endDate, purpose, transport, estimatedCost } = payload;

  if (!destination || destination.length < 1 || destination.length > 100) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '目的地长度需在1-100字符之间');
  }
  if (!purpose || purpose.length < 1 || purpose.length > 500) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '出差事由长度需在1-500字符之间');
  }
  if (!transport || !transports.includes(transport)) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '交通工具取值非法');
  }
  if (estimatedCost === undefined || estimatedCost === null || isNaN(estimatedCost) || estimatedCost < 0) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '预计费用必须为非负数');
  }
  const cost = parseFloat(estimatedCost);
  if (Math.round(cost * 100) !== cost * 100) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '预计费用最多两位小数');
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime())) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '出发日期格式非法');
  }
  if (isNaN(end.getTime())) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '返回日期格式非法');
  }
  if (end < start) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '返回日期不能早于出发日期');
  }
}

function validateExpenseItems(payload) {
  const items = payload && payload.expenseItems;
  if (items === undefined || items === null || !Array.isArray(items) || items.length === 0) {
    return;
  }
  if (items.length > 20) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '费用明细数量不能超过20条');
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || typeof item !== 'object') {
      throw new BusinessError(errorCodes.VALIDATION_ERROR, `第${i + 1}条费用明细格式非法`);
    }
    if (!expenseCategories.includes(item.category)) {
      throw new BusinessError(errorCodes.VALIDATION_ERROR, `第${i + 1}条费用明细的类别取值非法`);
    }
    const amount = Number(item.amount);
    if (item.amount === undefined || item.amount === null || isNaN(amount) || amount <= 0) {
      throw new BusinessError(errorCodes.VALIDATION_ERROR, `第${i + 1}条费用明细的金额必须大于0`);
    }
    if (Math.round(amount * 100) !== amount * 100) {
      throw new BusinessError(errorCodes.VALIDATION_ERROR, `第${i + 1}条费用明细的金额最多两位小数`);
    }
    if (item.description !== undefined && item.description !== null && item.description.length > 200) {
      throw new BusinessError(errorCodes.VALIDATION_ERROR, `第${i + 1}条费用明细的说明长度不能超过200字符`);
    }
  }
}

module.exports = { validateRequestFields, validateExpenseItems };