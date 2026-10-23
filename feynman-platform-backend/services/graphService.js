// 知识图谱的数据层（12课）：从知识点列表算出节点与边。
// 这里全是纯函数——不读库、不碰 req/res，输入知识点数组，输出 { nodes, links }。
// 路由（routes/graph.js）只负责取数据与回包，规则要改就改这个文件。
//
// 边的两种来源（顺序即优先级，同一条边只出现一次）：
//   1) explicit 显式引用：知识点自己的 references 字段，改标题也不会断；
//   2) auto 正文提及：A 的正文里出现了 B 的完整标题 → A 提及 B（自动发现，可关掉不要）。
// 边上的文字不放数据里（属于「怎么画」）：2D 用实线/虚线 + 颜色 + 箭头区分，悬停看 tooltip。

// 节点大小的统一口径：sizeValue = min(关联数, 6)
// 2D 图谱（ECharts symbolSize）与 3D 知识宇宙（球体 scale）都从这一个值换算，
// 保证两个视图里「越大」代表同一件事：这个知识点关联的其它知识点越多。
const SIZE_CAP = 6;

// 状态 → 图例分类（未开始 0 / 学习中 1 / 待复习 2 / 已掌握 3）
const STATUS_CATEGORY = { not_started: 0, in_progress: 1, mastered: 3 };
const REVIEW_CATEGORY = 2;

/** 分类：待复习优先于状态（复习标记是显式动作，权重更高） */
function categoryOf(kp) {
  if (kp.reviewList) return REVIEW_CATEGORY;
  return STATUS_CATEGORY[kp.status] ?? 0;
}

/**
 * 标题索引：用于「正文提及」的自动发现
 * 同名标题只保留第一条（Map 先写先得），避免两个同名知识点互相覆盖、产生歧义边
 * @returns {Map<string, string>} title -> 知识点 id
 */
function buildTitleIndex(knowledgePoints) {
  const titleIndex = new Map();
  knowledgePoints.forEach((kp) => {
    const title = kp.title;
    if (!title) return; // 空标题会把所有正文都匹配上，直接跳过
    if (!titleIndex.has(title)) titleIndex.set(title, kp._id.toString());
  });
  return titleIndex;
}

/**
 * 算出所有边，并顺带统计每个节点的关联数（显式 + 提及，按边计）
 * @param {Array} knowledgePoints - 至少含 _id / title / content / references
 * @returns {{links: Array<{source: string, target: string, kind: 'explicit'|'auto'}>, degreeById: Map<string, number>}}
 */
function collectGraphEdges(knowledgePoints) {
  const idSet = new Set(knowledgePoints.map((kp) => kp._id.toString()));
  const titleIndex = buildTitleIndex(knowledgePoints);

  const links = [];
  const edgeKeys = new Set(); // 'source->target'：先去重，先到先得（显式边先入）
  const degreeById = new Map(knowledgePoints.map((kp) => [kp._id.toString(), 0]));

  const pushLink = (source, target, kind) => {
    if (source === target) return; // 自己指自己没意义
    const key = `${source}->${target}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    links.push({ source, target, kind });
    degreeById.set(source, (degreeById.get(source) || 0) + 1);
    degreeById.set(target, (degreeById.get(target) || 0) + 1);
  };

  // 1) 显式引用（一等数据）
  knowledgePoints.forEach((kp) => {
    const sourceId = kp._id.toString();
    (kp.references || []).forEach((refId) => {
      const target = refId.toString();
      if (idSet.has(target)) pushLink(sourceId, target, 'explicit');
    });
  });

  // 2) 正文提及（自动发现）：只看「完整标题」是否出现，子串命中即可
  knowledgePoints.forEach((kp) => {
    const sourceId = kp._id.toString();
    const content = kp.content || '';
    titleIndex.forEach((targetId, targetTitle) => {
      if (content.includes(targetTitle)) pushLink(sourceId, targetId, 'auto');
    });
  });

  return { links, degreeById };
}

/**
 * 生成节点：附带状态、关联数与统一口径的 sizeValue
 * @param {Array} knowledgePoints
 * @param {Map<string, number>} degreeById - collectGraphEdges 的结果
 */
function buildGraphNodes(knowledgePoints, degreeById) {
  return knowledgePoints.map((kp) => {
    const id = kp._id.toString();
    const degree = degreeById.get(id) || 0;
    const sizeValue = Math.min(degree, SIZE_CAP);
    return {
      id,
      name: kp.title,
      value: (kp.content || '').substring(0, 100), // 截取内容摘要用于 tooltip
      status: kp.status,
      reviewList: kp.reviewList,
      category: categoryOf(kp),
      degree, // 关联的其它知识点数量（引用 + 提及）
      sizeValue, // 0~6，视图据此换算视觉大小（2D: symbolSize；3D: 球体 scale）
      symbolSize: 20 + sizeValue * 6, // 2D 图谱直接使用；3D 用同一个 sizeValue 换算
    };
  });
}

/**
 * 一次算完整张图（路由只需要调这一个）
 * @returns {{nodes: Array, links: Array}}
 */
function buildKnowledgeGraph(knowledgePoints) {
  if (!Array.isArray(knowledgePoints) || knowledgePoints.length === 0) {
    return { nodes: [], links: [] };
  }
  const { links, degreeById } = collectGraphEdges(knowledgePoints);
  return { nodes: buildGraphNodes(knowledgePoints, degreeById), links };
}

module.exports = {
  SIZE_CAP,
  STATUS_CATEGORY,
  REVIEW_CATEGORY,
  categoryOf,
  buildTitleIndex,
  collectGraphEdges,
  buildGraphNodes,
  buildKnowledgeGraph,
};
