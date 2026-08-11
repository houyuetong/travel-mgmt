const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const appPath = path.join(__dirname, '..', 'src', 'app.js');

const tmpDirs = [];

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-startup-test-'));
  tmpDirs.push(dir);
  return dir;
}

function spawnApp(env) {
  const child = spawn(process.execPath, [appPath], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', d => { output += d.toString(); });
  child.stderr.on('data', d => { output += d.toString(); });
  return {
    child,
    outputRef: () => output,
    exited: new Promise(resolve => child.on('exit', (code) => resolve({ code, output: () => output }))),
  };
}

function waitForOutput(outputRef, predicate, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (outputRef().split('\n').some(l => predicate(l))) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error('timeout waiting for output'));
      }
    }, 100);
  });
}

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('startupValidation', () => {
  test('生产模式 + 弱密钥 → 退出码非0、日志含原因类别', async () => {
    const { child, exited, outputRef } = spawnApp({
      NODE_ENV: 'production',
      JWT_SECRET: 'dev-jwt-secret-key-for-testing-only',
      DATA_DIR: makeTmpDir(),
      INIT_ADMIN_USERNAME: 'admin',
      INIT_ADMIN_PASSWORD: 'admin123456',
    });
    const { code } = await exited;
    const output = outputRef();
    assert.notStrictEqual(code, 0);
    assert.ok(output.includes('命中示例黑名单'), `output should contain reason: ${output}`);
  });

  test('生产模式 + 缺失 JWT_SECRET → 退出码非0、日志含 INIT_CONFIG_MISSING', async () => {
    const { exited, outputRef } = spawnApp({
      NODE_ENV: 'production',
      JWT_SECRET: '',
      DATA_DIR: makeTmpDir(),
      INIT_ADMIN_USERNAME: 'admin',
      INIT_ADMIN_PASSWORD: 'admin123456',
    });
    const { code } = await exited;
    const output = outputRef();
    assert.notStrictEqual(code, 0);
    assert.ok(output.includes('INIT_CONFIG_MISSING'), `output should contain INIT_CONFIG_MISSING: ${output}`);
  });

  test('非生产 + 弱密钥 → 正常启动、日志含 WARN', async () => {
    const { child, outputRef } = spawnApp({
      NODE_ENV: 'development',
      JWT_SECRET: 'dev-jwt-secret-key-for-testing-only',
      DATA_DIR: makeTmpDir(),
      PORT: '3101',
      INIT_ADMIN_USERNAME: 'admin',
      INIT_ADMIN_PASSWORD: 'admin123456',
    });
    try {
      await waitForOutput(outputRef, l => l.includes('Server running'));
      const output = outputRef();
      assert.ok(output.includes('WARN'), `output should contain WARN: ${output}`);
    } finally {
      child.kill();
    }
  });

  test('生产模式 + 强密钥 → 正常启动', async () => {
    const { child, outputRef } = spawnApp({
      NODE_ENV: 'production',
      JWT_SECRET: 'this-is-a-strong-random-secret-at-least-32-chars-long',
      DATA_DIR: makeTmpDir(),
      PORT: '3102',
      INIT_ADMIN_USERNAME: 'admin',
      INIT_ADMIN_PASSWORD: 'admin123456',
    });
    try {
      await waitForOutput(outputRef, l => l.includes('Server running'));
      const output = outputRef();
      assert.ok(!output.includes('INIT_CONFIG_WEAK_SECRET'), `output should not contain weak secret error: ${output}`);
    } finally {
      child.kill();
    }
  });
});
