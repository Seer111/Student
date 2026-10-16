// Markdown 渲染组件：统一处理 Markdown / GFM / LaTeX / Mermaid
// 安全说明（XSS 三道防线）：
//   1) 未启用 rehype-raw，react-markdown 不会把正文里的原始 HTML 渲染成 DOM（只当纯文本处理），
//      且它默认的 urlTransform 只放行 http/https/mailto 等安全协议，javascript: 一律被清洗；
//      这里再显式打开 skipHtml，把 HTML 节点直接丢弃 —— 即使以后有人加上 rehype-raw 也不会失守；
//   2) Mermaid 生成的 SVG 额外经过 DOMPurify 消毒（见 MermaidRenderer），作为双重保险；
//   3) 外链统一补 rel="noreferrer noopener"，避免被反向控制 window.opener。
// 为什么不引入 rehype-sanitize：它的默认 schema 会把 KaTeX 输出的标记一起剥掉，需要自己维护一份
// 自定义 schema；在“原始 HTML 本来就不渲染”的前提下，收益为负、维护成本为正。
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
      skipHtml
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
        // 外链加固：新窗口打开并切断 opener 引用；只取 href/children，
        // 避免把 react-markdown 内部的 node 等字段透传到真实 DOM 上
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default MarkdownRenderer;
