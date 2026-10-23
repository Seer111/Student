// 向量存储服务（10课 & 11课 RAG 核心）
// 职责：文本分割 -> 向量化（百度千帆 Embedding）-> 本地向量库存储 -> 相似度检索
// 说明：课程原方案使用 LangChain.js + HNSWLib。为保证依赖轻量、跨平台稳定，
//       这里使用 hnswlib-node（HNSW 算法的 Node 绑定，性能高、可本地文件持久化）。
//
// 删除语义（HNSW 没有真正的删除，只有"标记删除"）：一个知识点被删除时同时做两件事——
//   1) 元数据打墓碑（deleted: true）：查询时直接过滤，纯 JS 降级路径也靠它；
//   2) 可用时调用 hnswlib 的 markDelete：被标记的点不再进入检索结果，也不再占用候选名额。
//   墓碑多了会白占索引槽位，所以超过阈值时自动重建一次索引（compactVectorStore）。
//
// 三层实现（对应上面 1) 2)，加上第三层重建）：
//   1) 墓碑 tombstone —— docs.json 里给块打 deleted: true（tombstoneChunks）；所有查询先过 liveDocs()
//   2) 索引标记删除 markDelete —— 让死块不再进入 searchKnn、不占候选名额；失败不致命，墓碑兜底
//   3) 重建 compactVectorStore —— 丢墓碑、重新向量化存活块、label 重排；由 shouldCompact() 判断时机
// 对外入口只有两个：removeKnowledgePointFromStore（知识点被删/被改）与 compactVectorStore。
const fs = require('fs');
const path = require('path');
const { embedding } = require('../utils/llmService');

// 向量库文件目录（后端根目录下）
const VECTOR_STORE_PATH = path.join(__dirname, '..', 'vector_store');
const INDEX_FILE = path.join(VECTOR_STORE_PATH, 'hnswlib.index');
// 元数据文件：保存每个向量对应的文本内容、知识点ID等（与索引文件配套）
const DOCS_FILE = path.join(VECTOR_STORE_PATH, 'docs.json');
// 索引元信息：向量维度等（删除/重建索引时要按同维度构造 HNSW 实例）
const META_FILE = path.join(VECTOR_STORE_PATH, 'meta.json');

// 文本分割参数
const CHUNK_SIZE = 500; // 每个文本块的最大字符数
const CHUNK_OVERLAP = 50; // 块之间的重叠字符数，保证语义连续性

// 自动重建阈值：墓碑块占比 ≥ 30% 且总块数 ≥ 20 时重建索引（教学场景数据量小，重建很便宜）
const COMPACT_TOMBSTONE_RATIO = 0.3;
const COMPACT_MIN_DOCS = 20;

// 尝试加载 hnswlib-node（原生模块，安装失败时降级为纯 JS 余弦检索）
let HierarchicalNSW = null;
try {
  ({ HierarchicalNSW } = require('hnswlib-node'));
} catch (e) {
  console.warn('[vectorStore] hnswlib-node 未安装或加载失败，将使用纯 JS 余弦检索降级方案：', e.message);
}

/**
 * 简易文本分割器：尽量按段落/句号切分，避免在句子中间硬切；
 * 块之间保留 overlap 重叠字符，保证上下文语义连续。
 * @param {string} text - 原始长文本
 * @returns {string[]} - 文本块数组
 */
function splitText(text) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    // 在块尾附近寻找最近的句号/换行作为更优切分点
    if (end < text.length) {
      const window = text.slice(Math.max(start + CHUNK_SIZE / 2, start), end);
      const lastBreak = Math.max(window.lastIndexOf('\n'), window.lastIndexOf('。'));
      if (lastBreak > -1) {
        end = Math.max(start + CHUNK_SIZE / 2, start) + lastBreak + 1;
      }
    }
    chunks.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.length > 0);
}

