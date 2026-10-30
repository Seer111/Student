import { describe, it, expect } from 'vitest';
import { stripLeadingTitle, buildPreview } from './markdownText.js';

describe('stripLeadingTitle', () => {
  it('去掉与标题同名的一级标题', () => {
    expect(stripLeadingTitle('# 闭包\n\n正文内容', '闭包')).toBe('\n正文内容');
  });

  it('二级标题也去掉', () => {
    expect(stripLeadingTitle('## 闭包\n正文', '闭包')).toBe('正文');
  });

  it('标题不同则原样返回（不能误删正文里的小标题）', () => {
    const content = '# 另一个标题\n正文';
    expect(stripLeadingTitle(content, '闭包')).toBe(content);
  });

  it('容忍「# + 全角空格 + 标题」的手写格式', () => {
    expect(stripLeadingTitle('#\u3000闭包\n正文', '闭包')).toBe('正文');
  });

  it('只看第一个非空行：前面有空行也能定位', () => {
    expect(stripLeadingTitle('\n\n#  闭包  \n正文', '闭包')).toBe('\n\n正文');
  });

  it('首行不是标题（例如引用块）时不动', () => {
    const content = '> 「闭包」是一个函数和它的词法环境\n\n# 闭包';
    expect(stripLeadingTitle(content, '闭包')).toBe(content);
  });

  it('空内容返回空串', () => {
    expect(stripLeadingTitle('', '闭包')).toBe('');
    expect(stripLeadingTitle(null, '闭包')).toBe('');
  });

  it('标题为空时原样返回（没东西可比，不做猜测）', () => {
    const content = '# 任意\n正文';
    expect(stripLeadingTitle(content, '')).toBe(content);
    expect(stripLeadingTitle(content, undefined)).toBe(content);
  });

  it('全是空白的正文返回空串', () => {
    expect(stripLeadingTitle('   \n\n\t', '闭包')).toBe('');
  });

  it('只删第一处同名标题，正文里后面再出现的保留', () => {
    const out = stripLeadingTitle('# 闭包\n中间\n# 闭包\n结尾', '闭包');
    expect(out).toBe('中间\n# 闭包\n结尾');
  });
});

describe('buildPreview', () => {
  it('压成一行并去掉标题标记', () => {
    const out = buildPreview('# 闭包\n\n函数记住了它的词法环境。', '闭包');
    expect(out.text).toBe('函数记住了它的词法环境。');
    expect(out.truncated).toBe(false);
  });

  it('整块代码不进摘要（折叠态不该出现被截断的代码块）', () => {
    const content = '闭包示例：\n\n```js\nconst n = 1;\n```\n\n结束。';
    const out = buildPreview(content, '闭包');
    expect(out.text).not.toContain('const n');
    expect(out.text).toContain('闭包示例');
    expect(out.text).toContain('结束。');
  });

  it('行内代码、链接、强调符号被清掉，链接只留文字', () => {
    const content = '用 [`var`](https://mdn.io/var) 会共享变量，**注意**。';
    const out = buildPreview(content, '闭包');
    expect(out.text).toBe('用 var 会共享变量，注意。');
  });

  it('超长时截断并以省略号结尾', () => {
    const long = '字'.repeat(300);
    const out = buildPreview(long, '闭包', 20);
    expect(out.truncated).toBe(true);
    expect(out.text).toBe(`${'字'.repeat(20)}…`);
  });

  it('刚好等于上限时不截断', () => {
    const out = buildPreview('字'.repeat(20), '闭包', 20);
    expect(out.truncated).toBe(false);
    expect(out.text).toBe('字'.repeat(20));
  });

  it('空内容返回空摘要', () => {
    expect(buildPreview('', '闭包')).toEqual({ text: '', truncated: false });
    expect(buildPreview(null, '闭包')).toEqual({ text: '', truncated: false });
  });

  it('列表与引用标记不进摘要', () => {
    const content = '> 一句话定义\n\n- 用途一\n- 用途二';
    const out = buildPreview(content, '闭包');
    expect(out.text).toBe('一句话定义 用途一 用途二');
  });

  it('公式源码不进摘要（显示 LaTeX 比不显示更糟）', () => {
    const content = '自注意力：$$ \\text{Attention}(Q,K,V) = \\text{softmax}(QK^T)V $$\n\n就是加权求和。';
    const out = buildPreview(content, '注意力');
    expect(out.text).not.toContain('text{Attention}');
    expect(out.text).toBe('自注意力： 就是加权求和。');
  });
});
