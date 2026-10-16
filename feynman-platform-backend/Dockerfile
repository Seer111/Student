# 后端 Dockerfile（16课：容器化部署）
# 基础镜像用 Node 22：mongoose 9 / 前端工具链均要求 >=20.19.0（官方 18 镜像过旧）
FROM node:22-alpine

# 设置工作目录
WORKDIR /app

# hnswlib-node 是 C++ 原生模块（package.json 中 gypfile: true，npm 上无预编译产物），
# alpine 镜像默认不带编译链，缺少以下工具会导致 npm install 直接失败
RUN apk add --no-cache python3 make g++

# 先复制依赖清单并安装（利用 Docker 层缓存：依赖不变则无需重新安装）
COPY package*.json ./
RUN npm install --omit=dev

# 复制所有项目文件
COPY . .

# 暴露后端服务端口
EXPOSE 3000

# 启动命令
CMD [ "node", "index.js" ]
