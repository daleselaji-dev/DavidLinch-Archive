# WORKFLOW — v1.12.0 制作工作流（拐角贴角 · 资产精修循环轮）

> 每个阶段定义 输入 → 产出 → 验证。严格按序执行；若清单提前完成，
> 回到阶段 2–5 做第 N 遍精修循环（INSPECT→修比例/结构→中尺度→
> 近景→对照→SAVE），直到 `WORKLOG.md` 显示本轮累计 ≥8 小时再进入
> 阶段 7。每阶段结束：commit + push + WORKLOG 记录。
> v1.11 工作流全文见 git 历史（commit `3b946b7`）。

## 阶段 0 — 计划与门禁（本阶段）
- 输入：v1.11.0 代码基线（3b946b7，**非 main**）+ 用户「拐角再贴角 /
  黑影要有长发与眼睛的恐怖感 / 资产精度仍太低 / 细节彩蛋加强 /
  重新打包」意图。
- 产出：`PRODUCTION_PLAN.md`（v1.12 重写）、`WORKFLOW.md`（本文件）、
  `WORKLOG.md`（v1.12 段开篇）、`QUALITY_GATES.md` 新增门禁 59–62（草案）。
- 验证：文档齐备，git log 可见独立 commit；基线 387 单测全绿存档。

## 阶段 1 — 拐角惊吓再校准 + cornerWraith v3（最高优先级）
- 输入：PRODUCTION_PLAN §2/§3 方案（墙体几何实测 + 合规设计）。
- 产出：CORNER_SCARE 收紧到贴角（北缘距拐角 ≤0.7m）+ LURK_PATH
  贝塞尔绕角路径 + 几何守卫收紧；cornerWraith v3（发帘/发绺/眼窝
  空洞/抬头顿挪）；冒烟 routeA 同步；cornerscare.test 更新。
- 验证：`npm test` 全绿；`xvfb-run npx electron . --smoke` 自然触发
  连续 ≥3 轮全绿；转身惊吓零回退；compliance 零肖像词表复跑。

## 阶段 2 — 资产精修循环 B/C（树/梯优先）
- 输入：§1 工作法 + 目标优先队列。
- 产出：pineGeometryMaterial v3、树桩散布件、archive 图书梯第二遍、
  各厅梯/栏杆复查；每资产走完 INSPECT→SAVE 七步并留档截屏。
- 验证：`--smoke` 预算硬断言 + 近景截屏对比留档（/tmp/shots-v112/）。

## 阶段 3 — placeholder 巡查（D）
- 输入：定向机位巡查七厅。
- 产出：点名最弱资产清单 + 逐件重做 commit。
- 验证：同帧一致性复核 + antiplastic 单测全绿。

## 阶段 4 — 英雄道具二级细节 + 彩蛋可发现性（E）
- 输入：七厅英雄资产现状 + 既有彩蛋触达链。
- 产出：每厅 ≥1 件二级细节；彩蛋可发现性以光/声引导（零新增说明字）。
- 验证：`--smoke` activateAll 无异常 + INTERACTIVE_MIN 保持。

## 阶段 5 — 多遍艺术抛光（拉满 ≥8h）
- 输入：阶段 1–4 全部产出。
- 产出：定向机位截屏逐张复核；发现问题清单与修复 commit；门禁
  59–61 勾选与证据。
- 验证：三连全绿（npm test / npm run smoke / xvfb electron --smoke）。

## 阶段 6 — 终版三连
- 输入：全部改动叠加。
- 产出：/tmp/smoke-final.log。
- 验证：387+ 单测全绿；预算断言全过；两重惊吓自然触发保持。

## 阶段 7 — 文档同步
- 产出：CHANGELOG v1.12.0、README、TESTING、QUALITY_GATES 证据回填。

## 阶段 8 — Release 1.12.0（WORKLOG ≥8h 后）
- 产出：版本 bump；`npm run dist:win` 双 exe；SHA256SUMS.txt；
  DOWNLOAD.md 直链换新（指向本分支）；打包产物上三连复跑。
- 验证：门禁 62 全勾。
