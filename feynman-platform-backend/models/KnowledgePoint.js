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
    references: {
      // 显式引用（12课知识图谱的"引用"边）：本知识点依赖/延伸到的其它知识点
      // 存 id 而不是标题——改标题不会让引用失效，也不会因为同名标题互相覆盖
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'KnowledgePoint',
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgePoint', KnowledgePointSchema);
