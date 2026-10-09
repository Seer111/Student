import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vite 配置：React 插件 + PWA 插件（15课：渐进式 Web 应用，支持安装到主屏幕与离线访问）
export default defineConfig({
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
  },
});
