// 注册页：提交用户名、邮箱和密码，调用后端 /users/register，成功后跳转登录页
// 注意：字段名与后端 User 模型保持一致（name / email / password），课程文档中的 username 需适配为 name
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/axios.js';

function RegisterPage() {
  // 用一个对象统一管理表单数据
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 通用输入处理：利用 name 属性动态更新对应字段
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiClient.post('/users/register', formData);
      navigate('/login'); // 注册成功 → 跳转登录页
    } catch (err) {
      setError(err.response?.data?.msg || '注册失败，请稍后再试');
    }
  };

  return (
    <div className="form-box card">
      <h1>注册</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-item">
          <label>用户名</label>
          <input
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="请输入用户名"
            required
          />
        </div>
        <div className="form-item">
          <label>邮箱</label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="请输入邮箱"
            required
          />
        </div>
        <div className="form-item">
          <label>密码</label>
          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="请输入密码（至少 6 位）"
            required
            minLength={6}
          />
        </div>
        <div className="form-actions">
          <button className="btn" type="submit">注册</button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>
      <p className="form-tip">
        已有账号？<Link to="/login">去登录</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
