const config = require('../config');
const userRepository = require('../repositories/userRepository');
const bcryptUtil = require('../utils/bcrypt');
const roles = require('../constants/roles');
const userStatus = require('../constants/userStatus');
const BusinessError = require('../errors/BusinessError');
const errorCodes = require('../constants/errorCodes');
const logger = require('../utils/logger');

async function initAdmin() {
  const users = userRepository.findAll();
  if (users.length > 0) {
    logger.info('INIT', 'Data file not empty, skipping admin initialization');
    return;
  }

  if (!config.INIT_ADMIN_USERNAME || !config.INIT_ADMIN_PASSWORD) {
    throw new BusinessError(errorCodes.INIT_CONFIG_MISSING, '初始管理员配置缺失，请检查 .env 文件', 500);
  }

  const passwordHash = await bcryptUtil.hash(config.INIT_ADMIN_PASSWORD);
  await userRepository.create({
    username: config.INIT_ADMIN_USERNAME,
    name: '系统管理员',
    passwordHash,
    role: roles.ADMIN,
    status: userStatus.ACTIVE,
    createdAt: new Date().toISOString(),
  });

  logger.info('INIT', 'Initial admin created', { username: config.INIT_ADMIN_USERNAME });
}

module.exports = { initAdmin };