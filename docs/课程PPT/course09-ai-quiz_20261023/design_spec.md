<!-- ppt-master-schema: design-spec/v1 -->
# 第九次课 AI 出题与智能测评系统 - Design Spec

## I. Project Information

| Item | Value |
| --- | --- |
| Project Name | 第九次课 AI 出题与智能测评系统 |
| Canvas Format | PPT 16:9 (1280×720) |
| Page Count | 14 |
| Primary Language | zh-CN |
| Target Audience | 跟随《大前端与AI实战》课程、已具备 React + Express + MongoDB 基础、正在做费曼学习平台实验的学生 |
| Communication Intent | 教（teach）：先讲清「为什么缺练」，再按后端出题 → 前端考场 → AI 阅卷的顺序讲机制，使学员能照着做出单选全流程，并理解简答题必须交给 AI 评分 |
| Desired Audience Outcome | 课后学员能独立复述出题 Prompt 的三段结构、答题页的串行流程、错题如何进入复习列表，并完成单选题「选择难度→出题→答题→评分→更新复习」闭环 |
| Core Message / Ask / Action | AI 出题把「练」补进费曼平台：一个知识点 → 一道可评分的题 → 错题自动回到复习计划，形成「学-练-评」闭环 |
| Delivery Context | 教师现场投屏讲解 + 学员跟做（4 小时实验课的第 2–3 小时）；课后留档供学员回看 |
| Artifact Afterlife | 课堂投屏 + 课后复习回看（保留可读的代码与流程，便于学员对照练习） |
| Reading Mode | balanced |
| Content Strategy | 贴近原稿：沿用课件的四部分顺序（后端出题 → 前端答题 → AI 评分讨论 → 总结作业），只做桥接与压缩，不引入原稿以外的事实 |
| Design Style | custom 技术教学板式：浅冷灰底、细线网格骨架、深墨蓝结构色、单一亮蓝强调色、深色等宽代码块 |
| AI Image Acquisition Path | not applicable |
| Generation Mode | continuous |
| Spec Refinement | disabled |
| Speaker Notes | enabled — 工作流默认（讲师投屏，讲稿承担解释与过渡） |
| Custom Animations | disabled — 工作流默认 |
| Narration Audio | disabled — 工作流默认 |
| Created Date | 2026-10-23 |

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
- **Mode Behavior**: 每页先给一个可判断的结论，再展开机制与代码；顺序固定为「问题 → 做法 → 代码 → 验证」，让学员按同一节奏跟做。
- **Visual Style Behavior**: 浅冷灰底（#F5F7FA）上铺极淡的细线网格作为结构骨架；每页左侧 4px 深墨蓝竖条与右上角页码建立节奏；标题用大字号思源/雅黑粗体、深墨蓝；代码一律进深色圆角块（#0F1B2D）用 Consolas；强调色只给「下一步动作/关键变量」；挑战与注意事项用琥珀色细线标签，不铺大色块。
- **Theme**: 讲义式技术板书
- **Tone**: 克制、清晰、可跟做

### Color Scheme

| Role | HEX | Purpose |
| --- | --- | --- |
| Background | #F5F7FA | 页面底色 |
| Secondary background | #FFFFFF | 卡片、代码块外的面板 |
| Primary | #16233A | 标题、结构色、左侧竖条 |
| Accent | #2F80ED | 关键动作、关键变量、流程图高亮 |
| Secondary accent | #F2994A | 挑战任务、注意点标签 |
| Body text | #1F2933 | 正文 |
| Secondary text | #6B7A90 | 注解、脚注、次级说明 |
| Divider | #D9E1EC | 细线、网格、分隔 |

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
- **Role rationale**: 新增 Code 角色：本课多页承载 Prompt 与 JS 片段，等宽字是内容语义的一部分，不能用正文字体替代。

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

- **Hierarchy direction**: 左对齐的竖向阅读流：kicker → 页标题 → 结论句 → 内容块 → 页脚
- **Composition tendency**: 每页一个主结构（流程带、双栏对照、代码+说明、编号清单），避免卡片墙
- **Cross-page continuity**: 左上角 4px 竖条、右上角 NN / 14 页码、页脚课程名跨页不变；章节页放大编号做锚点
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

