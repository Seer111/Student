// 知识点领域逻辑（从 routes/knowledgePoints.js 抽出来的，批次 25）
//
// 为什么抽出来：路由文件以前既管 HTTP（状态码、响应体），又管业务（引用校验、向量库联动、
// 悬空引用清理），一个函数里两种关注点混着，改业务时很容易顺手把状态码改错。
// 现在这里只返回数据或抛 ServiceError，路由只负责「把错误翻译成 HTTP」。
//
// 错误约定：ServiceError.status 就是响应状态码，message 就是响应里的 msg——
// 这样拆分前后前端看到的每个错误文案都保持不变。
const mongoose = require('mongoose');
const KnowledgePoint = require('../models/KnowledgePoint');
// RAG 向量化服务（10课）：知识点创建/更新/删除时同步维护向量库（异步，不阻塞响应）
const {
  addKnowledgePointToStore,
  removeKnowledgePointFromStore,
} = require('./vectorStoreService');

/** 业务错误：带上要回给前端的状态码与文案，路由层原样透出 */
class ServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
  }
}

// 校验并规范化"显式引用"列表：
// - 去重、去掉自己（自己引用自己没有意义）
// - 必须都是当前用户名下真实存在的知识点（防止越权引用别人的知识点）
// 返回 { references } 或 { error }
async function resolveReferences(rawReferences, userId, selfId) {
  if (!Array.isArray(rawReferences)) {
    return { error: 'references 必须是知识点 id 数组' };
  }
  const unique = [
    ...new Set(
      rawReferences.map((item) => String(item)).filter((item) => item && item !== String(selfId || '')),
    ),
  ];
  if (unique.some((item) => !mongoose.Types.ObjectId.isValid(item))) {
    return { error: '引用列表里有无效的知识点 id' };
  }
  if (unique.length > 0) {
    const ownedCount = await KnowledgePoint.countDocuments({ _id: { $in: unique }, user: userId });
    if (ownedCount !== unique.length) {
      return { error: '引用列表里有不存在或不属于你的知识点' };
    }
  }
  return { references: unique };
}

/**
 * 取一个「属于当前用户」的知识点，查不到抛 404、不是本人的抛 401。
 * 404 与 401 分开是为了跟拆分类前的行为保持一致（前端对 401 会跳登录）。
 */
async function findOwnedKnowledgePoint(id, userId) {
  const kp = await KnowledgePoint.findById(id);
  if (!kp) {
    throw new ServiceError(404, 'Knowledge point not found');
  }
  if (kp.user.toString() !== String(userId)) {
    throw new ServiceError(401, 'Not authorized');
  }
  return kp;
}

/** 列表：按创建时间倒序 */
async function listKnowledgePoints(userId) {
  return KnowledgePoint.find({ user: userId }).sort({ createdAt: -1 });
}

/** 详情（校验归属） */
async function getKnowledgePoint(id, userId) {
  return findOwnedKnowledgePoint(id, userId);
}

/**
 * 引用关系：它引用了谁（出边）+ 谁引用了它（入边）
 * 查不到或不属于当前用户都按 404 处理，不泄露别人数据的存在性。
 */
async function getReferenceRelations(id, userId) {
  const kp = await KnowledgePoint.findOne({ _id: id, user: userId })
    .select('title references')
    .populate('references', 'title status');
  if (!kp) {
    throw new ServiceError(404, 'Knowledge point not found');
  }

  // 入边：哪些知识点把它放进了自己的 references（只统计自己的知识点）
  const incoming = await KnowledgePoint.find({ user: userId, references: kp._id })
    .select('title status')
    .sort({ title: 1 });

  return {
    _id: kp._id,
    title: kp.title,
    // populate 遇到已删除的引用会给出 null，这里过滤掉，避免前端拿到空对象
    outgoing: (kp.references || []).filter(Boolean).map((item) => ({
      _id: item._id,
      title: item.title,
      status: item.status,
    })),
    incoming,
  };
}

/** 创建：引用可选；写库后异步进向量库（失败只记日志，不影响保存） */
async function createKnowledgePoint({ title, content, references }, userId) {
  const resolved =
    references === undefined
      ? { references: [] }
      : await resolveReferences(references, userId, null);
  if (resolved.error) {
    throw new ServiceError(400, resolved.error);
  }

  const newKp = new KnowledgePoint({
    title,
    content,
    user: userId,
    references: resolved.references,
  });
  const kp = await newKp.save();

  // 异步写入向量库（10课 RAG 索引）：不阻塞响应
  addKnowledgePointToStore(kp).catch((err) =>
    console.warn('[vectorStore] 知识点创建后索引失败（不影响知识点保存）：', err.message),
  );

  return kp;
}

/**
 * 更新：只更新请求体中实际出现的字段（未传字段不能被 undefined 覆盖清空）。
 * 正文变了要重新索引——先摘旧块再写新块，否则库里会留下同一知识点的多份版本。
 */
async function updateKnowledgePoint(id, userId, payload) {
  const kp = await findOwnedKnowledgePoint(id, userId);

  const updates = {};
  const { title, content, status, reviewList, references } = payload;
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (status !== undefined) updates.status = status;
  if (reviewList !== undefined) updates.reviewList = reviewList;
  if (references !== undefined) {
    const resolved = await resolveReferences(references, userId, id);
    if (resolved.error) {
      throw new ServiceError(400, resolved.error);
    }
    updates.references = resolved.references;
  }

  const updatedKp = await KnowledgePoint.findByIdAndUpdate(id, { $set: updates }, { new: true });

  if (content !== undefined && content !== kp.content) {
    removeKnowledgePointFromStore(updatedKp._id)
      .then(() => addKnowledgePointToStore(updatedKp))
      .catch((err) =>
        console.warn('[vectorStore] 知识点更新后重新索引失败（不影响保存）：', err.message),
      );
  }

  return updatedKp;
}

/**
 * 删除：连带清理「悬空引用」与向量库里的块。
 * 悬空引用不清理的话，被引用方删掉后引用方再保存会被引用校验拦下来。
 */
async function deleteKnowledgePoint(id, userId) {
  await findOwnedKnowledgePoint(id, userId);

  await KnowledgePoint.findByIdAndDelete(id);

  await KnowledgePoint.updateMany(
    { user: userId, references: id },
    { $pull: { references: id } },
  );

  removeKnowledgePointFromStore(id).catch((err) =>
    console.warn('[vectorStore] 知识点删除后清理向量失败（不影响删除）：', err.message),
  );
}

module.exports = {
  ServiceError,
  resolveReferences,
  listKnowledgePoints,
  getKnowledgePoint,
  getReferenceRelations,
  createKnowledgePoint,
  updateKnowledgePoint,
  deleteKnowledgePoint,
};
