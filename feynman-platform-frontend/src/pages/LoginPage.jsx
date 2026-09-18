// 登录页：提交邮箱和密码，调用后端 /users/login 获取 token，写入全局状态后跳转主页
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth(); // 从全局状态获取 login 函数
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); // 阻止表单默认的刷新行为
    setError('');
    try {
      const response = await apiClient.post('/users/login', { email, password });
      login(response.data.token); // 更新全局 token（同步写入 localStorage）
      navigate('/'); // 登录成功 → 跳转主页
    } catch (err) {
      setError(err.response?.data?.msg || '登录失败，请稍后再试');
    }
  };

  return (
    <div className="form-box card">
      <h1>登录</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-item">
          <label>邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="请输入邮箱"
            required
          />
        </div>
        <div className="form-item">
          <label>密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            required
          />
        </div>
        <div className="form-actions">
          <button className="btn" type="submit">登录</button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>
      <p className="form-tip">
        还没有账号？<Link to="/register">去注册</Link>
      </p>
    </div>
  );
}

export default LoginPage;
