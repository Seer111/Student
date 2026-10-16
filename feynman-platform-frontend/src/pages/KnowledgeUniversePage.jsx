// 3D 知识宇宙页（14课）：数据驱动的 Three.js 可视化
// 视觉分层（由远及近）：星云穹顶 → 星空点云（逐星闪烁）→ 知识星球（自发光 + 光晕）
//                      → 星际航线（渐变色 + 小飞船穿行）→ UnrealBloom 泛光后期
// 航线两种（与 2D 图谱同一口径）：亮实线 = 用户手动建立的「引用」（亮蓝大飞船、快）；
//                                 暗虚线 = 正文里写到对方标题的「提及」（暗灰小飞船、慢）
// 交互：拖拽旋转 / 滚轮缩放 / 悬停高亮 / 点击聚焦并弹出详情浮层
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { forceSimulation, forceManyBody, forceCenter, forceLink, forceRadial } from 'd3-force-3d';
import apiClient from '../api/axios';
import { useNavigate } from 'react-router-dom';
import {
  hashSeed,
  createPlanetSurface,
  createRingTexture,
  ATMOSPHERE_VERT,
  ATMOSPHERE_FRAG,
} from '../utils/planetTextures';

// 节点状态 -> 颜色（与知识图谱页保持一致）
const STATUS_COLOR = {
  not_started: 0x5b8ff9,
  in_progress: 0x61a0a8,
  mastered: 0x3ba272,
};
const REVIEW_COLOR = 0xf6a609; // 待复习（橙色）
const STATUS_TEXT = { not_started: '未开始', in_progress: '学习中', mastered: '已掌握' };
const LEGEND = [
  { label: '未开始', color: '#5b8ff9' },
  { label: '学习中', color: '#61a0a8' },
  { label: '已掌握', color: '#3ba272' },
  { label: '待复习', color: '#f6a609' },
];

// 航线上穿行的小飞船：两种航线用不同外观，口径与航线本身（实线/虚线）保持一致
const SHIP_STYLE = {
  // 用户手动建立的「引用」：亮蓝、大、快
  explicit: {
    color: 0xdfeaff,
    emissive: 0x4f8dff,
    emissiveIntensity: 1.6,
    scale: 1,
    speed: 0.3,
    trail: 0xbfe0ff,
  },
  // 系统从正文里识别出的「提及」：暗灰、小、慢，还半透明——一眼看出这是"系统自建"的
  auto: {
    color: 0x93a0b8,
    emissive: 0x46506b,
    emissiveIntensity: 0.55,
    scale: 0.6,
    speed: 0.13,
    trail: 0x8a97ad,
  },
};

// 星空数量：既要"满天星"的密度，又要照顾集显
const STAR_COUNT = 9000;

// 星云穹顶：反面大球 + 片元着色器里叠几团柔和星云（纯代码生成，不依赖贴图资源）
const DOME_VERT = `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DOME_FRAG = `
  varying vec3 vDir;

  // 以方向向量为中心的柔和光团（distance 越小越亮，幂次控制衰减速度）
  float blob(vec3 dir, vec3 center, float falloff) {
    float d = distance(dir, normalize(center));
    return exp(-d * d * falloff);
  }

  void main() {
    // 底色：上下渐变的深空（偏蓝紫，避免纯黑死板）
    vec3 base = mix(vec3(0.010, 0.016, 0.048), vec3(0.022, 0.038, 0.108), smoothstep(-0.7, 0.9, vDir.y));
    vec3 col = base;
    col += vec3(0.26, 0.10, 0.40) * blob(vDir, vec3(0.78, 0.26, -0.62), 7.5) * 0.55;  // 紫色星云
    col += vec3(0.04, 0.17, 0.38) * blob(vDir, vec3(-0.72, -0.16, 0.66), 6.0) * 0.65; // 蓝色星云
    col += vec3(0.03, 0.24, 0.26) * blob(vDir, vec3(0.16, 0.82, 0.52), 9.0) * 0.4;    // 青色极光
    col += vec3(0.28, 0.15, 0.04) * blob(vDir, vec3(-0.34, -0.78, -0.42), 13.0) * 0.3; // 暖色微光
    col += vec3(0.22, 0.09, 0.34) * blob(vDir, vec3(-0.25, 0.45, -0.85), 16.0) * 0.35; // 远处小星云，补一层景深
    gl_FragColor = vec4(col, 1.0);
  }
