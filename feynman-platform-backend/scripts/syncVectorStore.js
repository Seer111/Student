// 向量库对账脚本（可重复运行）：把 MongoDB 里的知识点与本地向量库对齐
//
// 为什么需要它：只有走接口（POST/PUT/DELETE /api/knowledge-points）的增删改才会进向量库，
// 直接写库（批量播种脚本、手工改库、数据迁移）不会 —— 于是出现「库里有、向量库没有」的缺口，
// 表现就是 RAG 问答检索不到那些知识点。这个脚本把缺口补齐、把孤儿块摘掉，跑几次都一样。
//
// 用法（在 feynman-platform-backend 目录下）：
//   npm run vectors:sync              # 对账并修复：缺的补、正文变了的重建、孤儿块摘掉
//   npm run vectors:sync -- --dry-run # 只打印差异，不改任何数据
//   npm run vectors:sync -- --verify  # 修完再逐个知识点检索一次，核对可检索性（会调 embedding）
//
// 判定口径（与 services/vectorStoreService.js 保持一致）：
//   期望块 = splitText(kp.content)
//   实际块 = 向量库里该知识点的存活块（按 label 升序）
//   长度或任一块内容不一致 => 重建（先 remove 再 add，避免留下旧版本碎片）
require('dotenv').config();
const mongoose = require('mongoose');
const KnowledgePoint = require('../models/KnowledgePoint');
const {
  addKnowledgePointToStore,
  removeKnowledgePointFromStore,
  queryVectorStore,
  listLiveChunks,
  splitText,
  storeStats,
} = require('../services/vectorStoreService');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERIFY = args.includes('--verify');

/** 按知识点分组存活块（label 是追加顺序，按它排即可还原 splitText 的块序） */
function groupLiveChunksByKnowledgePoint() {
  const byKp = new Map();
  listLiveChunks().forEach((chunk) => {
    if (!byKp.has(chunk.knowledgePointId)) byKp.set(chunk.knowledgePointId, []);
    byKp.get(chunk.knowledgePointId).push(chunk);
  });
  return byKp;
}

/** 期望块与实际块是否一致 */
function sameChunks(expected, actualChunks) {
  if (expected.length !== actualChunks.length) return false;
  return expected.every((text, i) => text === actualChunks[i].content);
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('缺少环境变量 MONGO_URI，请参考 .env.example 配置 .env 文件');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  const kps = await KnowledgePoint.find({}).lean();
  const byKp = groupLiveChunksByKnowledgePoint();
  const kpIds = new Set(kps.map((kp) => kp._id.toString()));

  const consistent = [];
  const toReindex = [];
  const toDrop = [];

  kps.forEach((kp) => {
    const expected = splitText(kp.content || '');
    const actual = byKp.get(kp._id.toString()) || [];
    if (expected.length === 0 && actual.length === 0) {
      consistent.push({ title: kp.title, reason: '正文为空，无需索引' });
    } else if (sameChunks(expected, actual)) {
      consistent.push({ title: kp.title, reason: `${actual.length} 块一致` });
    } else {
      toReindex.push({
        kp,
        expected: expected.length,
        actual: actual.length,
        reason: actual.length === 0 ? '从未索引' : '正文已变（块数或内容不一致）',
      });
    }
  });

  byKp.forEach((chunks, id) => {
    if (!kpIds.has(id)) toDrop.push({ id, title: chunks[0].title, chunks: chunks.length });
  });

  const before = storeStats();
  console.log(`\nMongoDB 知识点 ${kps.length} 个；向量库存活块 ${before.live} 个 / 覆盖 ${byKp.size} 个知识点`);
  console.log(`一致 ${consistent.length} 个 / 需要重建 ${toReindex.length} 个 / 孤儿 ${toDrop.length} 组`);

  if (toReindex.length) {
    console.log('\n需要重建：');
    toReindex.forEach((item) =>
      console.log(`  - ${item.kp.title}（${item.reason}：${item.actual} -> ${item.expected} 块）`),
    );
  }
  if (toDrop.length) {
    console.log('\n孤儿块（知识点已不在 MongoDB 里）：');
    toDrop.forEach((item) => console.log(`  - ${item.title}（${item.chunks} 块，id ${item.id}）`));
  }

  if (DRY_RUN) {
    console.log('\n--dry-run：未修改任何数据');
  } else {
    // 重建：先摘后写，正文改写过的知识点不会留下旧版本碎片
    for (const item of toReindex) {
      await removeKnowledgePointFromStore(item.kp._id);
      const written = await addKnowledgePointToStore(item.kp);
      console.log(`[sync] 已重建「${item.kp.title}」：${written} 块`);
    }
    for (const item of toDrop) {
      const removed = await removeKnowledgePointFromStore(item.id);
      console.log(`[sync] 已摘掉孤儿块「${item.title}」：${removed} 块`);
    }
    console.log(`\n[sync] 修复完成：重建 ${toReindex.length} 个知识点，摘掉 ${toDrop.length} 组孤儿块`);
  }

  const after = storeStats();
  console.log(
    `[sync] 向量库现状：存活 ${after.live} 块 / 覆盖 ${after.knowledgePoints} 个知识点 / 墓碑 ${after.tombstones} / 维度 ${after.dim}`,
  );

  if (VERIFY) {
    console.log('\n逐个知识点检索核对（k=999 取回全部候选后按 knowledgePointId 命中）：');
    let hit = 0;
    for (const kp of kps) {
      if (splitText(kp.content || '').length === 0) {
        hit += 1; // 正文为空的知识点本来就不该有块
        continue;
      }
      const results = await queryVectorStore(kp.title, { userId: kp.user, k: 999 });
      const found = results.some((doc) => doc.knowledgePointId === kp._id.toString());
      console.log(`  [${found ? 'hit ' : 'miss'}] ${kp.title}`);
      if (found) hit += 1;
    }
    console.log(`\n[verify] 可检索 ${hit}/${kps.length}`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[sync] 失败：', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
