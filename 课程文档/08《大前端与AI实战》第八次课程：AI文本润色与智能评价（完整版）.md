# 08《大前端与AI实战》第八次课程：AI文本润色与智能评价（完整版）

## 课程目标

1. 理解大语言模型（LLM）的基本原理和应用场景
2. 掌握Prompt工程的核心技巧，设计有效的提示词
3. 集成多个LLM服务（DeepSeek为主用，百度千帆、硅基流动和OpenRouter为备用）实现文本润色和评价功能
4. 了解不同LLM服务的特点和免费模型使用方法
5. 实现前后端完整的AI反馈闭环
6. 掌握多LLM架构设计和智能回退机制

## 核心关键词

LLM、DeepSeek、百度千帆、硅基流动、OpenRouter、API调用、Prompt工程、多LLM架构、容错机制、免费模型

---

## 教学流程

### 第一部分：大模型与Prompt工程入门 (约30分钟)

#### 1.1 大语言模型简介

"今天我们要为费曼学习平台添加最智能的功能——AI文本润色与评价。我们将使用多个大语言模型服务，包括DeepSeek、百度千帆、硅基流动和OpenRouter，实现更可靠的AI反馈系统。"

#### 1.2 多LLM服务架构介绍

"在生产环境中，依赖单一LLM服务可能存在风险。我们将设计一个多LLM架构，优先使用DeepSeek，当DeepSeek不可用时自动回退到其他服务，确保服务的稳定性。特别地，我们将重点介绍硅基流动和OpenRouter这两个提供免费模型的平台。"

#### 1.3 Prompt工程核心技巧

"Prompt是与LLM沟通的关键。我们将学习如何设计有效的Prompt，包括：
- 角色扮演：让LLM扮演特定角色
- 明确指令：清晰告诉LLM需要做什么
- 上下文示例：提供输入输出示例
- 输出格式约束：指定返回格式"

---

### 第二部分：免费LLM服务介绍 (约30分钟)

#### 2.1 硅基流动API介绍

"硅基流动是一个专注于Gen AI计算基础设施的MaaS企业，提供多种免费模型，非常适合个人开发者和小型项目使用。"

**硅基流动特点：**
- 提供多种免费大模型，包括DeepSeek、Qwen、Llama等
- 注册后赠送免费额度
- 兼容OpenAI API格式，易于集成
- 支持流式和非流式响应

**免费模型推荐：**
- deepseek-ai/deepseek-chat：DeepSeek的免费聊天模型
- Qwen/Qwen2.5-7B-Instruct：阿里的Qwen2.5 7B指令微调模型
- meta-llama/Meta-Llama-3.1-8B-Instruct：Meta的Llama 3.1 8B指令微调模型

**API调用示例：**
```javascript
const response = await axios.post(
    'https://api.siliconflow.cn/v1/chat/completions',
    {
        model: 'deepseek-ai/deepseek-chat',
        messages: [
            { role: 'system', content: '你是一个专业的教育评估专家。' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
    },
    {
        headers: {
            'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
            'Content-Type': 'application/json'
        }
    }
);
```

#### 2.2 OpenRouter API介绍

"OpenRouter是一个提供500+大模型的平台，其中50+个是免费的，无需绑卡即可使用，包括许多第一梯队模型。"

**OpenRouter特点：**
- 提供50多个免费模型，无需绑卡
- 支持多种第一梯队模型，如DeepSeek V3、Gemini 2.5 Pro等
- 统一的API接口，兼容OpenAI格式
- 提供模型性能和成本对比

**免费模型推荐：**
- deepseek/deepseek-chat：DeepSeek的免费聊天模型
- meta-llama/llama-3-8b-instruct：Meta的Llama 3 8B指令微调模型
- microsoft/wizardlm-2-8x22b：Microsoft的大型指令微调模型
- google/gemma-7b-it：Google的Gemma 7B指令微调模型
- qwen/qwen-2-7b-instruct：阿里巴巴的Qwen 2 7B指令微调模型

**API调用示例：**
```javascript
const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
        model: 'deepseek/deepseek-chat',
        messages: [
            { role: 'system', content: '你是一个专业的教育评估专家。' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
    },
    {
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/feynman-platform',
            'X-Title': 'Feynman Platform'
        }
    }
);
```

---

