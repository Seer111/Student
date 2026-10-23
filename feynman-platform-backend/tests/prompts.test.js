// Prompt 构建函数的回归测试：把「提示词里必须出现什么」钉住，避免改文案时误删关键约束
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildEvaluatePrompt,
  buildQuestionPrompt,
  buildQuestionTemplate,
  buildGradingPrompt,
  buildRagPrompt,
} = require('../services/prompts');

test('复述评价 Prompt 带上原文与转写文本，并要求 JSON 输出', () => {
  const prompt = buildEvaluatePrompt({ originalContent: '闭包是函数与其词法环境的组合', transcribedText: '闭包保留了函数定义时的作用域' });
  assert.match(prompt, /闭包是函数与其词法环境的组合/);
  assert.match(prompt, /闭包保留了函数定义时的作用域/);
  assert.match(prompt, /JSON/);
});

test('出题 Prompt：单选题带 options，难度注入', () => {
  const prompt = buildQuestionPrompt({ knowledgePointContent: '原型链通过 __proto__ 连接', difficulty: '困难', type: 'single-choice' });
  assert.match(prompt, /原型链通过 __proto__ 连接/);
  assert.match(prompt, /困难/);
  assert.match(prompt, /options/);
  assert.match(prompt, /"answer"/);
});

test('出题 Prompt：简答题不给 options，改为 answer_key_points', () => {
  const prompt = buildQuestionPrompt({ knowledgePointContent: '事件循环', difficulty: '中等', type: 'short-answer' });
  assert.match(prompt, /answer_key_points/);
  assert.doesNotMatch(prompt, /"options"/);
});

test('出题模板与出题 Prompt 共用同一套字段约束（单选/简答分流）', () => {
  const single = buildQuestionTemplate({ difficulty: '基础', isSingle: true });
  const short = buildQuestionTemplate({ difficulty: '基础', isSingle: false });
  assert.match(single, /options/);
  assert.match(short, /answer_key_points/);
  assert.match(single, /基础/);
  assert.match(short, /基础/);
});

test('阅卷 Prompt 带上题目、要点与学生回答，输出 isCorrect', () => {
  const prompt = buildGradingPrompt({ question: '什么是闭包', answerKeyPoints: '函数\n词法环境', studentAnswer: '函数和它定义时的环境' });
  assert.match(prompt, /什么是闭包/);
  assert.match(prompt, /函数/);
  assert.match(prompt, /词法环境/);
  assert.match(prompt, /函数和它定义时的环境/);
  assert.match(prompt, /isCorrect/);
});

test('RAG Prompt 把检索片段放进 context 并且要求只依据资料回答', () => {
  const prompt = buildRagPrompt({ context: '【资料1】闭包指函数与词法环境的组合', question: '闭包是什么' });
  assert.match(prompt, /闭包指函数与词法环境的组合/);
  assert.match(prompt, /闭包是什么/);
  assert.match(prompt, /context|资料/i);
});
