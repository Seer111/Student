// 一次性：给「提及」边造一条真实示例（P0-2）。
// 做法：在某个知识点正文里自然地写到另一个知识点的完整标题 —— 后端 graph.js 的自动边规则
// 就是「正文里包含对方的完整标题」。幂等：已经写过就跳过。
require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE = 'http://localhost:3000/api';
const USER_ID = '6aaca100d127198b70388a0d';
const token = jwt.sign({ user: { id: USER_ID } }, process.env.JWT_SECRET, { expiresIn: '1h' });

const SOURCE_TITLE = 'RAG 检索增强生成';
const TARGET_TITLE = '注意力机制与 Transformer';
const SENTENCE =
  '在实现 RAG 时，检索到的片段最终仍由大模型生成回答；理解 注意力机制与 Transformer 里的注意力权重分配，有助于判断片段该塞多长、塞几段。';

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'x-auth-token': token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

function edgeSummary(graph) {
  const links = graph?.links || [];
  const auto = links.filter((l) => l.kind === 'auto');
  const explicit = links.filter((l) => l.kind !== 'auto');
  return { nodes: (graph?.nodes || []).length, links: links.length, explicit: explicit.length, auto: auto.length, autoPairs: auto.map((l) => `${l.source}->${l.target}`) };
}

(async () => {
  const list = await call('GET', '/knowledge-points');
  const points = list.data || [];
  const source = points.find((p) => p.title === SOURCE_TITLE);
  const target = points.find((p) => p.title === TARGET_TITLE);
  if (!source || !target) {
    console.error(`找不到知识点：source=${Boolean(source)} target=${Boolean(target)}；现有标题：${points.map((p) => p.title).join(' / ')}`);
    process.exit(1);
  }

  const before = edgeSummary((await call('GET', '/graph/knowledge-map')).data);
  console.log('改动前：', JSON.stringify(before));

  const detail = await call('GET', `/knowledge-points/${source._id}`);
  const content = detail.data.content || '';
  const already = content.includes(SENTENCE);
  console.log(`源知识点：${source.title}（${source._id}），正文 ${content.length} 字，已含该句=${already}`);

  if (!already) {
    const updated = await call('PUT', `/knowledge-points/${source._id}`, { content: `${content}\n\n${SENTENCE}` });
    console.log(`PUT 结果：${updated.status}，正文现在 ${updated.data?.content?.length} 字`);
  }

  const after = edgeSummary((await call('GET', '/graph/knowledge-map')).data);
  console.log('改动后：', JSON.stringify(after));
  console.log(`提及边：${before.auto} → ${after.auto}`);

  const hit = after.autoPairs.some((pair) => pair.includes(source._id) || pair.includes(target._id));
  console.log(hit ? '[PASS] 出现了与本次改动相关的提及边' : '[WARN] 没看到相关提及边（检查标题写法是否完全一致）');
})().catch((e) => {
  console.error('脚本异常：', e.message);
  process.exit(1);
});
