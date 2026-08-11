const fs = require('fs');
const path = require('path');
const config = require('../config');
const BusinessError = require('../errors/BusinessError');
const errorCodes = require('../constants/errorCodes');
const logger = require('../utils/logger');

const COLLECTIONS = ['users', 'requests', 'audit-logs', 'token-blacklist'];

class JsonStoreEngine {
  constructor() {
    this.dataDir = config.DATA_DIR;
    this.memory = {};
    this.locks = {};
  }

  init() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    for (const col of COLLECTIONS) {
      const filePath = path.join(this.dataDir, `${col}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        this.memory[col] = JSON.parse(raw);
      } else {
        this.memory[col] = [];
        fs.writeFileSync(filePath, '[]', 'utf-8');
      }
    }
    logger.info('STORE', 'JsonStoreEngine initialized', { collections: COLLECTIONS });
  }

  read(collection) {
    return this.memory[collection] || [];
  }

  async write(collection, data) {
    if (!this.locks[collection]) {
      this.locks[collection] = Promise.resolve();
    }
    this.locks[collection] = this.locks[collection].then(async () => {
      const previous = this.memory[collection];
      this.memory[collection] = data;
      try {
        const filePath = path.join(this.dataDir, `${collection}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      } catch (e) {
        this.memory[collection] = previous;
        logger.error('STORE', `Write failed for ${collection}`, { error: e.message });
        throw new BusinessError(errorCodes.STORE_WRITE_FAILED, '数据写入失败', 500);
      }
    });
    return this.locks[collection];
  }
}

const instance = new JsonStoreEngine();

module.exports = instance;