// 前端入口文件：把根组件 App 挂载到 index.html 的 #root 容器中
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter：开启客户端路由（SPA 的“假跳转”） */}
    <BrowserRouter>
      {/* AuthProvider：提供全局登录状态（token / user / login / logout） */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
