import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vite 配置：React 插件 + PWA 插件（15课：渐进式 Web 应用，支持安装到主屏幕与离线访问）
export default defineConfig({
  // 资源基础路径 base：
  //   Web / PWA 部署在站点根目录 → 用绝对路径 '/'（默认行为，Service Worker 作用域也以它为基准）
  //   Electron 桌面端用 file:// 加载 dist/index.html → 必须用相对路径 './'，
  //   否则产物里的 /assets/* 会被解析成磁盘根目录、脚本 404，窗口一片空白
  // 由 `npm run build:electron` 传入 ELECTRON=1 触发（见 package.json）
  base: process.env.ELECTRON === '1' ? './' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Web App Manifest：定义应用名称、图标、主题色等，让网站像原生 App 一样可安装
      manifest: {
        name: '费曼学习平台',
        short_name: '费曼平台',
        description: '一个基于费曼学习法与 AI 的个性化学习平台',
        theme_color: '#1e2958',
        background_color: '#f7f8fc',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      // Service Worker 缓存策略：缓存构建产物，实现离线访问
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // 主 bundle 体积较大（含 echarts/three 等），调高单文件缓存上限以免预缓存失败
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  server: {
    port: 5173,
    // 文件监听忽略写入过程产生的临时目录：编辑器/工具做原子替换时会先落
    // .<文件名>.<pid>.<uuid>.tmpdir/ 再改名，chokidar 若正好在临时目录被删除的瞬间
    // 去 watch 它，Node 的 fs.watch 会抛 EBUSY，未捕获的 error 事件会直接终止 dev server
    watch: {
      ignored: ['**/.*.tmpdir/**', '**/*.tmp', '**/.*.swp'],
    },
    // 开发模式下把 /api 转发给本地后端，与生产环境 Nginx 的反向代理行为保持一致
    // （前端 axios 在 http(s) 页面下统一使用相对路径 /api）
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
