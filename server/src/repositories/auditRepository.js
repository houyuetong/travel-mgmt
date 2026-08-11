const crypto = require('crypto');
const store = require('../store/JsonStoreEngine');

async function append(entry) {
  const logs = store.read('audit-logs');
  const newEntry = { ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
  logs.push(newEntry);
  await store.write('audit-logs', logs);
  return newEntry;
}

function findAll() {
  return store.read('audit-logs');
}

module.exports = { append, findAll };