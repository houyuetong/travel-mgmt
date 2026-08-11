const auditRepository = require('../repositories/auditRepository');
const logger = require('../utils/logger');

async function record({ operatorUsername, operatorRole, action, targetType, targetId, detail }) {
  const entry = await auditRepository.append({
    operatorUsername,
    operatorRole,
    action,
    targetType,
    targetId,
    detail,
  });
  logger.info('AUDIT', `Audit recorded: ${action}`, { operatorUsername, targetType, targetId });
  return entry;
}

module.exports = { record };