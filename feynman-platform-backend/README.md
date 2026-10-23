# 费曼学习平台 · 后端服务

费曼学习平台是一个融合大前端与 AI 的智能学习工具，基于"费曼学习法"构建。
核心学习流程：录入知识点 → 用自己的话复述（录音）→ 语音转文字 → AI 润色与评分 → 智能出题与复习 → 知识图谱可视化。

本仓库为后端服务，已完成用户认证、知识点管理、AI 集成（多 LLM 润色评价 / 出题评分 / RAG 问答）、音频转录、知识图谱与复述记录等全部 API。前端为 React + Vite（见 `../feynman-platform-frontend`）。

## 技术栈

- 运行时框架：Node.js + Express
- 数据库：MongoDB Atlas + Mongoose
- 认证：JWT（jsonwebtoken）；密码哈希：bcryptjs
- 配置管理：dotenv（.env 文件）
- AI 服务：DeepSeek（主）/ 百度千帆 v2（备）/ OpenAI（可选）多 LLM 自动回退；千帆 Embedding-V1 向量化
- 语音转文字：百度 AI 短语音识别（REST API）；可选本地 Whisper 服务转发
- 向量检索：hnswlib-node（cosine 空间，本地文件持久化，纯 JS 余弦检索降级方案）
- 文件上传：multer（内存存储）

## 目录结构

```
feynman-platform-backend/
├── index.js                  # 服务入口：中间件、数据库连接、路由挂载、错误处理
├── models/
│   ├── User.js               # 用户数据模型
│   ├── KnowledgePoint.js     # 知识点数据模型
│   └── FeynmanAttempt.js     # 费曼复述记录模型（原始内容 / 复述 / AI 评价 / 评分）
├── routes/
│   ├── users.js              # 用户注册 / 登录路由
│   ├── knowledgePoints.js    # 知识点 CRUD 路由（含 RAG 向量索引联动）
│   ├── audio.js              # 音频转录路由（百度 ASR / 本地 Whisper）
│   ├── ai.js                 # AI 能力路由（润色评价 / 出题 / 评分 / RAG 问答）
│   ├── graph.js              # 知识图谱数据路由
│   └── attempts.js           # 复述记录路由
├── controllers/
│   ├── baiduAiController.js  # 百度 ASR 控制器（access_token 缓存）
│   ├── aiController.js       # 多 LLM 调用控制器（含容错 JSON 解析）
│   └── whisperController.js  # 本地 Whisper 服务转发控制器
├── services/
│   └── vectorStoreService.js # 向量存储服务（文本分割 / 向量化 / hnswlib 检索）
├── utils/
│   └── llmService.js         # 多 LLM 统一封装（自动回退 + embedding）
├── middleware/
│   └── auth.js               # JWT 认证中间件
├── vector_store/             # 向量索引与元数据持久化目录（运行时自动生成，不入库）
├── api-tests.http            # 接口测试脚本（配合 VSCode REST Client 扩展使用）
├── Dockerfile                # 后端容器镜像
├── .dockerignore
├── .env                      # 本地环境变量（不入库）
├── .env.example              # 环境变量模板
└── .gitignore
```

## 快速开始

1. 安装依赖：

   ```bash
   npm install
   ```

2. 配置环境变量：复制 `.env.example` 为 `.env`，并填写：

   - `MONGO_URI`：MongoDB Atlas 连接字符串（Atlas 控制台 → Connect → Drivers 获取），末尾追加数据库名 `feynman-db`
   - `JWT_SECRET`：JWT 签名密钥（任意足够长的随机字符串）
   - `PORT`：服务端口，默认 3000
   - 注意：需在 Atlas 的 Network Access 中将 IP 加入白名单（教学环境可配置为 `0.0.0.0/0`）

   AI 能力配置（不使用对应功能可留空，多 LLM 会自动回退）：

   - `DEEPSEEK_API_KEY`：DeepSeek 开放平台 API Key（主 LLM）
   - `QIANFAN_API_KEY`：百度千帆 API Key（备用 LLM + embedding 向量化 + 语音识别；语音识别复用此 Key Bearer 鉴权，需应用已开通「短语音识别」能力）
   - `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL`：可选第三方 LLM（OpenAI 兼容接口）
   - `WHISPER_API_URL`：本地 Whisper 服务地址（可选，见 `../feynman-platform-whisper-api`）

3. 启动服务：

   ```bash
   npm start        # 正常启动
   npm run dev      # 开发模式（文件变更自动重启）
   ```

