const { test, describe, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');

const tmpDirs = [];

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-version-test-'));
  tmpDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const { createVersionProvider } = require('../src/utils/versionProvider');
const { createMetaController } = require('../src/controllers/metaController');
const errorHandler = require('../src/middlewares/errorHandler');

describe('createVersionProvider 单元', () => {
  test('正常读取 version（1.2.0）', () => {
    const dir = makeTmpDir();
    const pkgPath = path.join(dir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'test', version: '1.2.0' }));
    const provider = createVersionProvider(pkgPath);
    assert.strictEqual(provider.getVersion(), '1.2.0');
  });

  test('缓存生效：修改文件后取值不变', () => {
    const dir = makeTmpDir();
    const pkgPath = path.join(dir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ version: '1.2.0' }));
    const provider = createVersionProvider(pkgPath);
    assert.strictEqual(provider.getVersion(), '1.2.0');
    fs.writeFileSync(pkgPath, JSON.stringify({ version: '9.9.9' }));
    assert.strictEqual(provider.getVersion(), '1.2.0');
  });

  test('version 缺失返回 null 且不抛错', () => {
    const dir = makeTmpDir();
    const pkgPath = path.join(dir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'no-version' }));
    const provider = createVersionProvider(pkgPath);
    assert.strictEqual(provider.getVersion(), null);
  });

  test('version 格式非法返回 null', () => {
    const dir = makeTmpDir();
    const pkgPath = path.join(dir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ version: 'abc' }));
    const provider = createVersionProvider(pkgPath);
    assert.strictEqual(provider.getVersion(), null);
  });

  test('文件不存在返回 null 且不抛错', () => {
    const provider = createVersionProvider(path.join(os.tmpdir(), 'not-exist-package.json'));
    assert.strictEqual(provider.getVersion(), null);
  });

  test('JSON 解析失败返回 null 且不抛错', () => {
    const dir = makeTmpDir();
    const pkgPath = path.join(dir, 'package.json');
    fs.writeFileSync(pkgPath, '{invalid json');
    const provider = createVersionProvider(pkgPath);
    assert.strictEqual(provider.getVersion(), null);
  });
});

describe('版本接口 HTTP', () => {
  function buildApp(provider) {
    const app = express();
    app.use(express.json());
    const controller = createMetaController(provider);
    app.get('/api/meta/version', controller.getVersion);
    app.use(errorHandler);
    return app.listen(0);
  }

  test('正常返回 200 + code=0 + version 与 server/package.json 一致', async () => {
    const server = buildApp(createVersionProvider(path.join(__dirname, '..', 'package.json')));
    try {
      const port = server.address().port;
      const res = await fetch(`http://127.0.0.1:${port}/api/meta/version`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.code, 0);
      const pkg = require('../package.json');
      assert.strictEqual(body.data.version, pkg.version);
    } finally {
      server.close();
    }
  });

  test('免鉴权：无 Authorization 头仍返回 200', async () => {
    const server = buildApp(createVersionProvider(path.join(__dirname, '..', 'package.json')));
    try {
      const port = server.address().port;
      const res = await fetch(`http://127.0.0.1:${port}/api/meta/version`);
      assert.strictEqual(res.status, 200);
      assert.ok(!res.headers.get('set-cookie'));
    } finally {
      server.close();
    }
  });

  test('version 不可用返回 500 + VERSION_UNAVAILABLE', async () => {
    const dir = makeTmpDir();
    const pkgPath = path.join(dir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'x' }));
    const server = buildApp(createVersionProvider(pkgPath));
    try {
      const port = server.address().port;
      const res = await fetch(`http://127.0.0.1:${port}/api/meta/version`);
      assert.strictEqual(res.status, 500);
      const body = await res.json();
      assert.strictEqual(body.code, 'VERSION_UNAVAILABLE');
    } finally {
      server.close();
    }
  });
});