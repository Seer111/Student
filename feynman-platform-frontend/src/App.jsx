// 路由配置：公共路由（登录/注册） + 受保护路由（仪表盘/知识点表单）
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import KnowledgePointFormPage from './pages/KnowledgePointFormPage.jsx';

function App() {
  return (
    <Routes>
      {/* Layout 作为父路由：所有页面共享导航栏 */}
      <Route element={<Layout />}>
        {/* 公共路由：无需登录即可访问 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 受保护路由：未登录访问时会被重定向到 /login */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/kp/new" element={<KnowledgePointFormPage />} />
          <Route path="/kp/edit/:id" element={<KnowledgePointFormPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
