<!-- ppt-master-schema: design-spec/v1 -->
# 第十次课 RAG 与私有知识库（Part 1 后端基础）- Design Spec

## I. Project Information

| Item | Value |
| --- | --- |
| Project Name | 第十次课 RAG 与私有知识库（后端基础） |
| Canvas Format | PPT 16:9 (1280×720) |
| Page Count | 12 |
| Primary Language | zh-CN |
| Target Audience | 已会 React + Express + MongoDB、上过第九次课的实训学生 |
| Communication Intent | 教（teach）：先讲清「为什么要 RAG」，再把索引四步落到可运行的代码，最后用 Postman 验证向量库真的建起来了 |
| Desired Audience Outcome | 课后能说出 RAG 三步流程与索引四步，独立完成「装依赖 → 建 vectorStoreService → 接进知识点接口 → 验证 vector_store 文件」 |
| Core Message / Ask / Action | RAG = 先检索、再生成：把知识切成块、变成向量、存进本地向量库，让 AI 回答前先「翻书」 |
| Delivery Context | 教师投屏讲解 + 学生跟做（4 学时；理论 60 分钟、编码 120 分钟、验证 30 分钟） |
| Artifact Afterlife | 课堂投屏 + 课后对照回看（代码页要能照着敲） |
| Reading Mode | balanced |
| Content Strategy | 严格贴源文档顺序（理论 → 后端基础设施 → 测试 → 总结作业），只做桥接与压缩 |
| Design Style | custom 技术教学板式：浅冷灰底、细线骨架、深墨蓝结构色、单一亮蓝强调、深色等宽代码块 |
| AI Image Acquisition Path | not applicable |
| Generation Mode | continuous |
| Spec Refinement | disabled |
| Speaker Notes | enabled |
| Custom Animations | disabled |
| Narration Audio | disabled |
| Created Date | 2026-10-30 |

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
- **Mode Behavior**: 每页先给可判断的结论，再展开机制与代码；固定节奏「问题 → 做法 → 代码 → 验证」。
- **Visual Style Behavior**: 浅冷灰底（#F5F7FA）铺极淡细线骨架；左侧 4px 深墨蓝竖条 + 右上角页码；代码进深色圆角块（#0F1B2D）用 Consolas；强调色只给关键动作与关键变量；注意点用琥珀细线标签，不铺色块。
- **Theme**: 讲义式技术板书
- **Tone**: 克制、清晰、可跟做

### Color Scheme

| Role | HEX | Purpose |
| --- | --- | --- |
| Background | #F5F7FA | 页面底色 |
| Secondary background | #FFFFFF | 卡片、面板 |
| Primary | #16233A | 标题、结构色、左侧竖条 |
| Accent | #2F80ED | 关键动作、关键变量、流程高亮 |
| Secondary accent | #F2994A | 注意点、坑 |
| Body text | #1F2933 | 正文 |
| Secondary text | #6B7A90 | 注解、脚注 |
| Divider | #D9E1EC | 细线、网格 |

## IV. Typography System

### Font Plan

| Role | Character (Reference) | Primary | English if non-English | Fallback tail |
| --- | --- | --- | --- | --- |
| Title | 中性当代无衬线，字重建立层级 | Microsoft YaHei | Arial | sans-serif |
| Body | 同族常规字重 | Microsoft YaHei | Arial | sans-serif |
| Code | 等宽，突出符号与缩进 | Consolas | Consolas | monospace |

- **Title stack**: Microsoft YaHei, Arial, sans-serif
- **Body stack**: Microsoft YaHei, Arial, sans-serif
- **Code stack**: Consolas, monospace
- **Role rationale**: 新增 Code 角色，代码是内容语义的一部分，不能替代。

### Font Size Hierarchy

| Purpose | Anchor Size (px) |
| --- | ---: |
| Body | 24 |
| Title | 42 |
| Subtitle | 30 |
| Annotation | 18 |
| page_title | 36 |
| kicker | 16 |
| code | 17 |
| footnote | 14 |

## V. Layout Principles

### Deck-wide Direction

- **Hierarchy direction**: 左对齐竖向阅读流：kicker → 页标题 → 结论句 → 内容块 → 页脚
- **Composition tendency**: 每页一个主结构（流程带 / 双栏 / 代码+说明 / 编号清单 / 步骤条）
- **Cross-page continuity**: 左侧竖条、右上 NN / 12、页脚课程名不变
- **Spacing posture**: 中等偏松，代码页收紧
- **Spacing anchors**: 页边距 80 / 块间距 32 / 栏间距 40 / 圆角 10 / 正文行高 36

## VI. Icon Usage Specification

- **Primary bundled library**: none

| Icon Path | Suitable Scenarios |
| --- | --- |

## VIII. Image Resource List

| Filename | Dimensions | Ratio | Purpose | Type | Image pattern | Crop Policy | Acquire Via | Status | Reference | text_policy | page_role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## IX. Content Outline

