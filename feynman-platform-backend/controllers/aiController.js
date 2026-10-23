// AI 控制器（08课 & 09课 & 11课）
// 职责：AI 文本润色与评价、AI 出题、AI 评分、RAG 知识库问答
// 提示词模板统一放在 services/prompts/，这里只负责「取参数 → 调模型 → 容错解析 → 回响应」
const { chatWithFallback } = require('../utils/llmService');
const { queryVectorStore } = require('../services/vectorStoreService');
const {
  buildEvaluatePrompt,
  buildQuestionPrompt,
  buildGradingPrompt,
  buildRagPrompt,
} = require('../services/prompts');
const KnowledgePoint = require('../models/KnowledgePoint');
const { advanceStatus, advanceStatusByScore } = require('../utils/knowledgeStatus');

// 评分阈值：AI 评分低于该值时，自动将知识点加入复习列表（08课挑战任务）
const REVIEW_SCORE_THRESHOLD = 60;

/**
 * 从 LLM 输出中提取 JSON 对象（09课）
 * LLM 有时会输出带 markdown 代码块包裹或前后缀说明的 JSON，需要做容错解析。
 * @param {string} text - LLM 原始输出
 * @returns {object} - 解析出的 JSON 对象
 */
function extractJson(text) {
  // 1. 去掉 markdown 代码块包裹：```json ... ```
  let cleaned = text.replace(/```json|```/g, '').trim();
  // 2. 截取第一个 { 到最后一个 } 之间的内容
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('LLM 输出中未找到 JSON 对象');
  }
  cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
}

/**
 * 08课：AI 文本润色与智能评价
 * 输入：原始知识点内容 + 学生复述文本；输出：润色文本、综合评价、优缺点、分数、服务提供方
 * 附：评分低于 60 分时自动将对应知识点加入复习列表
 */
exports.evaluateFeynmanAttempt = async (req, res) => {
  const { originalContent, transcribedText, knowledgePointId } = req.body;

  if (!originalContent || !transcribedText) {
    return res.status(400).json({ msg: 'Original content and transcribed text are required.' });
  }

  const prompt = buildEvaluatePrompt({ originalContent, transcribedText });

  try {
    const { content, provider } = await chatWithFallback(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 1500 },
    );

    const result = extractJson(content);
    // 保证 strengths / weaknesses 一定是数组，防止 LLM 返回 null 导致前端崩溃
    result.strengths = Array.isArray(result.strengths) ? result.strengths : [];
    result.weaknesses = Array.isArray(result.weaknesses) ? result.weaknesses : [];
    result.provider = provider;

    // 挑战功能：低分自动加入复习列表
    if (knowledgePointId && Number(result.score) < REVIEW_SCORE_THRESHOLD) {
      try {
        await KnowledgePoint.findByIdAndUpdate(
          knowledgePointId,
          { $set: { reviewList: true } },
          { new: true },
        );
        result.autoAddedToReview = true;
        console.log(`知识点 ${knowledgePointId} 评分 ${result.score} 低于 ${REVIEW_SCORE_THRESHOLD}，已加入复习列表`);
      } catch (err) {
        console.warn('自动更新复习状态失败：', err.message);
      }
    }

    // 学习阶段自动流转：有评分就至少算「学习中」，≥85 分直接算「已掌握」（只前进不回退）
    if (knowledgePointId) {
      try {
        const advanced = await advanceStatusByScore(knowledgePointId, result.score, req.user?.id);
        if (advanced) {
          result.statusUpdated = advanced; // 前端据此提示「阶段已更新」
          console.log(`知识点 ${knowledgePointId} 阶段自动流转：${advanced.from} -> ${advanced.to}（评分 ${result.score}）`);
        }
      } catch (err) {
        console.warn('自动更新学习阶段失败：', err.message);
      }
    }

    console.log(`评估完成，使用服务: ${provider}`);
    res.json(result);
  } catch (error) {
    console.error('评估过程中出错:', error.message);
    res.status(500).json({ msg: 'AI 评估失败，请检查 AI 服务配置后重试', detail: error.message });
  }
};

/**
 * 09课：AI 出题（支持单选题与简答题）
 * 输入：知识点内容 + 难度 + 题型；输出：结构化题目 JSON
 */
