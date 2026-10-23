// 3D 视界页（第 13 课）：Three.js 教学演示
// 讲义的目标是「理解场景(Scene) / 相机(Camera) / 渲染器(Renderer) 三要素，独立搭出一个可交互的 3D 场景」。
// 所以这页不只是一个旋转立方体，而是一个可以边拨边看的实验台：
//   1) 几何体切换 —— 讲「几何体(Geometry) + 材质(Material) = 网格(Mesh)」
//   2) 材质切换   —— 基础材质忽略光照，标准材质必须靠光源才亮，关掉光照立刻变黑
//   3) 光照 / 辅助坐标开关 —— 把看不见的「光」和「坐标系」显形
//   4) 实时读数   —— 相机位置、物体旋转角、帧率，把「每一帧 render(scene, camera)」这件事显式化
// 交互：左键拖拽旋转视角、滚轮缩放、右键平移（由 OrbitControls 接管）。
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 几何体就是「形状」：换个构造器就换个形状，顶点数据由 Three.js 生成
const GEOMETRY_OPTIONS = {
  box: { label: '立方体', create: () => new THREE.BoxGeometry(1.4, 1.4, 1.4) },
  sphere: { label: '球体', create: () => new THREE.SphereGeometry(1, 48, 32) },
  knot: { label: '圆环结', create: () => new THREE.TorusKnotGeometry(0.8, 0.3, 160, 24) },
};

// 材质决定「怎么和光打交道」：MeshBasicMaterial 直接用颜色填充，MeshStandardMaterial 要走 PBR 光照计算
const MATERIAL_OPTIONS = {
  basic: {
    label: '基础材质（不受光）',
    create: (color, wireframe) => new THREE.MeshBasicMaterial({ color, wireframe }),
  },
  standard: {
    label: '标准材质（受光）',
    create: (color, wireframe) =>
      new THREE.MeshStandardMaterial({ color, wireframe, roughness: 0.35, metalness: 0.25 }),
  },
};

const INITIAL_PARAMS = {
  geometry: 'box',
  material: 'standard',
  color: '#4ade80',
  wireframe: false,
  spin: true,
  autoRotate: false,
  lights: true,
  helpers: false,
};

const INITIAL_CAMERA = { x: 4.5, y: 3.5, z: 6.5 };

