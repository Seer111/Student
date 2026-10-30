// 通用布局：导航栏 + 内容区（Outlet）
// 作业实现（05课）：根据登录状态显示不同导航项；提供“退出登录”按钮
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

function Layout() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 导航项统一的 class：当前页加 is-active（CSS 里是 ink 文字 + 2px 下划线）
  const navClass = ({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`;

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
            {/* 当前页靠 nav-item + is-active（ink 文字 + 2px 下划线）标记，不用底色块 */}
            <NavLink to="/" end className={navClass}>主页</NavLink>
            <NavLink to="/agent" className={navClass}>AI助手</NavLink>
            <NavLink to="/graph" className={navClass}>知识图谱</NavLink>
            <NavLink to="/knowledge-universe" className={navClass}>3D知识宇宙</NavLink>
            <NavLink to="/3d-world" className={navClass}>3D视界</NavLink>
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
