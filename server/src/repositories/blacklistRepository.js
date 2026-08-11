const crypto = require('crypto');
const store = require('../store/JsonStoreEngine');
const logger = require('../utils/logger');

async function add(token, expiresAt) {
  await store.runExclusive('token-blacklist', () => {
    const list = store.read('token-blacklist');
    return [...list, { id: crypto.randomUUID(), token, expiresAt }];
  });
}

function isBlacklisted(token) {
  const list = store.read('token-blacklist');
  return list.some(entry => entry.token === token);
}

async function cleanupExpired() {
  const before = store.read('token-blacklist').length;
  try {
    await store.runExclusive('token-blacklist', () => {
      const list = store.read('token-blacklist');
      const now = Date.now();
      const filtered = list.filter(entry => new Date(entry.expiresAt).getTime() > now);
      return filtered.length === list.length ? null : filtered;
    });
    const after = store.read('token-blacklist').length;
    logger.info('BLACKLIST', 'Expired tokens cleaned', { before, after });
  } catch (e) {
    logger.error('BLACKLIST', 'Cleanup expired tokens failed', { error: e.message });
  }
}

module.exports = { add, isBlacklisted, cleanupExpired };