exports.generateQuestion = async (req, res) => {
  const { knowledgePointContent, difficulty, type = 'single-choice' } = req.body;

  if (!knowledgePointContent || !difficulty) {
    return res.status(400).json({ msg: 'Knowledge point content and difficulty are required.' });
  }
  if (!['single-choice', 'short-answer'].includes(type)) {
    return res.status(400).json({ msg: "Invalid type, must be 'single-choice' or 'short-answer'." });
  }
  if (!['基础', '中等', '困难'].includes(difficulty)) {
    return res.status(400).json({ msg: 'Invalid difficulty, must be 基础/中等/困难.' });
  }

  // 题型对应的 JSON 模板与提示词都在 services/prompts/questionGenerator.js 里
  const prompt = buildQuestionPrompt({ knowledgePointContent, difficulty, type });

  try {
    const { content } = await chatWithFallback(
      [{ role: 'user', content: prompt }],
      { temperature: 0.7, maxTokens: 1000 }, // 出题需要一定创造性，温度略高
    );

    const questionData = extractJson(content);
    res.json(questionData);
  } catch (error) {
    console.error('AI 出题失败:', error.message);
    res.status(500).json({ msg: 'AI 出题失败，请稍后重试', detail: error.message });
  }
};

/**
 * 09课（进阶）：AI 简答题评分
 * 输入：题目、答案要点、学生回答；输出：对错判断 + 解释
 */
exports.gradeAnswer = async (req, res) => {
  const { question, answerKeyPoints, studentAnswer, knowledgePointId } = req.body;

  if (!question || !answerKeyPoints || !studentAnswer) {
    return res.status(400).json({ msg: 'Question, answer key points and student answer are required.' });
  }

  const prompt = buildGradingPrompt({ question, answerKeyPoints, studentAnswer });

  try {
    const { content } = await chatWithFallback(
      [{ role: 'user', content: prompt }],
      { temperature: 0.2, maxTokens: 500 },
    );
    const graded = extractJson(content);

    // 答对就把它推进到「学习中」（只前进不回退；阶段本来就是「学习中/已掌握」时这里不做任何事）
    if (knowledgePointId && graded.isCorrect) {
      try {
        const advanced = await advanceStatus(knowledgePointId, 'in_progress', req.user?.id);
        if (advanced) {
          graded.statusUpdated = advanced;
          console.log(`知识点 ${knowledgePointId} 阶段自动流转：${advanced.from} -> ${advanced.to}（测评答对）`);
        }
      } catch (err) {
        console.warn('自动更新学习阶段失败：', err.message);
      }
    }

    res.json(graded);
  } catch (error) {
    console.error('AI 评分失败:', error.message);
    res.status(500).json({ msg: 'AI 评分失败，请稍后重试', detail: error.message });
  }
};

/**
 * 11课：RAG 知识库问答
 * 流程：向量检索（从用户知识点中找到相关内容）-> 组装上下文 -> LLM 生成回答
 * 返回：回答文本 + 引用来源（让用户看到 AI 的依据，增强可信度）
 */
exports.answerWithRAG = async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ msg: 'Question is required.' });
  }

  try {
    // 1. 检索：从向量库中找与问题最相关的 4 个文本片段
    const relevantDocs = await queryVectorStore(question, { userId: req.user.id, k: 4 });

    // 2. 组装上下文（使用标签明确各部分角色，遵循 MCP 结构化 Prompt 的最佳实践）
    const context = relevantDocs.length > 0
      ? relevantDocs.map((doc, i) => `--- 文档 ${i + 1}（知识点：${doc.title}）---\n${doc.content}`).join('\n\n')
      : '（知识库中暂时没有检索到相关内容）';

    const prompt = buildRagPrompt({ context, question });

    // 3. 生成：调用 LLM 生成回答
    const { content, provider } = await chatWithFallback(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 1000 },
    );

    console.log(`RAG 问答完成，检索到 ${relevantDocs.length} 个相关片段，使用服务: ${provider}`);
    res.json({
      answer: content,
      sources: relevantDocs.map((doc) => ({
        knowledgePointId: doc.knowledgePointId,
        title: doc.title,
        excerpt: doc.content.slice(0, 150),
      })),
      provider,
    });
  } catch (error) {
    console.error('RAG Chain execution error:', error.message);
    const missingKey = error.message?.includes('未配置');
    res.status(500).json({
      msg: missingKey
        ? `RAG 问答暂不可用：${error.message}`
        : 'RAG 问答出错，请稍后重试',
      detail: missingKey ? undefined : error.message,
    });
  }
};
