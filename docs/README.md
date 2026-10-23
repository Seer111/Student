# docs/ · 文档与资料

这里放的是「不参与运行时」的东西：讲义、课件、设计稿、截图。应用代码分别在
`feynman-platform-backend/`、`feynman-platform-frontend/`、`feynman-platform-whisper-api/`。

| 目录 | 内容 | 说明 |
| --- | --- | --- |
| `课程文档/` | 16 次课讲义（.md） | 《大前端与AI实战》课件正文，按课次命名 |
| `课程PPT/` | 课件 .pptx + 生成工程 | 每份课件一个同名 .pptx；`course09-*/` 是 ppt-master 工程（`design_spec.md`、`spec_lock.md`、`svg_output/`、`notes/`），改完导出即可再生成 |
| `设计/界面美化提示词.md` | 界面设计提示词 | 按 5 张截图逐屏写的改版要求（全局约束 + 单屏方案 + 验收清单） |
| `截图/` | 页面截图 | 本仓库验证时截的图；`原始截图/` 是用户提供的原始截图，勿覆盖 |

## 课件再生成（第九次课为例）

```bash
# 1) 改内容：编辑 svg_output/*.svg 与 notes/*.md（务必用 UTF-8 保存，不要用 PowerShell 文本替换）
# 2) 校验
python "$env:USERPROFILE\.dsh\skills\ppt-master\scripts\svg_quality_checker.py" docs/课程PPT/course09-ai-quiz_20261023 --canonical-authoring --stage final --json
# 3) 后处理 + 导出
python "$env:USERPROFILE\.dsh\skills\ppt-master\scripts\finalize_svg.py" docs/课程PPT/course09-ai-quiz_20261023
python "$env:USERPROFILE\.dsh\skills\ppt-master\scripts\svg_to_pptx.py" docs/课程PPT/course09-ai-quiz_20261023
```

导出的 .pptx 在工程的 `exports/` 下，命名为 `09《大前端与AI实战》第九次课程：AI出题与智能测评系统.pptx` 后放到 `课程PPT/` 根目录，与其它课次保持一致。
