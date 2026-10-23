// Prompt 集中出口：控制器只从这里取「拼好的提示词」，不再内联长模板。
// 想改文案/口径，只动这个目录，不碰控制器逻辑。
const { buildEvaluatePrompt } = require('./feynmanEvaluator');
const { buildQuestionPrompt, buildQuestionTemplate } = require('./questionGenerator');
const { buildGradingPrompt } = require('./answerGrader');
const { buildRagPrompt } = require('./ragAnswer');

module.exports = {
  buildEvaluatePrompt,
  buildQuestionPrompt,
  buildQuestionTemplate,
  buildGradingPrompt,
  buildRagPrompt,
};
