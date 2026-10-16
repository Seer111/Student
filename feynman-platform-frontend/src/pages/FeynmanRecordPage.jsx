// 费曼复述页（07课 + 08课）
// 核心流程：录音 -> 上传 -> 语音转文字 -> AI 润色与评价 -> 保存复述记录
import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/axios';
import useAudioRecorder from '../hooks/useAudioRecorder';

// 学习阶段文案（后端在评分后可能自动推进阶段，返回 {from,to} 供这里提示）
const STATUS_TEXT = { not_started: '未开始', in_progress: '学习中', mastered: '已掌握' };

function FeynmanRecordPage() {
  const { id } = useParams(); // 知识点 ID
  const [knowledgePoint, setKnowledgePoint] = useState(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [transcribeError, setTranscribeError] = useState('');

  // AI 反馈相关状态（08课）
  const [aiFeedback, setAiFeedback] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluateError, setEvaluateError] = useState('');

  // 历史复述记录（07课课后作业）
  const [attempts, setAttempts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // 引用关系（12课）：本知识点引用了谁、被谁引用
  const [relations, setRelations] = useState(null);
  useEffect(() => {
    const fetchRelations = async () => {
      try {
        const response = await apiClient.get(`/knowledge-points/${id}/references`);
        setRelations(response.data);
      } catch (err) {
        console.error('加载引用关系失败', err);
        setRelations({ outgoing: [], incoming: [] });
      }
    };
    fetchRelations();
  }, [id]);

  const { status, audioUrl, startRecording, stopRecording } = useAudioRecorder();

  // 录音计时器
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  useEffect(() => {
    if (status === 'recording') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  // 1. 加载知识点信息与历史复述记录
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [kpResponse, attemptsResponse] = await Promise.all([
          apiClient.get(`/knowledge-points/${id}`),
          apiClient.get(`/attempts/kp/${id}`),
        ]);
        setKnowledgePoint(kpResponse.data);
        setAttempts(attemptsResponse.data);
      } catch (error) {
        console.error('加载知识点信息失败', error);
      }
    };
    fetchData();
  }, [id]);

  // 2. 停止录音后自动上传转录
  const handleStopAndTranscribe = async () => {
    const recording = await stopRecording();
    if (!recording) return;

    setIsUploading(true);
    setTranscribedText('');
    setTranscribeError('');
    setAiFeedback(null);
    try {
      const audioFile = new File([recording.blob], `feynman-record-${id}.wav`, { type: 'audio/wav' });
      const formData = new FormData();
      formData.append('audio', audioFile); // 字段名必须与后端 multer 配置一致
      formData.append('knowledgePointId', id);

      const response = await apiClient.post('/audio/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTranscribedText(response.data.result);
    } catch (error) {
      console.error('上传或转录失败', error);
      setTranscribeError(error.response?.data?.msg || '转录失败，请重试。');
    } finally {
      setIsUploading(false);
    }
  };

  // 3. 获取 AI 评价（08课）
  const getAiEvaluation = async () => {
    if (!transcribedText) return;
    setIsEvaluating(true);
    setAiFeedback(null);
    setEvaluateError('');
    try {
      const response = await apiClient.post('/ai/evaluate', {
        originalContent: knowledgePoint.content,
        transcribedText,
        knowledgePointId: id, // 评分过低时后端会自动把知识点加入复习列表
      });
      setAiFeedback(response.data);
    } catch (error) {
      console.error('获取AI评价失败', error);
      setEvaluateError(error.response?.data?.msg || 'AI 评价失败，请稍后重试。');
    } finally {
      setIsEvaluating(false);
    }
  };

  // 4. 保存复述记录（07课课后作业）
  const saveAttempt = async () => {
    if (!transcribedText) return;
    setIsSaving(true);
    try {
      const response = await apiClient.post('/attempts', {
        knowledgePointId: id,
        transcribedText,
        aiFeedback: aiFeedback || undefined,
      });
      setAttempts([response.data, ...attempts]);
      alert('复述记录已保存！');
    } catch (error) {
      console.error('保存复述失败', error);
      alert(error.response?.data?.msg || '保存失败，请稍后再试');
    } finally {
      setIsSaving(false);
    }
  };

  if (!knowledgePoint) return <p className="status-text">加载中...</p>;

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="record-page">
      <div className="list-header">
        <h1 className="page-title">复述知识点：{knowledgePoint.title}</h1>
        <Link to="/" className="btn btn-plain">返回主页</Link>
      </div>

      {/* 录音区 */}
      <section className="record-card">
        <h2>第一步：用自己的话复述这个知识点</h2>
        <div className="record-controls">
          {status === 'idle' ? (
            <button className="btn btn-record" onClick={startRecording}>开始录音</button>
          ) : (
            <>
              <span className="record-timer">录音中... {formatTime(elapsed)}</span>
              <button className="btn btn-danger" onClick={handleStopAndTranscribe}>停止并转文字</button>
            </>
          )}
        </div>
        {status === 'recording' && <p className="status-text">请对着麦克风大声说出你对这个知识点的理解</p>}

        {/* 录音回放 */}
        {audioUrl && (
          <div className="audio-playback">
            <p>回放录音：</p>
            <audio src={audioUrl} controls />
          </div>
        )}
      </section>

      {/* 转录结果区 */}
      <section className="record-card">
        <h2>第二步：AI 转录结果</h2>
        {isUploading && <p className="status-text">正在上传并转录，请稍候...</p>}
        {transcribeError && <p className="status-text form-error">{transcribeError}</p>}
        <div className="transcript-box">
          {transcribedText || (isUploading ? '（转录中...）' : '（停止录音后，转录文字将显示在这里）')}
        </div>

        {transcribedText && (
          <div className="record-actions">
            <button className="btn" onClick={getAiEvaluation} disabled={isEvaluating}>
              {isEvaluating ? 'AI 教练正在批阅...' : '获取 AI 评价'}
            </button>
            <button className="btn btn-plain" onClick={saveAttempt} disabled={isSaving}>
              {isSaving ? '保存中...' : '保存复述'}
            </button>
          </div>
        )}
      </section>

      {/* AI 反馈区（08课） */}
      <section className="record-card">
        <h2>第三步：AI 教练反馈</h2>
        {isEvaluating && <p className="status-text">AI教练正在批阅您的答卷...</p>}
        {evaluateError && <p className="status-text form-error">{evaluateError}</p>}
        {aiFeedback && (
          <div className="ai-feedback">
            <div className="ai-feedback-main">
              <div className="ai-feedback-header">
                <h3>AI 润色后的文本</h3>
                <span className="llm-provider">服务提供方: {aiFeedback.provider || '未知'}</span>
              </div>
              <p className="ai-polished">{aiFeedback.polishedText}</p>

              <h3>综合评价</h3>
              <p>{aiFeedback.evaluation}</p>

              <h3>优点 👍</h3>
              <ul>
                {aiFeedback.strengths.map((item, index) => <li key={index}>{item}</li>)}
              </ul>

              <h3>待改进 👇</h3>
              <ul>
                {aiFeedback.weaknesses.map((item, index) => <li key={index}>{item}</li>)}
              </ul>

              {aiFeedback.autoAddedToReview && (
                <p className="review-notice">⚠️ 本次评分低于 60 分，该知识点已自动加入你的复习列表。</p>
              )}

              {aiFeedback.statusUpdated && (
                <p className="status-notice">
                  ✅ 学习阶段已自动更新：{STATUS_TEXT[aiFeedback.statusUpdated.from]} →{' '}
                  {STATUS_TEXT[aiFeedback.statusUpdated.to]}
                </p>
              )}
            </div>
            <div className="ai-feedback-score">
              <h3>综合得分</h3>
              <div className={`score-number ${aiFeedback.score > 80 ? 'score-good' : 'score-mid'}`}>
                {aiFeedback.score}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 引用关系（12课）：我引用了谁 / 谁引用了我 */}
      <section className="record-card">
        <h2>关联的知识点</h2>
        {relations === null ? (
          <p className="status-text">正在加载引用关系...</p>
        ) : (
          <>
            <div className="relation-grid">
              <div>
                <h3>我引用了（{relations.outgoing.length}）</h3>
                {relations.outgoing.length === 0 ? (
                  <p className="ref-empty">还没有引用其它知识点。</p>
                ) : (
                  <ul className="relation-list">
                    {relations.outgoing.map((item) => (
                      <li key={item._id}>
                        <Link to={`/feynman/${item._id}`} className="relation-link">
                          {item.title}
                        </Link>
                        <span className={`ref-status ref-status-${item.status}`}>
                          {STATUS_TEXT[item.status] || item.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3>被引用（{relations.incoming.length}）</h3>
                {relations.incoming.length === 0 ? (
                  <p className="ref-empty">还没有别的知识点引用它。</p>
                ) : (
                  <ul className="relation-list">
                    {relations.incoming.map((item) => (
                      <li key={item._id}>
                        <Link to={`/feynman/${item._id}`} className="relation-link">
                          {item.title}
                        </Link>
                        <span className={`ref-status ref-status-${item.status}`}>
                          {STATUS_TEXT[item.status] || item.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <p className="relation-hint">
              引用是手动建立的：在知识点编辑页勾选「引用」，或在 2D 知识图谱里从一个节点拖到另一个节点。
            </p>
          </>
        )}
      </section>

      {/* 历史复述记录 */}
      <section className="record-card">
        <h2>历史复述记录（{attempts.length}）</h2>
        {attempts.length === 0 ? (
          <p className="status-text">还没有保存过复述记录</p>
        ) : (
          <ul className="attempt-list">
            {attempts.map((attempt) => (
              <li key={attempt._id} className="attempt-item">
                <div className="attempt-meta">
                  <span>{new Date(attempt.createdAt).toLocaleString()}</span>
                  {attempt.aiFeedback?.score !== undefined && (
                    <span className="kp-status">得分: {attempt.aiFeedback.score}</span>
                  )}
                </div>
                <p>{attempt.transcribedText}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default FeynmanRecordPage;
