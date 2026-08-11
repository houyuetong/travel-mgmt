const BusinessError = require('../errors/BusinessError');
const errorCodes = require('../constants/errorCodes');
const logger = require('./logger');

const MIN_JWT_SECRET_LENGTH = 32;
const WEAK_JWT_SECRETS = [
  'dev-jwt-secret-key-for-testing-only',
  'your-jwt-secret-key-change-in-production',
];

function validateJwtSecret(secret) {
  if (!secret) {
    return { valid: false, reason: 'missing' };
  }
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    return { valid: false, reason: 'too-short' };
  }
  if (WEAK_JWT_SECRETS.includes(secret)) {
    return { valid: false, reason: 'blacklisted' };
  }
  return { valid: true, reason: null };
}

function reasonMessage(reason) {
  switch (reason) {
    case 'missing':
      return '缺失';
    case 'too-short':
      return '长度不足';
    case 'blacklisted':
      return '命中示例黑名单';
    default:
      return '未知原因';
  }
}

function assertJwtSecretStrength(secret, nodeEnv) {
  const { valid, reason } = validateJwtSecret(secret);
  if (reason === 'missing') {
    throw new BusinessError(errorCodes.INIT_CONFIG_MISSING, 'JWT_SECRET 配置缺失', 500);
  }
  if (valid) {
    return { ok: true, reason: null };
  }
  if (nodeEnv === 'production') {
    throw new BusinessError(
      errorCodes.INIT_CONFIG_WEAK_SECRET,
      `JWT_SECRET 强度不足（${reasonMessage(reason)}），请配置至少 ${MIN_JWT_SECRET_LENGTH} 字符的随机密钥`,
      500
    );
  }
  logger.warn('CONFIG', 'JWT_SECRET 为弱密钥，仅限开发环境使用', { reason });
  return { ok: true, reason };
}

module.exports = { MIN_JWT_SECRET_LENGTH, WEAK_JWT_SECRETS, validateJwtSecret, assertJwtSecretStrength };