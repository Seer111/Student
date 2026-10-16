# 本地 Whisper 语音识别服务（第 7.5 课进阶：AI 能力自主化）

用 OpenAI 开源的 **Whisper** 模型替代百度云 ASR：音频转文字全程在本机完成，**数据不出内网**，不消耗任何云 API 额度。

服务只做一件事：收一个音频文件，返回转写文本。

## 它在链路里的位置

```
浏览器录音
   │  multipart 字段名 audio
   ▼
后端 POST /api/audio/transcribe-local        （feynman-platform-backend/routes/audio.js，需登录）
   │  转发到 WHISPER_API_URL，默认 http://localhost:5001/transcribe
   ▼
本服务 POST /transcribe                       （feynman-platform-whisper-api/app.py，Flask）
   │  {"result": "转写出来的文字"}
   ▼
后端返回 {"result": "...", "provider": "local-whisper"}
```

- 后端侧的地址是可配的：`feynman-platform-backend/.env` 里的 `WHISPER_API_URL`（见后端的 `.env.example`）。
- 没启动本服务时，调那条接口会返回 500，提示「本地 Whisper 转录失败（请确认 Python 服务已在 … 启动）」。

## 快速开始（本机直跑）

> 需要 **Python 3.10 或更高**（PyTorch 2.10+ 已提供 cp314 wheel，Python 3.14 也能直接装）。

```bash
# 0) 系统依赖：whisper 读音频靠 ffmpeg，必须先装好并能在 PATH 里找到
#    Windows: winget install Gyan.FFmpeg      macOS: brew install ffmpeg      Linux: apt install ffmpeg

cd feynman-platform-whisper-api
python -m venv venv
venv\Scripts\activate          # Windows；macOS/Linux 用 source venv/bin/activate
pip install -r requirements.txt

python app.py                  # 首次启动会下载 base 模型（约 140 MB），需要几分钟
```

启动成功后监听 `http://localhost:5001`。自测（另开一个终端）：

```bash
curl -X POST -F "audio=@test.wav" http://localhost:5001/transcribe
# → {"result":"..."}
```

## 快速开始（Docker）

```bash
docker build -t feynman-whisper-api ./feynman-platform-whisper-api
# 想换成 small（更准、更慢、镜像更大）：
docker build --build-arg WHISPER_MODEL=small -t feynman-whisper-api ./feynman-platform-whisper-api
docker run --rm -p 5001:5001 feynman-whisper-api
```

镜像里已经装好 ffmpeg、torch（**CPU 版**）和 `WHISPER_MODEL` 指定的模型（默认 `base`），启动不再联网下载。

> 镜像体积通常会到 GB 级：除了 torch，`openai-whisper` 在 Linux x86_64 上还会连带安装 `triton`，这是它的依赖声明决定的，属正常现象。

和 `docker-compose.yml` 的两个服务配合时注意：**容器里的 `localhost` 指向容器自己**，所以后端要访问宿主机上的本服务时，用宿主机的专用域名（compose 里已经预留好这一行）：

```yaml
environment:
  WHISPER_API_URL: http://host.docker.internal:5001/transcribe
extra_hosts:
  - "host.docker.internal:host-gateway"
```

如果反过来把本服务也放进同一个 compose 网络，则直接写服务名即可：`WHISPER_API_URL: http://whisper:5001/transcribe`。

## 接口契约

| 方法 | 路径 | 请求 | 成功 | 失败 |
| --- | --- | --- | --- | --- |
| POST | `/transcribe` | `multipart/form-data`，字段名固定为 `audio` | `200 {"result": "文字"}` | 没带文件 → `400 {"error": "No audio file provided"}`；转写异常 → `500 {"error": "…"}` |

没有鉴权，默认只应在本机或内网暴露（`app.run(host="0.0.0.0", port=5001)` 是为了让后端容器/局域网能访问）。

每个请求各自落一个临时文件（`tempfile.mkstemp`），转写结束立刻删除，所以并发请求之间不会互相覆盖。（早期版本把文件名写死成 `temp_audio.wav`，两个请求同时进来会互相覆盖，已修。）

## 配置与调参

| 项 | 怎么配 | 说明 |
| --- | --- | --- |
| 模型大小 | 环境变量 `WHISPER_MODEL`（默认 `base`） | `tiny / base / small / medium / large`，越大越准、越慢、越吃内存；CPU 建议 `base`，有 GPU 可上 `small`/`medium` |
| 端口 | 环境变量 `WHISPER_PORT`（默认 `5001`） | 改了端口要同步后端的 `WHISPER_API_URL` |
| 服务地址 | 后端 `.env` 的 `WHISPER_API_URL` | 默认 `http://localhost:5001/transcribe` |

换模型不用改代码：

```bash
WHISPER_MODEL=small python app.py          # Linux / macOS
$env:WHISPER_MODEL="small"; python app.py  # Windows PowerShell
docker build --build-arg WHISPER_MODEL=small -t feynman-whisper-api ./feynman-platform-whisper-api
```

**硬件参考**：CPU 跑 `base` 大约 1~3 倍实时（10 秒音频 ≈ 10~30 秒出结果），吃内存约 1 GB；GPU（CUDA 版 torch）快一个数量级。想用 GPU，把 `requirements.txt` 里的 torch 换成按 <https://pytorch.org> 给的 CUDA 版本命令安装，并且 Docker 需要 `--gpus all`。

## 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 启动报 `ffmpeg` 相关错误 / 转写直接 500 | 系统没装 ffmpeg，或不在 PATH 里（Whisper 用它解码音频） |
| 第一次启动卡很久、没有输出 | 正常：正在下载模型权重；下载完会打印「模型加载完毕！」 |
| `Address already in use` | 5001 被占用（可能已经起过一个 app.py） |
| 容器里调 `localhost:5001` 失败 | 容器内的 localhost 是它自己，改用 `host.docker.internal`（见上） |
| 中文转写结果很差 | `base` 对中文只是「能用」，换 `small`/`medium` 明显更好；也可以先做降噪、用 16 kHz 单声道 wav |
| 后端返回「请确认 Python 服务已在 … 启动」 | 本服务没起、端口不对，或 `WHISPER_API_URL` 配错 |

## 已知限制 / 可选的改进

- 用的是 Flask 自带的开发服务器（单线程、无超时控制），只适合教学与本机使用；要暴露给多人可换 `gunicorn`（Linux）或 `waitress`（Windows）。
- 音频格式/时长没有校验，超长音频会一直占着请求；教学场景够用，生产要加时长上限。
- 只暴露了 `POST /transcribe`，没有健康检查端点：容器编排想知道「模型加载好了没」只能等第一个请求。
