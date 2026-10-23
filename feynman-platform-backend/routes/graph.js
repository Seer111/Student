// 知识图谱路由（12课）：只负责取数据 + 回包；节点与边的规则在 services/graphService.js（纯函数，可单测）
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const KnowledgePoint = require('../models/KnowledgePoint');
const { buildKnowledgeGraph } = require('../services/graphService');

// @route   GET /api/graph/knowledge-map
// @desc    获取当前用户的知识图谱数据（ECharts graph 格式：nodes + links）
// @access  Private
router.get('/knowledge-map', auth, async (req, res) => {
  try {
    const kps = await KnowledgePoint.find({ user: req.user.id });
    res.json(buildKnowledgeGraph(kps));
  } catch (error) {
    console.error('Error generating knowledge graph:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
