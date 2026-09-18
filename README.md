# 费曼学习平台（Feynman Platform）

费曼学习平台是一个融合大前端与 AI 的智能学习工具，基于"费曼学习法"构建。
核心学习流程：录入知识点 → 用自己的话复述（录音）→ 语音转文字 → AI 润色与评分 → 智能出题与复习 → 知识图谱可视化。

本仓库为 **monorepo 结构**，包含前端、后端与全部课程文档；目前已完成用户认证、知识点管理 API 与 React 前端界面（支持 Markdown / LaTeX / Mermaid 富文本渲染），AI 集成与可视化将在后续课程中开发。

## 课程进度（《大前端与AI实战》01 ~ 06 课）

| 课次 | 主题 | 完成内容 |
| ---- | ---- | -------- |
| 01 | 导论与后端初探 | 项目规划、开发环境、Git 与协作规范 |
| 02 | API 设计与数据库实战 | Express 骨架、MongoDB Atlas 接入、User / KnowledgePoint 模型 |
| 03 | 认证与核心业务 API | 用户注册登录（JWT + bcryptjs）、知识点 CRUD、认证中间件 |
| 04 | 前端起航与界面搭建 | Vite + React 项目、路由、Layout、登录 / 注册 / 主页 |
| 05 | 前后端联调与状态管理 | CORS、axios 封装、AuthContext、路由守卫 |
| 06 | 知识点模块与富文本渲染 | MD 编辑器、Markdown / LaTeX / Mermaid 渲染、DOMPurify 防 XSS |

各课程讲义见仓库根目录 `01~06《大前端与AI实战》*.md` 文档。

## 技术栈

| 端 | 技术 |
| -- | ---- |
| 前端 | React 19 + Vite、react-router-dom、axios、@uiw/react-md-editor、react-markdown + remark-gfm / remark-math + rehype-katex、mermaid、DOMPurify |
| 后端 | Node.js + Express、MongoDB Atlas + Mongoose、JWT（jsonwebtoken）、bcryptjs、dotenv |
| 数据库 | MongoDB Atlas（云端免费集群） |

## 仓库结构

```
.
├── feynman-platform-backend/   # 后端服务（Express + MongoDB）
│   ├── index.js                # 服务入口
│   ├── models/                 # User / KnowledgePoint 数据模型
│   ├── routes/                 # 用户与知识点路由
│   ├── middleware/             # JWT 认证中间件
│   ├── api-tests.http          # REST Client 接口测试脚本
│   └── .env.example            # 环境变量模板（.env 不入库）
├── feynman-platform-frontend/  # 前端应用（React + Vite）
│   └── src/
│       ├── api/                # axios 封装（自动注入 token）
│       ├── context/            # AuthContext 全局登录状态
│       ├── components/         # Layout / 路由守卫 / Markdown 渲染 / Mermaid 渲染
│       └── pages/              # 登录 / 注册 / 主页 / 知识点编辑页
├── 01~06《大前端与AI实战》*.md # 课程讲义
└── .gitignore
```

## 快速开始

### 1. 启动后端（端口 3000）

```bash
cd feynman-platform-backend
npm install
# 复制 .env.example 为 .env，填写 MONGO_URI 与 JWT_SECRET
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

## 功能特性

- 用户注册 / 登录（JWT 认证，token 自动持久化）
- 知识点增删改查（按用户隔离）
- 路由守卫：未登录自动跳转登录页
- 富文本编辑：MDEditor 编辑器，实时预览
- 富文本渲染：Markdown（GFM 表格 / 任务列表）、KaTeX 数学公式、Mermaid 图表（流程图 / 甘特图等）
- 安全防护：react-markdown 默认不渲染原始 HTML，Mermaid SVG 经 DOMPurify 消毒

## 安全说明

- `.env`（含数据库密码、JWT 密钥）已被 `.gitignore` 忽略，**严禁提交**
- 配置环境变量请复制 `.env.example` 并填写真实值
- `node_modules`、`dist` 等生成目录不入库，克隆后 `npm install` 重建

## 开发规范

- 代码注释、文档与团队交流统一使用中文
- Git 提交信息格式：`类型: 描述`，类型包括 feat / fix / docs / style / refactor / test / chore
- 只修改与任务相关的代码文件，无关内容绝不触碰
- 功能变更时同步更新相关文档，保持文档与代码一致

## 后续规划

- [ ] AI 集成：录音转文字、文字润色、理解评分、智能出题
- [ ] 知识图谱与 Three.js 3D 知识宇宙
- [ ] 跨平台打包（桌面端 / 移动端）与部署发布
