// 09课：出题 Prompt（单选 / 简答两套 JSON 模板）
// 模板的选择也放在这里：调用方只说「要什么题型」，不关心 JSON 长什么样。
function buildQuestionTemplate({ difficulty, isSingle }) {
  return isSingle
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
}

function buildQuestionPrompt({ knowledgePointContent, difficulty, type }) {
  const isSingle = type === 'single-choice';
  const jsonTemplate = buildQuestionTemplate({ difficulty, isSingle });

  return `你是一个专业的计算机科学出题专家。请根据以下提供的知识点内容和指定的难度，\
生成一个相关的${isSingle ? '单项选择题' : '简答题'}。

【知识点内容】:
"""
${knowledgePointContent}
"""

【指定难度】: ${difficulty}

请严格按照以下 JSON 格式返回题目，不要包含任何额外的解释或文字，确保所有字段都存在。
${jsonTemplate}`;
}

module.exports = { buildQuestionPrompt, buildQuestionTemplate };
