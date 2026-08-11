const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP', `${req.method} ${req.url}`, {
      method: req.method,
      path: req.url,
      status: res.statusCode,
      duration: Date.now() - start,
      userId: req.user ? req.user.userId : null,
    });
  });
  next();
}

module.exports = requestLogger;