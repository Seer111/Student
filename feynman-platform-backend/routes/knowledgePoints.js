// 知识点路由：知识点的增删改查（全部需要登录认证）
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const KnowledgePoint = require('../models/KnowledgePoint');
// RAG 向量化服务（10课）：知识点创建/更新时自动写入向量库（异步，不阻塞响应）
const { addKnowledgePointToStore } = require('../services/vectorStoreService');

// @route   POST /api/knowledge-points
// @desc    创建一个新的知识点
// @access  Private（需要登录）
router.post('/', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const newKp = new KnowledgePoint({
      title,
      content,
      user: req.user.id, // 从认证中间件附加的 req.user 中获取当前用户 ID
    });
    const kp = await newKp.save();

    // 异步写入向量库（10课 RAG 索引）：不阻塞响应，失败仅记录日志不影响主流程
    addKnowledgePointToStore(kp).catch((err) =>
      console.warn('[vectorStore] 知识点创建后索引失败（不影响知识点保存）：', err.message),
    );

    res.json(kp);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
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
    res.status(500).send('Server Error');
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
    res.status(500).send('Server Error');
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
    const { title, content, status, reviewList } = req.body;
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (status !== undefined) updates.status = status;
    if (reviewList !== undefined) updates.reviewList = reviewList;

    const updatedKp = await KnowledgePoint.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true },
    );

    // 内容发生变化时重新索引（10课 RAG）：向量库不支持高效删除，教学项目直接追加新块
    if (content !== undefined && content !== kp.content) {
      addKnowledgePointToStore(updatedKp).catch((err) =>
        console.warn('[vectorStore] 知识点更新后重新索引失败（不影响保存）：', err.message),
      );
    }

    res.json(updatedKp);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
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
    res.json({ msg: 'Knowledge point removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
