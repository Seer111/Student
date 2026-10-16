// 知识点路由：知识点的增删改查（全部需要登录认证）
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const KnowledgePoint = require('../models/KnowledgePoint');
// RAG 向量化服务（10课）：知识点创建/更新时自动写入向量库（异步，不阻塞响应）
const {
  addKnowledgePointToStore,
  removeKnowledgePointFromStore,
} = require('../services/vectorStoreService');

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

// @route   POST /api/knowledge-points
// @desc    创建一个新的知识点
// @access  Private（需要登录）
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, references } = req.body;
    // 引用是可选字段：不传就是空引用；新建时也能直接挂上引用
    const resolved =
      references === undefined ? { references: [] } : await resolveReferences(references, req.user.id, null);
    if (resolved.error) {
      return res.status(400).json({ msg: resolved.error });
    }
    const newKp = new KnowledgePoint({
      title,
      content,
      user: req.user.id, // 从认证中间件附加的 req.user 中获取当前用户 ID
      references: resolved.references,
    });
    const kp = await newKp.save();

    // 异步写入向量库（10课 RAG 索引）：不阻塞响应，失败仅记录日志不影响主流程
    addKnowledgePointToStore(kp).catch((err) =>
      console.warn('[vectorStore] 知识点创建后索引失败（不影响知识点保存）：', err.message),
    );

    res.json(kp);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET /api/knowledge-points
// @desc    获取当前用户的所有知识点（按创建时间倒序）
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const kps = await KnowledgePoint.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(kps);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET /api/knowledge-points/:id
// @desc    获取单个知识点详情（仅限知识点所属用户）
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    // 1. 先查找知识点
    const kp = await KnowledgePoint.findById(req.params.id);
    if (!kp) {
      return res.status(404).json({ msg: 'Knowledge point not found' });
    }
    // 2. 再验证归属：确保是该用户自己的知识点
    if (kp.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    res.json(kp);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET /api/knowledge-points/:id/references
// @desc    查看一个知识点的引用关系：它引用了谁（出边）+ 谁引用了它（入边）
// @access  Private
router.get('/:id/references', auth, async (req, res) => {
  try {
    // 1. 先确认这个知识点属于当前用户（查不到就当 404，不泄露别人数据的存在性）
    const kp = await KnowledgePoint.findOne({ _id: req.params.id, user: req.user.id })
      .select('title references')
      .populate('references', 'title status');
    if (!kp) {
      return res.status(404).json({ msg: 'Knowledge point not found' });
    }

    // 2. 入边：哪些知识点把它放进了自己的 references（只统计自己的知识点）
    const incoming = await KnowledgePoint.find({ user: req.user.id, references: kp._id })
      .select('title status')
      .sort({ title: 1 });

    res.json({
      _id: kp._id,
      title: kp.title,
      // populate 遇到已删除的引用会给出 null，这里过滤掉，避免前端拿到空对象
      outgoing: (kp.references || []).filter(Boolean).map((item) => ({
        _id: item._id,
        title: item.title,
        status: item.status,
      })),
      incoming,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   PUT /api/knowledge-points/:id
// @desc    更新一个知识点
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    // 1. 先查找并验证归属
    let kp = await KnowledgePoint.findById(req.params.id);
    if (!kp) {
      return res.status(404).json({ msg: 'Knowledge point not found' });
    }
    if (kp.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    // 2. 更新字段：只更新请求体中实际出现的字段，避免未传字段被 undefined 覆盖清空
    const updates = {};
    const { title, content, status, reviewList, references } = req.body;
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (status !== undefined) updates.status = status;
    if (reviewList !== undefined) updates.reviewList = reviewList;
    if (references !== undefined) {
      const resolved = await resolveReferences(references, req.user.id, req.params.id);
      if (resolved.error) {
        return res.status(400).json({ msg: resolved.error });
      }
      updates.references = resolved.references;
    }

    const updatedKp = await KnowledgePoint.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true },
    );

    // 内容发生变化时重新索引（10课 RAG）：先把旧块摘掉再写新块，
    // 否则同一知识点会在库里留下多份不同版本的碎片（检索会命中过期正文）
    if (content !== undefined && content !== kp.content) {
      removeKnowledgePointFromStore(updatedKp._id)
        .then(() => addKnowledgePointToStore(updatedKp))
        .catch((err) =>
          console.warn('[vectorStore] 知识点更新后重新索引失败（不影响保存）：', err.message),
        );
    }

    res.json(updatedKp);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   DELETE /api/knowledge-points/:id
// @desc    删除一个知识点
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // 1. 先查找并验证归属
    const kp = await KnowledgePoint.findById(req.params.id);
    if (!kp) {
      return res.status(404).json({ msg: 'Knowledge point not found' });
    }
    if (kp.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    // 2. 删除（使用 findByIdAndDelete，findByIdAndRemove 已在新版 Mongoose 中移除）
    await KnowledgePoint.findByIdAndDelete(req.params.id);
    // 3. 清理"悬空引用"：别的知识点可能引用了它，删除后要把这些引用一并摘掉
    //    （不做这一步的话，被引用方删掉后引用方再保存会被校验拦下来）
    await KnowledgePoint.updateMany(
      { user: req.user.id, references: req.params.id },
      { $pull: { references: req.params.id } },
    );
    // 4. 从向量库摘掉它的所有块（打墓碑 + HNSW 标记删除；墓碑过多时自动重建索引）
    //    不做这一步的话，RAG 检索仍会引用已删除知识点的正文
    removeKnowledgePointFromStore(req.params.id).catch((err) =>
      console.warn('[vectorStore] 知识点删除后清理向量失败（不影响删除）：', err.message),
    );
    res.json({ msg: 'Knowledge point removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
