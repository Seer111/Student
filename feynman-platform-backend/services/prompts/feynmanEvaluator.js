// 08课：复述评价 Prompt
// 只负责「把参数拼进提示词」，不调用模型、不碰数据库——这样改文案和改逻辑互不影响。
// 注意：模板里行尾的反斜杠是「续行」——它把两行拼成一行，不要删。
function buildEvaluatePrompt({ originalContent, transcribedText }) {
  return `你是一个严格而友善的费曼学习法教练。请将学生的复述与原始知识点内容进行对比，\
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
}

module.exports = { buildEvaluatePrompt };
