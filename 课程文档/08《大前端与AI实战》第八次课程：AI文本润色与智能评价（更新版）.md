# 08《大前端与AI实战》第八次课程：AI文本润色与智能评价（更新版）

## 课程目标

1. 理解大语言模型（LLM）的基本原理和应用场景
2. 掌握Prompt工程的核心技巧，设计有效的提示词
3. 集成多个LLM服务（DeepSeek为主用，百度千帆为备用）实现文本润色和评价功能
4. 了解OpenAI接口的使用方法和特点
5. 实现前后端完整的AI反馈闭环

## 核心关键词

LLM、DeepSeek、百度千帆、OpenAI、API调用、Prompt工程、多LLM架构、容错机制

---

## 教学流程

### 第一部分：大模型与Prompt工程入门 (约30分钟)

#### 1.1 大语言模型简介

"今天我们要为费曼学习平台添加最智能的功能——AI文本润色与评价。我们将使用多个大语言模型服务，以DeepSeek为主，百度千帆为备用，实现更可靠的AI反馈系统。"

#### 1.2 多LLM服务架构介绍

"在生产环境中，依赖单一LLM服务可能存在风险。我们将设计一个多LLM架构，优先使用DeepSeek，当DeepSeek不可用时自动回退到百度千帆，确保服务的稳定性。"

#### 1.3 Prompt工程核心技巧

"Prompt是与LLM沟通的关键。我们将学习如何设计有效的Prompt，包括：
- 角色扮演：让LLM扮演特定角色
- 明确指令：清晰告诉LLM需要做什么
- 上下文示例：提供输入输出示例
- 输出格式约束：指定返回格式"

---

### 第二部分：后端集成多LLM服务 (约75分钟)

#### 2.1 DeepSeek API集成

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

#### 2.2 多LLM服务管理器

"现在我们创建一个管理器，能够智能地在不同LLM服务之间切换。"

```javascript
// multi-llm-manager.js
async function evaluateWithMultipleLLMs(originalContent, transcribedText) {
    try {
        // 首先尝试使用DeepSeek
        console.log('尝试使用DeepSeek API进行评估...');
        const deepSeekResult = await evaluateWithDeepSeek(originalContent, transcribedText);
        return { ...deepSeekResult, provider: 'DeepSeek' };
    } catch (error) {
        console.warn('DeepSeek API评估失败，回退到百度千帆:', error.message);
        
        try {
            // DeepSeek失败，回退到百度千帆
            const qianfanResult = await evaluateWithQianfan(originalContent, transcribedText);
            return { ...qianfanResult, provider: 'Qianfan' };
        } catch (fallbackError) {
            throw new Error('所有LLM服务评估失败');
        }
    }
}
```

#### 2.3 更新后端控制器

"我们需要更新后端控制器，使用新的多LLM服务管理器。"

```javascript
// controllers/multiLlmController.js
const { evaluateWithMultipleLLMs } = require('../utils/multi-llm-manager');

exports.evaluateFeynmanAttempt = async (req, res) => {
    const { originalContent, transcribedText } = req.body;

    if (!originalContent || !transcribedText) {
        return res.status(400).json({ msg: 'Original content and transcribed text are required.' });
    }

    try {
        // 使用多LLM服务管理器进行评估
        const llmResult = await evaluateWithMultipleLLMs(originalContent, transcribedText);
        
        // 记录使用了哪个LLM服务
        console.log(`评估完成，使用服务: ${llmResult.provider}`);
        
        res.json(llmResult);

    } catch (error) {
        console.error('评估过程中出错:', error.message);
        res.status(500).send('评估过程中发生错误');
    }
};
```

#### 2.4 添加新路由

"在路由文件中添加新的评估端点。"

```javascript
// routes/ai.js
const { evaluateFeynmanAttempt } = require('../controllers/multiLlmController');

router.post('/evaluate', auth, evaluateFeynmanAttempt);
```

---

### 第三部分：OpenAI接口讲解 (约30分钟)

#### 3.1 OpenAI API简介

"OpenAI API是最早流行的LLM接口，许多其他LLM服务都采用了与其兼容的接口设计。了解OpenAI API有助于我们掌握通用的LLM调用方法。"

#### 3.2 OpenAI API特点

- 标准化的RESTful API设计
- 支持多种模型（GPT-3.5, GPT-4等）
- 丰富的参数配置选项
- 完善的错误处理机制
- 广泛的社区支持和文档

#### 3.3 OpenAI API调用示例

```javascript
// openai-api-example.js
const axios = require('axios');

const OPENAI_API_BASE_URL = 'https://api.openai.com/v1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function evaluateWithOpenAI(originalContent, transcribedText) {
    try {
        const url = `${OPENAI_API_BASE_URL}/chat/completions`;
        
        const prompt = `...精心设计的Prompt...`;
        
        const response = await axios.post(url, {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: '你是一个严格而友善的计算机科学学习教练。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 1000
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
        console.error('OpenAI API调用失败:', error.message);
        throw error;
    }
}
```

#### 3.4 接口对比

| 特性 | DeepSeek | 百度千帆 | OpenAI |
|------|----------|----------|--------|
| 接口兼容性 | OpenAI兼容 | 自定义接口 | 标准接口 |
| 认证方式 | Bearer Token | OAuth2.0 + Access Token | Bearer Token |
| 模型选择 | deepseek-chat | ERNIE-Bot系列 | GPT系列 |
| 成本 | 较低 | 中等 | 较高 |
| 中文支持 | 优秀 | 优秀 | 良好 |
| 响应速度 | 快 | 中等 | 快 |

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
            transcribedText: transcribed
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

---

## 五、 课堂总结与作业

### 总结

"今天我们实现了一个强大的多LLM服务架构，以DeepSeek为主用，百度千帆为备用，确保了AI评估功能的稳定性和可靠性。我们还学习了OpenAI接口的特点和使用方法，为将来扩展更多LLM服务打下了基础。"

### 课后作业

1. **必须完成**：
   - 获取DeepSeek API Key并配置到项目中
   - 实现多LLM服务架构，确保DeepSeek为主用，百度千帆为备用
   - 在前端显示当前使用的LLM服务提供方

2. **核心功能闭环（挑战）**：
   - 实现LLM服务性能监控，记录每个服务的响应时间和成功率
   - 当AI评分低于某个阈值（比如60分）时，自动调用后端API，将该知识点的reviewList状态更新为true
   - 在Dashboard页面上，对需要复习的知识点进行特殊标记

3. **扩展功能（选做）**：
   - 添加LLM服务选择功能，让用户可以选择使用哪个LLM服务
   - 实现负载均衡，在多个LLM服务之间分配请求
   - 集成OpenAI API作为第三个LLM服务选项

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

### 百度千帆API Key获取

1. 访问 [cloud.baidu.com/product/wenxinworkshop](https://cloud.baidu.com/product/wenxinworkshop)
2. 注册并登录百度智能云账号
3. 创建应用，获取API Key和Secret Key
4. 在应用管理中查看已创建应用的凭证信息

### OpenAI API Key获取

1. 访问 [platform.openai.com](https://platform.openai.com)
2. 注册账号并登录
3. 点击右上角头像，选择"View API keys"
4. 点击"Create new secret key"
5. 复制生成的API Key并保存

---

## 环境变量配置

在项目根目录的.env文件中添加以下配置：

```env
# DeepSeek API配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# 百度千帆API配置
QIANFAN_API_KEY=your_qianfan_api_key_here
QIANFAN_SECRET_KEY=your_qianfan_secret_key_here

# OpenAI API配置（可选）
OPENAI_API_KEY=your_openai_api_key_here
```