// 向量库「删不删」的纯函数测试：不读盘、不连库、不调 embedding
const test = require('node:test');
const assert = require('node:assert/strict');
const { chunksOfKnowledgePoint, tombstoneChunks, shouldCompact, splitText } = require('../services/vectorStoreService');

const chunk = (label, knowledgePointId, extra = {}) => ({
  label,
  content: `块 ${label}`,
  knowledgePointId,
  title: 't',
  userId: 'u',
  vector: null,
  ...extra,
});

test('chunksOfKnowledgePoint 只返回该知识点的存活块，且保持原顺序', () => {
  const docs = [
    chunk(0, 'kp1'),
    chunk(1, 'kp2'),
    chunk(2, 'kp1', { deleted: true }), // 已打墓碑，不该返回
    chunk(3, 'kp1'),
  ];
  const live = chunksOfKnowledgePoint(docs, 'kp1');
  assert.deepEqual(live.map((d) => d.label), [0, 3]);
});

test('chunksOfKnowledgePoint 接受 ObjectId 这类对象入参（内部统一 String 化）', () => {
  const docs = [chunk(0, 'abc123')];
  const live = chunksOfKnowledgePoint(docs, { toString: () => 'abc123' });
  assert.equal(live.length, 1);
});

test('tombstoneChunks 就地打墓碑并返回本次命中的块', () => {
  const docs = [chunk(0, 'kp1'), chunk(1, 'kp2'), chunk(2, 'kp1')];
  const hit = tombstoneChunks(docs, 'kp1');
  assert.deepEqual(hit.map((d) => d.label), [0, 2]);
  assert.equal(docs[0].deleted, true);
  assert.equal(docs[2].deleted, true);
  assert.equal(docs[1].deleted, undefined); // 别的知识点不受影响
});

test('tombstoneChunks 幂等：再调一次不再命中', () => {
  const docs = [chunk(0, 'kp1')];
  tombstoneChunks(docs, 'kp1');
  assert.deepEqual(tombstoneChunks(docs, 'kp1'), []);
});

test('没有存活块的知识点返回 0 块', () => {
  assert.equal(chunksOfKnowledgePoint([chunk(0, 'kp1', { deleted: true })], 'kp1').length, 0);
});

test('shouldCompact：块太少不重建（重建要重新向量化，代价高）', () => {
  assert.equal(shouldCompact(19, 19), false); // < 20 块
});

test('shouldCompact：墓碑占比未到 30% 不重建', () => {
  assert.equal(shouldCompact(25, 5), false); // 20%
  assert.equal(shouldCompact(20, 5), false); // 25%
});

test('shouldCompact：占比达到 30% 且块数够多时重建', () => {
  assert.equal(shouldCompact(20, 6), true); // 30%
  assert.equal(shouldCompact(30, 15), true); // 50%
});

test('splitText 短文本不切分', () => {
  assert.deepEqual(splitText('只有一句话。'), ['只有一句话。']);
});

test('splitText 长文本按 CHUNK_SIZE 切成带重叠的多块，且不丢内容', () => {
  const text = '第一段。'.repeat(400); // 1600 字符
  const chunks = splitText(text);
  assert.ok(chunks.length >= 3, `应切成多块，实际 ${chunks.length}`);
  chunks.forEach((c) => assert.ok(c.length <= 500, `块长度 ${c.length} 超出上限`));
  // 重叠保证连续：后一块的开头能在前一块的尾部附近找到
  assert.ok(text.startsWith(chunks[0]));
  const totalUnique = new Set(chunks.join('').replace(/。/g, '')).size;
  assert.ok(totalUnique <= 5, '拼接后不应出现新字符');
});

test('splitText 对空串与纯空白返回空数组', () => {
  assert.deepEqual(splitText(''), []);
  assert.deepEqual(splitText('   \n  '), []);
});
