// 知识图谱页（12课）
// 使用 ECharts 力导向图展示知识点之间的"引用"关系；
// 节点颜色按学习状态区分：已掌握绿色 / 待复习橙色 / 其他蓝色（12课挑战任务）
import { useEffect, useRef, useState } from 'react';
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

function GraphPage() {
  const chartRef = useRef(null); // 图表容器 DOM
  const chartInstanceRef = useRef(null); // ECharts 实例
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ nodeCount: 0, linkCount: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get('/graph/knowledge-map');
        const { nodes, links } = response.data;
        setStats({ nodeCount: nodes.length, linkCount: links.length });

        // 组装 ECharts 力导向图配置
        const chartOption = {
          tooltip: {
            formatter: (params) => {
              if (params.dataType === 'node') {
                const node = params.data;
                const statusName = CATEGORY_STYLE[node.category]?.name || '未知';
                return `<strong>${node.name}</strong><br/>状态：${statusName}<br/>${node.value || ''}`;
              }
              return '';
            },
          },
          legend: {
            data: Object.values(CATEGORY_STYLE).map((item) => item.name),
          },
          series: [
            {
              type: 'graph',
              layout: 'force',
              data: nodes,
              links,
              roam: true, // 开启鼠标缩放和平移漫游
              label: { show: true, position: 'right', formatter: '{b}' },
              categories: Object.values(CATEGORY_STYLE),
              force: {
                repulsion: 100, // 节点之间的斥力因子
                edgeLength: 80,
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

        // 初始化或更新图表
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
    };
    fetchData();

    // 窗口大小变化时自适应
    const handleResize = () => chartInstanceRef.current?.resize();
    window.addEventListener('resize', handleResize);

    // 组件卸载：销毁实例、解绑监听
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

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
        <span className="graph-stats">节点 {stats.nodeCount} · 关系 {stats.linkCount}</span>
      </div>
      <p className="graph-hint">展示知识点之间的引用关系：拖拽可移动节点，滚轮缩放，点击节点可进入编辑。</p>
      {loading && <p className="status-text">正在生成知识图谱...</p>}
      {error && <p className="status-text form-error">{error}</p>}
      <div ref={chartRef} style={{ height: '600px', width: '100%' }} />
    </div>
  );
}

export default GraphPage;