`;

// 星空点云：每颗星带随机相位与尺寸，在顶点着色器里做逐星闪烁
const STAR_VERT = `
  attribute float aPhase;
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vColor = aColor;
    vTwinkle = 0.55 + 0.45 * sin(uTime * 1.6 + aPhase); // 0.1 ~ 1.0 的呼吸式闪烁
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    // 屏幕空间固定尺寸（远景星空不需要近大远小，避免远处星星变成亚像素消失）
    gl_PointSize = aSize * uPixelRatio * (0.7 + 0.6 * vTwinkle);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAG = `
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    // gl_PointCoord 是点内部的 0~1 坐标，做成中心亮、边缘透明的圆点
    float d = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.0, d);
    alpha = pow(alpha, 2.4);
    // 十字星芒：只给最亮的那部分星星加一点点光芒
    float cross = max(0.0, 1.0 - abs(gl_PointCoord.x - 0.5) * 14.0)
                * max(0.0, 1.0 - abs(gl_PointCoord.y - 0.5) * 14.0);
    alpha += cross * 0.25 * smoothstep(0.85, 1.0, vTwinkle);
    gl_FragColor = vec4(vColor * (0.65 + 0.9 * vTwinkle), alpha);
  }
`;

// 用 canvas 生成一张"中心亮、边缘透明"的圆形光斑贴图（光晕 / 光点共用）
function createGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.75)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.22)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function KnowledgeUniversePage() {
  const mountRef = useRef(null);
  const actionsRef = useRef({}); // 暴露给 HUD 按钮的场景操作（回到全景 / 自转开关）
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null); // 当前选中节点信息（UI 浮层）
  const [loading, setLoading] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
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

  // 自转开关（HUD）同步到控制器
  useEffect(() => {
    actionsRef.current.setAutoRotate?.(autoRotate);
  }, [autoRotate]);

  // 2. 数据加载后初始化 3D 场景
  useEffect(() => {
    if (graphData.nodes.length === 0) return;
    const currentMount = mountRef.current;
    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    // ---------- 渲染器 / 相机 / 控制器 ----------
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 4000);
    const HOME_POSITION = new THREE.Vector3(0, 26, 195);
    camera.position.copy(HOME_POSITION);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // 泛光后期需要配合色调映射，才不至于过曝
    renderer.toneMappingExposure = 1.05;
    currentMount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 40;
    controls.maxDistance = 900;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.35;

    // ---------- 星云穹顶 ----------
    const domeGeometry = new THREE.SphereGeometry(1800, 48, 32);
    const domeMaterial = new THREE.ShaderMaterial({
      vertexShader: DOME_VERT,
      fragmentShader: DOME_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(domeGeometry, domeMaterial));

    // ---------- 星空点云 ----------
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(STAR_COUNT * 3);
    const starColors = new Float32Array(STAR_COUNT * 3);
    const starPhases = new Float32Array(STAR_COUNT);
    const starSizes = new Float32Array(STAR_COUNT);
    const tint = new THREE.Color();
    for (let i = 0; i < STAR_COUNT; i += 1) {
      // 球壳分布：半径 320~1650，越靠外越稀疏，形成"深空包裹"的层次
      const radius = 320 + Math.pow(Math.random(), 0.55) * 1330;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      // 96% 冷色星（蓝白），4% 暖色星（橙黄），色相接近真实星空
      const warm = Math.random() < 0.04;
      tint.setHSL(
        warm ? 0.09 + Math.random() * 0.04 : 0.55 + Math.random() * 0.1,
        warm ? 0.75 : 0.35 + Math.random() * 0.4,
        0.62 + Math.random() * 0.3,
      );
      starColors[i * 3] = tint.r;
      starColors[i * 3 + 1] = tint.g;
      starColors[i * 3 + 2] = tint.b;
      starPhases[i] = Math.random() * Math.PI * 2;
      // 少数亮星（size 大）撑起画面重点
      starSizes[i] = Math.random() < 0.05 ? 3.2 + Math.random() * 3.4 : 0.9 + Math.random() * 1.6;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));
    starGeometry.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
      },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // ---------- 光照 ----------
    scene.add(new THREE.AmbientLight(0x8899cc, 0.35));
    // decay=0：不做距离衰减。三个 r155+ 的点光源强度是物理单位（照度 = 强度 / 距离²），
    // 若保留 decay=2，强度要开到几万才能在 200 单位外照亮星球，所以这里直接关掉衰减。
    const keyLight = new THREE.PointLight(0xffffff, 2.4, 0, 0); // 主光：给出星球的亮面
    keyLight.position.set(120, 160, 220);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x6f8bff, 1.1, 0, 0); // 冷色补光，勾勒星球暗面
    rimLight.position.set(-120, -60, -90);
    scene.add(rimLight);

    // ---------- 数据驱动创建"星球"节点 ----------
    const glowTexture = createGlowTexture();
    const sphereGeometry = new THREE.SphereGeometry(5, 32, 24);
    const forceLinksRaw = graphData.links; // 原始连线（含引用关系）

    // 统计每个知识点的连接数：连接越多的星球越大（视觉上体现"核心概念"）
    const degreeById = new Map();
    forceLinksRaw.forEach((link) => {
      degreeById.set(link.source, (degreeById.get(link.source) || 0) + 1);
      degreeById.set(link.target, (degreeById.get(link.target) || 0) + 1);
    });

    // 星球贴图按状态色程序化生成，需要显卡支持的各向异性过滤上限来保持清晰
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    // 需要每帧自转的网格（星球本体 + 云层）
    const spinners = [];

    const nodes = graphData.nodes.map((node) => {
      const color = node.reviewList ? REVIEW_COLOR : STATUS_COLOR[node.status] ?? 0x5b8ff9;
      // 大小口径与 2D 知识图谱完全一致：都用后端算好的 sizeValue（0~6 = 关联数量，含引用与提及）
      const sizeValue =
        typeof node.sizeValue === 'number' ? node.sizeValue : Math.min(degreeById.get(node.id) || 0, 6);
      const scale = 0.85 + sizeValue * 0.14;

      // 每个知识点一颗"现实星球"：地貌贴图全部按状态色程序化生成（同色系深浅变化），
      // 所以"颜色代表处于哪个学习阶段"这条语义完全没变，只是从纯色球变成了有地貌的星球。
      // 种子取自知识点 id → 刷新页面还是同一颗星球。
      const seed = hashSeed(node.id);
      // 从种子派生的 0~1 随机数（同一颗星球每次都是同样的值）
      const rand01 = (salt) => (hashSeed(`${node.id}:${salt}`) % 1000) / 1000;
      const surface = createPlanetSurface(color, seed, { anisotropy: maxAnisotropy });

      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff, // 颜色交给贴图（贴图本身就是按状态色生成的）
        map: surface.map,
        bumpMap: surface.bump, // 凹凸贴图：光照下表面有起伏，不会像塑料球
        bumpScale: 0.7,
        // 自发光只给一点点：留出明暗面，星球才有"球体感"（纯自发光会糊成一团光斑）
        emissive: color,
        emissiveIntensity: 0.18,
        roughness: 0.85,
        metalness: 0.05,
      });
      const sphere = new THREE.Mesh(sphereGeometry, material);
      sphere.scale.setScalar(scale);
      // 自转轴倾角：真实行星几乎都不是"正着转"的，歪一点更像星球
      // （用 rotation.x 表示倾角、rotation.y 表示自转，转轴固定不摇摆）
      sphere.rotation.x = (rand01('tilt') - 0.5) * 0.7;
      const planetSpin = 0.05 + rand01('spin') * 0.14; // 自转角速度（弧度/秒）

      // 大气层：菲涅尔辉光（视线越掠过球体边缘越亮），一圈薄薄的光比纯光晕更像星球
      const atmosphereMaterial = new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERT,
        fragmentShader: ATMOSPHERE_FRAG,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uIntensity: { value: 0.75 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const atmosphere = new THREE.Mesh(sphereGeometry, atmosphereMaterial);
      atmosphere.scale.setScalar(1.16);
      sphere.add(atmosphere);

      // 云层：只有海洋型星球生成（气态/岩质星球不需要）
      let cloudMesh = null;
      let cloudMaterial = null;
      if (surface.clouds) {
        cloudMaterial = new THREE.MeshStandardMaterial({
          map: surface.clouds,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          roughness: 1,
        });
        cloudMesh = new THREE.Mesh(sphereGeometry, cloudMaterial);
        cloudMesh.scale.setScalar(1.015); // 稍微离开地表，避免和地面抢深度
        sphere.add(cloudMesh);
      }

      // 行星环：约三分之一的星球自带光环（确定性随机，所以同一颗星球每次都有/都没有）
      let ringGeometry = null;
      let ringMaterial = null;
      let ringTexture = null;
      if (rand01('ring') > 0.62) {
        ringTexture = createRingTexture(color, seed + 31);
        ringGeometry = new THREE.RingGeometry(7.4, 13, 96, 1);
        ringMaterial = new THREE.MeshBasicMaterial({
          map: ringTexture,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2; // RingGeometry 默认躺在 XY 平面，转 90° 变成赤道盘
        sphere.add(ring);
      }

      // 光晕：一张加色混合的贴图精灵，包在星球外面形成"恒星大气"
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          color,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      halo.scale.setScalar(3.6); // 父级 scale 会一并放缩，最终约为星球半径的 3.6 倍
      sphere.add(halo);

      // 自转清单：星球本体 + 云层（云转得比地面快一点才像"云在飘"）
      spinners.push({ mesh: sphere, speed: planetSpin });
      if (cloudMesh) spinners.push({ mesh: cloudMesh, speed: planetSpin * 1.6 });

      // 随机初始位置（力导向模拟会让它们自动聚拢）
      sphere.position.set(
        (Math.random() - 0.5) * 220,
        (Math.random() - 0.5) * 220,
        (Math.random() - 0.5) * 220,
      );
      sphere.userData = {
        ...node,
        originalColor: color,
        baseScale: scale,
        halo,
        surfaceStyle: surface.style, // ocean / bands / rocky（自检与调试用）
        // WebGL 资源不参与 JS 的垃圾回收，卸载时要逐个手动释放
        disposables: [
          surface.map,
          surface.bump,
          surface.clouds,
          ringTexture,
          ringGeometry,
          ringMaterial,
          cloudMaterial,
          atmosphereMaterial,
        ].filter(Boolean),
      };
      scene.add(sphere);
      return sphere;
    });

    // ---------- 力导向模拟（d3-force-3d）----------
    const nodeIdMap = new Map(graphData.nodes.map((n) => [n.id, n]));
    const forceNodes = graphData.nodes.map((n) => ({ id: n.id }));
    // kind 要一起带下来：下面按 kind === 'auto' 把「提及」分到虚线层。
    // 之前这里把 kind 丢了，于是 linkPairs 里 kind 恒为 undefined，提及边全落进实线层、虚线层是空的。
    const forceLinks = forceLinksRaw
      .filter((l) => nodeIdMap.has(l.source) && nodeIdMap.has(l.target))
      .map((l) => ({ source: l.source, target: l.target, kind: l.kind }));

    // 渲染用的"纯 id"副本：d3 的 forceLink 会把 forceLinks 里的 source/target
    // 就地替换成节点对象，替换后就拿不到 id 去查星球了（航线会一条都画不出来）。
    const linkPairs = forceLinks.map((l) => ({
      source: String(l.source),
      target: String(l.target),
      kind: l.kind,
    }));

    const simulation = forceSimulation(forceNodes, 3) // 3 表示三维空间
      .force('charge', forceManyBody().strength(-150).distanceMax(260)) // 节点间排斥力（限制作用距离，避免无限扩散）
      .force('center', forceCenter(0, 0, 0)) // 向中心聚拢
      .force('link', forceLink(forceLinks).id((d) => d.id).distance(70))
      // 球形约束：把星团大致收在一层球壳上（没有引用关系时也不会越飘越散）
      .force('radial', forceRadial(78, 0, 0, 0).strength(0.06))
      .stop(); // 关掉内置定时器，改由我们的动画循环手动推进（否则会和 rAF 重复 tick）

    // ---------- "星际航线"：两端渐变色的连线 ----------
    // 两种边分两层画：「引用」（手动建立）是亮实线，「提及」（正文里写到对方标题）是暗虚线。
    // 虚线必须用 LineDashedMaterial，并在顶点变动后调用 computeLineDistances()，否则看起来还是实线。
    const sphereById = new Map(nodes.map((s) => [s.userData.id, s]));

    const createLinkLayer = (pairs, material) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(pairs.length * 2 * 3);
      const colors = new Float32Array(pairs.length * 2 * 3);
      const startColor = new THREE.Color();
      const endColor = new THREE.Color();
      pairs.forEach((link, i) => {
        const source = sphereById.get(link.source);
        const target = sphereById.get(link.target);
        startColor.setHex(source ? source.userData.originalColor : 0x8aa5c9);
        endColor.setHex(target ? target.userData.originalColor : 0x8aa5c9);
        // 「提及」的亮度也压低，和「引用」区分开
        const dim = link.kind === 'auto' ? 0.4 : 1;
        const offset = i * 6;
        colors[offset] = startColor.r * dim;
        colors[offset + 1] = startColor.g * dim;
        colors[offset + 2] = startColor.b * dim;
        colors[offset + 3] = endColor.r * dim;
        colors[offset + 4] = endColor.g * dim;
        colors[offset + 5] = endColor.b * dim;
      });
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const object = new THREE.LineSegments(geometry, material);
      scene.add(object);
      return { pairs, geometry, positions, object };
    };

    const linkLayers = [
      createLinkLayer(
        linkPairs.filter((link) => link.kind !== 'auto'),
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
      createLinkLayer(
        linkPairs.filter((link) => link.kind === 'auto'),
        new THREE.LineDashedMaterial({
          vertexColors: true,
          dashSize: 10, // 世界单位：一段虚线 10、间隔 7（航线长度约 70~160）
          gapSize: 7,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    ];

    // ---------- 航线上穿行的小飞船 ----------
    // 参数按 linkPairs 的下标预先算好：船体、尾焰共用同一份相位/速度，尾焰才不会跟丢自己的船。
    const shipSpecs = linkPairs.map((link, index) => {
      const kind = link.kind === 'auto' ? 'auto' : 'explicit';
      const style = SHIP_STYLE[kind];
      return {
        link,
        index,
        kind,
        phase: Math.random(),
        speed: style.speed,
        trailColor: new THREE.Color(style.trail),
      };
    });

    // 每艘船 = 锥形船体 + 一对平直翼（两条 InstancedMesh 共用同一份实例矩阵）
    const shipGeometry = new THREE.ConeGeometry(1.05, 3.4, 7);
    const wingGeometry = new THREE.BoxGeometry(4.6, 0.32, 1.05);

    const makeShipGroup = (kind) => {
      const style = SHIP_STYLE[kind];
      const material = new THREE.MeshStandardMaterial({
        color: style.color,
        emissive: style.emissive,
        emissiveIntensity: style.emissiveIntensity,
        metalness: 0.35,
        roughness: 0.4,
        transparent: kind === 'auto', // 提及航线的船做成半透明，「系统自建」的感觉更强
        opacity: kind === 'auto' ? 0.55 : 1,
      });
      const specs = shipSpecs
        .filter((spec) => spec.kind === kind)
        .map((spec, slot) => ({ ...spec, slot }));
      const body = new THREE.InstancedMesh(shipGeometry, material, specs.length);
      const wing = new THREE.InstancedMesh(wingGeometry, material, specs.length);
      // 飞船一直在动，关掉视锥剔除，免得整批被误判成在视野外
      body.frustumCulled = false;
      wing.frustumCulled = false;
      body.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // 每帧都改矩阵
      wing.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(body);
      scene.add(wing);
      return { style, material, body, wing, specs };
    };

    const shipGroups = [makeShipGroup('explicit'), makeShipGroup('auto')];

    // ---------- 飞船尾焰（拖在船后的小光点，颜色跟着航线类型）----------
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(linkPairs.length * 3);
    const trailColors = new Float32Array(linkPairs.length * 3);
    shipSpecs.forEach((spec) => {
      trailColors.set([spec.trailColor.r, spec.trailColor.g, spec.trailColor.b], spec.index * 3);
    });
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    const trailMaterial = new THREE.PointsMaterial({
      map: glowTexture,
      vertexColors: true, // 亮蓝 = 引用航线，暗灰 = 提及航线
      size: 6,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const trails = new THREE.Points(trailGeometry, trailMaterial);
    scene.add(trails);

    // ---------- 泛光后期（UnrealBloom）----------
    const renderTarget = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, {
      type: THREE.HalfFloatType,
      samples: 4, // EffectComposer 自带的 RT 没有 MSAA，这里手动开 4x 让球体边缘光滑
    });
    const composer = new EffectComposer(renderer, renderTarget);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.8, // strength：泛光强度
      0.6, // radius：扩散半径
      0.14, // threshold：只让较亮的部分发光（避免整屏发灰）
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass()); // 负责色调映射 + 色彩空间转换，必须放在最后
    composer.setSize(width, height);

    // ---------- Raycaster 鼠标拾取（14课核心交互）----------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const pointer = new THREE.Vector2(); // 记录鼠标位置，供拖拽后重新判定悬停
    let hoveredNode = null;
    let focusTarget = null; // 点击后相机要聚焦到的位置

    const setHover = (node) => {
      if (hoveredNode === node) return;
      if (hoveredNode) {
        hoveredNode.userData.halo.material.opacity = 0.6;
        hoveredNode.material.emissiveIntensity = 0.18; // 与星球材质默认值保持一致（见上方材质定义）
        hoveredNode.scale.setScalar(hoveredNode.userData.baseScale);
      }
      hoveredNode = node;
      if (hoveredNode) {
        hoveredNode.userData.halo.material.opacity = 0.95;
        hoveredNode.material.emissiveIntensity = 1.15; // 悬停时自发光增强 → 泛光更亮
        hoveredNode.scale.setScalar(hoveredNode.userData.baseScale * 1.18);
      }
      currentMount.style.cursor = hoveredNode ? 'pointer' : 'grab';
    };

    const pick = () => {
      raycaster.setFromCamera(mouse, camera);
      // 只拾取星球本体（不递归），避免射线打在大气层壳 / 行星环这些子网格上
      const intersects = raycaster.intersectObjects(nodes, false);
      setHover(intersects.length > 0 ? intersects[0].object : null);
    };

    const onPointerMove = (event) => {
      const rect = currentMount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      mouse.copy(pointer);
      pick();
    };

    const onClick = () => {
      if (!hoveredNode) {
        setSelectedNode(null); // 点击空白取消选中
        return;
      }
      setSelectedNode({
        title: hoveredNode.userData.name,
        status: hoveredNode.userData.status,
        reviewList: hoveredNode.userData.reviewList,
        excerpt: hoveredNode.userData.value || '',
      });
      focusTarget = hoveredNode.position.clone(); // 点击后缓缓把镜头推近这颗星球
    };

    currentMount.addEventListener('pointermove', onPointerMove);
    currentMount.addEventListener('click', onClick);
    currentMount.style.cursor = 'grab';

    // HUD 按钮：回到全景 / 自转开关
    actionsRef.current.resetView = () => {
      camera.position.copy(HOME_POSITION);
      controls.target.set(0, 0, 0);
      focusTarget = null;
      setHover(null);
    };
    actionsRef.current.setAutoRotate = (enabled) => {
      controls.autoRotate = enabled;
    };

    // ---------- 动画循环 ----------
    const clock = new THREE.Clock();
    let frameId = 0;
    let settled = false; // 力导向布局稳定后就不再推进模拟，省下 CPU（星空/自转/飞船继续动）

    // 每帧都要算飞船的位置与朝向，这几个临时对象复用，避免在循环里反复 new
    const shipDummy = new THREE.Object3D();
    const shipDirection = new THREE.Vector3();
    const SHIP_UP = new THREE.Vector3(0, 1, 0); // ConeGeometry 默认锥尖朝 +Y

    const syncLinks = () => {
      linkLayers.forEach((layer) => {
        layer.pairs.forEach((link, i) => {
          const source = sphereById.get(link.source);
          const target = sphereById.get(link.target);
          if (!source || !target) return;
          const offset = i * 6;
          layer.positions[offset] = source.position.x;
          layer.positions[offset + 1] = source.position.y;
          layer.positions[offset + 2] = source.position.z;
          layer.positions[offset + 3] = target.position.x;
          layer.positions[offset + 4] = target.position.y;
          layer.positions[offset + 5] = target.position.z;
        });
        layer.geometry.attributes.position.needsUpdate = true;
        layer.geometry.computeBoundingSphere();
        // 顶点一挪就得重算虚线间距（LineSegments 自带按每段长度算的 lineDistance 属性）
        layer.object.computeLineDistances();
      });
    };

    let lastElapsed = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      // 帧间隔（秒）：给自转用；限幅避免切回标签页时星球"瞬移"一大圈
      const delta = Math.min(0.05, Math.max(0, elapsed - lastElapsed));
      lastElapsed = elapsed;

      // 星球自转（云层转得更快一点）
      for (let i = 0; i < spinners.length; i += 1) {
        spinners[i].mesh.rotation.y += spinners[i].speed * delta;
      }

      // 力导向：alpha 衰减到阈值以下就停（默认约 4~5 秒收敛），避免空转
      if (!settled) {
        simulation.tick();
        forceNodes.forEach((d, i) => {
          if (Number.isFinite(d.x)) nodes[i].position.set(d.x, d.y, d.z);
        });
        syncLinks();
        if (simulation.alpha() < 0.01) settled = true;
      }

      // 小飞船：沿航线从起点匀速穿行到终点再循环，锥尖始终朝向飞行方向
      for (let g = 0; g < shipGroups.length; g += 1) {
        const group = shipGroups[g];
        for (let s = 0; s < group.specs.length; s += 1) {
          const spec = group.specs[s];
          const source = sphereById.get(spec.link.source);
          const target = sphereById.get(spec.link.target);
          if (!source || !target) continue;
          shipDirection.subVectors(target.position, source.position);
          const routeLength = shipDirection.length() || 1;
          shipDirection.divideScalar(routeLength); // 单位方向向量
          const t = (elapsed * group.style.speed + spec.phase) % 1;
          shipDummy.position.copy(source.position).addScaledVector(shipDirection, routeLength * t);
          shipDummy.quaternion.setFromUnitVectors(SHIP_UP, shipDirection);
          shipDummy.scale.setScalar(group.style.scale);
          shipDummy.updateMatrix();
          group.body.setMatrixAt(spec.slot, shipDummy.matrix);
          group.wing.setMatrixAt(spec.slot, shipDummy.matrix);
        }
        group.body.instanceMatrix.needsUpdate = true;
        group.wing.instanceMatrix.needsUpdate = true;
      }

      // 尾焰：同一个相位再往回退 0.04 个航程，看起来就是拖在船后
      const trailPositionsAttr = trailGeometry.attributes.position;
      for (let i = 0; i < shipSpecs.length; i += 1) {
        const spec = shipSpecs[i];
        const source = sphereById.get(spec.link.source);
        const target = sphereById.get(spec.link.target);
        if (!source || !target) continue;
        const t = (elapsed * spec.speed + spec.phase - 0.04 + 1) % 1;
        trailPositionsAttr.setXYZ(
          spec.index,
          source.position.x + (target.position.x - source.position.x) * t,
          source.position.y + (target.position.y - source.position.y) * t,
          source.position.z + (target.position.z - source.position.z) * t,
        );
      }
      trailPositionsAttr.needsUpdate = true;

      // 星空缓慢自转 + 逐星闪烁
      stars.rotation.y = elapsed * 0.008;
      stars.rotation.x = Math.sin(elapsed * 0.05) * 0.02;
      starMaterial.uniforms.uTime.value = elapsed;

      // 点击聚焦：目标点与相机同时缓动，避免瞬移
      if (focusTarget) {
        controls.target.lerp(focusTarget, 0.09);
        const direction = camera.position.clone().sub(focusTarget).normalize();
        const distance = Math.max(70, camera.position.distanceTo(focusTarget) * 0.9);
        camera.position.lerp(focusTarget.clone().add(direction.multiplyScalar(distance)), 0.06);
        if (controls.target.distanceTo(focusTarget) < 0.8) focusTarget = null;
      }

      controls.update();
      composer.render();
    };
    animate();

    // ---------- 窗口大小自适应 ----------
    const handleResize = () => {
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h); // EffectComposer 内部会乘上 pixelRatio
    };
    window.addEventListener('resize', handleResize);

    // ---------- 清理资源 ----------
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      currentMount.removeEventListener('pointermove', onPointerMove);
      currentMount.removeEventListener('click', onClick);
      simulation.stop();
      controls.dispose();
      compose_dispose(composer);
      domeGeometry.dispose();
      domeMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      sphereGeometry.dispose();
      linkLayers.forEach((layer) => {
        layer.geometry.dispose();
        layer.object.material.dispose();
      });
      shipGeometry.dispose();
      wingGeometry.dispose();
      shipGroups.forEach((group) => group.material.dispose());
      trailGeometry.dispose();
      trailMaterial.dispose();
      glowTexture.dispose();
      nodes.forEach((node) => {
        node.material.dispose();
        node.userData.halo.material.dispose();
        // 星球贴图 / 凹凸贴图 / 云层 / 行星环这些"每颗星球独有"的资源
        node.userData.disposables.forEach((resource) => resource.dispose());
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
    };
  }, [graphData]); // 注意：autoRotate 通过 actionsRef 同步，避免整个场景因开关自转而重建

  return (
    <div>
      <div className="list-header">
        <h1 className="page-title">3D 知识宇宙</h1>
        <button className="btn btn-plain" onClick={() => navigate('/graph')}>
          查看2D图谱
        </button>
      </div>
      <p className="graph-hint">
        每颗星球是一个知识点，星球越大表示它关联的知识点越多（引用 + 提及，与 2D 知识图谱同一口径）；
        航线上有小飞船往来穿梭：<b>亮实线</b>上跑的是<b>亮蓝大飞船</b>（你手动建立的「引用」），
        <b>暗虚线</b>上跑的是<b>暗灰小飞船</b>（系统从正文里识别出的「提及」）——速度、体型、亮度都按航线类型区分。
        拖拽旋转、滚轮缩放、悬停高亮、点击星球聚焦并查看详情。
      </p>
      {loading && <p className="status-text">正在构建知识宇宙...</p>}
      {!loading && graphData.nodes.length === 0 && (
        <p className="status-text">暂无知识点，先创建几个知识点再来探索宇宙吧！</p>
      )}
      <div className="universe-stage" ref={mountRef}>
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
        {/* 左下角操作区：图例 + 视角按钮 */}
        {!loading && graphData.nodes.length > 0 && (
          <div className="universe-hud">
            <div className="universe-stats">
              <span>
                <b>{graphData.nodes.length}</b> 颗星球
              </span>
              <span>
                <b>{graphData.links.length}</b> 条航线
              </span>
            </div>
            <ul className="universe-legend">
              {LEGEND.map((item) => (
                <li key={item.label}>
                  <i style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                  {item.label}
                </li>
              ))}
            </ul>
            {/* 航线上的飞船图例：和航线本身的实线/虚线口径一一对应 */}
            <ul className="universe-legend universe-ship-legend">
              <li>
                <i className="ship-mark" />
                引用航线 · 亮蓝大飞船
              </li>
              <li>
                <i className="ship-mark ship-mark-auto" />
                提及航线 · 暗灰小飞船
              </li>
            </ul>
            <div className="universe-actions">
              <button type="button" className="universe-btn" onClick={() => actionsRef.current.resetView?.()}>
                回到全景
              </button>
              <button type="button" className="universe-btn" onClick={() => setAutoRotate((v) => !v)}>
                {autoRotate ? '暂停自转' : '开启自转'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// EffectComposer 在部分版本里没有 dispose()，这里做一层兼容
function compose_dispose(composer) {
  if (typeof composer.dispose === 'function') {
    composer.dispose();
    return;
  }
  composer.renderTarget1?.dispose();
  composer.renderTarget2?.dispose();
}

export default KnowledgeUniversePage;
