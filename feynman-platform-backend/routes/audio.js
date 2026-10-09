// 音频路由（07课 & 7.5课）：接收上传的音频文件并转文字
const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const { transcribeAudio } = require('../controllers/baiduAiController');
const { transcribeAudioLocal } = require('../controllers/whisperController');

// 配置 multer：使用内存存储，音频只是临时中转给 AI 服务，无需落盘
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 限制 10MB，防止异常大文件
});

// @route   POST /api/audio/transcribe
// @desc    上传音频并用百度语音识别转文字（主方案）
// @access  Private
// 'audio' 字段名必须与前端 FormData.append 的字段名一致
router.post('/transcribe', auth, upload.single('audio'), transcribeAudio);

// @route   POST /api/audio/transcribe-local
// @desc    上传音频并转发给本地 Whisper 服务转文字（7.5课进阶方案，需自行启动 Python 服务）
// @access  Private
router.post('/transcribe-local', auth, upload.single('audio'), transcribeAudioLocal);

module.exports = router;
