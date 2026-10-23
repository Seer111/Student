// 11课：RAG 知识库问答 Prompt
// 结构用标签分隔（<role> / <context> / <question>），比一段流水句更不容易被模型忽略。
function buildRagPrompt({ context, question }) {
  return `<role>你是一个知识库问答机器人。</role>
<instruction>请根据下面提供的<context>信息来回答用户的<question>。\
如果上下文中没有相关信息，就明确说你不知道，不要编造答案。请让回答简洁明了。</instruction>

<context>
${context}
</context>

<question>
${question}
</question>

<answer>你的回答是：</answer>`;
}

module.exports = { buildRagPrompt };
