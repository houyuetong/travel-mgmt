const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

async function hash(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function compare(plain, hashValue) {
  return bcrypt.compare(plain, hashValue);
}

module.exports = { hash, compare };