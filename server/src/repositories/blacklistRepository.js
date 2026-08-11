const crypto = require('crypto');
const store = require('../store/JsonStoreEngine');

async function add(token, expiresAt) {
  const list = store.read('token-blacklist');
  list.push({ id: crypto.randomUUID(), token, expiresAt });
  await store.write('token-blacklist', list);
}

function isBlacklisted(token) {
  const list = store.read('token-blacklist');
  return list.some(entry => entry.token === token);
}

async function cleanupExpired() {
  const list = store.read('token-blacklist');
  const now = Date.now();
  const filtered = list.filter(entry => new Date(entry.expiresAt).getTime() > now);
  if (filtered.length !== list.length) {
    await store.write('token-blacklist', filtered);
  }
}

module.exports = { add, isBlacklisted, cleanupExpired };