### Part 1: 为什么要有「练」

#### Slide 01 - 封面

- **Audience move**: 进教室时只知道今天做「测评」→ 知道今天要把「练」接进平台闭环
- **Relationships**: 课次标题、副标题主张、课程标识三者为主从关系
- **Composition**: 大标题压左侧、右下角一行主张与课程标识，极简留白
- **Title**: 让平台「能练」
- **Core message**: AI 出题把「练」补进费曼平台，形成学-练-评闭环
- **Content**:
  - kicker：《大前端与AI实战》· 第九次课 · AI 出题与智能测评系统
  - 主标题：让平台「能练」
  - 副标题：知识点 → 一道可评分的题 → 错题自动回到复习计划
  - 页脚：费曼学习平台 · 4 小时实验课
- **Cover impact**: hook 用「能教、能评，还差一个能练」这句反差；composition 为 Reference

#### Slide 02 - 今天做三件事

- **Audience move**: 不知道这节课要动哪些文件 → 知道四段任务与时间分配，能定位自己要跟做的部分
- **Relationships**: 四个任务单元构成顺序执行关系（后端 → 前端 → 评分讨论 → 交付）
- **Composition**: 四段时间轴 + 每段一行产出，右列标注分钟数
- **Title**: 今天做三件事，把「练」接进闭环
- **Core message**: 后端出题、前端考场、AI 阅卷三段，拼出一个能跑通的练习闭环
- **Content**:
  - ① 后端出题官（45 分钟）：出题 Prompt + generateQuestion + JSON 容错
  - ② 前端考场（90 分钟）：QuizPage 状态与串行流程 + 错题入复习
  - ③ AI 阅卷（45 分钟，讨论）：简答题为什么必须交给 AI 评分
  - ④ 交付：单选题全流程跑通；挑战任务选做

#### Slide 03 - 缺口：能教、能评，还不能练

- **Audience move**: 默认「平台已经很完整」→ 意识到没有题目就没有可验证的掌握度
- **Relationships**: 学、练、评三个环节中「练」缺失，与另外两者构成缺口对比
- **Composition**: 三段闭环示意，「练」用琥珀色虚线框标出缺口
- **Title**: 能教、能评，还不能练
- **Core message**: 没有题就没有练，没有分就没有评——闭环断在「练」
- **Content**:
  - 已具备：知识点录入与阅读、语音复述、AI 复述评价
  - 缺口：没有可判分的题目，掌握程度只能靠自述
  - 补法：让 AI 按知识点生成一道题，答完立刻给分
  - 结果：错题自动进复习列表，学习计划自己长出来

### Part 2: 后端出题官

#### Slide 04 - 全链路：从知识点到复习列表

- **Audience move**: 只觉得「要生成题目」→ 能说出六步链路上每一步的输入输出
- **Relationships**: 六个步骤构成单向链路，知识点与复习列表为首尾
- **Composition**: 横向流程带，箭头连接，关键数据形状标在节点下方
- **Title**: 一条链路：知识点 → 题目 → 分数 → 复习
- **Core message**: 出题只是链路中的一步，真正的价值在末端的复习回流
- **Content**:
  - ① 知识点正文 → ② 出题 Prompt（角色 + 输入 + 输出约束）→ ③ LLM
  - ④ 严格 JSON 题（type / difficulty / question / options / answer / explanation）
  - ⑤ 答题页渲染与作答 → ⑥ 评分 → 错了写回 reviewList
  - 讲解点：链路中唯一「不可控」的是 LLM 输出，所以第 ④ 步要卡死格式

#### Slide 05 - 出题 Prompt：三角色、三要素

- **Audience move**: 以为 Prompt 随便写 → 知道 Prompt 必须固定角色、输入、输出格式
- **Relationships**: 角色、输入、输出三者共同约束一次生成，缺一即不可用
- **Composition**: 左栏三段式说明，右栏 Prompt 骨架代码块
- **Title**: 出题 Prompt 的三段结构
- **Core message**: 提示词不是许愿，是把「谁来做、拿什么做、交什么格式」写死
- **Content**:
  - 角色：资深计算机老师，负责出一道理科测验题
  - 输入：知识点正文 + 难度（基础 / 中等 / 困难）
  - 输出：只用 JSON，不要 Markdown 围栏、不要解释文字
  - 关键约束：options 的键必须与 answer 的取值一致（A/B/C/D）
