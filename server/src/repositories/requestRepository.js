const crypto = require('crypto');
const store = require('../store/JsonStoreEngine');

function findAll() {
  return store.read('requests');
}

function findById(id) {
  return findAll().find(r => r.id === id);
}

async function create(request) {
  const requests = findAll();
  const newRequest = { ...request, id: crypto.randomUUID() };
  requests.push(newRequest);
  await store.write('requests', requests);
  return newRequest;
}

async function update(id, updates) {
  const requests = findAll();
  const idx = requests.findIndex(r => r.id === id);
  if (idx === -1) return null;
  requests[idx] = { ...requests[idx], ...updates, updatedAt: new Date().toISOString() };
  await store.write('requests', requests);
  return requests[idx];
}

module.exports = { findAll, findById, create, update };