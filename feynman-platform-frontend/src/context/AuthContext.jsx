// 认证上下文：用 React Context API 管理全局登录状态
// 三要素：createContext 创建“频道” → Provider 发布“消息” → useAuth 订阅“消息”
import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // token 从 localStorage 初始化：保证刷新页面后登录状态不丢失
  const [token, setToken] = useState(localStorage.getItem('token'));
  // user：预留字段，后续可通过解码 token 或请求用户信息接口来填充
  const [user, setUser] = useState(null);

  useEffect(() => {
    // token 变化时同步到 localStorage
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

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
