// 学习阶段流转的测试：分数 → 目标阶段，以及「只前进不回退」
const test = require('node:test');
const assert = require('node:assert/strict');
const KnowledgePoint = require('../models/KnowledgePoint');
const { STATUS_RANK, MASTER_SCORE_THRESHOLD, targetStatusForScore, advanceStatus, advanceStatusByScore } = require('../utils/knowledgeStatus');

test('分数 ≥ 85 判为已掌握，以下判为学习中', () => {
  assert.equal(targetStatusForScore(85), 'mastered');
  assert.equal(targetStatusForScore(100), 'mastered');
  assert.equal(targetStatusForScore(84.9), 'in_progress');
  assert.equal(targetStatusForScore(0), 'in_progress');
});

test('字符串分数与非法分数都能兜底', () => {
  assert.equal(targetStatusForScore('90'), 'mastered');
  assert.equal(targetStatusForScore('abc'), 'in_progress');
  assert.equal(targetStatusForScore(null), 'in_progress');
  assert.equal(targetStatusForScore(undefined), 'in_progress');
});

test('阶段序：not_started < in_progress < mastered', () => {
  assert.deepEqual(STATUS_RANK, { not_started: 0, in_progress: 1, mastered: 2 });
  assert.equal(MASTER_SCORE_THRESHOLD, 85);
});

// 下面的用例把模型替换成假对象，不连库
function stubFindOne(fakeKp) {
  const original = KnowledgePoint.findOne;
  KnowledgePoint.findOne = async () => fakeKp;
  return () => {
    KnowledgePoint.findOne = original;
  };
}

test('advanceStatus 前进：not_started → in_progress 返回前后阶段', async () => {
  let saved = false;
  const restore = stubFindOne({ status: 'not_started', save: async () => { saved = true; } });
  try {
    const move = await advanceStatus('kp1', 'in_progress', 'user1');
    assert.deepEqual(move, { from: 'not_started', to: 'in_progress' });
    assert.equal(saved, true);
  } finally {
    restore();
  }
});

test('advanceStatus 不回退：已 mastered 时再推进到 in_progress 返回 null', async () => {
  const restore = stubFindOne({ status: 'mastered', save: async () => {} });
  try {
    assert.equal(await advanceStatus('kp1', 'in_progress', 'user1'), null);
  } finally {
    restore();
  }
});

test('advanceStatus 同级不重复流转', async () => {
  const restore = stubFindOne({ status: 'in_progress', save: async () => {} });
  try {
    assert.equal(await advanceStatus('kp1', 'in_progress', 'user1'), null);
  } finally {
    restore();
  }
});

test('advanceStatus 找不到知识点返回 null', async () => {
  const restore = stubFindOne(null);
  try {
    assert.equal(await advanceStatus('kp1', 'mastered', 'user1'), null);
  } finally {
    restore();
  }
});

test('advanceStatus 拒绝非法目标阶段与缺失 id（都在查库之前返回 null）', async () => {
  assert.equal(await advanceStatus('kp1', 'weird', 'user1'), null); // 不在 STATUS_RANK 里
  assert.equal(await advanceStatus('', 'mastered', 'user1'), null); // 没有 id
  assert.equal(await advanceStatus(null, 'mastered', 'user1'), null);
});

test('未知旧阶段按 not_started 处理，仍可前进', async () => {
  const restore = stubFindOne({ status: 'weird', save: async () => {} });
  try {
    assert.deepEqual(await advanceStatus('kp1', 'in_progress', 'user1'), { from: 'not_started', to: 'in_progress' });
  } finally {
    restore();
  }
});

test('advanceStatusByScore 用评分选目标阶段（90 → mastered）', async () => {
  let next = null;
  const restore = stubFindOne({ status: 'in_progress', save: async () => {} });
  KnowledgePoint.findOne = async () => ({ status: 'in_progress', save: async () => {} });
  try {
    const move = await advanceStatusByScore('kp1', 90, 'user1');
    next = move;
    assert.deepEqual(next, { from: 'in_progress', to: 'mastered' });
  } finally {
    restore();
  }
});
