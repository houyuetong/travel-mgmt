const jwtUtil = require('../utils/jwt');
const blacklistRepository = require('../repositories/blacklistRepository');
const BusinessError = require('../errors/BusinessError');
const errorCodes = require('../constants/errorCodes');
const roles = require('../constants/roles');

function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BusinessError(errorCodes.AUTH_TOKEN_INVALID, '未提供认证令牌', 401);
    }
    const token = authHeader.substring(7);
    const decoded = jwtUtil.verify(token);

    if (blacklistRepository.isBlacklisted(token)) {
      throw new BusinessError(errorCodes.AUTH_TOKEN_INVALID, '令牌已失效', 401);
    }

    req.user = { userId: decoded.userId, username: decoded.username, role: decoded.role };
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === roles.ADMIN) {
    next();
  } else {
    next(new BusinessError(errorCodes.FORBIDDEN, '权限不足，需要管理员角色', 403));
  }
}

function requireEmployee(req, res, next) {
  if (req.user && req.user.role === roles.EMPLOYEE) {
    next();
  } else {
    next(new BusinessError(errorCodes.FORBIDDEN, '权限不足，需要普通员工角色', 403));
  }
}

module.exports = { authRequired, requireAdmin, requireEmployee };