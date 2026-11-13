# 后端 Dockerfile（16课：容器化部署）
# 两阶段：deps 阶段只负责装依赖（含 hnswlib-node 的 C++ 编译），运行阶段不带编译链
FROM node:22-alpine AS deps

WORKDIR /app

# hnswlib-node 是 C++ 原生模块（package.json 中 gypfile: true，npm 上无预编译产物），
# alpine 默认没有编译链，缺这些工具会在 npm ci 阶段直接失败
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# 用 npm ci：按 lockfile 精确安装，可复现；不把 devDependencies 带进运行时镜像
RUN npm ci --omit=dev


# --- 运行阶段 ---
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# 只搬依赖产物，不搬 python3/make/g++（镜像能小几百 MB）
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 向量库目录存在且属主是 node：挂载空命名卷时 Docker 会把这里的属主复制到卷里，
# 这样非 root 进程也能往 /app/vector_store 写索引
RUN mkdir -p /app/vector_store && chown -R node:node /app

# 以非 root 运行（node 镜像自带 node 用户）
USER node

EXPOSE 3000

# 健康检查：容器编排与运维探活；只要求进程与路由栈可用
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD [ "node", "index.js" ]
