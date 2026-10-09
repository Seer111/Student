// 复述记录模型（07课课后作业）：保存学生每次"费曼复述"的转录文本与 AI 反馈
const mongoose = require('mongoose');

const FeynmanAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    knowledgePoint: {
      // 关联的知识点
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgePoint',
      required: true,
    },
    transcribedText: {
      // 语音转文字后的复述原文
      type: String,
      required: true,
    },
    aiFeedback: {
      // AI 教练的完整反馈（08课）
      polishedText: String, // 润色后的文本
      evaluation: String, // 综合评价
      strengths: [String], // 优点列表
      weaknesses: [String], // 待改进列表
      score: Number, // 综合得分 0-100
      provider: String, // 本次评估使用的 LLM 服务（DeepSeek/Qianfan/OpenAI）
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('FeynmanAttempt', FeynmanAttemptSchema);
