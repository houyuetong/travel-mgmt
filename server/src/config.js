const path = require('path');

const config = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || 3001,
  INIT_ADMIN_USERNAME: process.env.INIT_ADMIN_USERNAME,
  INIT_ADMIN_PASSWORD: process.env.INIT_ADMIN_PASSWORD,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  DATA_DIR: process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data'),
};

module.exports = config;