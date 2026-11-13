<!-- ppt-master-schema: design-spec/v1 -->
# 第十一、十二次课合并课件 · Design Spec

## I. Project Information

| Item | Value |
| --- | --- |
| Project Name | 第十一、十二次课合并课件（RAG 检索与生成 + 知识图谱可视化） |
| Canvas Format | PPT 16:9 (1280×720) |
| Page Count | 17 |
| Primary Language | zh-CN |
| Target Audience | 已上完第十次课（向量库入盘）、有 React + Express + ECharts 基础的实训学生 |
| Communication Intent | 教（teach）：先讲清检索与生成的链路，再讲清关系数据如何变成可交互的图 |
| Desired Audience Outcome | 课后能独立做出 /ai/rag-qa 与对话页、/graph/knowledge-map 与力导向图谱页，并知道两条链路上的取舍 |
| Core Message / Ask / Action | 先让 AI 会查（检索 + 生成 + 依据），再让关系看得见（数据契约 + 力导向 + 视觉编码） |
| Delivery Context | 教师现场投屏讲解，两节课连排（8 学时） |
| Artifact Afterlife | 课后复习回看：保留代码与流程图，便于对照练习 |
| Reading Mode | balanced |
| Content Strategy | 贴近原稿：沿用两份课件各自的顺序与代码，只在两课之间加过渡页，不引入原稿以外的事实 |
| Design Style | custom 技术教学板式：浅冷灰底、细线骨架、深墨蓝结构色、单一亮蓝强调色、深色等宽代码块 |
| AI Image Acquisition Path | not applicable |
| Generation Mode | continuous |
| Spec Refinement | disabled |
| Speaker Notes | enabled |
| Custom Animations | disabled |
| Narration Audio | disabled |
| Created Date | 2026-11-13 |

## II. Canvas Specification

| Property | Value |
| --- | --- |
| Format | PPT 16:9 |
| Dimensions | 1280 × 720 |
| viewBox | `0 0 1280 720` |
| Margins | 左右 80，上 64，下 56 |
| Content Area | x 80–1200，y 64–664 |

## III. Visual Theme

### Theme Style

- **Mode**: instructional
- **Visual style**: custom
- **Mode Behavior**: 每页先给一个可判断的结论，再展开机制与代码；顺序固定为「问题 → 做法 → 代码 → 验证」。
- **Visual Style Behavior**: 浅冷灰底（#F5F7FA）上铺极淡细线骨架；左侧 4px 深墨蓝竖条与右上角页码建立节奏；代码进深色圆角块（#0F1B2D）用 Consolas；强调色只给关键动作与关键变量；坑与注意点用琥珀色细线标签，不铺大色块。
- **Theme**: 讲义式技术板书
- **Tone**: 克制、清晰、可跟做

### Color Scheme

| Role | HEX | Purpose |
| --- | --- | --- |
| Background | #F5F7FA | 页面底色 |
| Secondary background | #FFFFFF | 卡片与面板 |
| Primary | #16233A | 标题、结构色、左侧竖条 |
| Accent | #2F80ED | 关键动作、关键变量、流程箭头 |
| Secondary accent | #F2994A | 注意点、坑、取舍 |
| Body text | #1F2933 | 正文 |
| Secondary text | #6B7A90 | 注解、脚注 |
| Divider | #D9E1EC | 细线、分隔 |

## IV. Typography System

### Font Plan

| Role | Character (Reference) | Primary | English if non-English | Fallback tail |
| --- | --- | --- | --- | --- |
| Title | 中性当代无衬线，字重对比建立层级 | Microsoft YaHei | Arial | sans-serif |
| Body | 同族常规字重，长行可读 | Microsoft YaHei | Arial | sans-serif |
| Code | 等宽，突出符号与缩进 | Consolas | Consolas | monospace |

- **Title stack**: Microsoft YaHei, Arial, sans-serif
- **Body stack**: Microsoft YaHei, Arial, sans-serif
- **Code stack**: Consolas, monospace
- **Role rationale**: 本课多页承载 JS 片段与提示词模板，等宽字是内容语义的一部分。

### Font Size Hierarchy

| Purpose | Anchor Size (px) |
| --- | ---: |
| Body | 16 |
| Title | 36 |
| Subtitle | 21 |
| Annotation | 15 |
| page_title | 36 |
| kicker | 16 |
| code | 14 |
| footnote | 14 |