4. 浏览器访问 <http://localhost:3000>，看到 `Hello, Feynman Learner!` 即表示启动成功；
   控制台出现 `MongoDB connected successfully!` 表示数据库连接成功。

## API 文档

Base URL：`http://localhost:3000`

| 方法   | 路径                          | 说明                                     | 认证 |
| ------ | ----------------------------- | ---------------------------------------- | ---- |
| GET    | `/`                           | 欢迎信息（服务存活检查）                 | 否   |
| POST   | `/api/users/register`         | 用户注册（成功后返回 JWT，注册即登录）   | 否   |
| POST   | `/api/users/login`            | 用户登录（返回 JWT）                     | 否   |
| POST   | `/api/knowledge-points`       | 创建知识点（自动写入 RAG 向量库）        | 是   |
| GET    | `/api/knowledge-points`       | 获取当前用户全部知识点（按创建时间倒序） | 是   |
| GET    | `/api/knowledge-points/:id`   | 获取单个知识点详情                       | 是   |
| PUT    | `/api/knowledge-points/:id`   | 更新知识点（title / content / status / reviewList，未传字段不覆盖） | 是 |
| DELETE | `/api/knowledge-points/:id`   | 删除知识点（同步清理向量库）             | 是   |
| POST   | `/api/audio/transcribe`       | 百度 ASR 语音转文字（multipart 上传 wav，16kHz 单声道） | 是 |
| POST   | `/api/audio/transcribe-local` | 转发本地 Whisper 服务（需先启动 Whisper API） | 是 |
| POST   | `/api/ai/evaluate`            | AI 润色与评价（原始内容 vs 复述，返回评分/优缺点，<60 分自动加入复习） | 是 |
| POST   | `/api/ai/generate-question`   | AI 出题（type: single-choice / short-answer，difficulty 可调） | 是 |
| POST   | `/api/ai/grade-answer`        | AI 简答题评分（答错自动加入复习清单）    | 是   |
| POST   | `/api/ai/rag-qa`              | 私有知识库问答（RAG 检索 + LLM 生成，返回答案与来源） | 是 |
| GET    | `/api/graph/knowledge-map`    | 知识图谱数据（节点 + 连线，按掌握状态 / 复习标记着色） | 是 |
| POST   | `/api/attempts`               | 保存一次费曼复述记录（transcribedText + 可选 aiFeedback） | 是 |
| GET    | `/api/attempts/kp/:knowledgePointId` | 获取某知识点的全部复述记录（按时间倒序） | 是 |

### 认证方式

需要登录的接口请在请求头中携带 JWT，支持两种写法（任选其一）：

- `x-auth-token: <token>`
- `Authorization: Bearer <token>`（Postman 中 Authorization 选 Bearer Token 类型）

Token 有效期 5 小时，过期后需重新登录获取。

### 接口测试（VSCode REST Client，无需 Postman）

项目根目录提供了 `api-tests.http`，覆盖完整业务流：注册 → 登录 → 知识点 CRUD → AI 润色评价 → AI 出题（单选 / 简答）→ AI 评分 → RAG 问答 → 知识图谱 → 复述记录 → 音频转文字。token 与知识点 `_id` 会自动从上游响应中提取，无需手动复制粘贴。使用方法：

1. 在 VSCode 扩展市场安装 **REST Client**（作者：Huachao Mao）
2. 打开 `api-tests.http`，光标放到任意请求块内，点击上方浮现的 `Send Request`（或按 `Ctrl+Alt+R`）
3. 按文件内注释的顺序依次发送（先执行 1 注册 → 2 登录 → 3 创建知识点，AI 接口依赖这些响应）

### 请求示例

注册（响应：`{ "token": "..." }`）：

```json
POST /api/users/register
{
  "name": "张三",
  "email": "zhangsan@test.com",
  "password": "a_secure_password123"
}
```

创建知识点（需携带 token）：

```json
POST /api/knowledge-points
{
  "title": "什么是JWT",
  "content": "# JWT (JSON Web Token)\n是一种开放标准..."
}
```

AI 润色与评价（需携带 token）：

```json
POST /api/ai/evaluate
{
  "knowledgePointId": "<知识点 _id>",
  "userExplanation": "我用自己的话解释：JWT 就是..."
}
```

### 常见响应

- `400`：参数缺失 / 邮箱已注册 / 登录凭据错误
- `401`：未携带 token、token 无效，或操作了不属于自己的知识点
- `404`：知识点不存在
- `500`：服务器内部错误（development 环境下响应包含具体错误信息）
- `502`：所有 LLM 服务均不可用（请检查 .env 中的 API Key 配置）

