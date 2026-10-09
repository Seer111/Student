// 录音 Hook（07课）：封装 MediaStream + AudioContext，录制并生成 WAV 音频
// 说明：百度短语音识别要求 wav 格式、16000 采样率、单声道。
//       浏览器 MediaRecorder 只能产出 webm/opus，无法被百度直接识别，
//       因此这里使用 AudioContext 在录音时实时采集 PCM 数据，停止后手动封装成 WAV。
import { useRef, useState, useCallback } from 'react';

const SAMPLE_RATE = 16000; // 采样率：与后端百度 ASR 参数保持一致

export default function useAudioRecorder() {
  // 录音状态：idle 空闲 / recording 录音中
  const [status, setStatus] = useState('idle');
  const [audioUrl, setAudioUrl] = useState(null); // 停止后的可回放地址

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const chunksRef = useRef([]); // 收集到的 Float32 采样块

  /**
   * 把 Float32 采样数组封装为 WAV 文件（PCM 16bit 单声道）
   * WAV 文件 = 44 字节头部 + 原始 PCM 数据
   */
  const encodeWav = (floatSamples) => {
    const buffer = new ArrayBuffer(44 + floatSamples.length * 2);
    const view = new DataView(buffer);

    // 写入字符串工具
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // --- WAV 文件头 ---
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + floatSamples.length * 2, true); // 文件总长 - 8
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt 块长度
    view.setUint16(20, 1, true); // 音频格式：1 = PCM
    view.setUint16(22, 1, true); // 声道数：单声道
    view.setUint32(24, SAMPLE_RATE, true); // 采样率
    view.setUint32(28, SAMPLE_RATE * 2, true); // 字节率 = 采样率 * 声道数 * 位深/8
    view.setUint16(32, 2, true); // 块对齐
    view.setUint16(34, 16, true); // 位深：16bit
    writeString(36, 'data');
    view.setUint32(40, floatSamples.length * 2, true); // 数据长度

    // --- PCM 数据：Float32 [-1, 1] -> Int16 ---
    let offset = 44;
    for (let i = 0; i < floatSamples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, floatSamples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  /** 开始录音（需在用户点击事件中触发，以满足浏览器自动播放/麦克风策略） */
  const startRecording = useCallback(async () => {
    if (status === 'recording') return;

    // 1. 请求麦克风权限，指定单声道与采样率
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, sampleRate: SAMPLE_RATE },
    });
    streamRef.current = stream;

    // 2. 创建 AudioContext 并指定采样率
    const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);

    // 3. ScriptProcessorNode：实时采集 PCM 数据块
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    chunksRef.current = [];
    processor.onaudioprocess = (event) => {
      // event.inputBuffer 是 Float32Array，直接拷贝一份留存（buffer 会被复用）
      chunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };

    source.connect(processor);
    processor.connect(audioContext.destination); // 需要连接 destination 才会触发 onaudioprocess
    processorRef.current = processor;

    setAudioUrl(null);
    setStatus('recording');
  }, [status]);

  /** 停止录音，返回 { blob, url } 供上传与回放 */
  const stopRecording = useCallback(async () => {
    if (status !== 'recording') return null;

    // 1. 断开并释放音频资源
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());

    // 2. 合并所有采样块并封装为 WAV
    const totalLength = chunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunksRef.current) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    chunksRef.current = [];

    const blob = encodeWav(merged);
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setStatus('idle');
    return { blob, url };
  }, [status]);

  /** 取消录音（丢弃数据） */
  const cancelRecording = useCallback(async () => {
    await stopRecording();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  }, [stopRecording, audioUrl]);

  return { status, audioUrl, startRecording, stopRecording, cancelRecording };
}
