// 仪表盘（主页）：展示当前用户的知识点列表，支持新建、编辑、删除
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axios.js';
import MarkdownRenderer from '../components/MarkdownRenderer.jsx';

// 后端 status 枚举 → 中文展示文案
const STATUS_TEXT = {
  not_started: '未开始',
  in_progress: '学习中',
  mastered: '已掌握',
};

function DashboardPage() {
  const [knowledgePoints, setKnowledgePoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // useEffect：组件首次挂载时获取知识点列表（副作用：发送网络请求）
  useEffect(() => {
    const fetchKnowledgePoints = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/knowledge-points');
        setKnowledgePoints(response.data);
      } catch (err) {
        setError(err.response?.data?.msg || '获取知识点失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchKnowledgePoints();
  }, []); // 空依赖数组：只在组件首次挂载时运行一次

  // 删除知识点：确认后调用 DELETE 接口，并从本地状态中移除该项（避免整页刷新）
  const handleDelete = async (id) => {
    if (!window.confirm('你确定要删除这个知识点吗？')) return;
    try {
      await apiClient.delete(`/knowledge-points/${id}`);
      setKnowledgePoints(knowledgePoints.filter((kp) => kp._id !== id));
    } catch (err) {
      alert(err.response?.data?.msg || '删除失败，请稍后再试');
    }
  };

  if (loading) return <p className="status-text">加载中...</p>;
  if (error) return <p className="status-text form-error">{error}</p>;

  return (
    <div>
      <div className="list-header">
        <h1 className="page-title">我的知识点</h1>
        <Link to="/kp/new" className="btn">+ 新建知识点</Link>
      </div>

      {knowledgePoints.length === 0 ? (
        <p className="status-text">你还没有任何知识点，快去创建一个吧！</p>
      ) : (
        <ul className="kp-list">
          {knowledgePoints.map((kp) => (
            <li key={kp._id} className="kp-item">
              <div className="kp-item-header">
                <h2>{kp.title}</h2>
                <span className="kp-status">{STATUS_TEXT[kp.status] || kp.status}</span>
              </div>
              <div className="markdown-content">
                <MarkdownRenderer content={kp.content} />
              </div>
              <div className="kp-actions">
                <Link to={`/kp/edit/${kp._id}`} className="btn btn-plain">编辑</Link>
                <button className="btn btn-danger" onClick={() => handleDelete(kp._id)}>删除</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DashboardPage;
