// 前端入口文件：把根组件 App 挂载到 index.html 的 #root 容器中
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter：开启客户端路由（SPA 的“假跳转”） */}
    <BrowserRouter>
      {/* AuthProvider：提供全局登录状态（token / user / login / logout） */}
      <AuthProvider>
        {/* 最外层错误边界：连布局或路由本身崩掉时，也不会变成整页白屏 */}
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