- **Content（代码块）**: Prompt 骨架（角色行 / 【知识点】 / 【难度】 / 输出格式模板）
- **Mathematical content**: 无

#### Slide 06 - 后端实现：generateQuestion 三步

- **Audience move**: 看到一堆代码不知从哪下手 → 知道控制器只做「取值、调用、解析」三件事
- **Relationships**: 三步为顺序依赖，任一步失败都要有明确出口
- **Composition**: 右侧整块代码，左侧三步编号与要点
- **Title**: 控制器只做三件事
- **Core message**: generateQuestion = 取参数 + 调模型 + 解析 JSON，其余交给 Prompt
- **Content**:
  - 一、从 req.body 取 knowledgePointContent 与 difficulty，缺参直接 400
  - 二、axios 调 LLM，temperature 压低，max_tokens 够装一整道题
  - 三、JSON.parse 结果，再 res.json 回前端
  - 讲解：不要在控制器里拼业务文案，文案都在 Prompt 里

#### Slide 07 - JSON 容错：模型会不听话

- **Audience move**: 认为「模型一定返回合法 JSON」→ 知道必须防御性解析并留日志
- **Relationships**: 失败路径与成功路径并列，失败后有三条可采取措施
- **Composition**: 失败路径用琥珀色细线标注，右侧列验证清单
- **Title**: 模型不听话时，接口要体面地失败
- **Core message**: 解析失败不是意外，是常态；接口必须给出可读的中文错误
- **Content**:
  - try/catch 包住 JSON.parse；catch 里打印原始返回片段
  - 返回 500 + 中文提示「AI 返回格式错误，请稍后重试」
  - 外层再包一层 catch，覆盖网络与鉴权错误
  - Postman 验证清单：正常出题 / 空正文 / 超长正文 / 连续三次同难度
- **Content（代码块）**: 解析与兜底的 6 行骨架

### Part 3: 前端考场

#### Slide 08 - 答题页的五个状态

- **Audience move**: 想直接写 JSX → 先知道页面被哪五个状态驱动
- **Relationships**: 五个状态中 isLoading 与 question/result 互斥，selectedOption 依附 question
- **Composition**: 五个状态标签围绕一条串行流程排布
- **Title**: 五个 state 决定答题页长什么样
- **Core message**: 页面不是「画出来的」，是被状态驱动的
- **Content**:
  - knowledgePoint：先拿到知识点，才有正文可出题
  - isLoading：AI 出题中，禁用提交
  - question：题目对象，含 options 与 answer
  - selectedOption：用户选择，与 options 的键对应
  - result：{ isCorrect, explanation }

#### Slide 09 - 渲染与串行流程

- **Audience move**: 不知道加载顺序从哪来 → 清楚「加载知识点 → 选难度 → 出题 → 作答 → 结果」五步串行
- **Relationships**: 五步严格串行，前一步产出即后一步输入
- **Composition**: 左侧竖向步骤条，右侧对应界面区块示意
- **Title**: 串行，是这个页面的骨架
- **Core message**: 一次只做一件事，任何一步失败都不进入下一步
- **Content**:
  - 进页面：GET /knowledge-points/:id，拿到正文
  - 选难度：POST /ai/generate-question，期间显示「AI 正在出题中…」
  - 作答：radio 列表，提交前校验已选项
  - 出结果：显示对错、正确答案、解释，并提供「再来一题」
  - 讲解：整个流程没有并发，失败点只有两个接口

#### Slide 10 - 评分与错题回流

- **Audience move**: 以为评分是件复杂的事 → 单选题只需一次字符串比较，重点是错了之后做什么
- **Relationships**: 判定结果分两路：对则提示，错则写回 reviewList，形成回流
- **Composition**: 判定菱形分叉两条路径，错误路径指向复习列表
- **Title**: 判对错只要一行，值钱的是后面那一句
- **Core message**: 前端比较答案够用，但错题必须回流到复习列表
- **Content**:
  - 判定：selectedOption === question.answer
  - 错题：PUT /knowledge-points/:id，body { reviewList: true }
  - 提示：页面显示「该知识点已加入你的复习列表」
  - 局限：只能判选择题；简答题没法靠字符串比较

