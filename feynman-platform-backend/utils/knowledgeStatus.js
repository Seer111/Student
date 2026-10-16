// 学习阶段的自动流转（复述评分 / 测评阅卷 与知识点状态的联动）
//
// 规则：只前进、不回退 —— not_started(0) -> in_progress(1) -> mastered(2)
//   · 拿到一次评分（复述评分或测评阅卷）就至少算「学习中」
//   · 复述评分 ≥ 85 分直接算「已掌握」
//   · 低于 60 分不动阶段（只由 aiController 标记「待复习」），不把学过的知识点打回「未开始」
const KnowledgePoint = require('../models/KnowledgePoint');

// 阶段序号：只前进不回退靠它比较
const STATUS_RANK = { not_started: 0, in_progress: 1, mastered: 2 };
// 直接判定「已掌握」的评分线（与 REVIEW_SCORE_THRESHOLD=60 的"不及格线"配套：60 以下只标待复习）
const MASTER_SCORE_THRESHOLD = 85;

/**
 * 根据一次评分决定目标阶段（分数无效时按「学习中」处理）
 * @param {number|string} score
 * @returns {'in_progress'|'mastered'}
 */
function targetStatusForScore(score) {
  const value = Number(score);
  return Number.isFinite(value) && value >= MASTER_SCORE_THRESHOLD ? 'mastered' : 'in_progress';
}

/**
 * 把知识点推进到目标阶段（只前进不回退）
 * @param {string} knowledgePointId
 * @param {'in_progress'|'mastered'} targetStatus
 * @param {string} [userId] 传入则只更新该用户自己的知识点（避免越权改到别人的数据）
 * @returns {Promise<{from: string, to: string}|null>} 发生了流转则返回前后阶段，否则 null
 */
async function advanceStatus(knowledgePointId, targetStatus, userId) {
  if (!knowledgePointId || STATUS_RANK[targetStatus] === undefined) return null;

  const query = { _id: knowledgePointId };
  if (userId) query.user = userId;

  const kp = await KnowledgePoint.findOne(query);
  if (!kp) return null;

  const from = STATUS_RANK[kp.status] === undefined ? 'not_started' : kp.status;
  if (STATUS_RANK[targetStatus] <= STATUS_RANK[from]) return null; // 只前进，不回退

  kp.status = targetStatus;
  await kp.save();
  return { from, to: targetStatus };
}

/** 便捷入口：按评分推进阶段 */
function advanceStatusByScore(knowledgePointId, score, userId) {
  return advanceStatus(knowledgePointId, targetStatusForScore(score), userId);
}

module.exports = {
  STATUS_RANK,
  MASTER_SCORE_THRESHOLD,
  targetStatusForScore,
  advanceStatus,
  advanceStatusByScore,
};
