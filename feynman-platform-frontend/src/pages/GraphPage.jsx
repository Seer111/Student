// 知识图谱页（12课）
// 使用 ECharts 力导向图展示知识点之间的"引用"关系；
// 节点颜色按学习状态区分：已掌握绿色 / 待复习橙色 / 其他蓝色（12课挑战任务）
import { useCallback, useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import apiClient from '../api/axios';
import { useNavigate } from 'react-router-dom';

// 节点状态 -> 颜色映射（与后端返回的 category 对应）
const CATEGORY_STYLE = {
  0: { name: '未开始', color: '#5B8FF9' }, // 未开始
  1: { name: '学习中', color: '#61A0A8' }, // 学习中
  2: { name: '待复习', color: '#F6A609' }, // 复习列表
  3: { name: '已掌握', color: '#3BA272' }, // 已掌握
};

// 拖拽建引用：松手时离目标节点多近算"拖到了它身上"（像素）
// 拖动建引用时「松手算命中」的容差（像素）：略大于最大节点半径，力导向下节点会漂
const DRAG_SNAP_RADIUS = 52;

function GraphPage() {
  const chartRef = useRef(null); // 图表容器 DOM
  const chartInstanceRef = useRef(null); // ECharts 实例
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ nodeCount: 0, linkCount: 0 });
  const [notice, setNotice] = useState(''); // 拖拽建引用的提示/结果
  const [ghost, setGhost] = useState(null); // 拖拽时那条跟随鼠标的虚线（像素坐标）
  const nodesRef = useRef([]); // 与图谱 data 同序，拖拽命中判定要用 name
  const dragRef = useRef(null); // 正在拖的起点节点
  const hoverRef = useRef(null); // 当前悬停到的候选目标
  const navigate = useNavigate();

  // 拉取图谱数据并渲染（拖拽建引用后要重新拉一次，所以提成独立函数）
  const loadGraph = useCallback(async () => {
    try {
      const response = await apiClient.get('/graph/knowledge-map');
      const { nodes, links } = response.data;
      nodesRef.current = nodes; // 与 ECharts 的 data 同序，拖拽命中判定要用 name
      setStats({
        nodeCount: nodes.length,
        linkCount: links.length,
        explicitCount: links.filter((link) => link.kind === 'explicit').length,
        autoCount: links.filter((link) => link.kind === 'auto').length,
      });

      // 组装 ECharts 力导向图配置
      const chartOption = {
        // 调色板按 category 索引对齐 CATEGORY_STYLE：节点填充色与图例色块都取自这里
        color: Object.values(CATEGORY_STYLE).map((item) => item.color),
        tooltip: {
          formatter: (params) => {
            if (params.dataType === 'node') {
              const node = params.data;
              const statusName = CATEGORY_STYLE[node.category]?.name || '未知';
              const degree = node.degree ?? 0;
              return `<strong>${node.name}</strong><br/>状态：${statusName}<br/>关联：${degree} 个知识点<br/>${node.value || ''}`;
            }
            // 边的类型改由悬停说明（线上的文字不再常驻，见 backend/routes/graph.js 里的注释）
            if (params.dataType === 'edge') {
              const isAuto = params.data?.kind === 'auto';
              return isAuto
                ? '<strong>提及</strong><br/>正文里写到了对方的标题（系统自动发现）'
                : '<strong>引用</strong><br/>你手动建立的关系（可在详情页修改）';
            }
            return '';
          },
        },
        legend: {
          // 页面自己有一套图例（含「引用 / 提及」两种边），ECharts 自带的那套再画一遍就重复了
          show: false,
          data: Object.values(CATEGORY_STYLE).map((item) => ({
            name: item.name,
            itemStyle: { color: item.color },
          })),
        },
        series: [
          {
            type: 'graph',
            layout: 'force',
            data: nodes,
            // 两种关系分开画：显式引用（蓝色实线 + 箭头）/ 正文提及（灰色虚线，自动发现）
            links: links.map((link) => {
              const isAuto = link.kind === 'auto';
              return {
                ...link,
                symbol: isAuto ? ['none', 'none'] : ['none', 'arrow'],
                symbolSize: 6,
                lineStyle: {
                  color: isAuto ? '#9aa9c4' : '#5b8ff9',
                  width: isAuto ? 1.2 : 1.8,
                  opacity: isAuto ? 0.55 : 0.95,
                  type: isAuto ? 'dashed' : 'solid',
                  curveness: 0.08,
                },
              };
            }),
            roam: true, // 开启鼠标缩放和平移漫游
            // 注意：不要给 series 设 zoom —— 缩放后节点坐标与指针坐标不在同一空间，
            // 拖动建引用的命中判断会整体偏移（批次 30 踩过）。默认视图足够。
            // 节点可拖动：拖着圆球去另一个圆球上松手 = 建立引用。
            // 不打开 draggable 时，按下节点拖动的其实是画布本身（整张图平移），根本拖不到别的节点上（批次 30 修的 bug）
            draggable: true,
            // 标签放节点下方：力导向里左右相邻的节点最容易被「右侧标签」压住
            label: { show: true, position: 'bottom', distance: 9, formatter: '{b}', fontSize: 12 },
            // 标签挤在一起时：先横向错位，再隐藏——避免标签压在别的节点上
            labelLayout: { hideOverlap: true, moveOverlap: 'shiftY' },
            // 边上不画常驻文字：拖动/缩放时这些文字不跟手，会糊成一片（类型改由 tooltip 说明）
            edgeLabel: { show: false },
            categories: Object.values(CATEGORY_STYLE).map((item) => ({
              name: item.name,
              // 每个分类自己带色：ECharts 的默认调色板与 CATEGORY_STYLE 不是同一组颜色
              itemStyle: { color: item.color },
            })),
            force: {
              repulsion: 300, // 节点之间的斥力因子：太小标签互相压，太大会把节点推出画布
              edgeLength: [100, 180], // 边的长度区间
              gravity: 0.12, // 向心力：把整张图收在画布里，避免边上的节点被裁掉
            },
            emphasis: {
              focus: 'adjacency', // 悬停时高亮邻居节点与边
              lineStyle: { width: 6 },
            },
            edgeSymbol: ['none', 'arrow'], // 有向边：A 引用 B
            edgeSymbolSize: 6,
          },
        ],
      };

      // 初始化或更新图表（setOption 默认是合并，新加的引用边会画出来且不丢缩放状态）
      if (!chartInstanceRef.current) {
        chartInstanceRef.current = echarts.init(chartRef.current);
      }
      chartInstanceRef.current.setOption(chartOption);
      setLoading(false);
    } catch (err) {
      console.error('获取图谱数据失败', err);
      setError('获取知识图谱数据失败');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph();

    // 窗口大小变化时自适应
    const handleResize = () => chartInstanceRef.current?.resize();
    window.addEventListener('resize', handleResize);

    // 组件卸载：销毁实例、解绑监听
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, [loadGraph]);

  // 建立引用：先取回现有出边（PUT 是整体替换），再追加目标知识点
  const createReference = useCallback(
    async (from, to) => {
      if (!window.confirm(`建立引用：「${from.name}」→「${to.name}」？`)) {
        setNotice('');
        return;
      }
      setNotice('正在建立引用...');
      try {
        const current = await apiClient.get(`/knowledge-points/${from.id}/references`);
        const ids = current.data.outgoing.map((item) => item._id);
        if (!ids.includes(to.id)) ids.push(to.id);
        await apiClient.put(`/knowledge-points/${from.id}`, { references: ids });
        setNotice(`已建立引用：${from.name} → ${to.name}`);
        await loadGraph(); // 重新拉一次图谱，新边立刻可见
      } catch (err) {
        console.error('建立引用失败', err);
        setNotice(err.response?.data?.msg || '建立引用失败，请稍后重试');
      }
    },
    [loadGraph],
  );

  // 拖拽建引用：在节点上按下 -> 虚线跟随鼠标 -> 在另一个节点上松开即建立引用
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart || loading) return undefined;
    const zr = chart.getZr();

    // 找「离指针最近的节点」：力导向下节点边拖边漂，用开始拖动那一刻的快照来判命中，
    // 用户瞄准的就是他按下鼠标时看到的画面，比实时坐标稳得多。
    const snapshotRef = { current: null };
    const takeSnapshot = () => {
      const data = chart.getModel()?.getSeriesByIndex(0)?.getData();
      if (!data) return [];
      const list = [];
      for (let i = 0; i < data.count(); i += 1) {
        const node = nodesRef.current[i];
        if (!node) continue;
        const item = data.getItemGraphicEl(i);
        const layout = data.getItemLayout(i);
        const px = item?.x ?? layout?.[0];
        const py = item?.y ?? layout?.[1];
        if (px === undefined || py === undefined) continue;
        list.push({ id: node.id, name: node.name, x: px, y: py });
      }
      return list;
    };

    const findNodeAt = (x, y, excludeId) => {
      const list = snapshotRef.current || takeSnapshot();
      let best = null;
      let bestDist = Infinity;
      list.forEach((item) => {
        if (item.id === excludeId) return;
        const dist = Math.hypot(item.x - x, item.y - y);
        if (dist < bestDist) {
          bestDist = dist;
          best = item;
        }
      });
      return best && bestDist <= DRAG_SNAP_RADIUS ? { id: best.id, name: best.name } : null;
    };

    // 拖动节点：按下记起点（并拍快照）→ 移动时画辅助线并高亮落点 → 松开命中就建引用。
    // 注意：ECharts 的 graph 系列不会派发 dragstart/drag/dragend（那是 graphic 组件的事件），
    // 所以这里只能用 mousedown + zrender 的 mousemove/mouseup；节点本身的位移由 draggable: true 负责。
    const onDown = (params) => {
      if (params.dataType !== 'node') return;
      snapshotRef.current = takeSnapshot();
      dragRef.current = { id: params.data.id, name: params.data.name };
      const { offsetX, offsetY } = params.event;
      setGhost({ x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY });
      setNotice('拖到另一个节点上松手即可建立引用');
    };

    const onMove = (event) => {
      if (!dragRef.current) return;
      const { offsetX, offsetY } = event;
      const hit = findNodeAt(offsetX, offsetY, dragRef.current.id);
      setGhost((prev) => (prev ? { ...prev, x2: offsetX, y2: offsetY } : prev));
      const target = hit;
      if (target?.id !== hoverRef.current?.id) {
        hoverRef.current = target;
        setNotice(
          target
            ? `松手即可建立引用：${dragRef.current.name} → ${target.name}`
            : '拖到另一个节点上松手即可建立引用',
        );
      }
    };

    const finish = (from, to) => {
      dragRef.current = null;
      hoverRef.current = null;
      setGhost(null);
      setNotice('');
      if (from && to && to.id !== from.id) createReference(from, to);
    };

    // 松手：优先用 ECharts 自己的序列事件（它按真实渲染做命中，力导向漂移也不怕），
    // 没触发（比如松在空白处）再由 zrender 的 mouseup 兜底清理辅助线。
    const onNodeUp = (params) => {
      if (!dragRef.current) return;
      const from = dragRef.current;
      if (params.dataType === 'node' && params.data?.id !== from.id) {
        finish(from, { id: params.data.id, name: params.data.name });
      } else {
        setTimeout(() => finish(from, hoverRef.current), 0);
      }
    };

    const onUp = () => {
      if (!dragRef.current) return;
      const from = dragRef.current;
      setTimeout(() => {
        if (dragRef.current === from) finish(from, hoverRef.current);
      }, 0);
    };

    chart.on('mousedown', onDown);
    chart.on('mouseup', onNodeUp);
    zr.on('mousemove', onMove);
    zr.on('mouseup', onUp);
    return () => {
      chart.off('mousedown', onDown);
      chart.off('mouseup', onNodeUp);
      zr.off('mousemove', onMove);
      zr.off('mouseup', onUp);
    };
  }, [loading, createReference]);

  // 点击节点跳转到对应知识点编辑页
  useEffect(() => {
    if (!chartInstanceRef.current) return;
    const handler = (params) => {
      if (params.componentType === 'series' && params.dataType === 'node') {
        navigate(`/kp/edit/${params.data.id}`);
      }
    };
    chartInstanceRef.current.on('click', handler);
  }, [navigate, loading]); // loading 结束后重新绑定（此时实例已存在）

  // 重置视图：ECharts 的 restore 会把缩放/平移恢复到初始状态（力导向布局会重新收敛一次）
  const handleResetView = useCallback(() => {
    chartInstanceRef.current?.dispatchAction({ type: 'restore' });
  }, []);

  return (
    <div>
      <div className="list-header">
        <h1 className="page-title">知识图谱</h1>
      </div>
      {/* 副标题里「虚线」这半句只在真的存在提及边时才说——图例不承诺没画出来的东西 */}
      <p className="graph-subtitle">
        点越大关联越多，颜色是学习状态；实线箭头是你建立的引用
        {stats.autoCount > 0 ? '，虚线是正文里提到的知识点' : ''}
      </p>

      {/* 工具栏：图注（状态色 + 两种边）与统计放在同一行，右侧只留一个「重置视图」 */}
      <div className="graph-toolbar">
        <ul className="graph-legend">
          {Object.entries(CATEGORY_STYLE).map(([key, item]) => (
            <li key={key}>
              <i className="legend-dot" style={{ background: item.color }} aria-hidden="true" />
              {item.name}
            </li>
          ))}
          <li>
            <i className="legend-edge legend-edge-explicit" aria-hidden="true" />
            引用
          </li>
          {/* 提及边是「正文里写到了对方标题」才会自动出现的，没数据时就不列，免得图例说有两类却只画出一类 */}
          {stats.autoCount > 0 && (
            <li>
              <i className="legend-edge legend-edge-auto" aria-hidden="true" />
              提及
            </li>
          )}
        </ul>
        <div className="graph-toolbar-right">
          <span className="graph-stats">
            节点 {stats.nodeCount} · 关系 {stats.linkCount}
            {stats.linkCount > 0 && `（引用 ${stats.explicitCount} · 提及 ${stats.autoCount}）`}
          </span>
          <button type="button" className="graph-reset" onClick={handleResetView}>重置视图</button>
        </div>
      </div>

      <p className="graph-hint">滚轮缩放 · 从节点拖到另一个节点松手即可建立引用 · 点击节点进入编辑</p>

      {loading && <p className="status-text">正在生成知识图谱…</p>}
      {error && <p className="status-text form-error">{error}</p>}
      {notice && <p className="graph-notice" role="status">{notice}</p>}

      <div className="graph-canvas-wrap">
        <div ref={chartRef} className="graph-canvas" />
        {/* 拖拽建引用时跟随鼠标的引导虚线（纯装饰，不拦鼠标事件） */}
        {ghost && (
          <svg className="graph-ghost">
            <line x1={ghost.x1} y1={ghost.y1} x2={ghost.x2} y2={ghost.y2} />
          </svg>
        )}
      </div>
    </div>
  );
}

export default GraphPage;
