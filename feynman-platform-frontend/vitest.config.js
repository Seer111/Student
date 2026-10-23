import { defineConfig } from 'vitest/config';

// 最简配置：只跑 src 下的纯函数用例。
// 不装 jsdom、不配 @testing-library —— 组件渲染测试要额外一堆依赖，
// 当前只验证「摘标题」「状态映射」这类纯逻辑，用 node 环境就够。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
