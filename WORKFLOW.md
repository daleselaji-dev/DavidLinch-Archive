# WORKFLOW — v1.11.0 制作工作流（林奇味精修轮）

> 每个阶段定义 输入 → 产出 → 验证。严格按序执行；若清单提前完成，
> 回到阶段 2–5 做第 N 遍艺术抛光（重做粗糙模型、材质微调、光比、
> 交互连锁、音景分层、性能剖析），直到 `WORKLOG.md` 显示本轮
> 累计 ≥8 小时再进入阶段 7。每阶段结束：commit + push + WORKLOG 记录。
> v1.10 工作流全文见 git 历史（commit `f4662ca`）。

## 阶段 0 — 计划与门禁（本阶段）
- 输入：v1.10.0 代码基线（f4662ca，**非 main**）+ 用户「风格审视 /
  粗糙资产重做 / 拐角惊吓修正 / 多厅捏他 / 重新打包」意图。
- 产出：`PRODUCTION_PLAN.md`（v1.11 重写）、`WORKFLOW.md`（本文件）、
  `WORKLOG.md`（v1.11 段开篇）、`QUALITY_GATES.md` 新增门禁 55–58（草案）。
- 验证：文档齐备，git log 可见独立 commit；基线 348 单测全绿存档。

## 阶段 1 — 风格审计清单过单（A1–A6）
- 输入：PRODUCTION_PLAN §1 + 全馆字幕/hint/材质现状。
- 产出：审计结论逐条入 WORKLOG；「说得太满」的字幕与效果预告式 hint
  修正 commit；后续新增内容全部按 A3「光先于字」执行。
- 验证：captions/narration/antiplastic 单测全绿；审计记录可追溯。

## 阶段 2 — 拐角惊吓修正（最高优先级，先于资产轮）
- 输入：§3 病灶分析（触发区北缘 z=-23.6 vs 拐角 z≈-26.7）。
- 产出：CORNER_SCARE 拐角化 + CORNER_EDGE 导出 + cornerscare.test
  几何守卫；SCARE_BEATS 压迫感层（dreadswell/呼吸红光/逐顿注视）；
  cornerWraith v2（兜帽空腔/第二层破披/三指）；冒烟 routeA 同步。
- 验证：`npm test` 扩展用例全绿；`xvfb-run npx electron . --smoke`
  自然触发连续 ≥3 轮全绿；转身惊吓零回退。

## 阶段 3 — 粗糙资产重做（树/梯优先，B1–B6）
- 输入：§2 清单。
- 产出：pineAssetsV2 双 LOD 松林、枯树桩鸮 v2、咖啡树桩/劈柴墩年轮、
  图书梯细节遍、拐角区立面件；近景截屏对比留档（/tmp/shots-v111/）。
- 验证：`--smoke` 预算硬断言（twinpeaks tris ≤240k）+ 截屏复核。

## 阶段 4 — 多厅捏他彩蛋落地（§4 清单）
- 输入：阶段 2/3 后的场景。
- 产出：eraserhead 缠布之物 + 焦黑球（重点做深）；bluevelvet 耳形凹痕
  首饰盒；twinpeaks 红房间咖啡；studio 帘后小门；archive 心跳灯牌接骨；
  lobby 帷幕过影；配套新音色 ≥3（dreadswell/wetstir/reversecup…）。
- 验证：`--smoke` activateAll 无异常 + INTERACTIVE_MIN 重锁 +
  audio.test 扩展全绿。

## 阶段 5 — 多遍艺术抛光（拉满 ≥8h）
- 输入：阶段 1–4 全部产出。
- 产出：七厅+新件近景机位截屏逐张复核；发现问题清单与修复 commit；
  按 WORKLOG 时长继续第 N 遍抛光（每轮标注「第 N 遍」）；
  门禁 55–57 勾选与证据。
- 验证：`npm test` + `npm run smoke` + `xvfb-run npx electron . --smoke`
  三连全绿。

## 阶段 6 — 全量测试门禁
- 输入：全部改动。
- 产出：三连全绿记录；两重惊吓自然触发多轮取证；预算表终版入册。
- 验证：门禁 55–57 全绿勾选。

## 阶段 7 — 打包 1.11.0
- 输入：全绿代码基线 + WORKLOG ≥8h。
- 产出：`package.json`/`__SV__.version` 1.11.0；portable + NSIS exe；
  `SHA256SUMS.txt`；`DOWNLOAD.md` raw 直链醒目标注本轮 Portable-1.11.0；
  README/BUILD/TESTING/CHANGELOG/QUALITY_GATES 同步。
- 验证：PE 结构校验 + 对同一 dist 的运行时冒烟 + SHA256 记录。

---

## 循环规则
- 阶段 2–5 允许多轮：每轮在 WORKLOG 中标注「第 N 遍抛光」；
- 任何阶段引入回归（测试红）必须先修复再进入下一阶段；
- 每个逻辑变更独立 commit，push 后再开始下一段较长工作；
- 时长未到 8 小时不得进入阶段 7（WORKLOG UTC 时间戳为准，与 git 提交互证）；
- 既有彩蛋/通路/惊吓逻辑（v1.6–v1.10）不回退：拐角主触发（几何修正后
  仍必须自然触发）、转身第二扳机、后巷七段 walkable、讲解员/独石、
  雾呼吸/开幕点灯/接触阴影/墙脚 AO 全部保持，相关单测与冒烟断言不放宽；
- 合规红线每轮复述：零受版权媒体 / 惊吓体抽象无面目 / 捏他为氛围化
  致敬非肖像复刻 / 零受保护对白 / 字幕 ≤22 字。
