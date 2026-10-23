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
| 13~14 | 3D 可视化 | Three.js 3D 知识视界、d3-force-3d 3D 知识宇宙（第 13 课预告的 CesiumJS 数字地球未在代码中落地） |
| 15 | 跨平台部署 | Electron 桌面端（NSIS 安装包）、PWA 移动端 |
| 16 | 项目总结与部署 | Docker Compose 一键部署、项目展示 |

各课程讲义见 `docs/课程文档/`，课程幻灯片见 `docs/课程PPT/`。

## 技术栈

| 层 | 技术 |
| -- | ---- |
| 前端 | React 19 + Vite、react-router-dom、axios、@uiw/react-md-editor、react-markdown + remark-gfm / remark-math + rehype-katex、mermaid、DOMPurify、echarts、three、d3-force-3d、vite-plugin-pwa |
| 后端 | Node.js + Express、MongoDB Atlas + Mongoose、JWT（jsonwebtoken）、bcryptjs、multer、hnswlib-node（HNSW 向量检索） |
| AI 服务 | DeepSeek（主 LLM）、百度千帆 ERNIE（备用 LLM + Embedding-V1 向量化 + 语音识别）、OpenAI（可选第三备用） |
| 部署 | Docker Compose、Electron（NSIS 安装包）、PWA（Service Worker 离线可用） |

## 仓库结构

按「应用代码 / 文档资料 / 脚本工具」三层组织：三个可独立运行的应用各自是一个完整工程（自带 package.json、Dockerfile、README），
文档与课件全部收进 `docs/`，根目录只留编排与约定文件。

```
.
├── feynman-platform-backend/      # 后端服务（Express + MongoDB）
│   ├── index.js                   # 服务入口
│   ├── models/ routes/ controllers/ services/ utils/ middleware/
│   ├── scripts/                   # 运维脚本（向量库补索引/审计）
│   ├── vector_store/              # 向量索引运行时数据（不入库）
│   ├── api-tests.http             # REST Client 接口测试脚本
│   └── .env.example               # 环境变量模板（.env 不入库）
├── feynman-platform-frontend/     # 前端应用（React + Vite）
│   ├── src/pages|components|utils|api|context/
│   ├── public/                    # PWA 图标与 manifest
│   ├── electron.cjs               # Electron 主进程
│   ├── nginx.conf                 # 容器内静态托管配置
│   ├── dist/ release/             # 构建与打包产物（不入库）
│   └── eslint.config.js           # 代码规范（npm run lint）
├── feynman-platform-whisper-api/  # 本地 Whisper 语音识别服务（可选，Python + Flask）
├── docs/
│   ├── 课程文档/                  # 16 次课讲义（.md）
│   ├── 课程PPT/                   # 课件（.pptx）+ ppt-master 可再生成工程
│   ├── 设计/界面美化提示词.md      # 界面设计提示词（按截图逐屏）
│   └── 截图/                      # 各页面截图与用户提供的原始截图
├── scripts/generate-pwa-icons.js  # 生成 PWA 图标（零依赖，node 直接跑）
├── docker-compose.yml             # 容器编排（前端 Nginx + 后端；数据库为外部 Atlas）
├── package.json                   # 仓库根脚本（代理到各子工程，不含依赖）
├── AGENTS.md                      # 给 AI agent 的仓库约定
├── 记忆文档.md                     # 项目记忆（现状 / 踩坑 / 遗留）
└── .gitignore
```

根目录提供几条代理脚本，省去记目录：

```bash
npm run dev:backend      # 起后端（端口 3000）
npm run dev:frontend     # 起前端（端口 5173）
npm run lint             # 前端 ESLint
npm run build            # 前端生产构建
npm run vectors:audit    # 向量库与知识库一致性核对
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
- 3D 可视化：Three.js 3D 知识视界 + d3-force-3d 3D 知识宇宙（课程讲义预告的 CesiumJS 数字地球未实现）
- 跨平台：Electron 桌面端安装包 + PWA 移动端（离线可用）

## 部署

### Docker 一键部署

```bash
# 先在仓库根目录创建 .env（同 docker-compose.yml 同级），填入 MONGO_URI / JWT_SECRET / AI Key
docker compose up -d --build
```

说明：`docker-compose.yml` 只编排**前端（Nginx，80 端口）+ 后端（3000 端口）两个容器**，**不包含 MongoDB 服务**——数据库仍使用 `MONGO_URI` 指向的 MongoDB Atlas 集群，请确认 Atlas 的 Network Access 已放行容器出口 IP。前端通过相对路径 `/api` 请求后端，由 Nginx 反向代理，因此除 80 端口外无需额外暴露。

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
