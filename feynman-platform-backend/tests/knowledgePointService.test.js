// 知识点服务层测试：引用校验的分支与错误类型（把模型查询替换掉，不连库）
const test = require('node:test');
const assert = require('node:assert/strict');
const KnowledgePoint = require('../models/KnowledgePoint');
const { ServiceError, resolveReferences } = require('../services/knowledgePointService');

function stubCountDocuments(impl) {
  const original = KnowledgePoint.countDocuments;
  KnowledgePoint.countDocuments = impl;
  return () => {
    KnowledgePoint.countDocuments = original;
  };
}

test('ServiceError 带状态码与文案，可被 instanceof 识别', () => {
  const err = new ServiceError(404, 'Knowledge point not found');
  assert.equal(err.status, 404);
  assert.equal(err.message, 'Knowledge point not found');
  assert.ok(err instanceof Error);
  assert.ok(err instanceof ServiceError);
});

test('非数组入参报错（文案与拆分前一致）', async () => {
  const result = await resolveReferences('nope', 'user1', null);
  assert.deepEqual(result, { error: 'references 必须是知识点 id 数组' });
});

test('空数组直接返回空引用，不查库', async () => {
  let queried = false;
  const restore = stubCountDocuments(async () => {
    queried = true;
    return 0;
  });
  try {
    const result = await resolveReferences([], 'user1', null);
    assert.deepEqual(result, { references: [] });
    assert.equal(queried, false);
  } finally {
    restore();
  }
});

test('非法 ObjectId 报错（文案与拆分前一致）', async () => {
  const result = await resolveReferences(['not-an-id'], 'user1', null);
  assert.deepEqual(result, { error: '引用列表里有无效的知识点 id' });
});

test('引用自己会被剔除；剔除后为空则不查归属', async () => {
  const result = await resolveReferences(['6aaca100d127198b70388a0d'], 'user1', '6aaca100d127198b70388a0d');
  assert.deepEqual(result, { references: [] });
});

test('去重后按数量校验归属：都存在则返回 ObjectId 数组', async () => {
  // 让「查到了几个」跟随入参里真实要查的 id 数量，模拟这些 id 全都属于当前用户
  const restore = stubCountDocuments(async (conditions) => {
    const ids = conditions?._id?.$in ?? [];
    return Array.isArray(ids) ? ids.length : 1;
  });
  try {
    const result = await resolveReferences(
      ['6aaca100d127198b70388a0d', '6aaca100d127198b70388a0d', '6aaca100d127198b70388a0e'],
      'user1',
      null,
    );
    assert.ok(Array.isArray(result.references), JSON.stringify(result));
    assert.equal(result.references.length, 2); // 重复的被合并
  } finally {
    restore();
  }
});

test('引用了不属于自己的知识点 → 报错', async () => {
  const restore = stubCountDocuments(async () => 0); // 一个都没查到
  try {
    const result = await resolveReferences(['6aaca100d127198b70388a0d'], 'user1', null);
    assert.deepEqual(result, { error: '引用列表里有不存在或不属于你的知识点' });
  } finally {
    restore();
  }
});
