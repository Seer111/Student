# 本地 Whisper 语音转文字服务（7.5课 进阶：AI能力自主化）
# 功能：将音频文件转换为文字，完全本地运行，数据不出本机，替代百度云 ASR。
#
# 使用步骤：
#   1. 安装 Python 3.10+，创建虚拟环境并安装依赖：
#        python -m venv venv
#        venv\Scripts\activate        (Windows) / source venv/bin/activate (macOS/Linux)
#        pip install -r requirements.txt      （系统还需先装好 ffmpeg）
#   2. 启动服务（首次启动会自动下载模型，需要几分钟）：
#        python app.py
#        # 换模型：WHISPER_MODEL=small python app.py
#        #   Windows PowerShell: $env:WHISPER_MODEL="small"; python app.py
#   3. 服务默认运行在 http://localhost:5001
#   4. Node.js 后端已内置转发接口：POST /api/audio/transcribe-local（见 whisperController.js）
from flask import Flask, request, jsonify
import whisper
import os
import tempfile

app = Flask(__name__)

# 模型可选：tiny / base / small / medium / large（越大越准，但越慢、越占内存）
# CPU 环境建议 base；有 GPU 的环境可以用 small/medium
# 用环境变量 WHISPER_MODEL 覆盖（默认 base）：容器/CI 里不用改代码就能换模型
MODEL_NAME = os.environ.get("WHISPER_MODEL", "base")

# 识别语言：本平台是中文界面，默认按普通话识别。
# 不指定时会自动检测，但 base 模型对短音频容易判成粤语/日语，中文识别质量更差。
# 想转英文（或让模型自己判断）时把 WHISPER_LANGUAGE 设成 en / auto。
WHISPER_LANGUAGE = os.environ.get("WHISPER_LANGUAGE", "zh")

# 中文提示词：给模型一个「用简体中文、带标点」的锚点。
# 实测不加时 base 模型会输出繁体 + 同音错字（闭包→B-BOW、函数→寒術、变量→辨諒），
# 加上之后同一段音频的用词和标点都明显更接近原文。
INITIAL_PROMPT = "以下是普通话的句子，使用简体中文，并加上标点符号。"

# 加载模型（比较慢，只在启动时执行一次）
print(f"正在加载 Whisper 模型（{MODEL_NAME}）...")
model = whisper.load_model(MODEL_NAME)
print("模型加载完毕！")


@app.route("/transcribe", methods=["POST"])
def transcribe_audio():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]

    # Whisper 需要从磁盘读文件，先落一个临时文件。
    # 每个请求各自一份（此前写死 temp_audio.wav，并发请求会互相覆盖、转出别人的内容）。
    fd, temp_path = tempfile.mkstemp(prefix="whisper_", suffix=".wav")
    os.close(fd)

    try:
        audio_file.save(temp_path)
        # 使用 Whisper 进行转录
        # language=zh 固定普通话；auto 则交给模型自动检测
        transcribe_kwargs = {}
        if WHISPER_LANGUAGE and WHISPER_LANGUAGE != "auto":
            transcribe_kwargs["language"] = WHISPER_LANGUAGE
        # 仅在中文场景给提示词（英文等其它语言给中文提示反而会带偏）
        if WHISPER_LANGUAGE.startswith("zh"):
            transcribe_kwargs["initial_prompt"] = INITIAL_PROMPT
        result = model.transcribe(temp_path, **transcribe_kwargs)
        print("转录结果:", result["text"])
        return jsonify({"result": result["text"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # 无论成功与否都清理临时文件
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    # 0.0.0.0 允许局域网内其他设备（如 Node.js 后端）访问
    app.run(host="0.0.0.0", port=int(os.environ.get("WHISPER_PORT", "5001")))
