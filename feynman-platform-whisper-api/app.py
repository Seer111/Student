# 本地 Whisper 语音转文字服务（7.5课 进阶：AI能力自主化）
# 功能：将音频文件转换为文字，完全本地运行，数据不出本机，替代百度云 ASR。
#
# 使用步骤：
#   1. 安装 Python 3.8+，创建虚拟环境并安装依赖：
#        python -m venv venv
#        venv\Scripts\activate        (Windows) / source venv/bin/activate (macOS/Linux)
#        pip install flask openai-whisper torch
#   2. 启动服务（首次启动会自动下载模型，需要几分钟）：
#        python app.py
#   3. 服务默认运行在 http://localhost:5001
#   4. Node.js 后端已内置转发接口：POST /api/audio/transcribe-local（见 whisperController.js）
from flask import Flask, request, jsonify
import whisper
import os

app = Flask(__name__)

# 加载模型（比较慢，只在启动时执行一次）
# 模型可选：tiny / base / small / medium / large（越大越准，但越慢、越占内存）
# CPU 环境建议 base；有 GPU 的环境可以用 small/medium
print("正在加载 Whisper 模型...")
model = whisper.load_model("base")
print("模型加载完毕！")


@app.route("/transcribe", methods=["POST"])
def transcribe_audio():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]

    # Whisper 需要读取文件，先保存为临时文件
    temp_path = "temp_audio.wav"
    audio_file.save(temp_path)

    try:
        # 使用 Whisper 进行转录（默认自动检测语言）
        result = model.transcribe(temp_path)
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
    app.run(host="0.0.0.0", port=5001)
