// 文本向量化：百度千帆 Embedding-V1（10 课 RAG 的向量化入口）。
// 单独成文件的原因：它只有一个服务、没有回退链，失败策略也与对话接口不同——
// 对话接口可以换一家继续试，向量化失败就只能把错误抛给调用方（索引写入是原子语义）。
const axios = require('axios');

// 千帆 embedding-v1 单次请求的输入条数上限是 16，一次塞 20 条会直接 400；
// 所以这里按批切分再合并（重建索引、长正文切出很多块时都会用到）
const EMBED_BATCH_SIZE = 16;

/**
 * 调用百度千帆 Embedding-V1 将文本转换为向量（10课 RAG 向量化）
 * @param {string[]} texts - 待向量化的文本数组
 * @returns {Promise<number[][]>} - 与输入顺序对应的向量数组
 */
async function embedding(texts) {
  const apiKey = process.env.QIANFAN_API_KEY;
  if (!apiKey) {
    throw new Error('百度千帆 QIANFAN_API_KEY 未配置，无法进行文本向量化');
  }

  const list = Array.isArray(texts) ? texts : [texts];
  const vectors = [];

  for (let start = 0; start < list.length; start += EMBED_BATCH_SIZE) {
    const batch = list.slice(start, start + EMBED_BATCH_SIZE);
    const response = await axios.post(
      'https://qianfan.baidubce.com/v2/embeddings',
      {
        model: process.env.QIANFAN_EMBEDDING_MODEL || 'embedding-v1',
        input: batch,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      },
    );

    // 千帆 v2 返回 OpenAI 兼容结构：{ data: [{ embedding: [...], index }] }
    // 按 index 排序，保证与输入顺序严格对应
    response.data.data
      .slice()
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .forEach((item) => vectors.push(item.embedding));
  }

  return vectors;
}

module.exports = { embedding, EMBED_BATCH_SIZE };
