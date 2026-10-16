// 程序化星球贴图（工具模块）
// ---------------------------------------------------------------------------
// 目标：不依赖任何外部图片资源，为每个知识点"画"出一颗像真星球的贴图：
//   1. 三种地貌风格：ocean（海洋 + 大陆 + 极冠 + 云层）、bands（气态行星条纹 + 风暴）、rocky（岩质 + 环形山）
//   2. 颜色全部由"知识点状态色"推导（同色相的深浅变化），所以颜色依旧代表学习阶段
//   3. 噪声在经度方向环绕取模 → 球面 0°/360° 接缝处不会出现明显裂缝
//   4. 每颗星球的随机种子来自知识点 id → 刷新页面后还是同一颗星球
import * as THREE from 'three';

const MAP_W = 512;
const MAP_H = 256;
const CLOUD_W = 256;
const CLOUD_H = 128;
const BUMP_W = 128;
const BUMP_H = 64;
const RING_SIZE = 256;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// 可复现的伪随机数（mulberry32）：同样的种子一定得到同样的序列
function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// 字符串 -> 32 位种子（用于把知识点 id 变成"星球指纹"）
export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < String(text).length; i += 1) {
    h ^= String(text).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 周期性值噪声：x 方向按网格宽度取模，因此 u=0 与 u=1 的取值天然一致（球面无缝）
function createValueNoise(gridX, gridY, rand) {
  const grid = new Float32Array(gridX * gridY);
  for (let i = 0; i < grid.length; i += 1) grid[i] = rand();

  return function noise(u, v) {
    const x = u * gridX;
    const y = v * gridY;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = x - x0;
    const ty = y - y0;
    const sx = tx * tx * (3 - 2 * tx); // 平滑插值，避免网格状棱角
    const sy = ty * ty * (3 - 2 * ty);
    const i0 = ((x0 % gridX) + gridX) % gridX; // 环绕
    const i1 = (i0 + 1) % gridX;
    const j0 = Math.min(Math.max(y0, 0), gridY - 1);
    const j1 = Math.min(j0 + 1, gridY - 1);
    const a = grid[j0 * gridX + i0];
    const b = grid[j0 * gridX + i1];
    const c = grid[j1 * gridX + i0];
    const d = grid[j1 * gridX + i1];
    const top = lerp(a, b, sx);
    const bottom = lerp(c, d, sx);
    return lerp(top, bottom, sy);
  };
}

// 分形叠加（fBm）：多层噪声，每层网格翻倍、振幅减半 → 既有大结构又有细节
function createFbm(octaves, gridX, gridY, rand) {
  const layers = [];
  let amplitude = 1;
  let total = 0;
  let gx = gridX;
  let gy = gridY;
  for (let i = 0; i < octaves; i += 1) {
    layers.push({ noise: createValueNoise(gx, gy, rand), amplitude });
    total += amplitude;
    amplitude *= 0.5;
    gx *= 2;
    gy *= 2;
  }
  return function fbm(u, v) {
    let sum = 0;
    for (let i = 0; i < layers.length; i += 1) {
      sum += layers[i].noise(u, v) * layers[i].amplitude;
    }
    return sum / total;
  };
}

function createCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

// 生成一颗星球的表面贴图
// 返回 { map, bump, clouds, style }
export function createPlanetSurface(colorHex, seed, options = {}) {
  const rand = mulberry32(seed);
  const styles = ['ocean', 'bands', 'rocky'];
  const style = options.style || styles[Math.floor(rand() * styles.length)];

  const base = new THREE.Color(colorHex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const tone = (l, s = hsl.s) => new THREE.Color().setHSL(hsl.h, clamp01(s), clamp01(l));

  const surfaceCanvas = createCanvas(MAP_W, MAP_H);
  const surfaceCtx = surfaceCanvas.getContext('2d');
  const surfaceImage = surfaceCtx.createImageData(MAP_W, MAP_H);
  const surfacePixels = surfaceImage.data;

  const bumpCanvas = createCanvas(BUMP_W, BUMP_H);
  const bumpCtx = bumpCanvas.getContext('2d');
  const bumpImage = bumpCtx.createImageData(BUMP_W, BUMP_H);
  const bumpPixels = bumpImage.data;

  const terrain = createFbm(5, 6, 3, rand);
  const detail = createFbm(4, 12, 6, rand);

  // ---------- 逐像素生成表面颜色 ----------
  for (let y = 0; y < MAP_H; y += 1) {
    const v = y / (MAP_H - 1);
    const polar = Math.abs(v - 0.5) * 2; // 0=赤道，1=极点
    for (let x = 0; x < MAP_W; x += 1) {
      const u = x / (MAP_W - 1);
      const h = terrain(u, v);
      const d = detail(u, v);
      const index = (y * MAP_W + x) * 4;

      let color;
      if (style === 'bands') {
        // 气态行星：这里先铺一层基色，真正的纬度条纹在下面单独一遍画（要用上二维变换画风暴）
        color = tone(hsl.l * 0.95, hsl.s * 0.85);
      } else if (style === 'ocean') {
        const ice = smoothstep(0.8, 0.97, polar + (h - 0.5) * 0.3);
        let land = h > 0.5;
        // 极地附近陆地也冻成冰盖
        if (ice > 0.35) land = false;
        if (land) {
          const t = clamp01((h - 0.5) * 3.6);
          color = tone(lerp(hsl.l * 1.15, hsl.l * 1.75, t), hsl.s * 0.72).lerp(tone(hsl.l * 1.2, hsl.s * 0.5), d * 0.35);
        } else {
          const t = clamp01((0.5 - h) * 3.6);
          color = tone(lerp(hsl.l * 0.78, hsl.l * 0.34, t), hsl.s * 1.25);
        }
        const iceColor = new THREE.Color().setHSL(hsl.h, hsl.s * 0.18, 0.92);
        color.lerp(iceColor, ice);
      } else {
        // 岩质星球：整体偏灰的基色 + 大范围明暗斑
        const shade = 0.55 + h * 0.85;
        color = tone(hsl.l * shade, hsl.s * 0.6);
        color.lerp(tone(hsl.l * 0.45, hsl.s * 0.4), smoothstep(0.62, 0.78, d) * 0.5);
      }

      surfacePixels[index] = Math.round(clamp01(color.r) * 255);
      surfacePixels[index + 1] = Math.round(clamp01(color.g) * 255);
      surfacePixels[index + 2] = Math.round(clamp01(color.b) * 255);
      surfacePixels[index + 3] = 255;
    }
  }
  surfaceCtx.putImageData(surfaceImage, 0, 0);

  // ---------- 条纹风格：直接在主画布上叠条纹与风暴 ----------
  if (style === 'bands') {
    const bandCount = 8 + Math.floor(rand() * 7);
    const stripe = createCanvas(MAP_W, MAP_H);
    const stripeCtx = stripe.getContext('2d');
    const stripeImage = stripeCtx.createImageData(MAP_W, MAP_H);
    const stripePixels = stripeImage.data;
    for (let y = 0; y < MAP_H; y += 1) {
      const v = y / (MAP_H - 1);
      for (let x = 0; x < MAP_W; x += 1) {
        const u = x / (MAP_W - 1);
        const warp = (terrain(u, v) - 0.5) * 0.22; // 用噪声把条纹揉弯
        const band = 0.5 + 0.5 * Math.sin((v + warp) * Math.PI * bandCount);
        const shade = lerp(0.62, 1.5, band);
        const color = tone(hsl.l * shade, hsl.s * lerp(0.75, 1.05, band));
        const index = (y * MAP_W + x) * 4;
        stripePixels[index] = Math.round(clamp01(color.r) * 255);
        stripePixels[index + 1] = Math.round(clamp01(color.g) * 255);
        stripePixels[index + 2] = Math.round(clamp01(color.b) * 255);
        stripePixels[index + 3] = 255;
      }
    }
    stripeCtx.putImageData(stripeImage, 0, 0);
    surfaceCtx.drawImage(stripe, 0, 0);

    // 大红斑式风暴：几个椭圆
    const storms = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < storms; i += 1) {
      const cx = rand() * MAP_W;
      const cy = MAP_H * (0.2 + rand() * 0.6);
      const rx = 18 + rand() * 42;
      const ry = rx * (0.45 + rand() * 0.3);
      const stormColor = tone(hsl.l * (rand() > 0.4 ? 1.05 : 0.8), hsl.s * 1.1);
      const gradient = surfaceCtx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      gradient.addColorStop(0, `rgba(${Math.round(stormColor.r * 255)},${Math.round(stormColor.g * 255)},${Math.round(stormColor.b * 255)},0.85)`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      surfaceCtx.save();
      surfaceCtx.translate(cx, cy);
      surfaceCtx.scale(1, ry / rx);
      surfaceCtx.translate(-cx, -cy);
      surfaceCtx.fillStyle = gradient;
      surfaceCtx.beginPath();
      surfaceCtx.arc(cx, cy, rx, 0, Math.PI * 2);
      surfaceCtx.fill();
      surfaceCtx.restore();
    }
  }

  // ---------- 岩质风格：环形山 ----------
  if (style === 'rocky') {
    const craters = 26 + Math.floor(rand() * 20);
    for (let i = 0; i < craters; i += 1) {
      const cx = rand() * MAP_W;
      const cy = rand() * MAP_H;
      const r = 4 + Math.pow(rand(), 2.4) * 34;
      const rim = tone(hsl.l * 1.75, hsl.s * 0.45);
      const bowl = tone(hsl.l * 0.4, hsl.s * 0.5);
      // 坑底（暗）
      surfaceCtx.fillStyle = `rgba(${Math.round(bowl.r * 255)},${Math.round(bowl.g * 255)},${Math.round(bowl.b * 255)},0.75)`;
      surfaceCtx.beginPath();
      surfaceCtx.arc(cx, cy, r, 0, Math.PI * 2);
      surfaceCtx.fill();
      // 坑缘（亮）
      surfaceCtx.strokeStyle = `rgba(${Math.round(rim.r * 255)},${Math.round(rim.g * 255)},${Math.round(rim.b * 255)},0.7)`;
      surfaceCtx.lineWidth = Math.max(1, r * 0.36);
      surfaceCtx.beginPath();
      surfaceCtx.arc(cx, cy, r, 0, Math.PI * 2);
      surfaceCtx.stroke();
    }
  }

  // ---------- 凹凸贴图：同一套噪声的灰度版，让光线下有起伏 ----------
  for (let y = 0; y < BUMP_H; y += 1) {
    const v = y / (BUMP_H - 1);
    for (let x = 0; x < BUMP_W; x += 1) {
      const u = x / (BUMP_W - 1);
      const h = terrain(u, v) * 0.7 + detail(u, v) * 0.3;
      const index = (y * BUMP_W + x) * 4;
      const gray = Math.round(clamp01(h) * 255);
      bumpPixels[index] = gray;
      bumpPixels[index + 1] = gray;
      bumpPixels[index + 2] = gray;
      bumpPixels[index + 3] = 255;
    }
  }
  bumpCtx.putImageData(bumpImage, 0, 0);

  // ---------- 云层（只有海洋星球需要）----------
  let cloudCanvas = null;
  if (style === 'ocean') {
    cloudCanvas = createCanvas(CLOUD_W, CLOUD_H);
    const cloudCtx = cloudCanvas.getContext('2d');
    const cloudImage = cloudCtx.createImageData(CLOUD_W, CLOUD_H);
    const cloudPixels = cloudImage.data;
    const cloudNoise = createFbm(5, 5, 4, rand);
    for (let y = 0; y < CLOUD_H; y += 1) {
      const v = y / (CLOUD_H - 1);
      for (let x = 0; x < CLOUD_W; x += 1) {
        const u = x / (CLOUD_W - 1);
        const c = cloudNoise(u, v);
        const alpha = Math.round(smoothstep(0.52, 0.78, c) * 235);
        const index = (y * CLOUD_W + x) * 4;
        cloudPixels[index] = 255;
        cloudPixels[index + 1] = 255;
        cloudPixels[index + 2] = 255;
        cloudPixels[index + 3] = alpha;
      }
    }
    cloudCtx.putImageData(cloudImage, 0, 0);
  }

  const anisotropy = options.anisotropy || 1;
  const map = new THREE.CanvasTexture(surfaceCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = anisotropy;
  map.wrapS = THREE.RepeatWrapping; // 经度方向环回，配合周期性噪声做到无缝

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.anisotropy = anisotropy;
  bump.wrapS = THREE.RepeatWrapping;

  let clouds = null;
  if (cloudCanvas) {
    clouds = new THREE.CanvasTexture(cloudCanvas);
    clouds.colorSpace = THREE.SRGBColorSpace;
    clouds.anisotropy = anisotropy;
    clouds.wrapS = THREE.RepeatWrapping;
  }

  return { map, bump, clouds, style };
}

// 生成行星环贴图：同心圆环 + 卡西尼缝式的空隙
// RingGeometry 的 UV 是"方形映射"，所以用同心圆画在方画布上正好对上
export function createRingTexture(colorHex, seed) {
  const rand = mulberry32(seed);
  const canvas = createCanvas(RING_SIZE, RING_SIZE);
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(colorHex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const center = RING_SIZE / 2;
  const rings = 34 + Math.floor(rand() * 22);
  for (let i = 0; i < rings; i += 1) {
    const t = i / rings;
    const radius = center * (0.42 + t * 0.56);
    const width = center * 0.02 + rand() * center * 0.02;
    const light = clamp01(hsl.l * (0.6 + rand() * 0.9));
    const color = new THREE.Color().setHSL(hsl.h, clamp01(hsl.s * (0.35 + rand() * 0.5)), light);
    ctx.strokeStyle = `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},${0.25 + rand() * 0.5})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// 大气层辉光：菲涅尔效果，视线越掠过球体边缘越亮（地球那种一圈蓝光）
export const ATMOSPHERE_VERT = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const ATMOSPHERE_FRAG = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    // 菲涅尔：法线与视线夹角越大（球体边缘）越亮
    float fresnel = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), 2.6);
    gl_FragColor = vec4(uColor * fresnel * uIntensity, fresnel);
  }
`;
