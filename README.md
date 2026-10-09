# 费曼学习平台（Feynman Platform）

费曼学习平台是一个融合大前端与 AI 的智能学习工具，基于"费曼学习法"构建，随《大前端与AI实战》16 次实训课程完整开发。

核心学习闭环：录入知识点 → 费曼复述（录音/文字）→ 语音转文字 → AI 润色与评分 → AI 出题与测评 → 错题复习 → RAG 私有知识库问答 → 知识图谱与 3D 可视化。

本仓库为 monorepo 结构，包含前端、后端、全部课程文档与幻灯片，以及桌面端（Electron）与移动端（PWA）打包方案。

## 课程进度（《大前端与AI实战》01 ~ 16 课，全部完成）

| 课次 | 主题 | 核心成果 |
| ---- | ---- | -------- |
| 01 | 导论与后端初探 | 项目规划、开发环境、Git 与协作规范 |
| 02 | API 设计与数据库实战 | Express 骨架、MongoDB Atlas、User / KnowledgePoint 模型 |
| 03 | 认证与核心业务 API | JWT + bcryptjs 注册登录、知识点 CRUD、认证中间件 |
| 04 | 前端起航与界面搭建 | Vite + React 项目、路由、Layout、登录/注册/主页 |
| 05 | 前后端联调与状态管理 | CORS、axios 封装、AuthContext、路由守卫 |
| 06 | 知识点模块与富文本渲染 | MD 编辑器、Markdown / LaTeX / Mermaid 渲染、DOMPurify 防 XSS |
| 07 | 录音与语音转文字 | 录音 hook、音频上传、百度语音识别（复用千帆 Key） |
| 7.5 | AI 能力自主化（进阶） | 多 LLM 自动回退（DeepSeek / 千帆 / OpenAI） |
| 08 | AI 文本润色与智能评价 | 润色、费曼评分（完整性/准确性/简洁性）、反馈建议 |
| 09 | AI 出题与智能测评 | 单选/简答出题、自动评分、错题本与复习 |
| 10~11 | RAG 与私有知识库 | 千帆 Embedding + HNSW 向量检索、按用户隔离、AI 助手问答 |
| 12 | 知识图谱可视化 | 知识点关联图谱（2D，ECharts） |
| 13~14 | 3D 可视化 | Three.js 3D 视界、CesiumJS 3D 知识地球 |
| 15 | 跨平台部署 | Electron 桌面端（NSIS 安装包）、PWA 移动端 |
| 16 | 项目总结与部署 | Docker Compose 一键部署、项目展示 |

各课程讲义见 `课程文档/` 目录，课程幻灯片见 `课程PPT/` 目录。

## 技术栈

| 层 | 技术 |
| -- | ---- |
| 前端 | React 19 + Vite、react-router-dom、axios、@uiw/react-md-editor、react-markdown + remark-gfm / remark-math + rehype-katex、mermaid、DOMPurify、echarts、three、d3-force-3d、vite-plugin-pwa |
| 后端 | Node.js + Express、MongoDB Atlas + Mongoose、JWT（jsonwebtoken）、bcryptjs、multer、hnswlib-node（HNSW 向量检索） |
| AI 服务 | DeepSeek（主 LLM）、百度千帆 ERNIE（备用 LLM + Embedding-V1 向量化 + 语音识别）、OpenAI（可选第三备用） |
| 部署 | Docker Compose、Electron（NSIS 安装包）、PWA（Service Worker 离线可用） |

## 仓库结构