### Part 1: 理论突破

#### Slide 01 - 封面

- **Audience move**: 只知道今天讲 RAG → 知道今天要亲手把「知识库」建起来
- **Relationships**: 课次、主张、课程标识为主从关系
- **Composition**: 大标题压左，右下角一行主张，极简留白
- **Title**: 让 AI 读你的书
- **Core message**: RAG 把私有知识切块、向量化、存进本地库，让 AI 回答前先翻书
- **Content**:
  - kicker：《大前端与AI实战》· 第十次课 · RAG 与私有知识库（Part 1）
  - 主标题：让 AI 读你的书
  - 副标题：文档处理 · 文本嵌入 · 本地向量库
  - 页脚：费曼学习平台 · 4 学时 · 后端基础

#### Slide 02 - 今天做四件事

- **Audience move**: 不知道今天动哪些文件 → 知道四段时间与产出
- **Relationships**: 四个任务单元顺序执行
- **Composition**: 四段时间轴，右列标分钟数
- **Title**: 今天做四件事，把「图书馆」建起来
- **Core message**: 先懂原理，再写服务，最后用 Postman 验证库真的落盘
- **Content**:
  - ① 理论（60 分钟）：RAG 三步 + 索引四步 + 技术选型
  - ② 编码（120 分钟）：装依赖 → vectorStoreService → 接进知识点接口
  - ③ 验证（30 分钟）：Postman 建两条，看日志与 vector_store 文件
  - ④ 作业：必做（创建/更新都能进库）+ 选做（换成 TXT 上传）

#### Slide 03 - 为什么需要 RAG

- **Audience move**: 以为「把资料塞进 Prompt」就行 → 知道有 token 上限且跨知识点问题答不了
- **Relationships**: 两个限制（单点上下文 / 上下文长度）并列，共同指向 RAG
- **Composition**: 左两段问题描述，右下角一句 RAG 定义
- **Title**: 问题不在模型，在「一次只能看几页」
- **Core message**: 不要把整座图书馆塞给 AI，先帮它找到最相关的几页
- **Content**:
  - 限制一：每个 AI 功能只基于单个知识点上下文，跨知识点的问题答不了
  - 限制二：20 页 PDF 塞不进 Prompt——大模型有 token 上限
  - RAG 的做法：先检索最相关片段，再把片段 + 问题一起交给模型
  - 一句话：检索增强生成 = 先找书，再答题

#### Slide 04 - RAG 三步走

- **Audience move**: 把 RAG 当成一个神秘技术 → 能复述索引 / 检索 / 生成三步
- **Relationships**: 三步构成单向流程，第一步是本次课重点
- **Composition**: 横向三栏流程带，第一栏加粗描边表示「今天做这块」
- **Title**: 索引、检索、生成
- **Core message**: 今天只做第一步索引，但它是后面两步的地基
- **Content**:
  - Step 1 索引（本次课）：加载 → 分割 → 嵌入 → 存储
  - Step 2 检索（下次课）：问题向量化 → 相似度搜索 → 取回片段
  - Step 3 生成（下次课）：片段 + 问题拼成增强 Prompt → 模型回答
  - 记忆方法：建库、找书、答题

#### Slide 05 - 索引四步：加载、分割、嵌入、存储

- **Audience move**: 知道「要处理文档」→ 知道每一步的输入输出与关键参数
- **Relationships**: 四步严格串行，分割参数决定后面所有块
- **Composition**: 四步编号清单 + 右侧参数卡（chunkSize 500 / overlap 50）
- **Title**: 索引就是把文档变成坐标
- **Core message**: 分割粒度决定检索质量，500 字一块、50 字重叠是起点
- **Content**:
  - 加载：TXT / PDF / Markdown 读成纯文本
  - 分割：切成有意义的块（chunkSize 500，chunkOverlap 50）
  - 嵌入：每块过一次 Embedding 模型 → 数字向量
  - 存储：块原文 + 向量 + 元数据（knowledgePointId）一起入库

#### Slide 06 - 向量是语义空间里的坐标

- **Audience move**: 觉得向量是玄学 → 理解「意思近 = 坐标近」
- **Relationships**: 向量、距离、相似度三者因果相连
- **Composition**: 左文右示意（几个点 + 距离标注），不用图片
- **Title**: 意思越近，坐标越近
- **Core message**: 嵌入把语义压缩成坐标，检索就是找最近的坐标
- **Content**:
  - 向量：一长串浮点数（本课模型 384 维）
  - 距离：余弦相似度，越接近 1 越相似
  - 用途：问题向量化后，在库里找最近的 K 个块
  - 注意：不同模型维度不同，换模型要重建整库

#### Slide 07 - 技术选型三件套

