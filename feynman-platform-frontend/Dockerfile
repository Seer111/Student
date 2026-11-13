# 前端 Dockerfile（16课：容器化部署，多阶段构建）
# --- 构建阶段 ---
# Node 22：vite 8 要求 ^20.19.0 || >=22.12.0，官方 18 镜像会在 npm install 阶段因 engines 报错
FROM node:22-alpine AS builder

WORKDIR /app

# 容器里只做 vite 打包，根本用不到 Electron 运行时；
# 不跳过的话 electron 的 postinstall 会在构建期下载 100+ MB 的二进制（alpine 上还容易直接失败）
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1

# npm ci：按 lockfile 精确安装，构建可复现（比 npm install 快且不会漂版本）
COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# 执行打包命令，产物输出到 dist 目录
RUN npm run build

# --- 生产阶段：用 Nginx 托管静态文件 ---
FROM nginx:stable-alpine

# 从构建阶段复制打包好的静态文件到 Nginx 的默认 Web 根目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 使用自定义 Nginx 配置（含 SPA 路由回退、/api 反向代理、上传体积上限与 gzip）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 健康检查：能取到首页即视为可用
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

# 暴露 Nginx 默认端口
EXPOSE 80

# 启动 Nginx 服务
CMD ["nginx", "-g", "daemon off;"]