## 数据模型

### User（用户）

| 字段      | 类型   | 说明                       |
| --------- | ------ | -------------------------- |
| name      | String | 用户名，必填               |
| email     | String | 邮箱，必填且唯一           |
| password  | String | 密码的 bcrypt 哈希值，必填 |
| createdAt / updatedAt | Date | 自动维护 |

### KnowledgePoint（知识点）

| 字段       | 类型       | 说明                                                  |
| ---------- | ---------- | ----------------------------------------------------- |
| user       | ObjectId   | 关联 User（知识点归属），必填                         |
| title      | String     | 标题，必填                                            |
| content    | String     | 原始内容（支持 Markdown / LaTeX / Mermaid），必填     |
| status     | String     | 学习状态：not_started / in_progress / mastered，默认 not_started |
| reviewList | Boolean    | 是否加入复习计划，默认 false                          |
| createdAt / updatedAt | Date | 自动维护                                    |

### FeynmanAttempt（费曼复述记录）

| 字段       | 类型     | 说明                                              |
| ---------- | -------- | ------------------------------------------------- |
| user       | ObjectId | 关联 User，必填                                   |
| knowledgePoint | ObjectId | 关联知识点，必填                              |
| transcribedText | String | 语音转文字后的复述原文，必填                |
| aiFeedback.polishedText | String | AI 润色后的文本（08课，可选）      |
| aiFeedback.evaluation | String | AI 综合评价                          |
| aiFeedback.strengths | [String] | AI 指出的优点列表                     |
| aiFeedback.weaknesses | [String] | AI 指出的待改进列表                  |
| aiFeedback.score | Number | AI 评分（0~100，<60 自动将知识点加入复习清单） |
| aiFeedback.provider | String | 本次评估使用的 LLM 服务（DeepSeek/Qianfan/OpenAI） |
| createdAt / updatedAt | Date | 自动维护                              |

## RAG 私有知识库说明

- 创建 / 更新知识点时，后端自动将内容按 500 字分块（50 字重叠）调用千帆 Embedding-V1 生成 384 维向量，写入本地 `vector_store/` 目录（hnswlib 索引 + 元数据 JSON）
- `/api/ai/rag-qa` 先对问题进行向量检索（top-k，按用户隔离），再把检索到的上下文与问题组装成结构化 Prompt 交给 LLM 生成答案
- 若 hnswlib-node 加载失败（如平台不支持原生模块），自动降级为纯 JS 余弦相似度检索，功能不受影响

## 测试

项目使用 Node 内置的 `node:test`（不引入任何测试依赖），用例放在 `tests/`：

```bash
npm test          # 等价于 node --test "tests/*.test.js"
```

- `tests/graphService.test.js` —— 知识图谱的节点与边规则：显式引用优先、正文提及、去重、自环、同名标题、`sizeValue` 封顶、分类兜底
- `tests/vectorStore.pure.test.js` —— 向量库「删不删」的纯函数：取存活块、打墓碑（幂等）、自动重建阈值、文本分块
- `tests/knowledgePointService.test.js` —— 引用校验的每个分支与错误文案（模型查询已被替换，不连库）
- `tests/knowledgeStatus.test.js` —— 分数 → 阶段、只前进不回退
- `tests/prompts.test.js` —— 五段提示词的关键约束不能被误删（题型分流、JSON 字段、要点注入）

约定：**纯函数直接测，需要数据库的用替身**，所以整套用例不连 MongoDB、不调 Embedding、不起服务。
带数据库的端到端冒烟另有做法（自签 JWT + 真接口），见 `记忆文档.md` 的「可复用的验证方法」。

## 开发规范

- 代码注释、文档与团队交流统一使用中文
- Git 提交信息格式：`类型: 描述`，类型包括 feat / fix / docs / style / refactor / test / chore
- 只修改与任务相关的代码文件，无关内容绝不触碰
- 功能变更时同步更新本 README 与相关文档，保持文档与代码一致
- `.env` 与 `node_modules` 禁止提交到代码仓库

## 后续规划

- [x] React + Vite 前端界面
- [x] AI 集成：录音转文字、文字润色、理解评分、智能出题
- [x] RAG 私有知识库（向量化 + 检索 + 生成）
- [x] 知识图谱与 Three.js 3D 知识宇宙
- [x] 跨平台打包（Electron 桌面端 / PWA）
- [ ] 部署发布（Docker 镜像构建与云上运行）
