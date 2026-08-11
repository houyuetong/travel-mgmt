const userRepository = require('../repositories/userRepository');
const blacklistRepository = require('../repositories/blacklistRepository');
const bcryptUtil = require('../utils/bcrypt');
const jwtUtil = require('../utils/jwt');
const userStatus = require('../constants/userStatus');
const BusinessError = require('../errors/BusinessError');
const errorCodes = require('../constants/errorCodes');

async function login(username, password) {
  if (!username || !password) {
    throw new BusinessError(errorCodes.VALIDATION_ERROR, '用户名和密码不能为空', 400);
  }

  const user = userRepository.findByUsername(username);
  if (!user) {
    throw new BusinessError(errorCodes.AUTH_INVALID_CREDENTIALS, '用户名或密码错误', 401);
  }

  if (user.status === userStatus.DISABLED) {
    throw new BusinessError(errorCodes.AUTH_ACCOUNT_DISABLED, '账号已禁用，请联系管理员', 401);
  }

  const matched = await bcryptUtil.compare(password, user.passwordHash);
  if (!matched) {
    throw new BusinessError(errorCodes.AUTH_INVALID_CREDENTIALS, '用户名或密码错误', 401);
  }

  const token = jwtUtil.sign({ userId: user.id, username: user.username, role: user.role });

  await blacklistRepository.cleanupExpired();

  return {
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role, status: user.status },
  };
}

async function logout(token) {
  const decoded = jwtUtil.decode(token);
  if (decoded && decoded.exp) {
    await blacklistRepository.add(token, new Date(decoded.exp * 1000).toISOString());
  }
  await blacklistRepository.cleanupExpired();
  return { success: true };
}

module.exports = { login, logout };