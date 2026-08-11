const userRepository = require('../repositories/userRepository');
const auditService = require('./auditService');
const bcryptUtil = require('../utils/bcrypt');
const roles = require('../constants/roles');
const userStatus = require('../constants/userStatus');
const BusinessError = require('../errors/BusinessError');
const errorCodes = require('../constants/errorCodes');

function sanitize(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

function listUsers() {
  return userRepository.findAll().map(sanitize);
}

async function createUser(operator, { username, name, password }) {
  if (!username || !/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '用户名需为3-20位字母、数字或下划线', 400);
  }
  if (!name || name.length < 1 || name.length > 50) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '姓名长度需在1-50字符之间', 400);
  }
  if (!password || password.length < 6) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '密码长度至少6位', 400);
  }

  const existing = userRepository.findByUsername(username);
  if (existing) {
    throw new BusinessError(errorCodes.USER_NAME_CONFLICT, '用户名已存在', 409);
  }

  const passwordHash = await bcryptUtil.hash(password);
  const now = new Date().toISOString();
  const user = await userRepository.create({
    username,
    name,
    passwordHash,
    role: roles.EMPLOYEE,
    status: userStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
  });

  await auditService.record({
    operatorUsername: operator.username,
    operatorRole: operator.role,
    action: 'CREATE_USER',
    targetType: 'USER',
    targetId: user.id,
    detail: { username, name },
  });

  return sanitize(user);
}

async function updateUser(operator, id, { username, name, status }) {
  const user = userRepository.findById(id);
  if (!user) {
    throw new BusinessError(errorCodes.USER_NOT_FOUND, '用户不存在', 404);
  }
  if (user.role !== roles.EMPLOYEE) {
    throw new BusinessError(errorCodes.FORBIDDEN, '只能编辑普通员工', 403);
  }

  const updates = {};
  if (username !== undefined) {
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
      throw new BusinessError(errorCodes.VALIDATION_ERROR, '用户名需为3-20位字母、数字或下划线', 400);
    }
    const existing = userRepository.findByUsername(username);
    if (existing && existing.id !== id) {
      throw new BusinessError(errorCodes.USER_NAME_CONFLICT, '用户名已存在', 409);
    }
    updates.username = username;
  }
  if (name !== undefined) {
    if (name.length < 1 || name.length > 50) {
      throw new BusinessError(errorCodes.VALIDATION_ERROR, '姓名长度需在1-50字符之间', 400);
    }
    updates.name = name;
  }
  if (status !== undefined) {
    if (status !== userStatus.ACTIVE && status !== userStatus.DISABLED) {
      throw new BusinessError(errorCodes.VALIDATION_ERROR, '账号状态取值非法', 400);
    }
    updates.status = status;
  }

  const updated = await userRepository.update(id, updates);

  await auditService.record({
    operatorUsername: operator.username,
    operatorRole: operator.role,
    action: 'UPDATE_USER',
    targetType: 'USER',
    targetId: id,
    detail: updates,
  });

  return sanitize(updated);
}

async function updateUserStatus(operator, id, status) {
  const user = userRepository.findById(id);
  if (!user) {
    throw new BusinessError(errorCodes.USER_NOT_FOUND, '用户不存在', 404);
  }
  if (user.role !== roles.EMPLOYEE) {
    throw new BusinessError(errorCodes.FORBIDDEN, '只能操作普通员工', 403);
  }
  if (status !== userStatus.ACTIVE && status !== userStatus.DISABLED) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '账号状态取值非法', 400);
  }

  const updated = await userRepository.update(id, { status });

  await auditService.record({
    operatorUsername: operator.username,
    operatorRole: operator.role,
    action: 'UPDATE_USER_STATUS',
    targetType: 'USER',
    targetId: id,
    detail: { status },
  });

  return sanitize(updated);
}

async function resetPassword(operator, id, newPassword) {
  const user = userRepository.findById(id);
  if (!user) {
    throw new BusinessError(errorCodes.USER_NOT_FOUND, '用户不存在', 404);
  }
  if (user.role !== roles.EMPLOYEE) {
    throw new BusinessError(errorCodes.FORBIDDEN, '只能操作普通员工', 403);
  }
  if (!newPassword || newPassword.length < 6) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '密码长度至少6位', 400);
  }

  const passwordHash = await bcryptUtil.hash(newPassword);
  await userRepository.update(id, { passwordHash });

  await auditService.record({
    operatorUsername: operator.username,
    operatorRole: operator.role,
    action: 'RESET_PASSWORD',
    targetType: 'USER',
    targetId: id,
    detail: {},
  });

  return { success: true };
}

module.exports = { listUsers, createUser, updateUser, updateUserStatus, resetPassword };