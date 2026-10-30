<!-- ppt-master-schema: spec-lock/v1 -->
# Execution Lock

## canvas
- viewBox: 0 0 1280 720
- format: PPT 16:9

## communication
- primary_language: zh-CN
- audience: 已会 React + Express + MongoDB、上过第九次课的实训学生
- objective: 讲清 RAG 三步与索引四步，带学生把 vectorStoreService 接进知识点接口并用 Postman 验证向量库落盘
- core_message: RAG = 先检索、再生成；索引是地基：切块、向量化、落盘
- consumption_mode: balanced

## mode
- mode: instructional

## visual_style
- visual_style: custom
- visual_style_behavior: 浅冷灰底（#F5F7FA）铺极淡细线骨架；左侧 4px 深墨蓝竖条 + 右上页码；代码进深色圆角块（#0F1B2D）用 Consolas；强调色只给关键动作与关键变量；注意点用琥珀细线标签。

## colors
- background: #F5F7FA
- secondary_bg: #FFFFFF
- primary: #16233A
- accent: #2F80ED
- secondary_accent: #F2994A
- body_text: #1F2933
- secondary_text: #6B7A90
- divider: #D9E1EC

## typography
- font_family: Microsoft YaHei, Arial, sans-serif
- title_family: Microsoft YaHei, Arial, sans-serif
- body_family: Microsoft YaHei, Arial, sans-serif
- code_family: Consolas, monospace
- body: 24
- title: 42
- page_title: 36
- subtitle: 30
- annotation: 18
- kicker: 16
- code: 17
- footnote: 14

## icons
- library: none
- inventory: none

## page_rhythm
- P01: anchor
- P02: dense
- P03: dense
- P04: breathing
- P05: dense
- P06: dense
- P07: breathing
- P08: dense
- P09: dense
- P10: dense
- P11: dense
- P12: anchor

## pptx_structure
- mode: flat

## forbidden
- `mask`, `<style>`, `class`, external CSS, `<foreignObject>`, `textPath`, `@font-face`, `<animate*>`, `<set>`, `<script>` / event attributes, `<iframe>`
- HTML named entities in text; write typography as raw Unicode and escape XML reserved characters
