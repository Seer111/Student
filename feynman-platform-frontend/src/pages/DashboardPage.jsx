// 仪表盘（主页）：展示当前用户的知识点列表，支持新建、编辑、删除
// 视觉与信息层级（批次 16，只动样式与渲染层，不碰接口/数据/业务逻辑）：
//   · 正文里与头部同名的一级标题在渲染前剔除，一屏只留一个同名标题
//   · 内容不再套第二层灰底容器，直接落在卡片上
//   · 按钮分三级：主操作实心 / 次操作描边 / 删除极轻幽灵（hover 或键盘聚焦才显形）
//   · 三态语义色 + 状态点字形（○ / ◐ / ●），不只用颜色区分
//   · 加载态用与真实卡片同尺寸的骨架屏，避免布局跳动
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

// 列表入场的 stagger 上限：每项 45ms，最多 7 档（7 × 45 = 315ms ≤ 320ms），避免长列表末尾等太久
const MAX_STAGGER_INDEX = 7;

/**
 * 剔除正文开头与知识点标题重复的一级/二级标题。
 * 为什么需要：实测 11 个知识点里有 10 个正文首行就是 `# <标题>`，于是卡片头部 h2 与正文 h1
 * 会相邻出现两个同名标题。这里只在“渲染前”去掉首个非空行，不改数据、不改接口——
 * 换页面、换数据、把同一份内容渲染到别处都不受影响。
 * @param {string} content - 原始 Markdown 正文
 * @param {string} title - 卡片头部显示的标题
 * @returns {string} - 可直接交给 MarkdownRenderer 的正文
 */
function stripLeadingTitle(content, title) {
  if (!content) return '';
  const target = String(title || '').trim();
  if (!target) return content;

  const lines = String(content).split('\n');
  const firstIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstIndex === -1) return '';

  // 全角空格容错：手工写的内容里「# + 全角空格 + 标题」也常见，这里先统一换成半角再匹配
  const heading = lines[firstIndex].replace(/\u3000/g, ' ').trim();
  const match = /^#{1,2}\s+(.+)$/.exec(heading);
  if (match && match[1].trim() === target) {
    lines.splice(firstIndex, 1);
    return lines.join('\n');
  }
  return content;
}

// 加载骨架：与真实卡片同尺寸的占位，替代「加载中...」文字，避免列表出现时整页跳动。
// 正文行数按实测卡片高度取（真实卡片 212~844px、中位 294px），所以这里铺到接近中位的行数，
// 而不是只画两行——骨架太矮的话，数据回来时下面的内容照样会被顶下去。
function SkeletonList() {
  return (
    <ul className="kp-list" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <li key={index} className="kp-item kp-skeleton" style={{ '--i': index }}>
          <div className="kp-skeleton-bar kp-skeleton-title" />
          {Array.from({ length: 17 }, (_, line) => (
            <div key={line} className="kp-skeleton-bar" />
          ))}
          <div className="kp-skeleton-bar kp-skeleton-short" />
          <div className="kp-skeleton-actions">
            <span className="kp-skeleton-bar kp-skeleton-btn" />
            <span className="kp-skeleton-bar kp-skeleton-btn" />
            <span className="kp-skeleton-bar kp-skeleton-btn" />
            <span className="kp-skeleton-bar kp-skeleton-btn" />
          </div>
        </li>
      ))}
    </ul>
  );
}

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

  // 更新学习状态：让「未开始 / 学习中 / 已掌握」三态在界面上真正可达
  // 后端 PUT /api/knowledge-points/:id 支持 status 字段，这里用返回的最新对象替换本地那一项
  const handleStatusChange = async (id, status) => {
    try {
      const response = await apiClient.put(`/knowledge-points/${id}`, { status });
      setKnowledgePoints((prev) => prev.map((kp) => (kp._id === id ? response.data : kp)));
    } catch (err) {
      alert(err.response?.data?.msg || '状态更新失败，请稍后再试');
    }
  };

  // 页头在加载态与错误态也要渲染：否则列表出现时页头会把内容整体往下推，正是布局跳动的来源
  const header = (
    <div className="list-header">
      <h1 className="page-title">我的知识点</h1>
      <Link to="/kp/new" className="btn kp-btn-primary">+ 新建知识点</Link>
    </div>
  );

  if (loading) {
    return (
      <div>
        {header}
        <SkeletonList />
        <p className="visually-hidden" role="status" aria-live="polite">正在加载知识点…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {header}
        <p className="status-text form-error">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {header}

      {knowledgePoints.length === 0 ? (
        <p className="status-text">你还没有任何知识点，快去创建一个吧！</p>
      ) : (
        <ul className="kp-list">
          {knowledgePoints.map((kp, index) => (
            <li
              key={kp._id}
              className="kp-item"
              // --i 只给入场动画算延迟；上限封在 7 档，长列表不会越往下等越久
              style={{ '--i': Math.min(index, MAX_STAGGER_INDEX) }}
            >
              <div className="kp-item-header">
                <h2>{kp.title}</h2>
                <div className="kp-badges">
                  {kp.reviewList && <span className="kp-review-badge">待复习</span>}
                  {/* 状态点：给颜色之外再加一个形状通道（○ 空心 / ◐ 半实心 / ● 实心），
                      灰度打印或色觉差异下也能区分；状态文字由下面的下拉框提供 */}
                  <span className={`kp-status-dot kp-status-dot-${kp.status}`} aria-hidden="true" />
                  {/* 状态下拉：直接在这里改学习状态（以前只显示、改不了，三态成了“死枚举”） */}
                  <select
                    className={`kp-status kp-status-${kp.status}`}
                    value={kp.status}
                    onChange={(e) => handleStatusChange(kp._id, e.target.value)}
                    aria-label="学习状态"
                  >
                    {Object.entries(STATUS_TEXT).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="markdown-content">
                <MarkdownRenderer content={stripLeadingTitle(kp.content, kp.title)} />
              </div>
              <div className="kp-actions">
                <Link to={`/feynman/${kp._id}`} className="btn kp-btn-primary">开始复述</Link>
                <Link to={`/quiz/${kp._id}`} className="btn kp-btn-secondary">开始测评</Link>
                <Link to={`/kp/edit/${kp._id}`} className="btn kp-btn-secondary">编辑</Link>
                <button
                  type="button"
                  className="btn kp-btn-danger"
                  onClick={() => handleDelete(kp._id)}
                  aria-label={`删除知识点：${kp.title}`}
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DashboardPage;
