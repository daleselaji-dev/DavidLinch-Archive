# WORKFLOW — v1.4.0 制作工作流（PS5-tier）

> 每个阶段定义 输入 → 产出 → 验证。严格按序执行；若清单提前完成，
> 回到阶段 3–7 做第 N 遍艺术抛光（逐厅重做关键模型、加交互连锁、
> 调光、调材质、音景分层、性能剖析），直到 `WORKLOG.md` 显示本轮
> 累计 ≥8 小时再进入阶段 8。每阶段结束：commit + push + WORKLOG 记录。
> v1.3 工作流全文见 git 历史（commit `2a85370`）。

## 阶段 0 — 计划与门禁（本阶段）
- 输入：v1.3.0 代码基线（af30552）+ 用户 PS5-tier 意图。
- 产出：`PRODUCTION_PLAN.md`（v1.4 重写）、`WORKFLOW.md`（本文件）、
  `WORKLOG.md`（v1.4 段开篇）、`QUALITY_GATES.md` 新增门禁 25–31（草案，未勾选）。
- 验证：文档齐备，git log 可见独立 commit；基线三连测试全绿存档。

## 阶段 1 — 讲解配额审计（保持 v1.0 留白）
- 输入：`src/data/essays.js`、全部 `ui.caption` 字面量。
- 产出：审计报告（配额现状确认）；后续每个新增交互的字幕预先按
  ≤22 字/物性短句/零剧透标准写；单测保持全绿（不放宽任何断言）。
- 验证：`npm test` narration 组全绿。

## 阶段 2 — 材质/着色/后处理升级 PS5-tier
- 输入：`src/halls/kit.js`、`src/core/post.js`、`src/core/engine.js`。
- 产出：
  - `aoFromHeight()`：高度图 → 程序 AO 贴图；`setFrom` 升级五通道；
  - 金属组补 metalnessMap；全部材质工厂接 aoMap（channel=0）；
  - 新材质组 ×3：`marbleSet/marbleMat`、`boomerangSet/boomerangMat`、
    `rustSet/rustMat`；
  - LynchPass：+逐厅 lift/gamma/gain 电影分级（`meta.look.grade`）、
    +halation 光晕（低档关闭）；
  - 双层体积光锥构件（内芯+外晕）。
- 验证：`npm run build` 通过；`tests/kit.test.js` 扩展（新导出/通道完备性/
  尺寸预算审计）；lobby 截屏对比。

## 阶段 3 — 逐厅模型与场景精修（多轮）
- 输入：阶段 2 新材质/构件 + 各厅现状。
- 顺序：lobby → twinpeaks → bluevelvet → mulholland → studio → eraserhead → archive。
- 产出：PRODUCTION_PLAN §3.1 每厅 ≥2 件重做/显著增件；外景厅远景剪影层（P8）；
  近景实用光（P6）。
- 验证：`--smoke` 七厅装载 + 预算内 + 截屏留档（`/tmp/shots-v14/`）逐张复核。

## 阶段 4 — 交互密度与连锁再提升
- 输入：阶段 3 场景。
- 产出：全馆非导航交互 ≥105；每厅连锁 ≥2 条；新交互全部 ≥2 通道反馈；
  冒烟阈值更新（终版普查 -1）。
- 验证：`xvfb-run npx electron . --smoke` 全绿（新阈值生效 + activateAll 无异常）。

## 阶段 5 — 音景 / 配乐再抛光
- 输入：`src/audio/engine.js`、新交互清单。
- 产出：新合成音色 ≥6 种（翻页/抽屉/倒咖啡/瓷器/滚轮/票铃……按实际交互配套）；
  连锁反馈声分层（主音+尾音+持续层）；音色审计单测扩展。
- 验证：`npm test`（audio 扩展用例）+ 冒烟触发链不抛错。

## 阶段 6 — 性能剖析与画质档
- 输入：全部场景。
- 产出：逐厅 meshes/tris/lights 实测表（更新 QUALITY_GATES 30）；
  预算断言上调至 240/240k/40；低档补关 halation；纹理尺寸审计。
- 验证：`--smoke` 预算断言全绿；Q 档切换与自动降档行为确认。

## 阶段 7 — 全量测试 + 强制多遍艺术抛光（拉满 ≥8h）
- 输入：阶段 1–6 全部产出。
- 产出：七厅+内景机位截屏逐张复核；发现问题清单与修复 commit；
  按 WORKLOG 时长继续第 N 遍抛光（每轮标注「第 N 遍」）：逐厅重做关键模型、
  材质微调、光比调整、交互连锁增补、音景分层，直到 ≥8 小时；
  门禁 25–30 勾选与证据。
- 验证：`npm test` + `npm run smoke` + `xvfb-run npx electron . --smoke` 三连全绿。

## 阶段 8 — 打包 1.4.0
- 输入：全绿代码基线 + WORKLOG ≥8h。
- 产出：`package.json`/`__SV__.version` 1.4.0；portable + NSIS 双 exe；
  `SHA256SUMS.txt`；README/BUILD/TESTING/CHANGELOG/QUALITY_GATES 同步。
- 验证：PE 结构校验 + 对同一 dist 的运行时冒烟 + SHA256 记录。

---

## 循环规则
- 阶段 3–7 允许多轮：每轮在 WORKLOG 中标注「第 N 遍抛光」；
- 任何阶段引入回归（测试红）必须先修复再进入下一阶段；
- 每个逻辑变更独立 commit，push 后再开始下一段较长工作；
- 时长未到 8 小时不得进入阶段 8（WORKLOG UTC 时间戳为准）。
