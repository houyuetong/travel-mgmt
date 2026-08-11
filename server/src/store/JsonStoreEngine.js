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

  _persist(collection, data) {
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
  }

  async write(collection, data) {
    if (!this.locks[collection]) {
      this.locks[collection] = Promise.resolve();
    }
    this.locks[collection] = this.locks[collection].then(async () => {
      this._persist(collection, data);
    });
    return this.locks[collection];
  }

  /**
   * 在指定集合的串行临界区内执行 task（复用既有 this.locks[collection] 锁链，
   * 与 write() 天然串行——同一把锁，FIFO）。
   *
   * 契约约束（防止死锁与内存污染）：
   *  1) task 内禁止调用 write() 或 runExclusive() 自身（链上自引用会死锁）；
   *     允许调用同步 read() 读取当前集合快照。
   *  2) task 返回值约定：返回「变更后的完整集合数据（新数组/不可变更新）」→
   *     引擎在锁内同步落盘，失败回滚内存态并抛 BusinessError(STORE_WRITE_FAILED, 500)；
   *     返回 null / undefined → 视为无变更，不落盘（保证清理幂等、无副作用）。
   *  3) task 抛错（含业务冲突）时，引擎以 run.catch(() => {}) 维持锁链连续，
   *     后续操作不被阻塞（错误向上冒泡给调用方处理）。
   *
   * @param {string} collection - 集合名（users / requests / audit-logs / token-blacklist）
   * @param {() => Promise<Array<object> | null>} task - 临界区内任务
   * @returns {Promise<Array<object> | null>}
   */
  async runExclusive(collection, task) {
    if (!this.locks[collection]) {
      this.locks[collection] = Promise.resolve();
    }
    const run = this.locks[collection].then(async () => {
      const result = await task();
      if (result === null || result === undefined) {
        return result;
      }
      this._persist(collection, result);
      return result;
    });
    this.locks[collection] = run.catch(() => {});
    return run;
  }
}

const instance = new JsonStoreEngine();

module.exports = instance;