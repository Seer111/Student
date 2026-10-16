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
const DRAG_HIT_RADIUS = 26;

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
            return '';
          },
        },
        legend: {
          // 色块颜色要显式给：只给 name 的话 ECharts 会退回默认调色板，图例色块与节点颜色对不上
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
            label: { show: true, position: 'right', formatter: '{b}', fontSize: 12 },
            labelLayout: { hideOverlap: true }, // 挤不下时自动隐藏标签，避免文字糊成一团
            categories: Object.values(CATEGORY_STYLE).map((item) => ({
              name: item.name,
              // 每个分类自己带色：ECharts 的默认调色板与 CATEGORY_STYLE 不是同一组颜色
              itemStyle: { color: item.color },
            })),
            force: {
              repulsion: 260, // 节点之间的斥力因子（引用多了以后避免标签重叠）
              edgeLength: 140,
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

    // 按像素坐标找节点（图谱 data 与 nodesRef 同序，位置取图形元素中心）
    const findNodeAt = (x, y, excludeId) => {
      const data = chart.getModel()?.getSeriesByIndex(0)?.getData();
      if (!data) return null;
      for (let i = 0; i < data.count(); i += 1) {
        const node = nodesRef.current[i];
        if (!node || node.id === excludeId) continue;
        const el = data.getItemGraphicEl(i);
        const layout = data.getItemLayout(i);
        const px = el?.x ?? layout?.[0];
        const py = el?.y ?? layout?.[1];
        if (px === undefined || py === undefined) continue;
        if ((px - x) ** 2 + (py - y) ** 2 <= DRAG_HIT_RADIUS ** 2) {
          return { id: node.id, name: node.name };
        }
      }
      return null;
    };

    const onDown = (params) => {
      if (params.dataType !== 'node') return;
      dragRef.current = { id: params.data.id, name: params.data.name };
      const { offsetX, offsetY } = params.event;
      setGhost({ x1: offsetX, y1: offsetY, x2: offsetX, y2: offsetY });
      setNotice('拖到另一个节点上松手即可建立引用');
    };

    const onMove = (event) => {
      if (!dragRef.current) return;
      const { offsetX, offsetY } = event;
      setGhost((prev) => (prev ? { ...prev, x2: offsetX, y2: offsetY } : prev));
      const target = findNodeAt(offsetX, offsetY, dragRef.current.id);
      if (target?.id !== hoverRef.current?.id) {
        hoverRef.current = target;
        setNotice(
          target
            ? `松手即可建立引用：${dragRef.current.name} → ${target.name}`
            : '拖到另一个节点上松手即可建立引用',
        );
      }
    };

    const onUp = () => {
      const from = dragRef.current;
      const to = hoverRef.current;
      dragRef.current = null;
      hoverRef.current = null;
      setGhost(null);
      if (!from || !to) {
        setNotice('');
        return;
      }
      createReference(from, to);
    };

    chart.on('mousedown', onDown);
    zr.on('mousemove', onMove);
    zr.on('mouseup', onUp);
    return () => {
      chart.off('mousedown', onDown);
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

  return (
    <div>
      <div className="list-header">
        <h1 className="page-title">知识图谱</h1>
        <span className="graph-stats">
          节点 {stats.nodeCount} · 关系 {stats.linkCount}
          {stats.linkCount > 0 && `（引用 ${stats.explicitCount} · 提及 ${stats.autoCount}）`}
        </span>
      </div>
      <p className="graph-hint">
        节点越大 = 关联的知识点越多（引用 + 提及，上限 6）；蓝色实线箭头 = 手动建立的「引用」，
        灰色虚线 = 正文里写到了对方标题的「提及」。从一个节点拖到另一个节点上松手可直接建立引用，
        拖拽空白处移动节点，滚轮缩放，点击节点进入编辑。
      </p>
      {loading && <p className="status-text">正在生成知识图谱...</p>}
      {error && <p className="status-text form-error">{error}</p>}
      {notice && <p className="graph-notice">{notice}</p>}
      <div className="graph-canvas-wrap">
        <div ref={chartRef} style={{ height: '600px', width: '100%' }} />
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
