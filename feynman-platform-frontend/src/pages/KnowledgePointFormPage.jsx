// 知识点表单页：同时承担“新建”和“编辑”两种模式（通过 URL 是否携带 id 区分）
// 编辑模式：/kp/edit/:id   新建模式：/kp/new
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import apiClient from '../api/axios.js';

function KnowledgePointFormPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // 存储 Markdown 文本，与渲染组件配套
  const [error, setError] = useState('');
  const { id } = useParams(); // useParams：获取 URL 中的动态参数（编辑模式下的知识点 id）
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // 编辑模式：进入页面时拉取该知识点的现有数据并回填表单
  useEffect(() => {
    if (!isEditing) return;

    const fetchKnowledgePoint = async () => {
      try {
        const response = await apiClient.get(`/knowledge-points/${id}`);
        setTitle(response.data.title);
        setContent(response.data.content);
      } catch (err) {
        setError(err.response?.data?.msg || '获取知识点详情失败');
        console.error(err);
      }
    };

    fetchKnowledgePoint();
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const kpData = { title, content };
    try {
      if (isEditing) {
        await apiClient.put(`/knowledge-points/${id}`, kpData);
      } else {
        await apiClient.post('/knowledge-points', kpData);
      }
      navigate('/'); // 保存成功 → 返回主页
    } catch (err) {
      setError(err.response?.data?.msg || '保存知识点失败');
      console.error(err);
    }
  };

  return (
    <div>
      <h1 className="page-title">{isEditing ? '编辑知识点' : '新建知识点'}</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-item">
          <label>标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入知识点标题"
            required
          />
        </div>

        {/* data-color-mode 固定编辑器为浅色主题 */}
        <div className="form-item" data-color-mode="light">
          <label>内容（支持 Markdown / LaTeX / Mermaid）</label>
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || '')}
            height={360}
            textareaProps={{ placeholder: '在此输入知识点内容，支持 Markdown 语法...' }}
          />
        </div>

        <div className="form-actions">
          <button className="btn" type="submit">{isEditing ? '更新' : '创建'}</button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>
    </div>
  );
}

export default KnowledgePointFormPage;
