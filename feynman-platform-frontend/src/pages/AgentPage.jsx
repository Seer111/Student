// AI 助手问答页（11课 RAG）
// 与私有知识库对话：后端先向量检索用户知识点的相关内容，再由 LLM 生成回答
import { useState, useRef, useEffect } from 'react';
import apiClient from '../api/axios';
import './AgentPage.css';

function AgentPage() {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '你好！我是你的专属知识库AI助手。我会基于你创建的知识点来回答问题，有什么可以帮你的吗？', sources: null },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const question = inputValue.trim();
    if (!question || isLoading) return;

    setMessages((prev) => [...prev, { sender: 'user', text: question }]);
    setInputValue('');
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
    }
  };

  return (
    <div className="agent-page">
      <div className="agent-header">
        <h1>AI 知识库助手</h1>
        <span className="agent-hint">基于你的私有知识点库回答（RAG 检索增强生成）</span>
      </div>

      <div className="chat-window">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <div className="message-bubble">{msg.text}</div>
            {/* 引用来源：增强回答可信度（11课选做扩展） */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="message-sources">
                <span>参考知识点：</span>
                {msg.sources.map((source, i) => (
                  <span key={i} className="source-tag">{source.title}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message bot">
            <div className="message-bubble typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="在这里输入你的问题..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? '思考中...' : '发送'}
        </button>
      </form>
    </div>
  );
}

export default AgentPage;
