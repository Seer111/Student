// Mermaid 图表渲染组件：把 ```mermaid 代码块转换为 SVG 图表
// 实现要点：mermaid.render 是异步 API（返回 Promise），需在 useEffect 中调用
import { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

// 全局初始化一次：关闭自动渲染，由组件手动触发；securityLevel 使用严格模式
mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });

// 自增 id：mermaid.render 需要页面内唯一的元素 id
let uid = 0;

function MermaidRenderer({ code }) {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let cancelled = false;
    const id = `mermaid-svg-${++uid}`;

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (!cancelled) {
          // DOMPurify 消毒：过滤 SVG 中潜在的危险内容，作为安全双重保险
          setSvg(DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } }));
        }
      })
      .catch((err) => {
        console.error('Mermaid 渲染失败:', err);
        if (!cancelled) setSvg('');
      });

    return () => {
      cancelled = true; // 组件卸载后不再更新状态
    };
  }, [code]);

  if (!svg) {
    // 渲染中或语法错误：退化为展示源码，保证内容不丢失
    return <pre className="mermaid-fallback">{code}</pre>;
  }

  return <div className="mermaid-container" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default MermaidRenderer;
