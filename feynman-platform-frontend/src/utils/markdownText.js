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

export default { stripLeadingTitle };
