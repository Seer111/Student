// LLM 能力统一出口：调用方只认这里，不直接依赖具体实现文件。
// 拆成两个文件的理由见 ./chat.js 与 ./embedding.js 的头部注释。
const chat = require('./chat');
const embedding = require('./embedding');

module.exports = {
  chatWithFallback: chat.chatWithFallback,
  callProvider: chat.callProvider,
  FALLBACK_ORDER: chat.FALLBACK_ORDER,
  embedding: embedding.embedding,
  EMBED_BATCH_SIZE: embedding.EMBED_BATCH_SIZE,
};
