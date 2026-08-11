require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const store = require('./store/JsonStoreEngine');
const { initAdmin } = require('./init/initAdmin');
const blacklistRepository = require('./repositories/blacklistRepository');
const { assertJwtSecretStrength } = require('./utils/secretValidator');
const requestLogger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');
const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/request');
const adminRoutes = require('./routes/admin');
const logger = require('./utils/logger');


async function startServer() {
  assertJwtSecretStrength(config.JWT_SECRET, config.NODE_ENV);

  store.init();
  await blacklistRepository.cleanupExpired();
  await initAdmin();

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  app.use('/api/auth', authRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/admin', adminRoutes);

  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(errorHandler);

  app.listen(config.PORT, () => {
    logger.info('APP', `Server running on port ${config.PORT}`);
  });
}

startServer().catch(err => {
  logger.error('APP', 'Failed to start server', { error: err.message, errorCode: err.errorCode, stack: err.stack });
  process.exit(1);
});