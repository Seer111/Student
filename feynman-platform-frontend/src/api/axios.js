// axios 实例封装：统一 API 根路径与请求头
// 好处：后端地址变更只需改这一处；token 注入逻辑集中管理
import axios from 'axios';

// API 根路径解析（三种运行方式都要能用）：
//   1) 开发模式（vite dev server，5173）：用相对路径 /api，由 vite.config.js 的 server.proxy 转发到后端
//   2) 容器/服务器部署（Nginx 托管 dist）：同样用相对路径 /api，由 nginx.conf 反向代理到后端容器
//      —— 前端不再硬编码 http://localhost:3000，非本机访问也能正常请求
//   3) Electron 桌面端（file:// 加载 dist/index.html）：相对路径会指向本地文件系统，
//      因此回退到绝对地址 http://localhost:3000/api（桌面端与后端同机运行）
// 需要指向其它后端时，在 .env 中设置 VITE_API_BASE_URL 覆盖即可
const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
const baseURL =
  import.meta.env.VITE_API_BASE_URL || (isFileProtocol ? 'http://localhost:3000/api' : '/api');

const apiClient = axios.create({
  baseURL, // 后端 API 的基础路径
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：每次发请求前，自动把 token 附加到请求头
// 说明：后端认证中间件兼容 'x-auth-token' 与 'Authorization: Bearer ...' 两种写法，这里统一用前者
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器：集中处理“登录态失效”
// 背景：JWT 有效期 5 小时，过期后所有受保护接口都会返回 401。
// 这里统一清掉本地 token 并广播一个事件，由 AuthContext 收起登录状态，
// ProtectedRoute 随即把用户送回登录页 —— 避免每个页面各写一套 401 处理。
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export default apiClient;
