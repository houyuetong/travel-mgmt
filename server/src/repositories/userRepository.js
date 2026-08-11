const crypto = require('crypto');
const store = require('../store/JsonStoreEngine');
const BusinessError = require('../errors/BusinessError');
const errorCodes = require('../constants/errorCodes');

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

async function createIfUsernameFree(user) {
  let created = null;
  await store.runExclusive('users', () => {
    const users = store.read('users');
    if (users.some(u => u.username === user.username)) {
      throw new BusinessError(errorCodes.USER_NAME_CONFLICT, '用户名已存在', 409);
    }
    const newUser = { ...user, id: crypto.randomUUID() };
    created = newUser;
    return [...users, newUser];
  });
  return created;
}

async function updateIfUsernameFree(id, updates) {
  let updated = null;
  await store.runExclusive('users', () => {
    const users = store.read('users');
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    if (updates.username !== undefined && users.some(u => u.username === updates.username && u.id !== id)) {
      throw new BusinessError(errorCodes.USER_NAME_CONFLICT, '用户名已存在', 409);
    }
    updated = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
    const next = [...users];
    next[idx] = updated;
    return next;
  });
  return updated;
}

module.exports = { findAll, findByUsername, findById, create, update, createIfUsernameFree, updateIfUsernameFree };