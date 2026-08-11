const { test, describe } = require('node:test');
const assert = require('node:assert');

const { validateJwtSecret, assertJwtSecretStrength, WEAK_JWT_SECRETS } = require('../src/utils/secretValidator');
const BusinessError = require('../src/errors/BusinessError');

const STRONG_SECRET = 'this-is-a-strong-random-secret-at-least-32-chars-long';

describe('validateJwtSecret', () => {
  test('缺失返回 missing', () => {
    assert.deepStrictEqual(validateJwtSecret(undefined), { valid: false, reason: 'missing' });
    assert.deepStrictEqual(validateJwtSecret(''), { valid: false, reason: 'missing' });
  });

  test('长度不足返回 too-short', () => {
    assert.deepStrictEqual(validateJwtSecret('short-secret'), { valid: false, reason: 'too-short' });
    const thirtyOne = 'a'.repeat(31);
    assert.deepStrictEqual(validateJwtSecret(thirtyOne), { valid: false, reason: 'too-short' });
  });

  test('命中黑名单返回 blacklisted', () => {
    for (const weak of WEAK_JWT_SECRETS) {
      assert.deepStrictEqual(validateJwtSecret(weak), { valid: false, reason: 'blacklisted' });
    }
  });

  test('强密钥返回 valid', () => {
    assert.deepStrictEqual(validateJwtSecret(STRONG_SECRET), { valid: true, reason: null });
  });
});

describe('assertJwtSecretStrength', () => {
  test('缺失任何模式均抛 INIT_CONFIG_MISSING', () => {
    assert.throws(() => assertJwtSecretStrength(undefined, 'development'), (err) => {
      assert.ok(err instanceof BusinessError);
      assert.strictEqual(err.errorCode, 'INIT_CONFIG_MISSING');
      return true;
    });
  });

  test('开发模式弱密钥返回 ok 且输出 WARN', () => {
    const logs = [];
    const origLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    try {
      const result = assertJwtSecretStrength(WEAK_JWT_SECRETS[0], 'development');
      assert.strictEqual(result.ok, true);
      assert.ok(logs.some(l => l.includes('WARN') && l.includes('JWT_SECRET')));
    } finally {
      console.log = origLog;
    }
  });

  test('生产模式弱密钥抛 INIT_CONFIG_WEAK_SECRET 且消息含原因类别', () => {
    for (const weak of WEAK_JWT_SECRETS) {
      assert.throws(() => assertJwtSecretStrength(weak, 'production'), (err) => {
        assert.ok(err instanceof BusinessError);
        assert.strictEqual(err.errorCode, 'INIT_CONFIG_WEAK_SECRET');
        assert.ok(err.message.includes('命中示例黑名单'), `message should contain reason: ${err.message}`);
        return true;
      });
    }
    assert.throws(() => assertJwtSecretStrength('short', 'production'), (err) => {
      assert.ok(err.message.includes('长度不足'));
      return true;
    });
  });

  test('生产模式强密钥不抛错', () => {
    const result = assertJwtSecretStrength(STRONG_SECRET, 'production');
    assert.deepStrictEqual(result, { ok: true, reason: null });
  });
});