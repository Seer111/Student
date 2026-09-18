// 费曼学习平台后端服务 - 入口文件
// 职责：加载环境变量、注册核心中间件、连接数据库、挂载路由、启动服务
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// --- 环境变量校验：缺少关键配置时提前退出并给出清晰提示，避免运行中才暴露问题 ---
if (!process.env.MONGO_URI) {
  console.error('缺少环境变量 MONGO_URI，请参考 .env.example 配置 .env 文件');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('缺少环境变量 JWT_SECRET，请参考 .env.example 配置 .env 文件');
  process.exit(1);
}

// --- 核心中间件 ---
// cors：允许前端（如运行在 localhost:5173 的 Vite 应用）跨域请求后端接口
app.use(cors());
// express.json()：解析 JSON 格式的请求体（如注册/登录提交的用户信息）
app.use(express.json());

// --- 数据库连接 ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

// --- 业务路由 ---
app.use('/api/users', require('./routes/users'));
app.use('/api/knowledge-points', require('./routes/knowledgePoints'));

// 欢迎路由：用于快速验证服务是否正常启动
app.get('/', (req, res) => {
  res.send('Hello, Feynman Learner!');
});

// 404 处理：未匹配的路径统一返回 JSON
app.use((req, res) => {
  res.status(404).json({ msg: 'API not found' });
});

// 全局错误处理中间件：统一返回 500，避免异常被静默吞掉
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    msg: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(port, () => {
  console.log(`Feynman Platform backend is running at http://localhost:${port}`);
});
