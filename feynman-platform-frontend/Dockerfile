# 前端 Dockerfile（16课：容器化部署，多阶段构建）
# --- 构建阶段 ---
# Node 22：vite 8 要求 ^20.19.0 || >=22.12.0，官方 18 镜像会在 npm install 阶段因 engines 报错
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
# 执行打包命令，产物输出到 dist 目录
RUN npm run build

# --- 生产阶段：用 Nginx 托管静态文件 ---
FROM nginx:stable-alpine

# 从构建阶段复制打包好的静态文件到 Nginx 的默认 Web 根目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 使用自定义 Nginx 配置（含 SPA 路由回退与后端 API 反向代理）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露 Nginx 默认端口
EXPOSE 80

# 启动 Nginx 服务
CMD ["nginx", "-g", "daemon off;"]
