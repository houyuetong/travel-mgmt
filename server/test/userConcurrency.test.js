const { test, describe, after, before } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-user-test-'));
process.env.DATA_DIR = tmpDir;
process.env.JWT_SECRET = 'this-is-a-strong-random-secret-at-least-32-chars-long';
process.env.INIT_ADMIN_USERNAME = 'admin';
process.env.INIT_ADMIN_PASSWORD = 'admin123456';

const store = require('../src/store/JsonStoreEngine');
const userRepository = require('../src/repositories/userRepository');
const { initAdmin } = require('../src/init/initAdmin');
const jwtUtil = require('../src/utils/jwt');
const roles = require('../src/constants/roles');
const BusinessError = require('../src/errors/BusinessError');

const adminRoutes = require('../src/routes/admin');
const errorHandler = require('../src/middlewares/errorHandler');

const usersFile = path.join(tmpDir, 'users.json');

let server;
let baseUrl;
let adminToken;

before(async () => {
  store.init();
  await initAdmin();
  const admin = userRepository.findByUsername('admin');
  adminToken = jwtUtil.sign({ userId: admin.id, username: admin.username, role: admin.role });

  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  app.use(errorHandler);
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  if (server) server.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('createIfUsernameFree', () => {
  test('并发创建相同 username 恰一个成功、一个抛 USER_NAME_CONFLICT', async () => {
    const user = {
      username: 'dupuser',
      name: '重复用户',
      passwordHash: 'hash',
      role: roles.EMPLOYEE,
      status: '启用',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const results = await Promise.allSettled([
      userRepository.createIfUsernameFree({ ...user }),
      userRepository.createIfUsernameFree({ ...user }),
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');
    assert.strictEqual(fulfilled.length, 1);
    assert.strictEqual(rejected.length, 1);
    assert.ok(rejected[0].reason instanceof BusinessError);
    assert.strictEqual(rejected[0].reason.errorCode, 'USER_NAME_CONFLICT');
    assert.strictEqual(rejected[0].reason.httpStatus, 409);
  });
});

describe('updateIfUsernameFree', () => {
  test('改为已有用户名（排除自身）抛 409', async () => {
    await userRepository.createIfUsernameFree({
      username: 'userb',
      name: '用户B',
      passwordHash: 'hash',
      role: roles.EMPLOYEE,
      status: '启用',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const target = await userRepository.createIfUsernameFree({
      username: 'userc',
      name: '用户C',
      passwordHash: 'hash',
      role: roles.EMPLOYEE,
      status: '启用',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await assert.rejects(
      () => userRepository.updateIfUsernameFree(target.id, { username: 'userb' }),
      (err) => err instanceof BusinessError && err.errorCode === 'USER_NAME_CONFLICT'
    );
  });

  test('用户不存在返回 null', async () => {
    const result = await userRepository.updateIfUsernameFree('nonexistent-id', { username: 'whatever' });
    assert.strictEqual(result, null);
  });
});

describe('HTTP 层并发', () => {
  test('并发 POST /api/admin/users 相同 username 一 200 一 409', async () => {
    const payload = { username: 'httpdup', name: 'HTTP重复', password: 'password123' };
    const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

    const [r1, r2] = await Promise.all([
      fetch(`${baseUrl}/admin/users`, { method: 'POST', headers, body: JSON.stringify(payload) }),
      fetch(`${baseUrl}/admin/users`, { method: 'POST', headers, body: JSON.stringify(payload) }),
    ]);

    const b1 = await r1.json();
    const b2 = await r2.json();
    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    assert.deepStrictEqual(statuses, [200, 409]);

    const successBody = r1.status === 200 ? b1 : b2;
    const conflictBody = r1.status === 409 ? b1 : b2;
    assert.strictEqual(successBody.code, 0);
    assert.strictEqual(conflictBody.code, 'USER_NAME_CONFLICT');
    assert.strictEqual(conflictBody.message, '用户名已存在');
  });

  test('users.json 无重复 username', () => {
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    const usernames = users.map(u => u.username);
    assert.strictEqual(new Set(usernames).size, usernames.length);
  });
});