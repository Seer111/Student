// 路由配置：公共路由（登录/注册） + 受保护路由（仪表盘/知识点表单/AI功能/可视化）
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import KnowledgePointFormPage from './pages/KnowledgePointFormPage.jsx';
import FeynmanRecordPage from './pages/FeynmanRecordPage.jsx'; // 07/08课：录音复述+AI评价
import QuizPage from './pages/QuizPage.jsx'; // 09课：AI测评
import AgentPage from './pages/AgentPage.jsx'; // 11课：RAG知识库问答
import GraphPage from './pages/GraphPage.jsx'; // 12课：知识图谱
import ThreeJSPage from './pages/ThreeJSPage.jsx'; // 13课：3D视界
import KnowledgeUniversePage from './pages/KnowledgeUniversePage.jsx'; // 14课：3D知识宇宙

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
          <Route path="/feynman/:id" element={<FeynmanRecordPage />} />
          <Route path="/quiz/:id" element={<QuizPage />} />
          <Route path="/agent" element={<AgentPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/3d-world" element={<ThreeJSPage />} />
          <Route path="/knowledge-universe" element={<KnowledgeUniversePage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
