// 通用布局：导航栏 + 内容区（Outlet）
// 作业实现（05课）：根据登录状态显示不同导航项；提供“退出登录”按钮
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Layout() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

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
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
