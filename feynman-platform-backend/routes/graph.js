// 知识图谱路由（12课）：生成知识图谱所需的节点与边数据
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const KnowledgePoint = require('../models/KnowledgePoint');

// @route   GET /api/graph/knowledge-map
// @desc    获取当前用户的知识图谱数据（ECharts graph 格式：nodes + links）
// @access  Private
router.get('/knowledge-map', auth, async (req, res) => {
  try {
    const kps = await KnowledgePoint.find({ user: req.user.id });

    if (kps.length === 0) {
      return res.json({ nodes: [], links: [] });
    }

    // 节点：每个知识点一个节点
    // 附带 status 与 reviewList，前端据此区分节点颜色（12课挑战任务）
    const nodes = kps.map((kp) => ({
      id: kp._id.toString(),
      name: kp.title,
      value: kp.content.substring(0, 100), // 截取内容摘要用于 tooltip
      symbolSize: 20 + Math.min(kp.content.length / 50, 30), // 内容越长节点越大
      status: kp.status,
      reviewList: kp.reviewList,
      category: kp.reviewList ? 2 : { not_started: 0, in_progress: 1, mastered: 3 }[kp.status] ?? 0,
    }));

    // 边：知识点 A 的内容中出现了知识点 B 的标题，则建立 A -> B 的"引用"关系
    const links = [];
    const kpTitleMap = new Map(kps.map((kp) => [kp.title, kp._id.toString()]));

    for (const sourceKp of kps) {
      for (const [targetTitle, targetId] of kpTitleMap) {
        if (sourceKp.title === targetTitle) continue;
        if (sourceKp.content.includes(targetTitle)) {
          links.push({
            source: sourceKp._id.toString(),
            target: targetId,
            label: { show: true, formatter: '引用' },
          });
        }
      }
    }

    res.json({ nodes, links });
  } catch (error) {
    console.error('Error generating knowledge graph:', error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
