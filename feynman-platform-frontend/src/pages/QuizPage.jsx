// 知识点测评页（09课）
// 流程：选择难度 -> AI 出题 -> 作答 -> 评分（单选前端比对 / 简答 AI 阅卷）-> 错题自动加入复习列表
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/axios';

const DIFFICULTIES = ['基础', '中等', '困难'];
const QUESTION_TYPES = [
  { value: 'single-choice', label: '单选题' },
  { value: 'short-answer', label: '简答题' },
];
// 学习阶段的显示文案与序号（只前进不回退，序号用于比较）
const STATUS_TEXT = { not_started: '未开始', in_progress: '学习中', mastered: '已掌握' };
const STATUS_RANK = { not_started: 0, in_progress: 1, mastered: 2 };

function QuizPage() {
  const { id } = useParams(); // 知识点 ID
  const navigate = useNavigate();

  const [knowledgePoint, setKnowledgePoint] = useState(null);
  const [question, setQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [shortAnswer, setShortAnswer] = useState(''); // 简答题文本
  const [result, setResult] = useState(null); // { isCorrect, explanation }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusUpdated, setStatusUpdated] = useState(null); // 阶段自动流转提示（{from,to}）

  // 1. 加载知识点内容
  useEffect(() => {
    const fetchKp = async () => {
      try {
        const response = await apiClient.get(`/knowledge-points/${id}`);
        setKnowledgePoint(response.data);
      } catch (err) {
        console.error(err);
        setError('加载知识点失败');
      }
    };
    fetchKp();
  }, [id]);

  // 2. 请求 AI 出题
  const fetchQuestion = async (difficulty, type = 'single-choice') => {
    if (!knowledgePoint) return;
    setIsLoading(true);
    setQuestion(null);
    setResult(null);
    setSelectedOption('');
    setShortAnswer('');
    setError('');
    setStatusUpdated(null);
    try {
      const response = await apiClient.post('/ai/generate-question', {
        knowledgePointContent: knowledgePoint.content,
        difficulty,
        type,
      });
      setQuestion(response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.msg || 'AI 出题失败，请检查 AI 服务配置');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 更新知识点复习状态（答错时调用）
  const updateReviewStatus = async (needsReview) => {
    try {
      await apiClient.put(`/knowledge-points/${id}`, { reviewList: needsReview });
    } catch (error) {
      console.error('更新复习状态失败', error);
    }
  };

  // 3.5 答对后把「未开始」推进为「学习中」（只前进不回退；简答题由后端推进，这里只处理前端比对的单选）
  const advanceOnCorrect = async () => {
    if ((STATUS_RANK[knowledgePoint?.status] ?? 0) >= STATUS_RANK.in_progress) return;
    try {
      const response = await apiClient.put(`/knowledge-points/${id}`, { status: 'in_progress' });
      setKnowledgePoint(response.data);
      setStatusUpdated({ from: 'not_started', to: 'in_progress' });
    } catch (err) {
      console.error('自动更新学习阶段失败', err);
    }
  };

  // 4. 提交答案：单选前端直接比对；简答调用 AI 阅卷
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (question.type === 'single-choice') {
      if (!selectedOption) {
        alert('请选择一个答案！');
        return;
      }
      const isCorrect = selectedOption === question.answer;
      setResult({ isCorrect, explanation: question.explanation });
      if (isCorrect) await advanceOnCorrect();
      else await updateReviewStatus(true);
    } else {
      if (!shortAnswer.trim()) {
        alert('请输入你的回答！');
        return;
      }
      setIsLoading(true);
      setError('');
      try {
        const response = await apiClient.post('/ai/grade-answer', {
          question: question.question,
          answerKeyPoints: question.answer_key_points,
          studentAnswer: shortAnswer,
          knowledgePointId: id, // 答对时后端会把学习阶段推进到「学习中」
        });
        setResult(response.data);
        setStatusUpdated(response.data.statusUpdated || null);
        if (!response.data.isCorrect) await updateReviewStatus(true);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.msg || 'AI 评分失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!knowledgePoint) return <p className="status-text">{error || '加载知识点信息...'}</p>;

  return (
    <div className="quiz-page">
      <div className="list-header">
        <h1 className="page-title">知识点测评：{knowledgePoint.title}</h1>
        <Link to="/" className="btn btn-plain">返回主页</Link>
      </div>

      {/* 难度与题型选择 */}
      <section className="record-card">
        <p>选择难度：</p>
        <div className="quiz-options">
          {DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty}
              className="btn btn-plain"
              onClick={() => fetchQuestion(difficulty, question?.type || 'single-choice')}
            >
              {difficulty}
            </button>
          ))}
        </div>
        <p>选择题型：</p>
        <div className="quiz-options">
          {QUESTION_TYPES.map((type) => (
            <button
              key={type.value}
              className="btn btn-plain"
              onClick={() => fetchQuestion(question?.difficulty || '基础', type.value)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </section>

      <hr />

      {isLoading && <p className="status-text">AI正在出题/阅卷中...</p>}
      {error && <p className="status-text form-error">{error}</p>}

      {/* 答题区 */}
      {question && !result && (
        <section className="record-card">
          <h3>
            [{question.type === 'single-choice' ? '单选题' : '简答题'} · {question.difficulty}]
            {question.question}
          </h3>

          {question.type === 'single-choice' ? (
            <form onSubmit={handleSubmit}>
              <div className="quiz-option-list">
                {Object.entries(question.options || {}).map(([key, value]) => (
                  <div key={key} className="quiz-option">
                    <input
                      type="radio"
                      id={`option-${key}`}
                      name="option"
                      value={key}
                      checked={selectedOption === key}
                      onChange={(e) => setSelectedOption(e.target.value)}
                    />
                    <label htmlFor={`option-${key}`}>
                      <strong>{key}.</strong> {value}
                    </label>
                  </div>
                ))}
              </div>
              <button type="submit" className="btn">提交答案</button>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              <textarea
                className="quiz-textarea"
                rows={5}
                placeholder="在这里写下你的回答..."
                value={shortAnswer}
                onChange={(e) => setShortAnswer(e.target.value)}
              />
              <button type="submit" className="btn">提交给 AI 阅卷</button>
            </form>
          )}
        </section>
      )}

      {/* 测评结果区 */}
      {result && (
        <section className="record-card">
          <h2>测评结果</h2>
          <p className={`quiz-result-text ${result.isCorrect ? 'quiz-correct' : 'quiz-wrong'}`}>
            {result.isCorrect ? '回答正确！' : '回答错误！'}
          </p>
          {question.type === 'single-choice' && (
            <p><strong>正确答案是: {question.answer}</strong></p>
          )}
          <p><strong>解释:</strong> {result.explanation}</p>
          {statusUpdated && (
            <p className="status-notice">
              ✅ 学习阶段已自动更新：{STATUS_TEXT[statusUpdated.from]} → {STATUS_TEXT[statusUpdated.to]}
            </p>
          )}
          {!result.isCorrect && (
            <p className="review-notice">该知识点已加入你的复习列表。</p>
          )}
          <div className="record-actions">
            <button className="btn" onClick={() => fetchQuestion(question.difficulty, question.type)}>
              再来一题
            </button>
            <button className="btn btn-plain" onClick={() => navigate('/')}>返回主页</button>
          </div>
        </section>
      )}
    </div>
  );
}

export default QuizPage;
