// 认证上下文：用 React Context API 管理全局登录状态
// 三要素：createContext 创建“频道” → Provider 发布“消息” → useAuth 订阅“消息”
import { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api/axios.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // token 从 localStorage 初始化：保证刷新页面后登录状态不丢失
  const [token, setToken] = useState(localStorage.getItem('token'));
  // user：当前登录用户信息（由后端 GET /api/users/me 提供，登录/刷新后自动加载）
  const [user, setUser] = useState(null);

  useEffect(() => {
    // token 变化时同步到 localStorage
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  // 用 token 换用户资料：localStorage 只存 token，昵称/邮箱每次挂载时向后端要，
  // 避免把会过期的用户信息写死在本地，也避免“多个页面各自存一份”的不一致
  useEffect(() => {
    if (!token) {
      setUser(null);
      return undefined;
    }
    let cancelled = false;
    apiClient
      .get('/users/me')
      .then((response) => {
        if (!cancelled) setUser(response.data);
      })
      .catch(() => {
        // 401 已由 axios 响应拦截器统一广播，这里只需保证本地不残留用户信息
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // 监听登录态失效事件（axios 响应拦截器在收到 401 时广播）：
  // 立即清空 token 与 user，ProtectedRoute 会据此把用户送回登录页
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = (newToken) => {
    setToken(newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  // 通过 value 把状态与函数提供给所有子组件
  const value = { token, user, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 自定义 Hook：任何组件都可以通过 useAuth() 获取全局认证状态
export function useAuth() {
  return useContext(AuthContext);
}