function ThreeJSPage() {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const lightGroupRef = useRef(null);
  const helperGroupRef = useRef(null);
  const spinRef = useRef(INITIAL_PARAMS.spin);
  const rafRef = useRef(0);
  const fpsRef = useRef({ frames: 0, last: 0, value: 0 });

  const [params, setParams] = useState(INITIAL_PARAMS);
  const [readout, setReadout] = useState({ camera: '—', rotation: '—', fps: '—' });

  // ---- 1. 场景只初始化一次（三要素都在这段里） ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    // 场景（Scene）：三维世界的容器
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2a3a);
    sceneRef.current = scene;

    // 相机（Camera）：透视相机 —— 视野 75°、宽高比、近裁面、远裁面
    const camera = new THREE.PerspectiveCamera(
      75,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(INITIAL_CAMERA.x, INITIAL_CAMERA.y, INITIAL_CAMERA.z);
    cameraRef.current = camera;

    // 渲染器（Renderer）：把三维投影成二维像素，画布挂到 DOM 上
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 物体：几何体 + 材质 = 网格（Mesh）
    const material = MATERIAL_OPTIONS[INITIAL_PARAMS.material].create(
      INITIAL_PARAMS.color,
      INITIAL_PARAMS.wireframe,
    );
    const mesh = new THREE.Mesh(GEOMETRY_OPTIONS[INITIAL_PARAMS.geometry].create(), material);
    scene.add(mesh);
    meshRef.current = mesh;
    materialRef.current = material;

    // 光照：标准材质靠它成像（环境光打底 + 点光源出层次）
    const lightGroup = new THREE.Group();
    lightGroup.add(new THREE.AmbientLight(0xffffff, 0.55));
    const pointLight = new THREE.PointLight(0xffffff, 1.5);
    pointLight.position.set(6, 8, 6);
    lightGroup.add(pointLight);
    lightGroup.visible = INITIAL_PARAMS.lights;
    scene.add(lightGroup);
    lightGroupRef.current = lightGroup;

    // 辅助对象：坐标轴 + 网格地面，帮助理解三维坐标系
    const helperGroup = new THREE.Group();
    helperGroup.add(new THREE.AxesHelper(3));
    const grid = new THREE.GridHelper(12, 12, 0x8fa8c8, 0x4a5a76);
    grid.position.y = -1.6;
    helperGroup.add(grid);
    helperGroup.visible = INITIAL_PARAMS.helpers;
    scene.add(helperGroup);
    helperGroupRef.current = helperGroup;

    // 轨道控制器：接管鼠标（它动的是相机，不是物体）
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotateSpeed = 2;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 动画循环：每一帧「推进动画 → 更新控制器 → 渲染」
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      if (spinRef.current) {
        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.01;
      }
      controls.update();
      renderer.render(scene, camera);

      // 帧率统计：每 500ms 折算一次，避免每帧都 setState
      const now = performance.now();
      const fps = fpsRef.current;
      fps.frames += 1;
      if (now - fps.last >= 500) {
        fps.value = Math.round((fps.frames * 1000) / (now - fps.last));
        fps.frames = 0;
        fps.last = now;
      }
    };
    fpsRef.current.last = performance.now(); // 首帧时间基准：第一帧不计入帧率
    animate();

    // 尺寸自适应：容器大小变了就同步相机宽高比与渲染尺寸
    const resizeObserver = new ResizeObserver(() => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(mount);

    // 卸载时释放 GPU 资源，避免内存泄漏（React 严格模式下会挂载两次，这里必须干净）
    return () => {
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      mesh.geometry.dispose();
      material.dispose();
      pointLight.dispose();
      grid.geometry.dispose();
      grid.material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      meshRef.current = null;
      materialRef.current = null;
    };
  }, []);

  // ---- 2. 参数变化时增量改场景（不重建整个场景） ----
  useEffect(() => {
    spinRef.current = params.spin;
    if (controlsRef.current) controlsRef.current.autoRotate = params.autoRotate;
  }, [params.spin, params.autoRotate]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.geometry.dispose(); // 换形状前先释放旧的顶点数据
    mesh.geometry = GEOMETRY_OPTIONS[params.geometry].create();
  }, [params.geometry]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const old = materialRef.current;
    const next = MATERIAL_OPTIONS[params.material].create(params.color, params.wireframe);
    materialRef.current = next;
    mesh.material = next;
    if (old) old.dispose();
  }, [params.material, params.color, params.wireframe]);

  useEffect(() => {
    if (lightGroupRef.current) lightGroupRef.current.visible = params.lights;
  }, [params.lights]);

  useEffect(() => {
    if (helperGroupRef.current) helperGroupRef.current.visible = params.helpers;
  }, [params.helpers]);

  // ---- 3. 读数：每 400ms 从场景里取一次真实数据 ----
  useEffect(() => {
    const timer = setInterval(() => {
      const camera = cameraRef.current;
      const mesh = meshRef.current;
      if (!camera || !mesh) return;
      const deg = (rad) => ((THREE.MathUtils.radToDeg(rad) % 360) + 360) % 360;
      setReadout({
        camera: `${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`,
        rotation: `${deg(mesh.rotation.x).toFixed(0)}°, ${deg(mesh.rotation.y).toFixed(0)}°`,
        fps: String(fpsRef.current.value || '—'),
      });
    }, 400);
    return () => clearInterval(timer);
  }, []);

  const resetView = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(INITIAL_CAMERA.x, INITIAL_CAMERA.y, INITIAL_CAMERA.z);
    controls.target.set(0, 0, 0);
    controls.update();
  }, []);

  const toggle = (key) => (event) =>
    setParams((prev) => ({ ...prev, [key]: event.target.checked }));
  const pick = (key, value) => () => setParams((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <header className="three-header">
        <h1 className="page-title">3D 视界</h1>
        <p className="three-subtitle">
          场景装东西、相机决定从哪看、渲染器每帧把三维投影成画面；右边每个开关改的都是同一个场景对象
        </p>
      </header>

      <div className="three-layout">
        <aside className="three-panel">
          <section>
            <h2 className="three-group-title">几何体</h2>
            <div className="demo-chips">
              {Object.entries(GEOMETRY_OPTIONS).map(([key, option]) => (
                <button
                  key={key}
                  type="button"
                  className={`demo-chip${params.geometry === key ? ' is-active' : ''}`}
                  onClick={pick('geometry', key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="three-group-title">材质</h2>
            <div className="demo-chips">
              {Object.entries(MATERIAL_OPTIONS).map(([key, option]) => (
                <button
                  key={key}
                  type="button"
                  className={`demo-chip${params.material === key ? ' is-active' : ''}`}
                  onClick={pick('material', key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="demo-check three-color">
              颜色
              <input
                type="color"
                className="demo-color"
                value={params.color}
                onChange={(event) => setParams((prev) => ({ ...prev, color: event.target.value }))}
              />
            </label>
          </section>

          <section>
            <h2 className="three-group-title">显示</h2>
            <div className="three-switches">
              <label className="demo-check">
                <input type="checkbox" checked={params.wireframe} onChange={toggle('wireframe')} />
                线框模式
              </label>
              <label className="demo-check">
                <input type="checkbox" checked={params.spin} onChange={toggle('spin')} />
                物体自转
              </label>
              <label className="demo-check">
                <input type="checkbox" checked={params.autoRotate} onChange={toggle('autoRotate')} />
                相机自动环绕
              </label>
              <label className="demo-check">
                <input type="checkbox" checked={params.lights} onChange={toggle('lights')} />
                场景光照
              </label>
              <label className="demo-check">
                <input type="checkbox" checked={params.helpers} onChange={toggle('helpers')} />
                坐标轴 / 网格
              </label>
            </div>
          </section>

          <button type="button" className="three-reset" onClick={resetView}>重置视角</button>
        </aside>

        <div className="three-main">
          <div ref={mountRef} className="demo-stage" />

          <dl className="three-readout">
            <div>
              <dt>相机位置</dt>
              <dd>{readout.camera}</dd>
            </div>
            <div>
              <dt>物体旋转</dt>
              <dd>{readout.rotation}</dd>
            </div>
            <div>
              <dt>帧率</dt>
              <dd>{readout.fps} FPS</dd>
            </div>
          </dl>

          <p className="three-hint">左键拖拽旋转视角 · 滚轮缩放 · 右键平移</p>
        </div>
      </div>

      <ul className="demo-notes">
        <li>
          <b>场景 Scene</b>：<code>new THREE.Scene()</code> —— 三维世界的容器，物体、灯光都要{' '}
          <code>add</code> 进来才存在。
        </li>
        <li>
          <b>相机 Camera</b>：<code>PerspectiveCamera(75, 宽高比, 0.1, 1000)</code> ——
          决定「从哪看、看多广」，四个参数分别是视野角度、宽高比、近裁面、远裁面。
        </li>
        <li>
          <b>渲染器 Renderer</b>：<code>WebGLRenderer</code> —— 每一帧执行{' '}
          <code>renderer.render(scene, camera)</code>，把三维世界投影成二维像素。
        </li>
        <li>
          <b>网格 Mesh</b>：几何体（形状）+ 材质（外观）= 你看到的物体。换几何体只换形状，换材质才改变它怎么和光打交道。
        </li>
        <li>
          <b>光照</b>：标准材质靠反射光成像，把「场景光照」关掉会立刻变成一片黑；基础材质直接填充颜色，忽略光照——切到它再关灯就很明显。
        </li>
        <li>
          <b>OrbitControls</b>：接管鼠标左键、滚轮、右键。注意它移动的是<b>相机</b>，物体本身并没有动。
        </li>
        <li>
          <b>资源释放</b>：几何体、材质、渲染器都会占用 GPU 资源，组件卸载时要逐一 <code>dispose()</code>
          ，否则反复进出页面会持续泄漏显存。
        </li>
      </ul>
    </div>
  );
}

export default ThreeJSPage;
