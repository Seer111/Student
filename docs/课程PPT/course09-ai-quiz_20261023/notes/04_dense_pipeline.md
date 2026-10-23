# 第 4 页 · 一条链路

从左到右六步：知识点正文 → 出题 Prompt → LLM → 严格 JSON 题 → 答题页作答 → 评分，最后错了写回复习列表。

请特别看第三个方块：LLM 是整条链路上唯一不可控的环节。所以第 ④ 步要写死格式，第 ⑦ 步要兜底解析——这是今天最容易翻车的地方。

题目对象就六个字段：type、difficulty、question、options、answer、explanation。前三个给页面渲染，answer 给评分，explanation 给讲解。

（过渡）那就从 Prompt 开始，把「格式」写死。
