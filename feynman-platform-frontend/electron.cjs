// Electron 主进程（15课：跨平台部署 - 桌面端）
// 说明：本项目 package.json 声明了 "type": "module"，因此主进程文件使用 .cjs 后缀
//       （CommonJS），避免与前端 ESM 模块体系冲突。
// 架构：主进程（本文件，拥有完整 Node.js 能力）创建 BrowserWindow，
//       窗口内运行 React 应用（渲染进程）。
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  // 创建浏览器窗口
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // 关闭：更安全，渲染进程无法直接访问 Node API
      contextIsolation: true, // 开启：渲染进程与主进程环境隔离
    },
  });

  // 开发环境加载 Vite 开发服务器；生产环境加载打包后的 dist/index.html
  const startUrl =
    process.env.ELECTRON_START_URL ||
    `file://${path.join(__dirname, './dist/index.html')}`;
  win.loadURL(startUrl);

  // 开发环境自动打开开发者工具
  if (process.env.ELECTRON_START_URL) {
    win.webContents.openDevTools();
  }
}

// 原生顶部菜单栏（15课课后作业：Electron 进阶）
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [{ role: 'quit', label: '退出' }],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox({
              type: 'info',
              title: '关于',
              message: '费曼学习平台',
              detail: '一个基于费曼学习法与 AI 的个性化学习平台\n技术栈：React + Node.js + MongoDB + AI',
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  createMenu();

  // macOS：点击 Dock 图标且无窗口时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭后退出（macOS 除外，其惯例是保持应用存活）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