### 第三部分：后端集成多LLM服务 (约75分钟)

#### 3.1 DeepSeek API集成

"DeepSeek是一个性能优秀且成本较低的LLM服务，我们将把它作为主要服务。"

1. **获取DeepSeek API Key**
   - 访问 [platform.deepseek.com](https://platform.deepseek.com)
   - 注册账号并登录
   - 在控制台创建新的API Key
   - 复制API Key并保存到环境变量

2. **DeepSeek API调用方式**
   - 基于OpenAI兼容接口
   - 使用标准的HTTP POST请求
   - 支持流式和非流式响应

3. **创建DeepSeek集成代码**

```javascript
// deepseek-api-example.js
const axios = require('axios');

const DEEPSEEK_API_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

async function evaluateWithDeepSeek(originalContent, transcribedText) {
    try {
        const url = `${DEEPSEEK_API_BASE_URL}/chat/completions`;
        
        const prompt = `...精心设计的Prompt...`;
        
        const response = await axios.post(url, {
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 1000
        }, {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
        console.error('DeepSeek API调用失败:', error.message);
        throw error;
    }
}
```

#### 3.2 硅基流动API集成

"硅基流动提供多种免费模型，我们将把它作为备用服务。"

```javascript
// siliconflow-api-example.js
const axios = require('axios');

const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1';

async function evaluateWithSiliconFlow(originalText, knowledgePoint, model = 'deepseek-ai/deepseek-chat') {
    try {
        // 检查API密钥
        if (!SILICONFLOW_API_KEY) {
            throw new Error('硅基流动API密钥未配置');
        }

        // 构建评估提示词
        const prompt = `
你是一个教育评估专家，请根据费曼学习法的原则，评估以下讲解内容。

知识点：${knowledgePoint}

讲解内容：${originalText}

请从以下几个方面进行评估（每项评分1-10分）：
1. 准确性：讲解内容是否准确无误
2. 清晰度：表达是否清晰易懂
3. 完整性：是否涵盖了知识点的关键内容
4. 简洁性：是否用简单的语言解释复杂概念

请提供以下格式的JSON响应：
{
  "accuracy": 数字评分,
  "clarity": 数字评分,
  "completeness": 数字评分,
  "conciseness": 数字评分,
  "overallScore": 总体评分(1-10),
  "suggestions": "具体的改进建议",
  "optimizedText": "优化后的讲解文本"
}
`;

        // 调用硅基流动API
        const response = await axios.post(
            `${SILICONFLOW_BASE_URL}/chat/completions`,
            {
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的教育评估专家，擅长评估和优化教学内容。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1500
            },
            {
                headers: {
                    'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60秒超时
            }
        );

        // 解析响应
        const content = response.data.choices[0].message.content;
        
        // 尝试解析JSON响应
        let evaluationResult;
        try {
            // 提取JSON部分（可能包含在代码块中）
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
            evaluationResult = JSON.parse(jsonString);
        } catch (parseError) {
            console.error('解析硅基流动API响应失败:', parseError);
            // 如果解析失败，返回一个基本评估结果
            evaluationResult = {
                accuracy: 5,
                clarity: 5,
                completeness: 5,
                conciseness: 5,
                overallScore: 5,
                suggestions: '无法解析API响应，请检查API配置或稍后重试。',
                optimizedText: originalText,
                provider: 'SiliconFlow',
                model: model,
                rawResponse: content
            };
        }

        // 添加提供者信息
        evaluationResult.provider = 'SiliconFlow';
        evaluationResult.model = model;

        return evaluationResult;
    } catch (error) {
        console.error('硅基流动API调用失败:', error);
        
        // 返回错误信息
        return {
            error: true,
            message: error.message || '硅基流动API调用失败',
            provider: 'SiliconFlow',
            model: model
        };
    }
}
```

#### 3.3 OpenRouter API集成

"OpenRouter提供50多个免费模型，我们将把它作为另一个备用服务。"

```javascript
// openrouter-api-example.js
const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

async function evaluateWithOpenRouter(originalText, knowledgePoint, model = 'deepseek/deepseek-chat') {
    try {
        // 检查API密钥
        if (!OPENROUTER_API_KEY) {
            throw new Error('OpenRouter API密钥未配置');
        }

        // 构建评估提示词（与硅基流动相同）
        const prompt = `
你是一个教育评估专家，请根据费曼学习法的原则，评估以下讲解内容。

知识点：${knowledgePoint}

讲解内容：${originalText}

请从以下几个方面进行评估（每项评分1-10分）：
1. 准确性：讲解内容是否准确无误
2. 清晰度：表达是否清晰易懂
3. 完整性：是否涵盖了知识点的关键内容
4. 简洁性：是否用简单的语言解释复杂概念

请提供以下格式的JSON响应：
{
  "accuracy": 数字评分,
  "clarity": 数字评分,
  "completeness": 数字评分,
  "conciseness": 数字评分,
  "overallScore": 总体评分(1-10),
  "suggestions": "具体的改进建议",
  "optimizedText": "优化后的讲解文本"
}
`;

        // 调用OpenRouter API
        const response = await axios.post(
            `${OPENROUTER_BASE_URL}/chat/completions`,
            {
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的教育评估专家，擅长评估和优化教学内容。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1500
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/feynman-platform', // 可选，用于统计
                    'X-Title': 'Feynman Platform' // 可选，用于统计
                },
                timeout: 60000 // 60秒超时
            }
        );

        // 解析响应
        const content = response.data.choices[0].message.content;
        
        // 尝试解析JSON响应
        let evaluationResult;
        try {
            // 提取JSON部分（可能包含在代码块中）
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
            evaluationResult = JSON.parse(jsonString);
        } catch (parseError) {
            console.error('解析OpenRouter API响应失败:', parseError);
            // 如果解析失败，返回一个基本评估结果
            evaluationResult = {
                accuracy: 5,
                clarity: 5,
                completeness: 5,
                conciseness: 5,
                overallScore: 5,
                suggestions: '无法解析API响应，请检查API配置或稍后重试。',
                optimizedText: originalText,
                provider: 'OpenRouter',
                model: model,
                rawResponse: content
            };
        }

        // 添加提供者信息
        evaluationResult.provider = 'OpenRouter';
        evaluationResult.model = model;

        return evaluationResult;
    } catch (error) {
        console.error('OpenRouter API调用失败:', error);
        
        // 返回错误信息
        return {
            error: true,
            message: error.message || 'OpenRouter API调用失败',
            provider: 'OpenRouter',
            model: model
        };
    }
}
```

#### 3.4 多LLM服务管理器

"现在我们创建一个管理器，能够智能地在不同LLM服务之间切换。"

```javascript
// multi-llm-manager.js
async function evaluateWithMultipleLLMs(originalContent, transcribedText, knowledgePoint = '', preferredProviders = ['deepseek', 'siliconflow', 'openrouter', 'qianfan']) {
    const errors = [];
    
    // 按照优先级尝试不同的LLM服务
    for (const provider of preferredProviders) {
        try {
            console.log(`尝试使用${provider} API进行评估...`);
            let result;
            
            switch (provider) {
                case 'deepseek':
                    result = await evaluateWithDeepSeek(originalContent, transcribedText);
                    result.provider = 'DeepSeek';
                    break;
                    
                case 'siliconflow':
                    result = await evaluateWithSiliconFlow(transcribedText, knowledgePoint || originalContent);
                    break;
                    
                case 'openrouter':
                    result = await evaluateWithOpenRouter(transcribedText, knowledgePoint || originalContent);
                    break;
                    
                case 'qianfan':
                    result = await evaluateWithQianfan(originalContent, transcribedText);
                    result.provider = 'Qianfan';
                    break;
                    
                default:
                    throw new Error(`未知的LLM提供商: ${provider}`);
            }
            
            console.log(`${provider} API评估成功`);
            return result;
            
        } catch (error) {
            const errorMsg = `${provider} API评估失败: ${error.message}`;
            console.warn(errorMsg);
            errors.push(errorMsg);
        }
    }
    
    // 所有LLM服务都失败
    console.error('所有LLM服务评估失败:', errors);
    throw new Error(`所有LLM服务评估失败: ${errors.join('; ')}`);
}
```

#### 3.5 更新后端控制器

"我们需要更新后端控制器，使用新的多LLM服务管理器。"

```javascript
// controllers/multiLlmController.js
const { evaluateWithMultipleLLMs } = require('../utils/multi-llm-manager');

exports.evaluateFeynmanAttempt = async (req, res) => {
    const { originalContent, transcribedText, knowledgePoint } = req.body;

    if (!originalContent || !transcribedText) {
        return res.status(400).json({ msg: 'Original content and transcribed text are required.' });
    }

    try {
        // 使用多LLM服务管理器进行评估
        const llmResult = await evaluateWithMultipleLLMs(originalContent, transcribedText, knowledgePoint);
        
        // 记录使用了哪个LLM服务
        console.log(`评估完成，使用服务: ${llmResult.provider}`);
        
        res.json(llmResult);

    } catch (error) {
        console.error('评估过程中出错:', error.message);
        res.status(500).send('评估过程中发生错误');
    }
};
```

#### 3.6 添加新路由

"在路由文件中添加新的评估端点。"

```javascript
// routes/ai.js
const { evaluateFeynmanAttempt } = require('../controllers/multiLlmController');

router.post('/evaluate', auth, evaluateFeynmanAttempt);
```

---

### 第四部分：前端展示AI反馈 (约45分钟)

"后端已经能提供智能反馈了，现在我们要把这些宝贵的信息优雅地展示给用户，并显示使用了哪个LLM服务。"

#### 4.1 改造 FeynmanRecordPage.jsx

```jsx
// 添加新的状态
const [aiFeedback, setAiFeedback] = useState(null);
const [isEvaluating, setIsEvaluating] = useState(false);
const [llmProvider, setLlmProvider] = useState('');

// 修改获取AI评价的函数
const getAiEvaluation = async (transcribed) => {
    setIsEvaluating(true);
    setAiFeedback(null);
    try {
        const kpResponse = await apiClient.get(`/knowledge-points/${id}`);
        const originalContent = kpResponse.data.content;
        
        const feedbackResponse = await apiClient.post('/ai/evaluate', {
            originalContent: originalContent,
            transcribedText: transcribed,
            knowledgePoint: kpResponse.data.title
        });

        setAiFeedback(feedbackResponse.data);
        setLlmProvider(feedbackResponse.data.provider || '未知');

    } catch (error) {
        console.error('获取AI评价失败', error);
    } finally {
        setIsEvaluating(false);
    }
};
```

#### 4.2 渲染AI反馈结果

```jsx
// ... 在转录结果 div 下方
<hr />
<h2>AI 教练反馈:</h2>
{isEvaluating && <p>AI教练正在批阅您的答卷...</p>}
{aiFeedback && (
    <div className="ai-feedback" style={{ display: 'flex', gap: '2rem' }}>
        <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>AI 润色后的文本</h3>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                    服务提供方: {llmProvider}
                </span>
            </div>
            <p style={{ background: '#eef', padding: '1rem' }}>{aiFeedback.polishedText}</p>
            
            <h3>综合评价</h3>
            <p>{aiFeedback.evaluation}</p>

            <h3>优点 👍</h3>
            <ul>
                {aiFeedback.strengths.map((item, index) => <li key={index}>{item}</li>)}
            </ul>

            <h3>待改进 👇</h3>
            <ul>
                {aiFeedback.weaknesses.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
        </div>
        <div style={{ flex: '0 0 150px', textAlign: 'center' }}>
            <h3>综合得分</h3>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: aiFeedback.score > 80 ? 'green' : 'orange' }}>
                {aiFeedback.score}
            </div>
        </div>
    </div>
)}
```

---

### 第五部分：联调与扩展 (15分钟)

#### 5.1 全流程联调

1. 确保后端服务、前端服务都已重启并加载最新代码
2. 走一遍完整流程：登录 -> 选择知识点 -> 复述 -> 停止录音
3. 观察流程：先显示转录文本，然后显示"AI教练正在批阅..."，最后展示出完整的润色、评价和分数
4. 注意观察使用了哪个LLM服务

#### 5.2 功能扩展讨论 (作业方向)

"我们现在有了多LLM服务架构，可以考虑以下扩展："
1. 添加LLM服务选择功能，让用户可以选择使用哪个LLM服务
2. 实现LLM服务性能监控，记录响应时间和成功率
3. 添加更多LLM服务，如OpenAI、Claude等
4. 实现负载均衡，在多个LLM服务之间分配请求
5. 为不同的LLM服务设置不同的评分权重

---

## 五、 课堂总结与作业

### 总结

"今天我们实现了一个强大的多LLM服务架构，以DeepSeek为主用，硅基流动、OpenRouter和百度千帆为备用，确保了AI评估功能的稳定性和可靠性。我们特别介绍了硅基流动和OpenRouter这两个提供免费模型的平台，为个人开发者和小型项目提供了经济实惠的选择。通过多LLM架构和智能回退机制，我们的系统能够在各种情况下提供稳定的服务。"

### 课后作业

1. **必须完成**：
   - 获取DeepSeek、硅基流动和OpenRouter的API Key并配置到项目中
   - 实现多LLM服务架构，确保DeepSeek为主用，硅基流动、OpenRouter和百度千帆为备用
   - 在前端显示当前使用的LLM服务提供方

2. **核心功能闭环（挑战）**：
   - 实现LLM服务性能监控，记录每个服务的响应时间和成功率
   - 当AI评分低于某个阈值（比如60分）时，自动调用后端API，将该知识点的reviewList状态更新为true
   - 在Dashboard页面上，对需要复习的知识点进行特殊标记

3. **扩展功能（选做）**：
   - 添加LLM服务选择功能，让用户可以选择使用哪个LLM服务
   - 实现负载均衡，在多个LLM服务之间分配请求
   - 集成OpenAI API作为第五个LLM服务选项
   - 为不同的LLM服务设置不同的评分权重，综合计算最终得分

### 预告下次课内容

"我们的平台现在功能非常强大，但我们如何应对学生自己的知识库？如何让AI在我们上传的特定文档（比如一篇PDF论文）中进行问答？下次课，我们将进入一个更高级的AI领域——RAG（检索增强生成），学习如何构建基于私有知识库的智能问答Agent！"

---

## 附录：LLM服务获取指南

### DeepSeek API Key获取

1. 访问 [platform.deepseek.com](https://platform.deepseek.com)
2. 注册账号并登录
3. 在控制台点击"API Keys"
4. 点击"Create new key"
5. 复制生成的API Key并保存

### 硅基流动API Key获取

1. 访问 [siliconflow.cn](https://siliconflow.cn)
2. 注册账号并登录
3. 在控制台点击"API Keys"
4. 点击"Create new key"
5. 复制生成的API Key并保存
6. 注册后会获得免费额度，可用于体验付费模型

### OpenRouter API Key获取

1. 访问 [openrouter.ai](https://openrouter.ai)
2. 注册账号并登录
3. 在控制台点击"API Keys"
4. 点击"Create new key"
5. 复制生成的API Key并保存
6. 无需绑卡即可使用50多个免费模型

### 百度千帆API Key获取

1. 访问 [cloud.baidu.com/product/wenxinworkshop](https://cloud.baidu.com/product/wenxinworkshop)
2. 注册并登录百度智能云账号
3. 创建应用，获取API Key和Secret Key
4. 在应用管理中查看已创建应用的凭证信息

---

## 环境变量配置

在项目根目录的.env文件中添加以下配置：

```env
# DeepSeek API配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# 硅基流动API配置
SILICONFLOW_API_KEY=your_siliconflow_api_key_here

# OpenRouter API配置
OPENROUTER_API_KEY=your_openrouter_api_key_here

# 百度千帆API配置
QIANFAN_API_KEY=your_qianfan_api_key_here
QIANFAN_SECRET_KEY=your_qianfan_secret_key_here

# OpenAI API配置（可选）
OPENAI_API_KEY=your_openai_api_key_here
```

---

## 多LLM服务对比

| 特性 | DeepSeek | 硅基流动 | OpenRouter | 百度千帆 |
|------|----------|----------|------------|----------|
| 接口兼容性 | OpenAI兼容 | OpenAI兼容 | OpenAI兼容 | 自定义接口 |
| 认证方式 | Bearer Token | Bearer Token | Bearer Token | OAuth2.0 + Access Token |
| 免费模型 | 有限 | 多种免费模型 | 50+免费模型 | 有限免费额度 |
| 模型选择 | deepseek-chat | 多种开源模型 | 500+模型 | ERNIE-Bot系列 |
| 成本 | 较低 | 低 | 免费+付费 | 中等 |
| 中文支持 | 优秀 | 优秀 | 良好 | 优秀 |
| 响应速度 | 快 | 快 | 快 | 中等 |
| 稳定性 | 高 | 高 | 高 | 高 |