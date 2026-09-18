// axios 实例封装：统一 API 根路径与请求头
// 好处：后端地址变更只需改这一处；token 注入逻辑集中管理
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api', // 后端 API 的基础路径
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

export default apiClient;
