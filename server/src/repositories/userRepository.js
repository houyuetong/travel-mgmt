const crypto = require('crypto');
const store = require('../store/JsonStoreEngine');

function findAll() {
  return store.read('users');
}

function findByUsername(username) {
  return findAll().find(u => u.username === username);
}

function findById(id) {
  return findAll().find(u => u.id === id);
}

async function create(user) {
  const users = findAll();
  const newUser = { ...user, id: crypto.randomUUID() };
  users.push(newUser);
  await store.write('users', users);
  return newUser;
}

async function update(id, updates) {
  const users = findAll();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
  await store.write('users', users);
  return users[idx];
}

module.exports = { findAll, findByUsername, findById, create, update };