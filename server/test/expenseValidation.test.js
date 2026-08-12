const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-expense-test-'));
process.env.DATA_DIR = tmpDir;
process.env.JWT_SECRET = 'this-is-a-strong-random-secret-at-least-32-chars-long';

const store = require('../src/store/JsonStoreEngine');
const userRepository = require('../src/repositories/userRepository');
const requestRepository = require('../src/repositories/requestRepository');
const requestService = require('../src/services/requestService');
const { validateExpenseItems } = require('../src/utils/validator');
const BusinessError = require('../src/errors/BusinessError');

before(async () => {
  store.init();
  const now = new Date().toISOString();
  await userRepository.create({ username: 'emp1', name: '张三', role: '普通员工', status: '启用', createdAt: now, updatedAt: now });
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function basePayload(extra = {}) {
  return {
    destination: '北京',
    startDate: '2026-09-01',
    endDate: '2026-09-05',
    purpose: '出差',
    transport: '火车',
    estimatedCost: 300,
    ...extra,
  };
}

function assertValidationError(fn, messagePart) {
  assert.throws(fn, err => {
    assert.ok(err instanceof BusinessError);
    assert.strictEqual(err.errorCode, 'VALIDATION_ERROR');
    assert.ok(err.message.includes(messagePart), `expected "${err.message}" to include "${messagePart}"`);
    return true;
  });
}

describe('validateExpenseItems', () => {
  test('未提供/非数组/空数组直接通过', () => {
    assert.doesNotThrow(() => validateExpenseItems({}));
    assert.doesNotThrow(() => validateExpenseItems({ expenseItems: null }));
    assert.doesNotThrow(() => validateExpenseItems({ expenseItems: 'not-array' }));
    assert.doesNotThrow(() => validateExpenseItems({ expenseItems: [] }));
  });

  test('超过 20 条拒绝', () => {
    const items = Array.from({ length: 21 }, () => ({ category: '交通', amount: 10 }));
    assertValidationError(() => validateExpenseItems({ expenseItems: items }), '不能超过20条');
  });

  test('类别非法拒绝', () => {
    assertValidationError(() => validateExpenseItems({ expenseItems: [{ category: '飞行', amount: 100 }] }), '类别取值非法');
  });

  test('金额 0/负数/超两位小数拒绝', () => {
    assertValidationError(() => validateExpenseItems({ expenseItems: [{ category: '交通', amount: 0 }] }), '必须大于0');
    assertValidationError(() => validateExpenseItems({ expenseItems: [{ category: '交通', amount: -5 }] }), '必须大于0');
    assertValidationError(() => validateExpenseItems({ expenseItems: [{ category: '交通', amount: 10.123 }] }), '最多两位小数');
  });

  test('说明超 200 字符拒绝', () => {
    assertValidationError(() => validateExpenseItems({ expenseItems: [{ category: '交通', amount: 10, description: 'x'.repeat(201) }] }), '不能超过200字符');
  });

  test('合法明细通过', () => {
    assert.doesNotThrow(() => validateExpenseItems({
      expenseItems: [
        { category: '交通', amount: 80.5, description: '高铁票' },
        { category: '住宿', amount: 200 },
      ],
    }));
  });
});

describe('createRequest 落库 expenseItems', () => {
  test('含明细创建：expenseItems 正确落库，totalCost 为明细合计', async () => {
    const payload = basePayload({ expenseItems: [{ category: '交通', amount: 80.5 }, { category: '住宿', amount: 20.5 }] });
    const req = await requestService.createRequest('emp1', payload);
    assert.strictEqual(req.expenseItems.length, 2);
    assert.strictEqual(req.expenseItems[0].amount, 80.5);
    const stored = requestRepository.findById(req.id);
    assert.strictEqual(stored.expenseItems[1].amount, 20.5);

    const enriched = requestService.getMyRequest('emp1', req.id);
    assert.strictEqual(enriched.totalCost, 101);
  });

  test('不含明细创建：不写 expenseItems 字段', async () => {
    const req = await requestService.createRequest('emp1', basePayload());
    assert.ok(!('expenseItems' in req));
    const enriched = requestService.getMyRequest('emp1', req.id);
    assert.strictEqual(enriched.totalCost, 300);
  });

  test('无效明细导致创建失败且不落库', async () => {
    const beforeCount = requestRepository.findAll().length;
    await assert.rejects(
      requestService.createRequest('emp1', basePayload({ expenseItems: [{ category: '飞行', amount: 100 }] })),
      err => err.errorCode === 'VALIDATION_ERROR'
    );
    assert.strictEqual(requestRepository.findAll().length, beforeCount);
  });
});