// 路由守卫：未登录（无 token）时重定向到登录页，保护需要登录才能访问的页面
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function ProtectedRoute() {
  const { token } = useAuth(); // 从全局状态获取 token

  if (!token) {
    // replace：替换当前历史记录，用户点“后退”不会回到受保护的页面
    return <Navigate to="/login" replace />;
  }

  // 已登录：正常渲染子路由
  return <Outlet />;
}

export default ProtectedRoute;
