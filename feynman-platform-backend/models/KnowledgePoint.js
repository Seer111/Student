// 知识点数据模型
const mongoose = require('mongoose');

const KnowledgePointSchema = new mongoose.Schema(
  {
    user: {
      // 关联到所属用户
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      // 存放 Markdown、LaTeX、Mermaid 等原始内容
      type: String,
      required: true,
    },
    status: {
      // 学习状态：'not_started' 未开始 / 'in_progress' 学习中 / 'mastered' 已掌握
      type: String,
      enum: ['not_started', 'in_progress', 'mastered'],
      default: 'not_started',
    },
    reviewList: {
      // 是否已加入复习计划
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgePoint', KnowledgePointSchema);