## V. Layout Principles

### Deck-wide Direction

- **Hierarchy direction**: 左对齐的竖向阅读流：kicker → 页标题 → 结论句 → 内容块 → 页脚
- **Composition tendency**: 每页一个主结构（流程带、双栏、代码+说明、编号清单、对照表），避免卡片墙
- **Cross-page continuity**: 左上 4px 竖条、右上页码、页脚课程名跨页不变；分节页放大 PART 字母做锚点
- **Spacing posture**: 中等偏松，代码页收紧
- **Spacing anchors**: 页边距 80 / 块间距 32 / 栏间距 32 / 圆角 10 / 正文行高 26

## VI. Icon Usage Specification

- **Primary bundled library**: none

| Icon Path | Suitable Scenarios |
| --- | --- |

## VIII. Image Resource List

| Filename | Dimensions | Ratio | Purpose | Type | Image pattern | Crop Policy | Acquire Via | Status | Reference | text_policy | page_role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## IX. Content Outline

#### Slide 01 - 01 封面

- **Audience move**: 第十一、十二次课合并课件，一句话说清两节课的关系
- **Relationships**: 本页内容围绕「从「查得到」到「看得见」」构成一个主结构
- **Title**: 从「查得到」到「看得见」
- **Core message**: 从「查得到」到「看得见」
- **Content**:
  - kicker：《大前端与AI实战》· 第十一、十二次课
  - 主标题：从「查得到」到「看得见」
  - 副标题：RAG 检索与生成 · 知识图谱可视化
  - 页脚：费曼学习平台 · 8 学时实验课

#### Slide 02 - 02 课程地图

- **Audience move**: 学生知道两节课各自产出什么、时间怎么分
- **Relationships**: 本页内容围绕「两段路，四个交付物」构成一个主结构
- **Title**: 两段路，四个交付物
- **Core message**: 两段路，四个交付物
- **Content**:
  - Part A：检索器 / RAG 链 / 对话页 / 联调
  - Part B：关系数据 / 图谱接口 / ECharts / 交互
  - 四个交付物：检索接口 · 对话页 · 图谱接口 · 图谱页

#### Slide 03 - 03 分节 A

- **Audience move**: 进入 Part A：图书馆已有书，缺一位管理员与一位教授
- **Relationships**: 本页内容围绕「检索与生成」构成一个主结构
- **Title**: 检索与生成
- **Core message**: 检索与生成
- **Content**:
  - 大字 Part A
  - 一句话承上启下
  - 两句说明检索器与 RAG 链的分工

#### Slide 04 - 04 检索三步

- **Audience move**: 把「相似度搜索」讲成三步可复述的动作
- **Relationships**: 本页内容围绕「问句向量化 → 近邻搜索 → 取回 K 条」构成一个主结构
- **Title**: 问句向量化 → 近邻搜索 → 取回 K 条
- **Core message**: 问句向量化 → 近邻搜索 → 取回 K 条
- **Content**:
  - 三步流程带
  - k=4 的取舍
  - 空库返回空数组而不是抛错

#### Slide 05 - 05 检索器代码

- **Audience move**: 把三步映射到 queryVectorStore 的三个调用
- **Relationships**: 本页内容围绕「检索器只做一件事：给我最相关的几段」构成一个主结构
- **Title**: 检索器只做一件事：给我最相关的几段
- **Core message**: 检索器只做一件事：给我最相关的几段
- **Content**:
  - 三步要点（load / asRetriever / invoke）
  - 右侧代码块
  - 空库兜底的说明

#### Slide 06 - 06 RAG 链

- **Audience move**: 理解 LCEL：检索 → 模板 → 模型 → 解析
- **Relationships**: 本页内容围绕「用 .pipe() 把四段接成一条流水线」构成一个主结构
- **Title**: 用 .pipe() 把四段接成一条流水线
- **Core message**: 用 .pipe() 把四段接成一条流水线
- **Content**:
  - 四段流程带
  - RunnableSequence 代码
  - pipe 等价写法

#### Slide 07 - 07 上下文协议

- **Audience move**: 为什么用 <role>/<instruction>/<context> 这类标签
- **Relationships**: 本页内容围绕「上下文写成带标签的段落」构成一个主结构
- **Title**: 上下文写成带标签的段落
- **Core message**: 上下文写成带标签的段落
- **Content**:
  - 提示词骨架代码块
  - 标签降低歧义
  - 拒答条件写在 instruction 里

