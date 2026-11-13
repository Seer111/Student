# 本地 Whisper 语音识别服务（第 7.5 课进阶）—— CPU 版镜像
#
# 构建： docker build -t feynman-whisper-api ./feynman-platform-whisper-api
# 运行： docker run --rm -p 5001:5001 feynman-whisper-api
#
# 说明：
#   - 模型（base）在构建期就下载并烤进镜像，运行时不再联网、启动更快
#   - torch 显式装 CPU 版，避免把 CUDA 运行时（5 GB+）带进来
#   - 但镜像仍然不小：openai-whisper 在 Linux x86_64 上还会写入 triton 依赖（其声明里没有 Python 版本条件），
#     配 ffmpeg + torch + 模型，最终通常是 GB 级

FROM python:3.11-slim

# ffmpeg：openai-whisper 解码音频的硬依赖
# libgomp1：torch 需要的 OpenMP 运行库（slim 镜像里没有）
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DEFAULT_TIMEOUT=120

COPY requirements.txt .

# 先装 CPU 版 torch（从 PyTorch 官方 CPU 源取，镜像里不必带 CUDA 运行时，体积小很多）
# 再装 whisper：这里故意用 --no-deps 单独装 openai-whisper 本体，
# 因为它在 Linux x86_64 上会声明 triton>=2（约 200 MB，只服务 torch.compile 的 GPU 优化，
# CPU 推理完全用不到）；不绕开的话构建会卡在这个大包下载上并 read timeout。
# 它真正需要的运行时依赖下面显式装齐。
#
# 为什么要换国内源：默认走 files.pythonhosted.org，大包经常 read timeout；
# 想换回官方源：docker build --build-arg PIP_INDEX_URL=https://pypi.org/simple ...
ARG PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple
RUN pip install --index-url https://download.pytorch.org/whl/cpu --retries 5 "torch>=2.4" \
    && pip install -i ${PIP_INDEX_URL} --retries 5 --no-deps "openai-whisper>=20231117" \
    && pip install -i ${PIP_INDEX_URL} --retries 5 numba numpy tiktoken tqdm more-itertools flask

COPY app.py .

# 构建期把模型权重下载到镜像里（缓存目录 /root/.cache/whisper），容器启动即用
# 换模型：docker build --build-arg WHISPER_MODEL=small -t feynman-whisper-api ./feynman-platform-whisper-api
ARG WHISPER_MODEL=base
ENV WHISPER_MODEL=${WHISPER_MODEL}
RUN python -c "import os, whisper; whisper.load_model(os.environ['WHISPER_MODEL'])"

EXPOSE 5001

CMD ["python", "app.py"]
