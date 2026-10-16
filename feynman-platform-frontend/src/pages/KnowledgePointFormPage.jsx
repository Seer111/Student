// 知识点表单页：同时承担“新建”和“编辑”两种模式（通过 URL 是否携带 id 区分）
// 编辑模式：/kp/edit/:id   新建模式：/kp/new
// 引用：勾选其它知识点作为“显式引用”（存进 references 字段，2D 图谱与 3D 宇宙据此画关系线）
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';
import apiClient from '../api/axios.js';

// 学习状态 -> 中文（引用列表里给每条候选知识点标一个状态）
const STATUS_TEXT = { not_started: '未开始', in_progress: '学习中', mastered: '已掌握' };

function KnowledgePointFormPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // 存储 Markdown 文本，与渲染组件配套
  const [references, setReferences] = useState([]); // 已选中的引用（知识点 id 数组）
  const [candidates, setCandidates] = useState([]); // 可被引用的其它知识点
  const [keyword, setKeyword] = useState(''); // 引用搜索词
  const [error, setError] = useState('');
  const { id } = useParams(); // useParams：获取 URL 中的动态参数（编辑模式下的知识点 id）
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // 编辑模式：进入页面时拉取该知识点的现有数据并回填表单（含已建立的引用）
  useEffect(() => {
    if (!isEditing) return;

    const fetchKnowledgePoint = async () => {
      try {
        const response = await apiClient.get(`/knowledge-points/${id}`);
        setTitle(response.data.title);
        setContent(response.data.content);
        setReferences((response.data.references || []).map((item) => String(item)));
      } catch (err) {
        setError(err.response?.data?.msg || '获取知识点详情失败');
        console.error(err);
      }
    };

    fetchKnowledgePoint();
  }, [id, isEditing]);

  // 候选引用列表：当前用户的其它知识点（排除自己）
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await apiClient.get('/knowledge-points');
        setCandidates(response.data.filter((kp) => kp._id !== id));
      } catch (err) {
        console.error('获取可引用知识点失败', err);
      }
    };

    fetchCandidates();
  }, [id]);

  // 搜索过滤 + 已选的排在前面（方便一眼看到自己勾了什么、也好取消）
  const visibleCandidates = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const list = kw ? candidates.filter((kp) => kp.title.toLowerCase().includes(kw)) : candidates;
    return [...list].sort((a, b) => {
      const aSelected = references.includes(a._id) ? 0 : 1;
      const bSelected = references.includes(b._id) ? 0 : 1;
      return aSelected - bSelected || a.title.localeCompare(b.title, 'zh-Hans-CN');
    });
  }, [candidates, keyword, references]);

  const toggleReference = (kpId) => {
    setReferences((prev) => (prev.includes(kpId) ? prev.filter((item) => item !== kpId) : [...prev, kpId]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // 只提交当前确实存在的候选知识点 id：别人删掉的旧引用不会让保存报 400
    const validIds = new Set(candidates.map((kp) => kp._id));
    const kpData = { title, content, references: references.filter((refId) => validIds.has(refId)) };
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

        <div className="form-item">
          <label>引用（关联其它知识点）</label>
          <p className="ref-hint">
            勾选本知识点依赖 / 延伸到的知识点。保存后 2D 知识图谱会连出一条带箭头的“引用”边，
            3D 知识宇宙里会出现一条航线；图谱里的节点大小也由“关联数量”决定，所以引用越多节点越大。
            （另外：正文里原样写到别的知识点标题，会被自动识别为“提及”，画成更淡的一条线。）
          </p>
          <input
            className="ref-search"
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索知识点标题..."
          />
          <div className="ref-list">
            {visibleCandidates.length === 0 && (
              <p className="ref-empty">
                {candidates.length === 0 ? '还没有其它知识点可以引用' : '没有匹配的知识点'}
              </p>
            )}
            {visibleCandidates.map((kp) => (
              <label
                key={kp._id}
                className={`ref-item${references.includes(kp._id) ? ' is-selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={references.includes(kp._id)}
                  onChange={() => toggleReference(kp._id)}
                />
                <span className="ref-title">{kp.title}</span>
                <span className={`ref-status ref-status-${kp.status}`}>
                  {STATUS_TEXT[kp.status] || '未知'}
                </span>
              </label>
            ))}
          </div>
          <p className="ref-count">
            已选 {references.length} 个引用
            {references.length > 0 && (
              <button
                type="button"
                className="ref-clear"
                onClick={() => setReferences([])}
              >
                清空
              </button>
            )}
          </p>
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
