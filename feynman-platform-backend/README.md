# 费曼学习平台 - 后端服务（feynman-platform-backend）

费曼学习平台是一个融合大前端与 AI 的智能学习工具，基于"费曼学习法"构建。
核心学习流程：录入知识点 → 用自己的话复述（录音）→ 语音转文字 → AI 润色与评分 → 智能出题与复习 → 知识图谱可视化。

本仓库为后端服务，目前已完成用户认证与知识点管理 API；前端（React + Vite）、AI 集成与可视化将在后续课程中开发。

## 技术栈

- 运行时框架：Node.js + Express
- 数据库：MongoDB Atlas + Mongoose
- 认证：JWT（jsonwebtoken）；密码哈希：bcryptjs
- 配置管理：dotenv（.env 文件）

## 目录结构

```
feynman-platform-backend/
├── index.js                  # 服务入口：中间件、数据库连接、路由挂载、错误处理
├── models/
│   ├── User.js               # 用户数据模型
│   └── KnowledgePoint.js     # 知识点数据模型
├── routes/
│   ├── users.js              # 用户注册 / 登录路由
│   └── knowledgePoints.js    # 知识点 CRUD 路由
├── middleware/
│   └── auth.js               # JWT 认证中间件
├── api-tests.http            # 接口测试脚本（配合 VSCode REST Client 扩展使用）
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
   - 注意：需在 Atlas 的 Network Access 中将 IP 加入白名单（教学环境可配置为 `0.0.0.0/0`）

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
| POST   | `/api/knowledge-points`       | 创建知识点                               | 是   |
| GET    | `/api/knowledge-points`       | 获取当前用户全部知识点（按创建时间倒序） | 是   |
| GET    | `/api/knowledge-points/:id`   | 获取单个知识点详情                       | 是   |
| PUT    | `/api/knowledge-points/:id`   | 更新知识点（title / content / status / reviewList） | 是 |
| DELETE | `/api/knowledge-points/:id`   | 删除知识点                               | 是   |

### 认证方式

需要登录的接口请在请求头中携带 JWT，支持两种写法（任选其一）：

- `x-auth-token: <token>`
- `Authorization: Bearer <token>`（Postman 中 Authorization 选 Bearer Token 类型）

Token 有效期 5 小时，过期后需重新登录获取。

### 接口测试（VSCode REST Client，无需 Postman）

项目根目录提供了 `api-tests.http`，覆盖完整业务流的 7 个请求（注册 → 登录 → 创建 → 查列表 / 查单个 → 更新 → 删除），其中 token 与知识点 `_id` 会自动从上游响应中提取，无需手动复制粘贴。使用方法：

1. 在 VSCode 扩展市场安装 **REST Client**（作者：Huachao Mao）
2. 打开 `api-tests.http`，光标放到任意请求块内，点击上方浮现的 `Send Request`（或按 `Ctrl+Alt+R`）
3. 按文件内注释的顺序依次发送（1 注册 → 2 登录 → 3 创建 → …）

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

### 常见响应

- `400`：参数缺失 / 邮箱已注册 / 登录凭据错误
- `401`：未携带 token、token 无效，或操作了不属于自己的知识点
- `404`：知识点不存在
- `500`：服务器内部错误（development 环境下响应包含具体错误信息）

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

## 开发规范

- 代码注释、文档与团队交流统一使用中文
- Git 提交信息格式：`类型: 描述`，类型包括 feat / fix / docs / style / refactor / test / chore
- 只修改与任务相关的代码文件，无关内容绝不触碰
- 功能变更时同步更新本 README 与相关文档，保持文档与代码一致
- `.env` 与 `node_modules` 禁止提交到代码仓库

## 后续规划

- [ ] React + Vite 前端界面
- [ ] AI 集成：录音转文字、文字润色、理解评分、智能出题
- [ ] 知识图谱与 Three.js 3D 知识宇宙
- [ ] 跨平台打包（桌面端 / 移动端）与部署发布
