// AI 助手问答页（11课 RAG）
// 与私有知识库对话：后端先向量检索用户知识点的相关内容，再由 LLM 生成回答
// 界面口径（批次 18）：一个主操作（发送）、助手回答走 Markdown 渲染、引用来源可点回知识点详情
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/axios';
import MarkdownRenderer from '../components/MarkdownRenderer.jsx';
import './AgentPage.css';

// 空态示例问题：直接点一下就能发，省掉「我该问什么」的犹豫
const EXAMPLE_QUESTIONS = [
  '闭包和作用域链有什么区别？',
  'Promise 和 async/await 是什么关系？',
  'HTTP 缓存有哪几种，分别什么时候用？',
];

const WELCOME_TEXT = '你好，我是你的知识库助手。我只依据你创建的知识点回答，并在每条回答下面列出用到的知识点。';

function AgentPage() {
  const [messages, setMessages] = useState([{ sender: 'bot', text: WELCOME_TEXT, sources: null }]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const ask = async (question) => {
    if (!question || isLoading) return;

    setMessages((prev) => [...prev, { sender: 'user', text: question }]);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/ai/rag-qa', { question });
      const { answer, sources } = response.data;
      setMessages((prev) => [...prev, { sender: 'bot', text: answer, sources }]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: error.response?.data?.msg || '抱歉，我遇到了一些问题，请稍后再试。',
          sources: null,
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const question = inputValue.trim();
    if (!question) return;
    setInputValue('');
    ask(question);
  };

  const handleExample = (question) => {
    setInputValue('');
    ask(question);
  };

  // 只有欢迎语时展示示例问题（对话开始后就不占地方了）
  const showExamples = messages.length === 1 && !isLoading;

  return (
    <div className="agent-page">
      <header className="agent-header">
        <h1 className="page-title">AI 知识库助手</h1>
        <p className="agent-hint">基于你的私有知识点做检索增强回答（RAG），每条回答都会列出依据</p>
      </header>

      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            {msg.sender === 'bot' ? (
              <div className="message-bubble markdown-content">
                <MarkdownRenderer content={msg.text} />
              </div>
            ) : (
              <div className="message-bubble">{msg.text}</div>
            )}

            {/* 引用来源：可点回知识点详情（以前只是一串不可点的灰标签） */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="message-sources">
                <span className="message-sources-label">依据</span>
                {msg.sources.map((source, i) => (
                  <Link
                    key={i}
                    to={`/feynman/${source.knowledgePointId}`}
                    className="source-tag"
                    title={source.excerpt}
                  >
                    {source.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        {showExamples && (
          <div className="agent-examples">
            <span className="agent-examples-label">可以这样问</span>
            {EXAMPLE_QUESTIONS.map((question) => (
              <button key={question} type="button" className="agent-example" onClick={() => handleExample(question)}>
                {question}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="message bot">
            <div className="message-bubble message-typing">
              <span className="typing-dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="visually-hidden">正在检索你的知识点并生成回答</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="问一个你知识点里的概念…"
          aria-label="向知识库提问"
          disabled={isLoading}
        />
        <button type="submit" className="agent-send" disabled={isLoading || !inputValue.trim()}>
          {isLoading ? '检索中…' : '发送'}
        </button>
      </form>
    </div>
  );
}

export default AgentPage;