#### Slide 11 - 路由与入口

- **Audience move**: 不知道页面怎么被打开 → 清楚两条路由与一个入口按钮
- **Relationships**: 入口按钮、路由、页面三者构成一条访问路径
- **Composition**: 三个节点横向串联，标注文件位置
- **Title**: 把考场挂到平台上
- **Core message**: 一个 Link、一条 Route，答题页就有了入口
- **Content**:
  - 路由：App.jsx 增加 /quiz/:id → QuizPage
  - 入口：Dashboard 知识点卡片加「开始测评」链接
  - 传参：:id 即知识点 _id，页面据此拉正文
  - 注意：入口放卡片操作区，不要挤占「开始复述」的位置

### Part 4: AI 阅卷与交付

#### Slide 12 - 简答题：为什么必须让 AI 阅卷

- **Audience move**: 以为前端评分能解决一切 → 理解开放答案需要语义判断，必须交给模型
- **Relationships**: 选择题与简答题构成对比，评分主体从「前端比较」转为「模型判断」
- **Composition**: 双栏对照：左选择题判分，右简答题判分；下方评分 Prompt 代码块
- **Title**: 开放答案，只能交给阅卷老师
- **Core message**: 简答题没有唯一字符串答案，只能让模型按「答案要点」判分
- **Content**:
  - 出题时就多给一份 answer_key_points（答案要点）
  - 评分 Prompt 输入：题目 + 要点 + 学生回答；输出 { isCorrect, explanation }
  - 评分原则：覆盖主要要点即算正确，允许措辞不同
  - 注意：模型评分不稳定，要点写得越具体越稳定
- **Content（代码块）**: 评分 Prompt 骨架

#### Slide 13 - 挑战任务拆解

- **Audience move**: 觉得挑战任务无从下手 → 知道要改两个后端点、两个前端点
- **Relationships**: 四项改动按「后端先行、前端跟进」的依赖顺序排列
- **Composition**: 两列待办清单，左后端右前端，每项一个可勾选方块
- **Title**: 挑战任务：拆成四个可勾选的点
- **Core message**: 支持简答题 = 出题加 type + 新增评分接口 + 前端按 type 渲染
- **Content**:
  - 后端 ①：generateQuestion 增加 type 参数，切换两套 Prompt
  - 后端 ②：新增 gradeAnswer，接题目、要点、学生回答
  - 前端 ①：按 question.type 渲染单选或文本域
  - 前端 ②：提交时简答题走 /ai/grade-answer，不再前端比较

#### Slide 14 - 总结与作业

- **Audience move**: 带走一句口号 → 带走三个可复述的结论与两项明确作业
- **Relationships**: 三条结论并列；作业一必做、作业二挑战；末行指向下节课
- **Composition**: 三段总结 + 两条作业卡 + 底部一行预告
- **Title**: 今天带走三句话
- **Core message**: 出题靠 Prompt 约束格式，答题靠状态驱动流程，评分后的回流才是闭环
- **Content**:
  - 一：Prompt 要写死角色、输入、输出格式
  - 二：答题页是状态驱动的串行流程
  - 三：错题回流复习列表，闭环才闭合
  - 必做：单选「难度→出题→答题→评分→复习」全流程跑通
  - 挑战：完成简答题支持（出题 type + gradeAnswer + 前端分流）
  - 下节课：RAG 检索增强生成——让 AI 与你的知识库对话
- **Closing impact**: takeaway 为「学-练-评闭环今天闭合」；composition 为 Reference

## X. Speaker Notes Requirements

- **Generation**: enabled
- **Filename**: match each SVG filename under `notes/`
- **Content**: 按页写讲师口语化讲稿：每页 3–6 句，包含「为什么要有这一步」「学员容易踩的坑」「过渡到下一页的一句话」；代码页要点名行号级别的关键语句
- **Total duration**: 约 45 分钟讲授（不含学员实操）
- **Notes style**: conversational
- **Presentation purpose**: 教（让学员能照着做出单选全流程并理解简答题的评分边界）
