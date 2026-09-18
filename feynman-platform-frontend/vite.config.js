import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 配置：启用 React 插件（负责 JSX 编译与热更新）
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
