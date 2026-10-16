// 知识图谱路由（12课）：生成知识图谱所需的节点与边数据
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const KnowledgePoint = require('../models/KnowledgePoint');

// 节点大小的统一口径：sizeValue = min(关联数, 6)
// 2D 图谱（ECharts symbolSize）与 3D 知识宇宙（球体 scale）都从这一个值换算，
// 保证两个视图里"越大"代表同一件事：这个知识点关联的其它知识点越多。
const SIZE_CAP = 6;

// @route   GET /api/graph/knowledge-map
// @desc    获取当前用户的知识图谱数据（ECharts graph 格式：nodes + links）
// @access  Private
router.get('/knowledge-map', auth, async (req, res) => {
  try {
    const kps = await KnowledgePoint.find({ user: req.user.id });

    if (kps.length === 0) {
      return res.json({ nodes: [], links: [] });
    }

    const idSet = new Set(kps.map((kp) => kp._id.toString()));

    // 标题索引只用于"自动发现"（正文里提到标题）；同名标题只保留第一条，避免互相覆盖
    const titleMap = new Map();
    kps.forEach((kp) => {
      if (!titleMap.has(kp.title)) titleMap.set(kp.title, kp._id.toString());
    });

    const links = [];
    const edgeKeys = new Set(); // 'source->target'：显式引用优先，同一条边不会被两种来源重复添加
    const degreeById = new Map(kps.map((kp) => [kp._id.toString(), 0]));

    const pushLink = (source, target, kind) => {
      if (source === target) return;
      const key = `${source}->${target}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      links.push({
        source,
        target,
        kind, // explicit = 手动建立的引用；auto = 正文里写到了对方的标题（自动发现）
        label: { show: true, formatter: kind === 'explicit' ? '引用' : '提及' },
      });
      degreeById.set(source, (degreeById.get(source) || 0) + 1);
      degreeById.set(target, (degreeById.get(target) || 0) + 1);
    };

    // 1) 显式引用（一等数据：存在知识点自己的 references 字段里，改标题也不会断）
    kps.forEach((kp) => {
      (kp.references || []).forEach((refId) => {
        const target = refId.toString();
        if (idSet.has(target)) pushLink(kp._id.toString(), target, 'explicit');
      });
    });

    // 2) 正文提及（自动发现，保留原有能力）：A 的正文里出现了 B 的完整标题 → A 提及 B
    kps.forEach((sourceKp) => {
      const sourceId = sourceKp._id.toString();
      titleMap.forEach((targetId, targetTitle) => {
        if (sourceKp.content.includes(targetTitle)) pushLink(sourceId, targetId, 'auto');
      });
    });

    // 节点：每个知识点一个节点，附带状态、关联数与统一口径的 sizeValue
    const nodes = kps.map((kp) => {
      const id = kp._id.toString();
      const degree = degreeById.get(id) || 0;
      const sizeValue = Math.min(degree, SIZE_CAP);
      return {
        id,
        name: kp.title,
        value: kp.content.substring(0, 100), // 截取内容摘要用于 tooltip
        status: kp.status,
        reviewList: kp.reviewList,
        category: kp.reviewList ? 2 : { not_started: 0, in_progress: 1, mastered: 3 }[kp.status] ?? 0,
        degree, // 关联的其它知识点数量（引用 + 提及）
        sizeValue, // 0~6，视图据此换算视觉大小（2D: symbolSize；3D: 球体 scale）
        symbolSize: 20 + sizeValue * 6, // 2D 图谱直接使用；3D 用同一个 sizeValue 换算
      };
    });

    res.json({ nodes, links });
  } catch (error) {
    console.error('Error generating knowledge graph:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
