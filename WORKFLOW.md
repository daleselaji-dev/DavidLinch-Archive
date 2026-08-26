# WORKFLOW — v1.9.0 制作工作流（PS5-tier 再冲刺）

> 每个阶段定义 输入 → 产出 → 验证。严格按序执行；若清单提前完成，
> 回到阶段 2–6 做第 N 遍艺术抛光（逐厅重做关键模型、加交互连锁、
> 调光、调材质、音景分层、性能剖析），直到 `WORKLOG.md` 显示本轮
> 累计 ≥8 小时再进入阶段 7。每阶段结束：commit + push + WORKLOG 记录。
> v1.4 工作流全文见 git 历史（commit `ca11f2e`）。

## 阶段 0 — 计划与门禁（本阶段）
- 输入：v1.8.0 代码基线（d317699，**非 main**）+ 用户「PS5-tier 再冲刺 +
  打包 exe」意图。
- 产出：`PRODUCTION_PLAN.md`（v1.9 重写）、`WORKFLOW.md`（本文件）、
  `WORKLOG.md`（v1.9 段开篇）、`QUALITY_GATES.md` 新增门禁 47–50（草案，未勾选）。
- 验证：文档齐备，git log 可见独立 commit；基线三连测试全绿存档。

## 阶段 1 — 材质 / 后处理 / 画面节奏升级
- 输入：`src/halls/kit.js`、`src/core/engine.js`、各厅 `meta.look`。
- 产出：
  - `enamelSet/enamelMat` 瓷釉铁皮材质组（白瓷釉+磕碰露黑+釉裂细纹，B4）；
  - 雾密度呼吸 `fogPulse`（引擎级，逐厅配置，B1）；
  - 尘埃层透明度节奏调制 ≥3 厅（B2）；
  - 大厅开幕点灯序列（B3，只演一次）。
- 验证：`npm run build` 通过；`tests/kit.test.js` 扩展（enamel 导出/通道
  完备性/尺寸审计）；lobby 开幕截屏对比。

## 阶段 2 — 逐厅英雄资产二级细节精修（多轮）
- 输入：阶段 1 新材质/机制 + 各厅现状。
- 顺序：lobby → twinpeaks → bluevelvet → mulholland → studio → eraserhead → archive。
- 产出：PRODUCTION_PLAN §2 每厅 ≥2 件新增/重做（缝/铆钉/磨损/倒角高光/
  指纹污迹 ≥2 种同场）；截屏留档（`/tmp/shots-v19/`）逐张复核。
- 验证：`--smoke` 七厅装载 + 预算内 + 截屏复核。

## 阶段 3 — 交互密度与连锁再提升
- 输入：阶段 2 场景。
- 产出：全馆非导航交互 ≥126；新交互全部 ≥2 通道反馈；每厅连锁 ≥2 保持；
  冒烟阈值更新（终版普查 -1）。
- 验证：`xvfb-run npx electron . --smoke` 全绿（新阈值生效 + activateAll 无异常
  + 拐角/转身两重惊吓自然触发断言保持）。

## 阶段 4 — 音景抛光
- 输入：`src/audio/engine.js`、新交互清单。
- 产出：新合成音色 ≥4 种（与新交互配套）；分层反馈；音色审计单测扩展。
- 验证：`npm test`（audio 扩展用例）+ 冒烟触发链不抛错 + 零采样扫描。

## 阶段 5 — 性能剖析与画质档
- 输入：全部场景。
- 产出：逐厅 meshes/tris/lights 实测表（入 WORKLOG/门禁 48 备注）；
  预算断言保持 240/240k/40；低档回退复核（B6）。
- 验证：`--smoke` 预算断言全绿；Q 档切换与自动降档行为确认。

## 阶段 6 — 全量测试 + 强制多遍艺术抛光（拉满 ≥8h）
- 输入：阶段 1–5 全部产出。
- 产出：七厅+内景机位截屏逐张复核；发现问题清单与修复 commit；
  按 WORKLOG 时长继续第 N 遍抛光（每轮标注「第 N 遍」）：逐厅重做关键模型、
  材质微调、光比调整、交互连锁增补、音景分层，直到 ≥8 小时；
  门禁 47–49 勾选与证据。
- 验证：`npm test` + `npm run smoke` + `xvfb-run npx electron . --smoke` 三连全绿。

## 阶段 7 — 打包 1.9.0
- 输入：全绿代码基线 + WORKLOG ≥8h。
- 产出：`package.json`/`__SV__.version` 1.9.0；portable（+尽量 NSIS）exe；
  `SHA256SUMS.txt`；`DOWNLOAD.md` raw 直链醒目标注本轮 Portable-1.9.0；
  README/BUILD/TESTING/CHANGELOG/QUALITY_GATES 同步。
- 验证：PE 结构校验 + 对同一 dist 的运行时冒烟 + SHA256 记录。

---

## 循环规则
- 阶段 2–6 允许多轮：每轮在 WORKLOG 中标注「第 N 遍抛光」；
- 任何阶段引入回归（测试红）必须先修复再进入下一阶段；
- 每个逻辑变更独立 commit，push 后再开始下一段较长工作；
- 时长未到 8 小时不得进入阶段 7（WORKLOG UTC 时间戳为准）；
- 既有彩蛋/通路/惊吓逻辑（v1.6–v1.8）不回退：拐角主触发、转身第二扳机、
  后巷七段 walkable、讲解员/独石全部保持，相关单测与冒烟断言不放宽。