```
.
├── feynman-platform-backend/     # 后端服务（Express + MongoDB）
│   ├── index.js                  # 服务入口
│   ├── models/                   # User / KnowledgePoint / FeynmanAttempt 数据模型
│   ├── routes/                   # 用户、知识点、音频、AI、测评、图谱路由
│   ├── controllers/              # 百度语音识别控制器
│   ├── services/                 # 向量库服务（HNSW + 千帆 Embedding）
│   ├── utils/                    # 多 LLM 服务（DeepSeek/千帆/OpenAI 自动回退）
│   ├── vector_store/             # 向量索引运行时数据（不入库）
│   ├── api-tests.http            # REST Client 接口测试脚本
│   └── .env.example              # 环境变量模板（.env 不入库）
├── feynman-platform-frontend/    # 前端应用（React + Vite）
│   ├── src/pages/                # 登录/注册/主页/费曼复述/AI助手/测评/图谱/3D 页面
│   ├── public/                   # PWA 图标与 manifest
│   ├── electron.cjs              # Electron 主进程
│   ├── dist/                     # PWA 构建产物（不入库）
│   └── release/                  # Electron 安装包（不入库）
├── feynman-platform-whisper-api/ # 本地 Whisper 语音识别服务（可选）
├── 课程文档/                     # 全部课程讲义（01~16 课 .md）
├── 课程PPT/                      # 课程幻灯片（.pptx）
├── docker-compose.yml            # 一键部署（后端 + 前端 + MongoDB）
└── .gitignore
```

## 快速开始

### 1. 启动后端（端口 3000）

```bash
cd feynman-platform-backend
npm install
# 复制 .env.example 为 .env，填写 MONGO_URI、JWT_SECRET 与 AI Key
npm run dev
```

看到 `MongoDB connected successfully!` 即启动成功。注意：需在 MongoDB Atlas 的 Network Access 中将本机 IP 加入白名单。

### 2. 启动前端（端口 5173）

```bash
cd feynman-platform-frontend
npm install
npm run dev
```

浏览器访问 <http://localhost:5173>，注册账号后即可创建知识点。

### 3. 配置 AI 能力（可选但推荐）

在 `feynman-platform-backend/.env` 中至少配置一个 LLM Key：

| 能力 | 所需配置 |
| ---- | -------- |
| AI 润色 / 出题 / 评分 | `DEEPSEEK_API_KEY`（主）或 `QIANFAN_API_KEY`（备）或 `OPENAI_API_KEY`（第三备） |
| RAG 私有知识库 | `QIANFAN_API_KEY`（需开通 Embedding-V1） |
| 语音转文字 | `QIANFAN_API_KEY`（复用，需开通「短语音识别」能力） |

未配置时对应 AI 接口会返回 502 提示。

## 功能特性

- 用户注册 / 登录（JWT 认证，token 自动持久化）
- 知识点增删改查（按用户隔离）+ Markdown / LaTeX / Mermaid 富文本渲染
- 费曼复述：录音（60 秒）→ 语音转文字 → AI 润色 → 费曼评分与反馈
- AI 测评：AI 出题（单选 / 简答）→ 自动评分 → 错题加入复习
- RAG 私有知识库：知识点自动向量化入库，AI 助手基于私有知识回答（附来源）
- 知识图谱可视化（2D）：知识点关联关系图谱
- 3D 可视化：Three.js 3D 知识视界 + CesiumJS 3D 知识地球
- 跨平台：Electron 桌面端安装包 + PWA 移动端（离线可用）

## 部署

### Docker 一键部署

```bash
docker compose up -d
```

### 桌面端（Windows 安装包）

```bash
cd feynman-platform-frontend
npm run electron:build
```

安装包输出至 `release/` 目录。

### 移动端（PWA）

`npm run build` 产物 `dist/` 部署到任意 HTTPS 服务器即可，支持添加到主屏幕与离线访问。

## 安全说明

- `.env`（含数据库密码、JWT 密钥、AI API Key）已被 `.gitignore` 忽略，**严禁提交**
- `node_modules`、`dist`、`release`、`vector_store` 等生成/运行时数据不入库
- 配置环境变量请复制 `.env.example` 并填写真实值

## 开发规范

- 代码注释、文档与团队交流统一使用中文
- Git 提交信息格式：`类型: 描述`，类型包括 feat / fix / docs / style / refactor / test / chore
- 只修改与任务相关的代码文件，无关内容绝不触碰
- 功能变更时同步更新相关文档，保持文档与代码一致
