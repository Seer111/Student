// 向量存储服务（10课 & 11课 RAG 核心）
// 职责：文本分割 -> 向量化（百度千帆 Embedding）-> 本地向量库存储 -> 相似度检索
// 说明：课程原方案使用 LangChain.js + HNSWLib。为保证依赖轻量、跨平台稳定，
//       这里使用 hnswlib-node（HNSW 算法的 Node 绑定，性能高、可本地文件持久化）。
const fs = require('fs');
const path = require('path');
const { embedding } = require('../utils/llmService');

// 向量库文件目录（后端根目录下）
const VECTOR_STORE_PATH = path.join(__dirname, '..', 'vector_store');
const INDEX_FILE = path.join(VECTOR_STORE_PATH, 'hnswlib.index');
// 元数据文件：保存每个向量对应的文本内容、知识点ID等（与索引文件配套）
const DOCS_FILE = path.join(VECTOR_STORE_PATH, 'docs.json');

// 文本分割参数
const CHUNK_SIZE = 500; // 每个文本块的最大字符数
const CHUNK_OVERLAP = 50; // 块之间的重叠字符数，保证语义连续性

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

/** 向量库是否已初始化（用于查询前的快速判断） */
function isStoreReady() {
  return fs.existsSync(INDEX_FILE) && fs.existsSync(DOCS_FILE);
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
  console.log(`[vectorStore] 知识点 ${kp._id} 的 ${chunks.length} 个向量已保存。`);
  return chunks.length;
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

  const docs = readDocs();
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

module.exports = {
  addKnowledgePointToStore,
  queryVectorStore,
  clearVectorStore,
  isStoreReady,
  splitText,
};
