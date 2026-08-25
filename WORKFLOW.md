# WORKFLOW — v1.3.0 制作工作流

> 每个阶段定义 输入 → 产出 → 验证。严格按序执行；若清单提前完成，
> 回到阶段 3–7 做第二遍/第三遍艺术抛光（逐厅重做关键模型、加交互热点、
> 调光、调材质、音景分层、性能剖析），直到 `WORKLOG.md` 显示累计 ≥7 小时。
> 每阶段结束：commit + push + WORKLOG 记录。

## 完工状态（2026-08-25/26 收口）
- ✅ 阶段 0–8 全部完成；阶段 3–7 实际执行**三遍艺术抛光**（WORKLOG 逐段可查）。
- 最终产出：90 件非导航交互、35 件预制体、18 种新合成音、程序化混响、
  预算峰值 203 mesh / 12.4 万 tris / 26 灯（上限 220/200k/40），
  139 单测 + 构建冒烟 + 运行时全厅巡检三连全绿，1.3.0 双 exe + SHA256SUMS。
- 门禁 19–24 全部勾选（见 QUALITY_GATES.md 最终自检表 v1.3.0）。

## 阶段 0 — 计划与门禁（本阶段）
- 输入：v1.2.0 代码基线（5d8e6cb）+ 用户意图校正。
- 产出：`PRODUCTION_PLAN.md`、`WORKFLOW.md`、`WORKLOG.md`、
  `QUALITY_GATES.md` 新增门禁 19–24（草案，未勾选）。
- 验证：文档齐备，git log 可见独立 commit。

## 阶段 1 — 讲解回退 v1.0 克制 + 去叙事
- 输入：`src/data/essays.js`、七厅 `ui.caption` 全量、粉笔字等场景内文字。
- 产出：
  - 旁白全馆 ≤8 条 × ≤16 字（风格化空间提示措辞）；
  - 删除/替换一切原作叙事性文案（对白引用、剧情还原句）；
  - 事实铭牌语言统一为「片名+年份」一行；
  - `tests/narration.test.js` 扩展：配额收紧断言 + 叙事禁词扫描（源码级）。
- 验证：`npm test` 全绿（新断言生效）。

## 阶段 2 — kit / 材质系统升级
- 输入：`src/halls/kit.js`。
- 产出：
  - `normalFromHeight()`：Canvas 高度图 → Sobel 法线贴图；
  - 纹理工厂返回 `{map, normalMap, roughnessMap}` 组合（木/砖/金属/织物/沥青/水泥/皮革）;
  - 材质工厂（§2.2 清单），含 anisotropy 拉丝金属、湿面水材质；
  - 新预制体：多臂吊灯、点唱机、目录柜、排椅、老轿车 v2、电话亭 v2、
    台灯 v2、收音机 v2、荧光灯具、炉门等（供阶段 3 使用）；
  - 移除/降级旧「一刀切 roundedBox」构件的默认用法。
- 验证：`npm run build` 通过；新增 `tests/kit.test.js`（法线生成尺寸/通道、
  材质工厂通道完备性——node 环境可测的纯逻辑部分）。

## 阶段 3 — 逐厅模型精修（重做关键 mesh）
- 输入：阶段 2 预制体 + 各厅现状。
- 顺序：twinpeaks → studio → bluevelvet → mulholland → eraserhead → lobby → archive。
- 产出：每厅 ≥2 件「重做而非调参」关键模型（见 PRODUCTION_PLAN §3 表）+
  地面/墙面换用新 PBR 组合材质 + 磨损与湿面落位。
- 验证：`--smoke` 七厅装载 + 预算内 + 截屏留档（`/tmp/shots-v13/`）。

## 阶段 4 — 逐厅交互密度提升
- 输入：阶段 3 场景。
- 产出：
  - 每厅非导航交互 ≥8（双峰/房间 ≥10），类型覆盖 §7；每厅 ≥1 条连锁反应；
  - `hotspots.add` 支持 `nav` 标记；`__SV__.countInteractives()` 钩子；
  - `electron/main.cjs` 冒烟逐厅断言交互阈值。
- 验证：`xvfb-run npx electron . --smoke` 全绿（新断言生效）。

## 阶段 5 — 音景 / 配乐抛光
- 输入：`src/audio/engine.js`、`drones.js`、`jazz.js`。
- 产出：新交互 sfx ≥10 种；`sfxAt()` 位置化通道 + 每帧听者更新；
  大厅留声机点播爵士；音量层级复核（配乐不盖底噪静默）。
- 验证：`npm test`（audio 扩展用例）+ 冒烟触发链不抛错。

## 阶段 6 — 性能预算与低画质档
- 输入：全部场景。
- 产出：逐厅 meshes/tris 实测表（更新 QUALITY_GATES）；低画质档强化
  （颗粒/色差减半 + 像素比 1.0 + 关 Bloom）；纹理尺寸审计。
- 验证：`--smoke` 预算断言全绿；Q 键切换冒烟脚本覆盖。

## 阶段 7 — 全量测试 + 艺术第二遍抛光（强制）
- 输入：阶段 1–6 全部产出。
- 产出：七厅截屏逐张复核记录（光比/材质读感/交互提示可见性）；
  发现的问题清单与修复 commit；门禁 19–24 勾选与证据链接；
  必要时回到阶段 3/4/5 做第三遍。
- 验证：`npm test` + `npm run smoke` + `xvfb-run npx electron . --smoke` 三连全绿。

## 阶段 8 — 打包 1.3.0
- 输入：全绿代码基线。
- 产出：`package.json` 版本 1.3.0；portable + NSIS 双 exe；
  `SHA256SUMS.txt`；README/BUILD/TESTING/QUALITY_GATES 文档同步。
- 验证：PE 结构校验 + 对同一 dist 的运行时冒烟 + SHA256 记录。

---

## 循环规则
- 阶段 3–7 允许多轮：每轮在 WORKLOG 中标注「第 N 遍抛光」；
- 任何阶段引入回归（测试红）必须先修复再进入下一阶段；
- 每个逻辑变更独立 commit，push 后再开始下一段较长工作。
