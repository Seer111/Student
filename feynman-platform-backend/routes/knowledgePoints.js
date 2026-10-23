// 知识点路由：只负责 HTTP（挂中间件、翻译错误、返回响应）
// 业务逻辑都在 services/knowledgePointService.js（批次 25 抽离）
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  ServiceError,
  listKnowledgePoints,
  getKnowledgePoint,
  getReferenceRelations,
  createKnowledgePoint,
  updateKnowledgePoint,
  deleteKnowledgePoint,
} = require('../services/knowledgePointService');

/**
 * 统一收口：ServiceError 带着业务状态码（400/401/404）原样回给前端，
 * 其它异常一律 500。拆分前每个 handler 里各写一遍的 try/catch 收敛到这里。
 */
function handle(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (err instanceof ServiceError) {
        return res.status(err.status).json({ msg: err.message });
      }
      console.error(err.message);
      res.status(500).json({ msg: 'Server Error' });
    }
  };
}

// @route   POST /api/knowledge-points
// @desc    创建一个新的知识点
// @access  Private（需要登录）
router.post(
  '/',
  auth,
  handle(async (req, res) => {
    const { title, content, references } = req.body;
    const kp = await createKnowledgePoint({ title, content, references }, req.user.id);
    res.json(kp);
  }),
);

// @route   GET /api/knowledge-points
// @desc    获取当前用户的所有知识点（按创建时间倒序）
// @access  Private
router.get(
  '/',
  auth,
  handle(async (req, res) => {
    res.json(await listKnowledgePoints(req.user.id));
  }),
);

// @route   GET /api/knowledge-points/:id
// @desc    获取单个知识点详情（仅限知识点所属用户）
// @access  Private
router.get(
  '/:id',
  auth,
  handle(async (req, res) => {
    res.json(await getKnowledgePoint(req.params.id, req.user.id));
  }),
);

// @route   GET /api/knowledge-points/:id/references
// @desc    查看一个知识点的引用关系：它引用了谁（出边）+ 谁引用了它（入边）
// @access  Private
router.get(
  '/:id/references',
  auth,
  handle(async (req, res) => {
    res.json(await getReferenceRelations(req.params.id, req.user.id));
  }),
);

// @route   PUT /api/knowledge-points/:id
// @desc    更新一个知识点
// @access  Private
router.put(
  '/:id',
  auth,
  handle(async (req, res) => {
    res.json(await updateKnowledgePoint(req.params.id, req.user.id, req.body));
  }),
);

// @route   DELETE /api/knowledge-points/:id
// @desc    删除一个知识点
// @access  Private
router.delete(
  '/:id',
  auth,
  handle(async (req, res) => {
    await deleteKnowledgePoint(req.params.id, req.user.id);
    res.json({ msg: 'Knowledge point removed' });
  }),
);

module.exports = router;
