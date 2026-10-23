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

// 正文折叠阈值：约 4 行正文（中文按字符计）。低于它的卡片不显示「展开全文」，
// 高于它的先折叠成 260px 再让用户点开——列表高度因此收敛（批次 16 遗留的 212~844px 极差就是这里来的）。
const CLAMP_THRESHOLD = 180;

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
  // 正文展开状态：逐卡独立记录（Set 里存 _id），不写进后端数据
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  // 状态下拉菜单：同一时间只开一个（存 _id）。为什么不用原生 select：
  // 原生下拉列表由系统绘制，样式改不动（打开后是一张白色系统菜单，和卡片风格完全不搭），
  // 而且它的弹出层会盖住相邻卡片的边框，看起来像「线条压在文字上」。
  const [openStatusId, setOpenStatusId] = useState(null);

  // 点胶囊外部 / 按 Esc 关闭状态下拉
  useEffect(() => {
    if (!openStatusId) return undefined;
    const handlePointerDown = (event) => {
      if (!event.target.closest('.kp-status-pill')) setOpenStatusId(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenStatusId(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openStatusId]);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  // 顶部统计：全部用真实列表算，不做假 KPI（学习中是后端 status 枚举的真值，「待复习」是另一个通道）
  const summary = {
    total: knowledgePoints.length,
    inProgress: knowledgePoints.filter((kp) => kp.status === 'in_progress').length,
    review: knowledgePoints.filter((kp) => kp.reviewList).length,
  };

  return (
    <div>
      {header}

      {knowledgePoints.length === 0 ? (
        <div className="kp-empty">
          <h2>还没有知识点</h2>
          <p>写下一个你正在学的概念，复述一次，系统会给你打分。</p>
          <Link to="/kp/new" className="btn kp-btn-primary">+ 新建第一个知识点</Link>
        </div>
      ) : (
        <>
          <p className="kp-summary">
            共 <b>{summary.total}</b> 个知识点 · 学习中 <b>{summary.inProgress}</b>
            {summary.review > 0 && (
              <>
                {' '}· 待复习 <b>{summary.review}</b>
              </>
            )}
          </p>

          <ul className="kp-list">
            {knowledgePoints.map((kp, index) => {
              // 正文只在渲染前处理一次：剔除与卡头同名的首行标题；超长则折叠
              const body = stripLeadingTitle(kp.content, kp.title);
              const expanded = expandedIds.has(kp._id);
              const clampable = body.length > CLAMP_THRESHOLD;

              return (
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
                      {/* 状态胶囊：状态点（形状通道）+ 自定义下拉（可改状态）。
                          点仍是 ○ 空心 / ◐ 半实心 / ● 实心，灰度下也能分辨；
                          菜单是自己画的，圆角/字号/底色与卡片同一套，不会被系统弹层压住边框 */}
                      <span className={`kp-status-pill kp-status-pill-${kp.status}`}>
                        <span className={`kp-status-dot kp-status-dot-${kp.status}`} aria-hidden="true" />
                        <button
                          type="button"
                          className="kp-status-btn"
                          onClick={() => setOpenStatusId(openStatusId === kp._id ? null : kp._id)}
                          aria-haspopup="listbox"
                          aria-expanded={openStatusId === kp._id}
                          aria-label={`学习状态：${STATUS_TEXT[kp.status]}，点击修改`}
                        >
                          {STATUS_TEXT[kp.status]}
                          <svg className="kp-status-caret" viewBox="0 0 10 6" aria-hidden="true">
                            <path d="M1 1l4 4 4-4" />
                          </svg>
                        </button>

                        {openStatusId === kp._id && (
                          <div className="kp-status-menu" role="listbox" aria-label="选择学习状态">
                            {Object.entries(STATUS_TEXT).map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                role="option"
                                aria-selected={value === kp.status}
                                className={`kp-status-option${value === kp.status ? ' is-active' : ''}`}
                                onClick={() => {
                                  setOpenStatusId(null);
                                  if (value !== kp.status) handleStatusChange(kp._id, value);
                                }}
                              >
                                <span className={`kp-status-dot kp-status-dot-${value}`} aria-hidden="true" />
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className={`markdown-content${clampable && !expanded ? ' is-clamped' : ''}`}>
                    <MarkdownRenderer content={body} />
                  </div>

                  {clampable && (
                    <button
                      type="button"
                      className="kp-expand"
                      onClick={() => toggleExpanded(kp._id)}
                      aria-expanded={expanded}
                    >
                      {expanded ? '收起' : '展开全文'}
                    </button>
                  )}

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
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
