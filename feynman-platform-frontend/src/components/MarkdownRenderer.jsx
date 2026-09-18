// Markdown 渲染组件：统一处理 Markdown / GFM / LaTeX / Mermaid
// 安全说明：react-markdown 默认不渲染原始 HTML，天然免疫大部分 XSS 攻击；
// Mermaid 生成的 SVG 额外经过 DOMPurify 消毒（见 MermaidRenderer），作为双重保险
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import MermaidRenderer from './MermaidRenderer.jsx';

function MarkdownRenderer({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        // 自定义代码块渲染：识别 ```mermaid 代码块，交给 MermaidRenderer 绘制图表
        code(props) {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || '');
          if (match && match[1] === 'mermaid') {
            return <MermaidRenderer code={String(children).replace(/\n$/, '')} />;
          }
          // 普通代码：保持默认渲染
          return (
            <code className={className} {...rest}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default MarkdownRenderer;
