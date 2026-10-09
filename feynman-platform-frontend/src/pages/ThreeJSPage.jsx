// 3D 视界页（13课）：Three.js 入门 - 旋转立方体
// 演示 Three.js 核心三要素：场景(Scene) + 相机(Camera) + 渲染器(Renderer)，
// 以及 OrbitControls 轨道控制器（左键旋转 / 滚轮缩放 / 右键平移）。
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

function ThreeJSPage() {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;

    // 1. 创建场景（舞台）
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2a3a);

    // 2. 创建相机（眼睛）：透视相机 - 视野75度 / 宽高比 / 近截面 / 远截面
    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000,
    );
    camera.position.z = 5;

    // 3. 创建渲染器（放映机）
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);

    // 4. 创建物体：几何体 + 材质 = 网格（Mesh）
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // 5. 轨道控制器：让用户可以用鼠标旋转/缩放/平移场景
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // 阻尼效果，旋转更平滑

    // 6. 动画循环：每帧旋转立方体并渲染
    const animate = () => {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 7. 处理窗口大小变化
    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 8. 组件卸载时清理资源（防止内存泄漏）
    return () => {
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      currentMount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div>
      <div className="list-header">
        <h1 className="page-title">3D 视界</h1>
      </div>
      <p className="graph-hint">Three.js 入门：旋转立方体。左键拖拽旋转视角，滚轮缩放，右键平移。</p>
      <div ref={mountRef} style={{ width: '100%', height: '75vh' }} />
    </div>
  );
}

export default ThreeJSPage;