/** 读取元数据文件（不存在时返回空数组） */
function readDocs() {
  try {
    return JSON.parse(fs.readFileSync(DOCS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

/** 写入元数据文件 */
function writeDocs(docs) {
  fs.mkdirSync(VECTOR_STORE_PATH, { recursive: true });
  fs.writeFileSync(DOCS_FILE, JSON.stringify(docs), 'utf8');
}

/** 读取索引元信息（不存在时返回空对象） */
function readMeta() {
  try {
    return JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

/** 合并写入索引元信息 */
function writeMeta(patch) {
  const meta = { ...readMeta(), ...patch, updatedAt: new Date().toISOString() };
  fs.mkdirSync(VECTOR_STORE_PATH, { recursive: true });
  fs.writeFileSync(META_FILE, JSON.stringify(meta), 'utf8');
  return meta;
}

/** 向量库是否已初始化（用于查询前的快速判断） */
function isStoreReady() {
  return fs.existsSync(INDEX_FILE) && fs.existsSync(DOCS_FILE);
}

/** 存活的块（不带墓碑） */
function liveDocs(docs = readDocs()) {
  return docs.filter((doc) => !doc.deleted);
}

/**
 * 某个知识点当前还活着的块（纯函数，不读盘）
 * 单独抽出来是为了让「哪些块该摘」这个判断可以脱离文件系统测试。
 * @param {Array} docs - docs.json 里的全部块
 * @param {string} knowledgePointId
 * @returns {Array} 该知识点的存活块（顺序与入参一致）
 */
function chunksOfKnowledgePoint(docs, knowledgePointId) {
  const id = String(knowledgePointId);
  return docs.filter((doc) => doc.knowledgePointId === id && !doc.deleted);
}

/**
 * 给某个知识点的存活块打墓碑（就地修改传入的数组，纯函数不读盘）
 * 幂等：已经打过墓碑的块会被 chunksOfKnowledgePoint 过滤掉，重复调用返回空数组。
 * @returns {Array} 本次被打上墓碑的块（调用方据此决定要不要调 markDelete）
 */
function tombstoneChunks(docs, knowledgePointId) {
  const targets = chunksOfKnowledgePoint(docs, knowledgePointId);
  targets.forEach((doc) => {
    doc.deleted = true;
  });
  return targets;
}

/**
 * 是否该重建索引回收槽位（纯函数，纯算术，便于阈值回归测试）
 * 两个条件同时成立才重建：总块数够多（重建要重新向量化，代价不小）+ 墓碑占比够高。
 * @param {number} totalDocs - docs.json 里的总块数（含墓碑）
 * @param {number} tombstones - 其中墓碑的块数
 * @returns {boolean}
 */
function shouldCompact(totalDocs, tombstones) {
  if (totalDocs < COMPACT_MIN_DOCS) return false;
  return tombstones / totalDocs >= COMPACT_TOMBSTONE_RATIO;
}

/**
 * 将单个知识点内容向量化并写入向量库（10课）
 * @param {object} kp - 知识点对象，需要 _id、title、content、user 字段
 * @returns {Promise<number>} - 本次写入的文本块数量
 */
async function addKnowledgePointToStore(kp) {
  const chunks = splitText(kp.content);
  if (chunks.length === 0) return 0;

  console.log(`[vectorStore] 知识点「${kp.title}」被分割成 ${chunks.length} 个文本块，正在向量化...`);
  const vectors = await embedding(chunks);

  const docs = readDocs();
  let nextLabel = docs.length;

  if (HierarchicalNSW) {
    // --- hnswlib 路径：向量写入 HNSW 索引，文本写入 docs.json ---
    const dim = vectors[0].length;
    let index = new HierarchicalNSW('cosine', dim);

    if (isStoreReady()) {
      // 已有索引：加载后追加
      index.readIndexSync(INDEX_FILE, true);
    } else {
      // 新建索引（maxElements 预留一定余量，超出后 hnswlib 会抛出需要 resize 的错误；
      // 教学场景数据量有限，这里给一个较大的初始容量）
      index.initIndex(100000, 16, 200, 100);
    }
    // hnswlib-node v3 中 efSearch 更名为 setEf
    index.setEf(100);

    vectors.forEach((vector, i) => {
      index.addPoint(vector, nextLabel + i);
    });
    index.writeIndexSync(INDEX_FILE);
    console.log('[vectorStore] HNSW 索引已更新，当前向量总数：', index.getCurrentCount());
  } else {
    // --- 纯 JS 降级路径：向量直接存 JSON，查询时全量计算余弦相似度 ---
    console.warn('[vectorStore] 使用纯 JS 降级存储（数据量大时检索速度较慢）');
  }

  chunks.forEach((chunk, i) => {
    docs.push({
      label: nextLabel + i,
      content: chunk,
      knowledgePointId: kp._id.toString(),
      title: kp.title,
      userId: kp.user.toString(),
      vector: HierarchicalNSW ? null : vectors[i], // 降级模式下才在 JSON 里存向量
    });
  });
  writeDocs(docs);
  // 记下向量维度：删除/重建索引时要按同维度构造 HNSW 实例
  writeMeta({ dim: vectors[0].length, dimSource: 'embedding' });
  console.log(`[vectorStore] 知识点 ${kp._id} 的 ${chunks.length} 个向量已保存。`);
  return chunks.length;
}

/**
 * 从向量库中摘掉某个知识点的全部块（知识点被删除 / 正文被改写时调用）
 * - 元数据打墓碑：查询直接过滤，降级路径同样生效
 * - HNSW 标记删除：死块不再进入检索结果
 * - 墓碑占比过高时自动重建索引回收槽位
 * @param {string} knowledgePointId
 * @returns {Promise<number>} 本次摘掉的块数
 */
async function removeKnowledgePointFromStore(knowledgePointId) {
  const id = String(knowledgePointId);
  const docs = readDocs();
  // 「哪些块该摘」交给纯函数判断，方便单测；这里只负责把结果落盘
  const targets = tombstoneChunks(docs, id);
  if (targets.length === 0) {
    console.log(`[vectorStore] 知识点 ${id} 在向量库里没有存活块（可能从未索引过）`);
    return 0;
  }
  writeDocs(docs);

  // 2) HNSW 标记删除（没有 meta.json 的旧库会跳过，靠墓碑兜底，下次重建即回收）
  const meta = readMeta();
  if (HierarchicalNSW && meta.dim && fs.existsSync(INDEX_FILE)) {
    try {
      const index = new HierarchicalNSW('cosine', meta.dim);
      index.readIndexSync(INDEX_FILE, true);
      targets.forEach((doc) => index.markDelete(doc.label));
      index.writeIndexSync(INDEX_FILE);
      console.log(
        `[vectorStore] 已在 HNSW 索引标记删除 ${targets.length} 个块（知识点 ${id}），存活向量数：`,
        liveDocs().length,
      );
    } catch (err) {
      console.warn('[vectorStore] HNSW 标记删除失败，已用元数据墓碑兜底：', err.message);
    }
  } else if (targets.length > 0) {
    console.log(`[vectorStore] 知识点 ${id} 的 ${targets.length} 个块已打墓碑（索引标记删除跳过：${meta.dim ? '无索引文件' : '缺 meta.json'}）`);
  }

  await maybeCompact();
  return targets.length;
}

/**
 * 重建索引：丢掉墓碑块、重新向量化存活块、label 重新编号 0..n-1
 * 用于回收 HNSW 无法真正释放的槽位，也能顺手清掉历史重复块
 * @returns {Promise<number>} 重建后保留的块数
 */
async function compactVectorStore() {
  const docs = readDocs();
  const live = liveDocs(docs);
  const dropped = docs.length - live.length;

  if (live.length === 0) {
    // 一块都不剩：直接清空索引与元数据
    if (fs.existsSync(INDEX_FILE)) fs.rmSync(INDEX_FILE, { force: true });
    writeDocs([]);
    writeMeta({ dim: null, count: 0 });
    console.log(`[vectorStore] 存活块为 0，索引已清空（丢弃墓碑 ${dropped} 块）`);
    return 0;
  }

  console.log(`[vectorStore] 开始重建索引：保留 ${live.length} 块，丢弃墓碑 ${dropped} 块，重新向量化...`);
  const vectors = await embedding(live.map((doc) => doc.content));

  if (HierarchicalNSW) {
    const dim = vectors[0].length;
    const index = new HierarchicalNSW('cosine', dim);
    index.initIndex(100000, 16, 200, 100);
    index.setEf(100);
    vectors.forEach((vector, i) => index.addPoint(vector, i));
    index.writeIndexSync(INDEX_FILE);
    writeMeta({ dim, count: live.length });
    console.log('[vectorStore] HNSW 索引已重建，向量总数：', index.getCurrentCount());
  }

  const rebuilt = live.map((doc, i) => ({
    ...doc,
    label: i, // label 与索引一起重排，保证两边始终一致
    vector: HierarchicalNSW ? null : vectors[i],
  }));
  writeDocs(rebuilt);
  console.log(`[vectorStore] 重建完成：保留 ${rebuilt.length} 块，label 重排为 0~${rebuilt.length - 1}`);
  return rebuilt.length;
}

/** 墓碑占比超过阈值时自动重建一次索引 */
async function maybeCompact() {
  const docs = readDocs();
  const tombstones = docs.length - liveDocs(docs).length;
  if (shouldCompact(docs.length, tombstones)) {
    console.log(
      `[vectorStore] 墓碑块 ${tombstones}/${docs.length}（${Math.round((tombstones / docs.length) * 100)}%）超过阈值，自动重建索引`,
    );
    return compactVectorStore();
  }
  return 0;
}

/** 计算两个向量的余弦相似度（降级方案使用） */
function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * 从向量库中检索与问题最相关的文档片段（11课）
 * @param {string} query - 用户问题
 * @param {object} options - { userId, k } userId 用于隔离用户数据，k 为返回条数
 * @returns {Promise<Array<{content, knowledgePointId, title}>>}
 */
async function queryVectorStore(query, options = {}) {
  const { userId, k = 4 } = options;

  if (!isStoreReady()) {
    return []; // 向量库尚未建立（还没有任何知识点被索引）
  }

  // 墓碑块（知识点已删除/已改写）一律不参与检索
  const docs = liveDocs();
  if (docs.length === 0) return [];

  const queryVector = (await embedding([query]))[0];
  let results;

  if (HierarchicalNSW) {
    // hnswlib 不支持原生过滤，先多取一些候选再按用户过滤
    const dim = queryVector.length;
    const index = new HierarchicalNSW('cosine', dim);
    index.readIndexSync(INDEX_FILE, true);
    index.setEf(100);

    const candidates = index.searchKnn(queryVector, Math.min(docs.length, k * 10 + 20));
    const labelSet = new Set(candidates.neighbors);
    results = docs.filter((doc) => labelSet.has(doc.label));
  } else {
    // 纯 JS 降级：全量余弦相似度排序
    results = docs
      .map((doc) => ({ doc, score: cosineSimilarity(queryVector, doc.vector) }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.doc);
  }

  // 按用户隔离：只返回当前用户自己知识点的片段
  if (userId) {
    results = results.filter((doc) => doc.userId === userId.toString());
  }

  return results.slice(0, k).map((doc) => ({
    content: doc.content,
    knowledgePointId: doc.knowledgePointId,
    title: doc.title,
  }));
}

/**
 * 清空整个向量库（删除本地索引与元数据文件），供调试与重置使用
 */
function clearVectorStore() {
  if (fs.existsSync(VECTOR_STORE_PATH)) {
    fs.rmSync(VECTOR_STORE_PATH, { recursive: true, force: true });
  }
  console.log('[vectorStore] 向量库已清空');
}

/** 向量库概览（调试/自检用） */
function storeStats() {
  const docs = readDocs();
  const live = liveDocs(docs);
  const byKp = {};
  live.forEach((doc) => {
    byKp[doc.knowledgePointId] = (byKp[doc.knowledgePointId] || 0) + 1;
  });
  return {
    total: docs.length,
    live: live.length,
    tombstones: docs.length - live.length,
    knowledgePoints: Object.keys(byKp).length,
    chunksByKnowledgePoint: byKp,
    dim: readMeta().dim || null,
    indexExists: fs.existsSync(INDEX_FILE),
  };
}

/**
 * 列出当前存活块（对账/维护脚本用）：按 label 升序，只暴露必要字段，不带向量
 * @returns {Array<{label, content, knowledgePointId, title, userId}>}
 */
function listLiveChunks() {
  return liveDocs()
    .map(({ label, content, knowledgePointId, title, userId }) => ({
      label,
      content,
      knowledgePointId,
      title,
      userId,
    }))
    .sort((a, b) => a.label - b.label);
}

module.exports = {
  addKnowledgePointToStore,
  removeKnowledgePointFromStore,
  compactVectorStore,
  queryVectorStore,
  clearVectorStore,
  isStoreReady,
  storeStats,
  splitText,
  listLiveChunks,
  // 纯函数，导出给自检脚本与单测用（不读盘、不改盘）
  chunksOfKnowledgePoint,
  tombstoneChunks,
  shouldCompact,
};
