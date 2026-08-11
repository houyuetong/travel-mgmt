const jwt = require('jsonwebtoken');
const config = require('../config');
const BusinessError = require('../errors/BusinessError');
const errorCodes = require('../constants/errorCodes');

function sign(payload) {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
}

function verify(token) {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (e) {
    throw new BusinessError(errorCodes.AUTH_TOKEN_INVALID, '令牌无效或已过期', 401);
  }
}

function decode(token) {
  return jwt.decode(token);
}

module.exports = { sign, verify, decode };