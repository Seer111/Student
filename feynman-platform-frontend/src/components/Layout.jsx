// 通用布局：导航栏 + 内容区（Outlet）
// 作业实现（05课）：根据登录状态显示不同导航项；提供“退出登录”按钮
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

function Layout() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout(); // 清除全局 token（同步清空 localStorage）
    navigate('/login'); // 回到登录页
  };

  return (
    <div className="app-layout">
      <nav className="navbar">
        <Link to="/" className="brand">费曼学习平台</Link>
        {token ? (
          <>
            <Link to="/">主页</Link>
            <Link to="/agent">AI助手</Link>
            <Link to="/graph">知识图谱</Link>
            <Link to="/knowledge-universe">3D知识宇宙</Link>
            <Link to="/3d-world">3D视界</Link>
            {/* 昵称来自 GET /api/users/me（AuthContext 加载），悬停可看邮箱 */}
            {user && <span className="navbar-user" title={user.email}>{user.name}</span>}
            <button className="btn-logout" onClick={handleLogout}>退出登录</button>
          </>
        ) : (
          <>
            <Link to="/login">登录</Link>
            <Link to="/register">注册</Link>
          </>
        )}
      </nav>

      <main className="main-content">
        {/* Outlet 占位符：匹配到的子路由组件会渲染在这里 */}
        {/* 内容区包一层错误边界：某个页面崩了只替换内容区，导航栏依旧可用；
            resetKey 用当前路径，切到别的页面时自动复位 */}
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default Layout;
