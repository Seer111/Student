// ESLint 扁平配置（ESLint 10 / flat config）
// 说明：本仓只有前端有 lint，后端与 whisper 服务不参与。
// 目标：`npm run lint` 能跑起来，而且**当前代码是干净的**——
//   真错误（未定义变量、hooks 调用顺序、语法问题）保持 error；
//   性能建议类与历史风格类降级为 warn，避免一上来红一片。
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// 插件不同版本导出推荐规则的位置不同，两处都兼容一下
const hooksRecommended = reactHooks.configs['recommended-latest'] || reactHooks.configs.recommended;

export default [
  // 产物与依赖不检查
  { ignores: ['dist/**', 'release/**', 'node_modules/**', 'dev-dist/**'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...(hooksRecommended.rules || {}),

      // 本项目的 effect 就是用来拉数据 / 订阅外部系统的（图谱、星球、计时器），
      // 这条是 React Compiler 时代的性能建议（避免级联渲染），不是 bug → 只提示不拦。
      'react-hooks/set-state-in-effect': 'warn',

      // —— 风格类：降级为警告 ——
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^[A-Z_]' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],

      // 单文件里同时导出组件与常量是刻意为之（如 STATUS_TEXT），不报
      'react-refresh/only-export-components': 'off',
    },
  },

  // Electron 主进程：CommonJS（vite.config.js 是 ESM，走上面的统一配置）
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
  },
];
