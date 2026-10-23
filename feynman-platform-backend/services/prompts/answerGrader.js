// 09课（进阶）：简答题阅卷 Prompt
// 评分口径不稳定时先改这里：要点写得越具体，判分越稳。
function buildGradingPrompt({ question, answerKeyPoints, studentAnswer }) {
  return `你是一个客观的计算机科学阅卷老师。请根据以下题目、答案要点和学生的回答，\
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
}

module.exports = { buildGradingPrompt };
