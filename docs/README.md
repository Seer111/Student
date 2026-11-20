# docs/ · 文档与资料

这里放的是「不参与运行时」的东西：讲义、课件、设计稿、截图、作业与项目报告。
应用代码分别在 `feynman-platform-backend/`、`feynman-platform-frontend/`、`feynman-platform-whisper-api/`。

| 目录 | 内容 | 说明 |
| --- | --- | --- |
| `课程文档/` | 16 次课讲义（.md） | 《大前端与AI实战》课件正文，按课次命名 |
| `课程PPT/` | 课件 .pptx + 生成工程 | 每份课件一个同名 .pptx；`courseXX-*/` 是 ppt-master 工程（`design_spec.md`、`spec_lock.md`、`svg_output/`、`notes/`、`validation/`）。`backup/`、`exports/` 是中间产物，已随 `npm`/`python` 重建，不入库 |
| `课程作业/` | 选题报告与设计（.md + .docx）+ `图/` 6 张设计图 | 课程作业 10 项：选题、理由、调研、功能、User Story、用例图、原型图、类图、活动图、功能结构图与状态图；`图/费曼学习系统-设计图.drawio` 是多页可编辑源 |
| `项目报告/` | 实验报告（模板版）+ 图源 | `费曼学习平台-实验报告.docx` 按《安卓实验报告模板2023版》十节结构；`实验报告-图源.md` 是 7 张 mermaid 图的源码；`安卓实验报告.docx` 为学院下发的模板（实际是 .doc 格式、内含示例图），勿改 |
| `项目管理/` | WBS 与甘特图 | `费曼学习平台-WBS与甘特图.md`（32 个工作包 / 270 人日 / 14 周）+ `甘特图.png`、`WBS分解图.png`（同目录 .html 为生成源） |
| `答辩自测/` | `t1.md` | 答辩自测题库（5 题）；出题规则见根目录 `AGENTS.md` |
| `设计/界面美化提示词.md` | 界面设计提示词 | 按 5 张截图逐屏写的改版要求（全局约束 + 单屏方案 + 验收清单） |
| `截图/` | 页面截图 | 本仓库验证时截的图；`原始截图/` 是用户提供的原始截图，勿覆盖 |

## 课件再生成（以第九次课为例）

```bash
# 1) 改内容：编辑 svg_output/*.svg 与 notes/*.md（务必用 UTF-8 保存，不要用 PowerShell 做文本替换）
# 2) 校验（必须先产出 canonical 质量报告，否则 svg_to_pptx 会拒绝）
python "$env:USERPROFILE\\.dsh\\skills\\ppt-master\\scripts\\svg_quality_checker.py" docs/课程PPT/course09-ai-quiz_20261023 --canonical-authoring --stage final --json
# 3) 后处理 + 导出
python "$env:USERPROFILE\\.dsh\\skills\\ppt-master\\scripts\\finalize_svg.py" docs/课程PPT/course09-ai-quiz_20261023
python "$env:USERPROFILE\\.dsh\\skills\\ppt-master\\scripts\\svg_to_pptx.py" docs/课程PPT/course09-ai-quiz_20261023
```

导出的 .pptx 在工程的 `exports/` 下，命名为 `09《大前端与AI实战》第九次课程：AI出题与智能测评系统.pptx` 后放到 `课程PPT/` 根目录，与其它课次保持一致。
