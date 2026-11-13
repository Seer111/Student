// 前端入口文件：把根组件 App 挂载到 index.html 的 #root 容器中
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// 路由容器：浏览器里用 BrowserRouter（地址栏是 /login 这种）；
// Electron 桌面端跑在 file:// 协议下，pathname 会变成磁盘路径（/E:/.../dist/index.html），
// 所有路由都匹配不上、页面会整片空白，所以 file:// 下一律改用 HashRouter（#/login）。
const AppRouter = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* AppRouter：开启客户端路由（桌面端 file:// 下自动用 HashRouter） */}
    <AppRouter>
      {/* AuthProvider：提供全局登录状态（token / user / login / logout） */}
      <AuthProvider>
        {/* 最外层错误边界：连布局或路由本身崩掉时，也不会变成整页白屏 */}
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </AppRouter>
  </React.StrictMode>,
);
