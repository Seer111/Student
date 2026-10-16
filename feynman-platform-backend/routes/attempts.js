// 复述记录路由（07课课后作业）：保存与查询学生的费曼复述记录
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FeynmanAttempt = require('../models/FeynmanAttempt');

// @route   POST /api/attempts
// @desc    保存一次复述记录（转录文本 + 可选 AI 反馈）
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { knowledgePointId, transcribedText, aiFeedback } = req.body;

    if (!knowledgePointId || !transcribedText) {
      return res.status(400).json({ msg: 'Knowledge point id and transcribed text are required.' });
    }

    const attempt = new FeynmanAttempt({
      user: req.user.id,
      knowledgePoint: knowledgePointId,
      transcribedText,
      aiFeedback: aiFeedback || undefined,
    });
    await attempt.save();
    res.json(attempt);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// @route   GET /api/attempts/kp/:knowledgePointId
// @desc    获取某个知识点的全部复述记录（按时间倒序）
// @access  Private
router.get('/kp/:knowledgePointId', auth, async (req, res) => {
  try {
    const attempts = await FeynmanAttempt.find({
      user: req.user.id,
      knowledgePoint: req.params.knowledgePointId,
    }).sort({ createdAt: -1 });
    res.json(attempts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
