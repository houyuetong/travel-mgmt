const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-blacklist-test-'));
process.env.DATA_DIR = tmpDir;
process.env.JWT_SECRET = 'this-is-a-strong-random-secret-at-least-32-chars-long';

const store = require('../src/store/JsonStoreEngine');
const blacklistRepository = require('../src/repositories/blacklistRepository');

const blacklistFile = path.join(tmpDir, 'token-blacklist.json');

function mtime() {
  return fs.statSync(blacklistFile).mtimeMs;
}

function readFileList() {
  return JSON.parse(fs.readFileSync(blacklistFile, 'utf-8'));
}

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('cleanupExpired', () => {
  test('仅删除过期条目，未过期条目完整保留', async () => {
    const past = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await blacklistRepository.add('token-expired-1', past);
    await blacklistRepository.add('token-valid-1', future);
    await blacklistRepository.add('token-expired-2', past);

    await blacklistRepository.cleanupExpired();

    const remaining = readFileList();
    assert.strictEqual(remaining.length, 1);
    assert.strictEqual(remaining[0].token, 'token-valid-1');
  });

  test('无过期条目时不落盘（幂等，mtime 不变）', async () => {
    await blacklistRepository.add('token-valid-2', new Date(Date.now() + 60 * 60 * 1000).toISOString());
    await blacklistRepository.add('token-valid-3', new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString());
    const beforeMtime = mtime();

    await blacklistRepository.cleanupExpired();

    const afterMtime = mtime();
    assert.strictEqual(afterMtime, beforeMtime);
    const list = readFileList();
    assert.strictEqual(list.length, 3);
  });

  test('并发 add + cleanupExpired 不丢失任何条目', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const tasks = [];
    for (let i = 0; i < 20; i++) {
      tasks.push(blacklistRepository.add(`concurrent-token-${i}`, future));
    }
    tasks.push(blacklistRepository.cleanupExpired());
    await Promise.all(tasks);

    const list = readFileList();
    const uniqueTokens = new Set(list.map(e => e.token));
    for (let i = 0; i < 20; i++) {
      assert.ok(uniqueTokens.has(`concurrent-token-${i}`), `missing concurrent-token-${i}`);
    }
  });

  test('模拟写入失败时 cleanupExpired 不抛错且内存态回滚', async () => {
    await blacklistRepository.add('fail-expired', new Date(Date.now() - 60 * 1000).toISOString());
    const before = store.read('token-blacklist').length;

    const origPersist = store._persist;
    store._persist = () => { throw new Error('mock write failure'); };
    const logs = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    try {
      await blacklistRepository.cleanupExpired();
      assert.strictEqual(store.read('token-blacklist').length, before);
      assert.ok(logs.some(l => l.includes('ERROR') && l.includes('Cleanup expired tokens failed')));
    } finally {
      store._persist = origPersist;
      console.log = origLog;
    }
  });
});