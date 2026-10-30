// 与 Markdown 正文相关的纯函数（不依赖 React、不依赖浏览器 API，可以直接单测）。

/**
 * 剔除正文开头与知识点标题重复的一级/二级标题。
 *
 * 为什么需要：实测 11 个知识点里有 10 个正文首行就是 `# <标题>`，于是卡片头部 h2 与正文 h1
 * 会相邻出现两个同名标题。这里只在“渲染前”去掉首个非空行，不改数据、不改接口——
 * 换页面、换数据、把同一份内容渲染到别处都不受影响。
 *
 * @param {string} content - 原始 Markdown 正文
 * @param {string} title - 卡片头部显示的标题
 * @returns {string} - 可直接交给 MarkdownRenderer 的正文
 */
export function stripLeadingTitle(content, title) {
  if (!content) return '';
  const target = String(title || '').trim();
  if (!target) return content;

  const lines = String(content).split('\n');
  const firstIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstIndex === -1) return '';

  // 全角空格容错：手工写的内容里「# + 全角空格 + 标题」也常见，这里先统一换成半角再匹配
  const heading = lines[firstIndex].replace(/\u3000/g, ' ').trim();
  const match = /^#{1,2}\s+(.+)$/.exec(heading);
  if (match && match[1].trim() === target) {
    lines.splice(firstIndex, 1);
    return lines.join('\n');
  }
  return content;
}

/**
 * 生成列表卡片里的「纯文本摘要」。
 *
 * 为什么不再直接把 Markdown 渲染进折叠容器：折叠容器只能按像素裁高度，
 * 裁切点落在行中间时文字会被切掉半行、落在代码块中间时代码块看起来像被截断（批次 27 修的正是这个）。
 * 摘要是纯文本：先去掉代码块、标题符号、强调符号，再压成一行，由 CSS 做整行裁切（line-clamp），
 * 无论窗口多宽都不会切在半个字上。
 *
 * @param {string} content - 原始 Markdown 正文
 * @param {string} title - 卡片标题（摘要里不必重复出现）
 * @param {number} maxLength - 摘要最多保留多少字
 * @returns {{ text: string, truncated: boolean }}
 */
export function buildPreview(content, title, maxLength = 96) {
  const body = stripLeadingTitle(content, title);
  if (!body) return { text: '', truncated: false };

  const cleaned = body
    .replace(/```[\s\S]*?```/g, ' ') // 整块代码（摘要里不出现代码块，避免折叠时被截断）
    .replace(/\$\$[\s\S]*?\$\$/g, ' ') // 块级公式：摘要里显示 LaTeX 源码比不显示更糟
    .replace(/\$[^$\n]*\$/g, ' ') // 行内公式
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // 链接只留文字（必须早于行内代码，否则 [`var`](url) 会先被拆散）
    .replace(/`([^`]*)`/g, '$1') // 行内代码只去反引号，保留标识符本身
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // 标题标记
    .replace(/^\s{0,3}>\s?/gm, '') // 引用标记
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, '') // 列表标记
    .replace(/[*_~]{1,3}/g, '') // 强调符号
    .replace(/\s+/g, ' ') // 压成一行
    .trim();

  const characters = Array.from(cleaned);
  if (characters.length <= maxLength) return { text: cleaned, truncated: false };
  return { text: `${characters.slice(0, maxLength).join('')}…`, truncated: true };
}

export default { stripLeadingTitle, buildPreview };