#### Slide 08 - 08 后端接口

- **Audience move**: 接口契约：answer + sources，以及三种失败分流
- **Relationships**: 本页内容围绕「问题进，答案与依据一起出」构成一个主结构
- **Title**: 问题进，答案与依据一起出
- **Core message**: 问题进，答案与依据一起出
- **Content**:
  - 请求/响应示例
  - 内部三步
  - 没有依据就不要编

#### Slide 09 - 09 前端对话页

- **Audience move**: 前端三块结构与三个状态
- **Relationships**: 本页内容围绕「消息流、依据、输入框」构成一个主结构
- **Title**: 消息流、依据、输入框
- **Core message**: 消息流、依据、输入框
- **Content**:
  - 三张卡片
  - loading/error/empty 的处理
  - 依据可点回知识点

#### Slide 10 - 10 分节 B

- **Audience move**: 进入 Part B：列表答不了结构问题
- **Relationships**: 本页内容围绕「知识图谱可视化」构成一个主结构
- **Title**: 知识图谱可视化
- **Core message**: 知识图谱可视化
- **Content**:
  - 大字 Part B
  - 一句话点题
  - 三件事说明

#### Slide 11 - 11 为什么画图

- **Audience move**: 用三个场景说明图的价值
- **Relationships**: 本页内容围绕「三种问题，列表答不了」构成一个主结构
- **Title**: 三种问题，列表答不了
- **Core message**: 三种问题，列表答不了
- **Content**:
  - 找前置 / 看孤岛 / 查断层
  - 一句话总结

#### Slide 12 - 12 数据契约

- **Audience move**: 前端只认三个数组，后端负责算出来
- **Relationships**: 本页内容围绕「nodes / links / categories」构成一个主结构
- **Title**: nodes / links / categories
- **Core message**: nodes / links / categories
- **Content**:
  - JSON 示例
  - categories 决定颜色
  - kind 标记关系来源

#### Slide 13 - 13 后端聚合

- **Audience move**: 两类关系的合并、去重与度数计算
- **Relationships**: 本页内容围绕「显式引用 + 正文提及」构成一个主结构
- **Title**: 显式引用 + 正文提及
- **Core message**: 显式引用 + 正文提及
- **Content**:
  - 四条要点
  - 显式优先的理由

#### Slide 14 - 14 ECharts 骨架

- **Audience move**: 最小可用配置与两个关键开关
- **Relationships**: 本页内容围绕「二十行 ECharts，图就出来了」构成一个主结构
- **Title**: 二十行 ECharts，图就出来了
- **Core message**: 二十行 ECharts，图就出来了
- **Content**:
  - 最小配置代码
  - roam 与 draggable 的作用

#### Slide 15 - 15 视觉编码

- **Audience move**: 颜色/大小/线型各自负责一种语义
- **Relationships**: 本页内容围绕「三条视觉通道，各管一件事」构成一个主结构
- **Title**: 三条视觉通道，各管一件事
- **Core message**: 三条视觉通道，各管一件事
- **Content**:
  - 三行对照表
  - 图例只列真实存在的类型
  - 2D 与 3D 口径一致

#### Slide 16 - 16 交互与坑

- **Audience move**: 交互清单与两个常见坑
- **Relationships**: 本页内容围绕「四个交互 + 两个坑」构成一个主结构
- **Title**: 四个交互 + 两个坑
- **Core message**: 四个交互 + 两个坑
- **Content**:
  - 四个交互流程带
  - 标签压节点
  - 拖拽要先确认

#### Slide 17 - 17 收尾

- **Audience move**: 五条结论 + 两份作业 + 下节预告
- **Relationships**: 本页内容围绕「两节课，带走五句话」构成一个主结构
- **Title**: 两节课，带走五句话
- **Core message**: 两节课，带走五句话
- **Content**:
  - 五条结论
  - 必做与挑战作业
  - 下次课：3D 与 XR 可视化

## X. Speaker Notes Requirements

- **Generation**: enabled
- **Filename**: match each SVG filename under `notes/`
- **Content**: 每页 3–6 句口语化讲稿，含「为什么要有这一步」与「过渡到下一页」的一句话
- **Total duration**: 约 60 分钟讲授（不含学员实操）
- **Notes style**: conversational
- **Presentation purpose**: 教（让学员能照着做出两条链路的完整功能）
