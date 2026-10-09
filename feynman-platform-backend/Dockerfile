# 后端 Dockerfile（16课：容器化部署）
# 使用官方 Node.js 18 镜像作为基础
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 先复制依赖清单并安装（利用 Docker 层缓存：依赖不变则无需重新安装）
COPY package*.json ./
RUN npm install --omit=dev

# 复制所有项目文件
COPY . .

# 暴露后端服务端口
EXPOSE 3000

# 启动命令
CMD [ "node", "index.js" ]
