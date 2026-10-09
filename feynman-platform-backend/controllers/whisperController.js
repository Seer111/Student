// 本地 Whisper 控制器（7.5课 进阶：AI能力自主化）
// 方案：将上传的音频转发给本地部署的 Python Whisper API 服务（见 feynman-platform-whisper-api/app.py），
//       实现完全离线、数据不出本机的语音转文字，替代百度云 API。
// 注意：这是可选方案，默认路由仍使用百度 ASR（controllers/baiduAiController.js）。
const WHISPER_API_URL = process.env.WHISPER_API_URL || 'http://localhost:5001/transcribe';

exports.transcribeAudioLocal = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No audio file uploaded.' });
  }

  try {
    // Node 18+ 内置 FormData / Blob / fetch，可直接转发文件而无需额外依赖
    const formData = new FormData();
    formData.append('audio', new Blob([req.file.buffer], { type: 'audio/wav' }), 'audio.wav');

    const response = await fetch(WHISPER_API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Whisper 服务返回 ${response.status}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();
    console.log('Local Whisper Result:', JSON.stringify(data).slice(0, 300));
    res.json({ result: data.result, provider: 'local-whisper' });
  } catch (error) {
    console.error('Error calling local Whisper API:', error.message);
    res.status(500).json({
      msg: `本地 Whisper 转录失败（请确认 Python 服务已在 ${WHISPER_API_URL} 启动）`,
      detail: error.message,
    });
  }
};
