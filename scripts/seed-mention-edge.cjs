// 一次性：给「提及」边造一条真实示例（P0-2）。
// 规则：后端 graph.js 的自动边是「源知识点正文里包含目标知识点的完整标题」，
// 且与显式引用边同向时会被去重（显式优先）——所以这里特意选一对目前没有显式引用的方向。
//
// 本脚本会做两件事（都可重复执行）：
//   1) 撤掉上一版加在「RAG 检索增强生成」里的那句（如果还在）；
//   2) 在「注意力机制与 Transformer」正文末尾补一句自然提到「RAG 检索增强生成」的话。
// 之后打印改动前后的 {nodes, links, explicit, auto} 与该提及边指向。
require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE = 'http://localhost:3000/api';
const USER_ID = '6aaca100d127198b70388a0d';
const token = jwt.sign({ user: { id: USER_ID } }, process.env.JWT_SECRET, { expiresIn: '1h' });

// 上一版写错的落点：和已有显式引用同向，会被显式边盖住，撤掉
const LEGACY_SOURCE_TITLE = 'RAG 检索增强生成';
const LEGACY_SENTENCE =
  '在实现 RAG 时，检索到的片段最终仍由大模型生成回答；理解 注意力机制与 Transformer 里的注意力权重分配，有助于判断片段该塞多长、塞几段。';

// 本次真正要造的提及边：注意力机制与 Transformer --(正文提及)--> RAG 检索增强生成
const SOURCE_TITLE = '注意力机制与 Transformer';
const TARGET_TITLE = 'RAG 检索增强生成';
const SENTENCE =
  '顺带一提，像 RAG 检索增强生成 这类系统把检索到的片段控制在几段以内，正是因为这个限制：序列越长，注意力越难把关键信息压到需要的位置上。';

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'x-auth-token': token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function allPoints() {
  const res = await call('GET', '/knowledge-points');
  return res.data || [];
}

function edgeSummary(graph, titleById) {
  const links = graph?.links || [];
  const auto = links.filter((l) => l.kind === 'auto');
  const explicit = links.filter((l) => l.kind !== 'auto');
  const name = (id) => titleById[id] || id;
  return {
    nodes: (graph?.nodes || []).length,
    links: links.length,
    explicit: explicit.length,
    auto: auto.length,
    autoPairs: auto.map((l) => `${name(l.source)} -> ${name(l.target)}`),
  };
}

async function patchContent(point, remove, add) {
  const detail = await call('GET', `/knowledge-points/${point._id}`);
  const before = detail.data.content || '';
  let next = before;
  if (remove && next.includes(remove)) next = next.replace(`\n\n${remove}`, '').replace(remove, '');
  const needsAdd = Boolean(add) && !next.includes(add);
  if (needsAdd) next = `${next.trimEnd()}\n\n${add}`;
  if (next === before) {
    console.log(`· 「${point.title}」无需改动（${before.length} 字）`);
    return false;
  }
  const res = await call('PUT', `/knowledge-points/${point._id}`, { content: next });
  console.log(`· 「${point.title}」已更新：${before.length} → ${res.data?.content?.length} 字（${res.status}）`);
  return true;
}

(async () => {
  const points = await allPoints();
  const titleById = {};
  points.forEach((p) => {
    titleById[p._id] = p.title;
  });

  const before = edgeSummary((await call('GET', '/graph/knowledge-map')).data, titleById);
  console.log('改动前：', JSON.stringify(before));

  const legacy = points.find((p) => p.title === LEGACY_SOURCE_TITLE);
  if (legacy) await patchContent(legacy, LEGACY_SENTENCE, null);

  const source = points.find((p) => p.title === SOURCE_TITLE);
  const target = points.find((p) => p.title === TARGET_TITLE);
  if (!source || !target) {
    console.error(`找不到知识点：source=${Boolean(source)} target=${Boolean(target)}`);
    process.exit(1);
  }
  await patchContent(source, null, SENTENCE);

  const after = edgeSummary((await call('GET', '/graph/knowledge-map')).data, titleById);
  console.log('改动后：', JSON.stringify(after));

  const expected = `${SOURCE_TITLE} -> ${TARGET_TITLE}`;
  const hit = after.autoPairs.includes(expected);
  console.log(hit ? `[PASS] 提及边已出现：${expected}` : `[FAIL] 未出现 ${expected}`);
  process.exit(hit ? 0 : 1);
})().catch((e) => {
  console.error('脚本异常：', e.message);
  process.exit(1);
});
