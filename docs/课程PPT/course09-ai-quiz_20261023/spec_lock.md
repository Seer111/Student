<!-- ppt-master-schema: spec-lock/v1 -->
# Execution Lock

## canvas
- viewBox: 0 0 1280 720
- format: PPT 16:9

## communication
- primary_language: zh-CN
- audience: 跟随《大前端与AI实战》课程、具备 React + Express + MongoDB 基础、正在做费曼学习平台实验的学生
- objective: 讲清 AI 出题的机制与答题页的串行流程，使学员能独立做出「难度→出题→答题→评分→复习回流」的单选闭环，并理解简答题必须交给 AI 评分
- core_message: AI 出题把「练」补进费曼平台：知识点 → 一道可评分的题 → 错题回到复习计划，形成学-练-评闭环
- consumption_mode: balanced

## mode
- mode: instructional

## visual_style
- visual_style: custom
- visual_style_behavior: 浅冷灰底（#F5F7FA）上铺极淡细线网格作为结构骨架；每页左侧 4px 深墨蓝竖条与右上角页码建立节奏；标题用大字号雅黑粗体、深墨蓝；代码进深色圆角块（#0F1B2D）用 Consolas；强调色只给关键动作与关键变量；挑战与注意点用琥珀色细线标签，不铺大色块。

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
- P04: dense
- P05: dense
- P06: dense
- P07: dense
- P08: breathing
- P09: dense
- P10: dense
- P11: breathing
- P12: dense
- P13: dense
- P14: anchor

## pptx_structure
- mode: flat

## forbidden
- `mask`, `<style>`, `class`, external CSS, `<foreignObject>`, `textPath`, `@font-face`, `<animate*>`, `<set>`, `<script>` / event attributes, `<iframe>`
- HTML named entities in text; write typography as raw Unicode and escape XML reserved characters
