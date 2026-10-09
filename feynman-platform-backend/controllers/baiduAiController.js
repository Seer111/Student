// 百度 AI 控制器（07课）：语音识别（ASR）
// 说明：直接调用百度短语音识别 REST API，使用千帆 API Key（bce-v3/ 前缀）Bearer 鉴权，
//       与 LLM/Embedding 共用同一个 QIANFAN_API_KEY，无需再单独申请语音应用的 Key。
const axios = require('axios');

// 百度语音识别相关配置
const BAIDU_ASR_URL = 'https://vop.baidu.com/server_api';
const DEV_PID = 1537; // 1537 = 普通话(纯中文识别)模型（推荐）；追求速度可换极速版 80001 + pro_api

/**
 * 语音转文字：接收 multer 上传的音频 buffer，返回识别出的文字
 * 音频要求：wav 格式、16000 采样率、单声道（前端录音 hook 已按此规格生成）
 * 鉴权：Authorization: Bearer <QIANFAN_API_KEY>
 */
exports.transcribeAudio = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No audio file uploaded.' });
  }

  const apiKey = process.env.QIANFAN_API_KEY;
  if (!apiKey) {
    return res.status(502).json({ msg: '百度千帆 QIANFAN_API_KEY 未配置' });
  }

  try {
    const speech = req.file.buffer.toString('base64'); // 音频二进制转 base64

    const response = await axios.post(
      BAIDU_ASR_URL,
      {
        format: 'wav',
        rate: 16000,
        channel: 1,
        cuid: 'feynman-platform', // 用户唯一标识，教学项目用固定值
        dev_pid: DEV_PID, // 识别模型：1537 普通话
        len: req.file.buffer.length, // 原始音频字节数
        speech,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 60000,
      },
    );

    const result = response.data;
    console.log('Baidu ASR Result:', JSON.stringify(result).slice(0, 500));

    if (result.err_no === 0 && Array.isArray(result.result) && result.result.length > 0) {
      // 成功：result.result 是识别结果数组，取第一段文本
      res.json({ result: result.result[0] });
    } else if (result.err_no === 3301) {
      // 3301 = 音频质量过差无法识别
      res.status(422).json({ msg: '音频质量过差，未能识别出内容，请重新录音', error: result.err_msg });
    } else {
      res.status(500).json({ msg: 'Baidu ASR service error', error: result });
    }
  } catch (error) {
    console.error('Error calling Baidu ASR API:', error.response?.data || error.message);
    res.status(500).json({ msg: 'Server error during transcription.' });
  }
};
