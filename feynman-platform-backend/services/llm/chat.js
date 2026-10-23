// 对话类 LLM 调用：DeepSeek 主用、千帆备用、OpenAI 可选，统一成 OpenAI 兼容格式。
// 与「向量化」分开（见 ./embedding.js）：两者的鉴权、超时、失败策略完全不同，
// 放在一个文件里会让调用方误以为它们是同一套能力。
const axios = require('axios');

// 各 LLM 服务配置：baseUrl、默认模型、鉴权方式（全部使用 Bearer Token）
// DeepSeek 与 OpenAI 原生采用 OpenAI 兼容接口；百度千帆 v2 接口同样兼容 OpenAI 风格。
const PROVIDERS = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKey: () => process.env.DEEPSEEK_API_KEY,
  },
  qianfan: {
    baseUrl: 'https://qianfan.baidubce.com/v2',
    // ernie-3.5-8k 已于 2026-07 下线，官方推荐替代为 ernie-4.5-turbo-128k（可用 QIANFAN_MODEL 覆盖）
    model: process.env.QIANFAN_MODEL || 'ernie-4.5-turbo-128k',
    apiKey: () => process.env.QIANFAN_API_KEY,
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKey: () => process.env.OPENAI_API_KEY,
  },
};

// 各服务在系统中的优先级：依次尝试，前面的失败则回退到下一个
const FALLBACK_ORDER = ['deepseek', 'qianfan', 'openai'];

/**
 * 调用单个 LLM 服务的 chat/completions 接口
 * @param {Array<{role:string, content:string}>} messages - 对话消息
 * @param {object} options - { provider, temperature, maxTokens }
 * @returns {Promise<{content:string, provider:string}>}
 */
async function callProvider(messages, options = {}) {
  const name = options.provider || FALLBACK_ORDER[0];
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${name}`);
  }
  const apiKey = provider.apiKey();
  if (!apiKey) {
    throw new Error(`LLM 服务 ${name} 未配置 API Key`);
  }

  const response = await axios.post(
    `${provider.baseUrl}/chat/completions`,
    {
      model: provider.model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2000,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    },
  );

  return {
    content: response.data.choices[0].message.content,
    provider: name,
  };
}

/**
 * 多 LLM 自动回退调用：按 deepseek -> qianfan -> openai 顺序尝试，
 * 全部失败时抛出包含各服务错误信息的异常。
 * @returns {Promise<{content:string, provider:string}>}
 */
async function chatWithFallback(messages, options = {}) {
  const errors = [];
  for (const name of FALLBACK_ORDER) {
    try {
      return await callProvider(messages, { ...options, provider: name });
    } catch (error) {
      // 提取最关键的报错信息用于最终汇总
      const detail = error.response?.data?.error?.message || error.message;
      errors.push(`${name}: ${detail}`);
      console.warn(`LLM 服务 ${name} 调用失败，尝试下一个：${detail}`);
    }
  }
  throw new Error(`所有 LLM 服务均调用失败 -> ${errors.join(' | ')}`);
}

module.exports = { chatWithFallback, callProvider, PROVIDERS, FALLBACK_ORDER };
