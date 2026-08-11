const { fail } = require('../utils/response');
const BusinessError = require('../errors/BusinessError');
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  if (err instanceof BusinessError) {
    logger.warn('ERROR_HANDLER', err.message, {
      errorCode: err.errorCode,
      httpStatus: err.httpStatus,
    });
    return res.status(err.httpStatus).json(fail(err.errorCode, err.message));
  }

  logger.error('ERROR_HANDLER', err.message, { stack: err.stack });
  return res.status(500).json(fail('INTERNAL_ERROR', '服务器内部错误'));
}

module.exports = errorHandler;