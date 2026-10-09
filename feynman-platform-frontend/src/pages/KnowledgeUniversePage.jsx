// 3D 知识宇宙页（14课）：数据驱动的 Three.js 可视化
// 功能：获取知识图谱数据 -> 每个知识点渲染成一颗"星球" -> d3-force-3d 力导向自动布局
//       -> 引用关系渲染成"星际航线" -> Raycaster 鼠标拾取，点击高亮并显示信息浮层
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { forceSimulation, forceManyBody, forceCenter, forceLink } from 'd3-force-3d';
import apiClient from '../api/axios';
import { useNavigate } from 'react-router-dom';

// 节点状态 -> 颜色（与知识图谱页保持一致）
const STATUS_COLOR = {
  not_started: 0x5b8ff9,
  in_progress: 0x61a0a8,
  mastered: 0x3ba272,
};
const REVIEW_COLOR = 0xf6a609; // 待复习（橙色）

function KnowledgeUniversePage() {
  const mountRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null); // 当前选中节点信息（UI 浮层）
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 1. 获取知识图谱数据
  useEffect(() => {
    apiClient
      .get('/graph/knowledge-map')
      .then((response) => {
        setGraphData(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('获取图谱数据失败', error);
        setLoading(false);
      });
  }, []);

  // 2. 数据加载后初始化 3D 场景
  useEffect(() => {
    if (graphData.nodes.length === 0) return;
    const currentMount = mountRef.current;

    // --- Three.js 基础设置 ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050b1a); // 深空背景

    const camera = new THREE.PerspectiveCamera(
      60,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      2000,
    );
    camera.position.set(0, 0, 220);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // --- 光照 ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pointLight = new THREE.PointLight(0xffffff, 1.2, 0, 0);
    pointLight.position.set(100, 100, 100);
    scene.add(pointLight);

    // --- 数据驱动创建"星球"节点 ---
    const sphereGeometry = new THREE.SphereGeometry(5, 32, 32);
    const nodes = graphData.nodes.map((node) => {
      // 复习中的知识点优先显示橙色，否则按学习状态着色
      const color = node.reviewList
        ? REVIEW_COLOR
        : STATUS_COLOR[node.status] ?? 0x5b8ff9;
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.2,
      });
      const sphere = new THREE.Mesh(sphereGeometry, material);
      // 随机初始位置（力导向模拟会让它们自动聚拢）
      sphere.position.set(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200,
      );
      sphere.userData = { ...node, originalColor: color }; // 附加后端数据
      scene.add(sphere);
      return sphere;
    });

    // --- 力导向模拟（d3-force-3d）---
    const nodeIdMap = new Map(graphData.nodes.map((n) => [n.id, n]));
    const forceNodes = graphData.nodes.map((n) => ({ id: n.id }));
    const forceLinks = graphData.links
      .filter((l) => nodeIdMap.has(l.source) && nodeIdMap.has(l.target))
      .map((l) => ({ source: l.source, target: l.target }));

    const simulation = forceSimulation(forceNodes, 3) // 3 表示三维空间
      .force('charge', forceManyBody().strength(-120)) // 节点间排斥力
      .force('center', forceCenter(0, 0, 0)) // 向中心聚拢
      .force('link', forceLink(forceLinks).id((d) => d.id).distance(60)); // 关联节点相互吸引

    // --- 创建"星际航线"（引用关系连线）---
    const sphereById = new Map(nodes.map((s) => [s.userData.id, s]));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x8aa5c9,
      transparent: true,
      opacity: 0.45,
    });
    const lines = forceLinks
      .map((link) => {
        const source = sphereById.get(link.source);
        const target = sphereById.get(link.target);
        if (!source || !target) return null;
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          source.position,
          target.position,
        ]);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        return line;
      })
      .filter(Boolean);

    // --- Raycaster 鼠标拾取（14课核心交互）---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredNode = null;

    const onMouseMove = (event) => {
      // 屏幕坐标 -> 归一化设备坐标（-1 ~ 1）
      const rect = currentMount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodes);

      // 悬停高亮：恢复上一个，高亮当前
      if (hoveredNode) {
        hoveredNode.material.color.setHex(hoveredNode.userData.originalColor);
        hoveredNode = null;
      }
      if (intersects.length > 0) {
        hoveredNode = intersects[0].object;
        hoveredNode.material.color.setHex(0xff4444);
        currentMount.style.cursor = 'pointer';
      } else {
        currentMount.style.cursor = 'default';
      }
    };

    const onMouseClick = (event) => {
      if (!hoveredNode) {
        setSelectedNode(null); // 点击空白取消选中
        return;
      }
      // 显示信息浮层
      setSelectedNode({
        title: hoveredNode.userData.name,
        status: hoveredNode.userData.status,
        reviewList: hoveredNode.userData.reviewList,
        excerpt: hoveredNode.userData.value || '',
      });
    };

    currentMount.addEventListener('mousemove', onMouseMove);
    currentMount.addEventListener('click', onMouseClick);

    // --- 动画循环：推进力模拟 + 同步位置 + 更新连线 ---
    const animate = () => {
      requestAnimationFrame(animate);

      simulation.tick(); // 推进力导向模拟一步

      // 把模拟计算出的位置同步到球体
      forceNodes.forEach((d, i) => {
        nodes[i].position.set(d.x, d.y, d.z);
      });

      // 更新每条连线的端点（BufferGeometry 需要重新赋值 position attribute）
      lines.forEach((line, i) => {
        const link = forceLinks[i];
        const source = sphereById.get(link.source);
        const target = sphereById.get(link.target);
        const positions = line.geometry.attributes.position;
        positions.setXYZ(0, source.position.x, source.position.y, source.position.z);
        positions.setXYZ(1, target.position.x, target.position.y, target.position.z);
        positions.needsUpdate = true;
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- 窗口大小自适应 ---
    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- 清理资源 ---
    return () => {
      window.removeEventListener('resize', handleResize);
      currentMount.removeEventListener('mousemove', onMouseMove);
      currentMount.removeEventListener('click', onMouseClick);
      simulation.stop();
      controls.dispose();
      renderer.dispose();
      currentMount.removeChild(renderer.domElement);
    };
  }, [graphData]);

  const STATUS_TEXT = { not_started: '未开始', in_progress: '学习中', mastered: '已掌握' };

  return (
    <div>
      <div className="list-header">
        <h1 className="page-title">3D 知识宇宙</h1>
        {selectedNode && (
          <button className="btn btn-plain" onClick={() => navigate('/graph')}>
            查看2D图谱
          </button>
        )}
      </div>
      <p className="graph-hint">
        数据驱动的 3D 可视化：每颗星球代表一个知识点，航线代表引用关系。
        拖拽旋转、滚轮缩放、悬停高亮、点击查看详情。
      </p>
      {loading && <p className="status-text">正在构建知识宇宙...</p>}
      {!loading && graphData.nodes.length === 0 && (
        <p className="status-text">暂无知识点，先创建几个知识点再来探索宇宙吧！</p>
      )}
      <div ref={mountRef} style={{ width: '100%', height: '75vh', position: 'relative' }}>
        {/* 选中节点的信息浮层 */}
        {selectedNode && (
          <div className="universe-overlay">
            <h3>{selectedNode.title}</h3>
            <p>
              状态：{STATUS_TEXT[selectedNode.status] || selectedNode.status}
              {selectedNode.reviewList && ' · 待复习'}
            </p>
            <p className="overlay-excerpt">{selectedNode.excerpt}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeUniversePage;
