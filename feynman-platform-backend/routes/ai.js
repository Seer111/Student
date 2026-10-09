// AI 路由（08课 & 09课 & 11课）：AI 润色评价 / AI 出题 / AI 评分 / RAG 知识库问答
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  evaluateFeynmanAttempt,
  generateQuestion,
  gradeAnswer,
  answerWithRAG,
} = require('../controllers/aiController');

// @route   POST /api/ai/evaluate
// @desc    费曼复述的 AI 润色与评价（多 LLM 自动回退）
// @access  Private
router.post('/evaluate', auth, evaluateFeynmanAttempt);

// @route   POST /api/ai/generate-question
// @desc    根据知识点内容与难度生成题目（single-choice / short-answer）
// @access  Private
router.post('/generate-question', auth, generateQuestion);

// @route   POST /api/ai/grade-answer
// @desc    简答题 AI 自动评分
// @access  Private
router.post('/grade-answer', auth, gradeAnswer);

// @route   POST /api/ai/rag-qa
// @desc    基于私有知识库（RAG）的智能问答
// @access  Private
router.post('/rag-qa', auth, answerWithRAG);

module.exports = router;
