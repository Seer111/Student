// 生成 PWA 图标（15课）：Node.js 纯代码生成 PNG（圆形深蓝渐变 + 白色 F 字母）
// 使用内置 zlib 与手写 PNG 编码，不依赖 GDI+/canvas 等任何外部库
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// --- CRC32 实现（PNG 块校验必需） ---
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// --- PNG 编码 ---
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 位深 8bit
  ihdr[9] = 6; // 颜色类型 6 = RGBA
  // 压缩/滤波/隔行均为 0

  // 原始扫描线：每行前加一个滤波类型字节 0（None）
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- 绘制图标：圆形深蓝渐变背景 + 白色字母 F ---
function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size * 0.5;

  // 字母 F 的几何参数（三段矩形：竖线 + 顶横 + 中横）
  const barW = Math.max(size * 0.09, 8);
  const leftX = size * 0.30;
  const rightX = size * 0.70;
  const topY = size * 0.22;
  const bottomY = size * 0.78;
  const midY = size * 0.46;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const i = (y * size + x) * 4;

      if (dist > radius) {
        rgba[i + 3] = 0; // 圆外透明
        continue;
      }

      // 深蓝径向渐变：中心亮 -> 边缘暗
      const t = dist / radius;
      let r = Math.round(60 + (24 - 60) * t);
      let g = Math.round(78 + (32 - 78) * t);
      let b = Math.round(150 + (72 - 150) * t);

      // 白色字母 F
      const inVertical = x >= leftX && x <= leftX + barW && y >= topY && y <= bottomY;
      const inTopBar = x >= leftX && x <= rightX && y >= topY && y <= topY + barW;
      const inMidBar = x >= leftX && x <= rightX && y >= midY && y <= midY + barW;
      if (inVertical || inTopBar || inMidBar) {
        r = 255;
        g = 255;
        b = 255;
      }

      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
}

const outDir = path.join(__dirname, 'feynman-platform-frontend', 'public');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), drawIcon(192));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), drawIcon(512));
console.log('PWA icons generated: pwa-192x192.png, pwa-512x512.png');
