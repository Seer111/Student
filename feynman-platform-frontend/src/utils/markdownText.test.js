import { describe, it, expect } from 'vitest';
import { stripLeadingTitle } from './markdownText.js';

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