- **Audience move**: 面对一堆陌生包名 → 知道每个包负责哪一步
- **Relationships**: 三件套按职责分工：流程框架 / 向量化 / 存储
- **Composition**: 三张并排卡片，各一行职责 + 一行取舍
- **Title**: LangChain 管流程，千帆管向量，HNSWLib 管存放
- **Core message**: 三个组件各管一段，换掉其中一个不影响另外两个
- **Content**:
  - `langchain` + `@langchain/community`：加载、分割、流程编排
  - `@langchain/baidu-qianfan`：调用千帆 Embedding 模型
  - `hnswlib-node`：本地文件型向量库，无需独立服务
  - 取舍：本地库不能高效删除；生产环境换 Pinecone / Weaviate

### Part 2: 后端基础设施

#### Slide 08 - 装依赖，建服务模块

- **Audience move**: 不知道从哪开始写 → 知道装什么、文件放哪
- **Relationships**: 依赖 → 服务文件 → 被路由调用，三步依赖
- **Composition**: 上方一行安装命令代码条，下方左说明右文件树
- **Title**: 先装包，再建 `services/vectorStoreService.js`
- **Core message**: 所有向量相关逻辑集中在一个服务文件里，路由只调用
- **Content**:
  - 安装：`npm install langchain @langchain/community @langchain/baidu-qianfan hnswlib-node`
  - 位置：后端根目录新建 `services/vectorStoreService.js`
  - 常量：`VECTOR_STORE_PATH = path.join(__dirname, '../vector_store')`
  - 初始化：`BaiduQianfanEmbeddings` + `RecursiveCharacterTextSplitter`

#### Slide 09 - addKnowledgePointToStore：分割、入库、保存

- **Audience move**: 看到一个长函数不知结构 → 能拆出三段
- **Relationships**: 三段按顺序执行，加载失败才走新建分支
- **Composition**: 右侧整块代码，左侧三段编号说明
- **Title**: 三段：切块 → 加载或新建 → 保存
- **Core message**: 先判断库在不在，在就追加，不在就新建，最后一定要 save
- **Content**:
  - 一、分割：`textSplitter.createDocuments([content], [{ knowledgePointId }])`
  - 二、加载或新建：`HNSWLib.load()` 失败就 `HNSWLib.fromDocuments()`
  - 三、保存：`vectorStore.save(VECTOR_STORE_PATH)`，不保存等于白干
  - 容错：整段包 try/catch，失败只打日志，不影响接口返回

#### Slide 10 - 接进知识点接口

- **Audience move**: 以为要单独写个接口 → 知道只是在新旧流程里各加一行
- **Relationships**: POST 永远入库；PUT 只在内容变化时重建
- **Composition**: 左右两段代码（POST / PUT），下方一行注意点
- **Title**: 创建就入库，改内容才重建
- **Core message**: 调用是异步的、不等它完成，接口先返回
- **Content**:
  - POST：`const kp = await newKp.save(); addKnowledgePointToStore(kp);` 不 await
  - PUT：先取旧对象，`updatedKp.content !== kp.content` 时才重建
  - 为什么异步：向量化是慢操作，别让用户等
  - 简化取舍：本课允许旧块冗余；生产环境用支持删除的库

### Part 3: 验证与收尾

#### Slide 11 - 用 Postman 验证库真的建起来了

- **Audience move**: 不确定代码有没有生效 → 知道看三处证据
- **Relationships**: 操作 → 日志 → 文件系统，三处证据互相印证
- **Composition**: 三步编号 + 右侧文件树（args.json / docstore.json / hnswlib.index）
- **Title**: 三处证据：日志、文件、第二次追加
- **Core message**: 第一次建库、第二次追加、更新触发重建，三步都看到日志才算过
- **Content**:
  - 先删旧 `vector_store/`（避免看到上一次的残留）
  - 建第一条：日志出现「创建新的向量库」「分割成 N 个块」「已保存」
  - 建第二条：日志变成「向已存在的向量库中添加」
  - 更新内容：确认重建被再次触发

#### Slide 12 - 总结、作业与预告

- **Audience move**: 带走一句口号 → 带走三句结论与两项作业
- **Relationships**: 三句总结并列；作业必做/选做；末行预告下次
- **Composition**: 三段总结 + 两条作业 + 底部预告
- **Title**: 图书馆建好了，只等管理员
- **Core message**: 索引是地基：切块、向量化、落盘——下次课做检索与生成
- **Content**:
  - 一：RAG = 先检索、再生成，不是把资料塞进 Prompt
  - 二：索引四步，分割粒度决定检索质量
  - 三：服务化 + 异步调用，接口不被向量化拖慢
  - 必做：创建/更新都能正确进库；选做：支持 TXT 上传
  - 下次课：Part 2 检索器 + 问答 Agent

## X. Speaker Notes Requirements

- **Generation**: enabled
- **Filename**: match each SVG filename under `notes/`
- **Content**: 每页 3–6 句口语讲稿，含「为什么要有这一步」「学员常踩的坑」「过渡到下一页的一句」
- **Total duration**: 约 45 分钟讲授
- **Notes style**: conversational
- **Presentation purpose**: 教（能照着敲出可运行的向量库接入）
