// 知识图谱规则的单元测试（node:test，不连库、不起服务）
// 运行：npm test（或 node --test tests/）
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildKnowledgeGraph, buildTitleIndex, categoryOf, SIZE_CAP } = require('../services/graphService');

// 造知识点：_id 用带 toString 的对象模拟 ObjectId，保持与真实数据同形
const kp = (id, title, content, extra = {}) => ({
  _id: { toString: () => id },
  title,
  content,
  references: [],
  status: 'not_started',
  reviewList: false,
  ...extra,
});

test('显式引用生成 explicit 边，并计入两端 degree', () => {
  const graph = buildKnowledgeGraph([kp('a', '闭包', '函数加环境', { references: [{ toString: () => 'b' }] }), kp('b', '原型链', '对象的原型')]);
  assert.deepEqual(graph.links, [{ source: 'a', target: 'b', kind: 'explicit' }]);
  const a = graph.nodes.find((n) => n.id === 'a');
  assert.equal(a.degree, 1);
  assert.equal(a.sizeValue, 1);
  assert.equal(a.symbolSize, 26); // 20 + 6 × 1
});

test('正文提到对方标题生成 auto 边', () => {
  const graph = buildKnowledgeGraph([kp('a', '闭包', '学闭包要先懂原型链'), kp('b', '原型链', '没有提到别人')]);
  assert.deepEqual(graph.links, [{ source: 'a', target: 'b', kind: 'auto' }]);
});

test('同一条边既有引用又被提及：只保留 explicit 一条', () => {
  const graph = buildKnowledgeGraph([
    kp('a', '闭包', '学闭包要先懂原型链', { references: [{ toString: () => 'b' }] }),
    kp('b', '原型链', '对象的原型'),
  ]);
  assert.equal(graph.links.length, 1);
  assert.equal(graph.links[0].kind, 'explicit');
});

test('自环被丢弃：正文提到自己的标题不产生边', () => {
  const graph = buildKnowledgeGraph([kp('a', '闭包', '闭包的定义里又出现了闭包')]);
  assert.equal(graph.links.length, 0);
});

test('同名标题只有第一条接收提及（避免歧义边）', () => {
  const graph = buildKnowledgeGraph([kp('a', '闭包', '见正文'), kp('b', '闭包', '另一条同名'), kp('c', '外部', '提到了闭包')]);
  assert.deepEqual(graph.links, [{ source: 'c', target: 'a', kind: 'auto' }]);
});

test('空标题不参与提及匹配（历史 bug：content.includes("") 恒真会造出假边）', () => {
  const graph = buildKnowledgeGraph([kp('a', '', '任何正文'), kp('b', '正常标题', '无引用')]);
  assert.equal(graph.links.length, 0);
  assert.deepEqual([...buildTitleIndex([kp('a', '', 'x')]).keys()], []);
});

test('引用不存在的知识点 id 不产生边', () => {
  const graph = buildKnowledgeGraph([kp('a', '闭包', 'no mention', { references: [{ toString: () => 'zzz' }] })]);
  assert.equal(graph.links.length, 0);
});

test('空输入返回空图', () => {
  assert.deepEqual(buildKnowledgeGraph([]), { nodes: [], links: [] });
  assert.deepEqual(buildKnowledgeGraph(null), { nodes: [], links: [] });
});

test('sizeValue 封顶 6：星形 8 条边时中心节点 degree=8、sizeValue=6、symbolSize=56', () => {
  const star = [kp('hub', '中心', 'no mentions')];
  for (let i = 0; i < 8; i += 1) {
    star.push(kp(`n${i}`, `叶${i}`, 'x', { references: [{ toString: () => 'hub' }] }));
  }
  const graph = buildKnowledgeGraph(star);
  const hub = graph.nodes.find((n) => n.id === 'hub');
  assert.equal(graph.links.length, 8);
  assert.equal(hub.degree, 8);
  assert.equal(hub.sizeValue, SIZE_CAP);
  assert.equal(hub.symbolSize, 56);
});

test('分类：待复习优先于状态，未知状态兜底为 0', () => {
  assert.equal(categoryOf({ reviewList: true, status: 'mastered' }), 2);
  assert.equal(categoryOf({ reviewList: false, status: 'mastered' }), 3);
  assert.equal(categoryOf({ reviewList: false, status: 'in_progress' }), 1);
  assert.equal(categoryOf({ reviewList: false, status: 'not_started' }), 0);
  assert.equal(categoryOf({ reviewList: false, status: 'weird' }), 0);
});

test('节点摘要截断到 100 字符', () => {
  const long = 'x'.repeat(180);
  const node = buildKnowledgeGraph([kp('a', '长内容', long)]).nodes[0];
  assert.equal(node.value.length, 100);
});
