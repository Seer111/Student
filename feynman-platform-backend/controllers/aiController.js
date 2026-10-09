// AI 控制器（08课 & 09课 & 11课）
// 职责：AI 文本润色与评价、AI 出题、AI 评分、RAG 知识库问答
const { chatWithFallback } = require('../utils/llmService');
const { queryVectorStore } = require('../services/vectorStoreService');
const KnowledgePoint = require('../models/KnowledgePoint');

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

  const prompt = `你是一个严格而友善的费曼学习法教练。请将学生的复述与原始知识点内容进行对比，\
完成文本润色与综合评价。

【原始知识点内容】:
"""
${originalContent}
"""

【学生的复述】:
"""
${transcribedText}
"""

请严格按照以下 JSON 格式返回，不要包含任何额外的解释或文字，确保所有字段都存在：
{
  "polishedText": "对学生的复述进行润色后的完整文本，修正口语化表达与逻辑顺序",
  "evaluation": "对复述质量的整体评价（3-5句话），指出其是否抓住了知识点的核心",
  "strengths": ["优点1", "优点2", "优点3"],
  "weaknesses": ["待改进点1", "待改进点2", "待改进点3"],
  "score": 85
}
说明：score 为 0-100 的整数，根据内容的完整性、准确性、表达清晰度综合评分。`;

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

  // 根据题型选择不同的出题 Prompt 与 JSON 模板
  const isSingle = type === 'single-choice';
  const jsonTemplate = isSingle
    ? `{
  "type": "single-choice",
  "difficulty": "${difficulty}",
  "question": "这里是题干",
  "options": {
    "A": "选项A的内容",
    "B": "选项B的内容",
    "C": "选项C的内容",
    "D": "选项D的内容"
  },
  "answer": "C",
  "explanation": "这里是对正确答案的简短解释"
}`
    : `{
  "type": "short-answer",
  "difficulty": "${difficulty}",
  "question": "这里是简答题题干",
  "answer_key_points": [
    "答案要点1",
    "答案要点2",
    "答案要点3"
  ]
}`;

  const prompt = `你是一个专业的计算机科学出题专家。请根据以下提供的知识点内容和指定的难度，\
生成一个相关的${isSingle ? '单项选择题' : '简答题'}。

【知识点内容】:
"""
${knowledgePointContent}
"""

【指定难度】: ${difficulty}

请严格按照以下 JSON 格式返回题目，不要包含任何额外的解释或文字，确保所有字段都存在。
${jsonTemplate}`;

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
  const { question, answerKeyPoints, studentAnswer } = req.body;

  if (!question || !answerKeyPoints || !studentAnswer) {
    return res.status(400).json({ msg: 'Question, answer key points and student answer are required.' });
  }

  const prompt = `你是一个客观的计算机科学阅卷老师。请根据以下题目、答案要点和学生的回答，\
判断学生的回答是否正确，并给出解释。

【题目】:
${question}

【答案要点】:
${Array.isArray(answerKeyPoints) ? answerKeyPoints.join('\n') : answerKeyPoints}

【学生的回答】:
${studentAnswer}

请严格按照以下 JSON 格式返回你的评判结果，不要包含任何额外的解释或文字。
{
  "isCorrect": true,
  "explanation": "这里是你的评判理由，比如：回答基本正确，覆盖了主要区别。或：回答混淆了State和Props的概念。"
}`;

  try {
    const { content } = await chatWithFallback(
      [{ role: 'user', content: prompt }],
      { temperature: 0.2, maxTokens: 500 },
    );
    res.json(extractJson(content));
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

    const prompt = `<role>你是一个知识库问答机器人。</role>
<instruction>请根据下面提供的<context>信息来回答用户的<question>。\
如果上下文中没有相关信息，就明确说你不知道，不要编造答案。请让回答简洁明了。</instruction>

<context>
${context}
</context>

<question>
${question}
</question>

<answer>你的回答是：</answer>`;

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
