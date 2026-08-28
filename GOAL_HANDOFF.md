# GOAL_HANDOFF — 持续演进 Goal 交接（第 1 轮 → 第 2 轮）

> 本文件由每轮子代理更新：本轮完成了什么 / 下一轮优先做什么 /
> 当前分支与阻塞项。父代理不改代码，只据此派生下一轮 Task。

---

## 本轮（第 1 轮，v1.13.0）完成了什么

**分支**：`cursor/blender-loop-v1130-a993`（基线 v1.12.0 tip `66353ed`，
非 main）。门禁 63–66 全绿，单测 399→**443**，三连测试全过。

### A) Blender 4.1.1 headless 资产管线（门禁 65）✅
- Blender **4.1.1** 装在 `/opt/blender`（NLUUG 镜像；官方站 Cloudflare
  拦 curl，README 有勘破记录）。`blender --version` 验证可复走。
- `scripts/blender/` 五件：`common.py`（studio rig / Cycles CPU / GLB
  导出）、`gen_corner_wraith.py`（block/mid/fine 三阶段参数化生成）、
  `inspect_blend.py`、`render_views.py`（四机位）、`export_glb.py`。
- 首件英雄资产**拐角魅影**五拍精修 loop 完整实录（README 开发日志：
  病灶逐拍——锥向反置/穿地/管风琴绺束/faceVoid specular）。产物
  `assets/blender/corner_wraith.{blend,glb}` + `renders/` 八张样张。
- `npm run blender:check` 工具链冒烟（无 Blender 环境跳过不红）。

### B) 林奇风审计（门禁 66）✅
- `STYLE_AUDIT.md`：六病灶判断 + 当轮修复（三处**错拍**、一处
  **永久态**）+ 下一轮观察点。审计不是文档作业——病灶当轮就修。

### C) 七厅彩蛋齐加一遍（门禁 63）✅
- 每厅 +1 件、≥2 通道、短句 ≤22 字一次性锁存：碑背白花 / 用剩橡皮 /
  小费罐 / 倒扣杯 / 弱音小号（新音色 `mutetrumpet`，声比乐器晚收半拍）/
  黏土小像 / 趴地书（合上永久）。
- 交互 162→**171**（INTERACTIVE_MIN 重锁普查−1）；mesh 预算 240→**250**
  （两厅贴顶实测勘破；「能合的都合」纪律入 PLAN §6）。
- `tests/v113-eggs.test.js` 30 用例。

### D) 访谈摘录层（门禁 64）✅
- `src/data/interviews.js` **12 条**中英对照短引语（出处只标类型）；
  「访谈摘录册」面板三入口（原话墙 / 年表 / archive 剪报盒）；
  archive 第 7 座立牌 doughnut + DOCENT +1；`interviews.test.js` 14 用例。

### 版本与测试
- bump **1.13.0**；CHANGELOG / QUALITY_GATES 63–66 / WORKLOG / PLAN §6
  预算修订全部入册。
- `npm test` 443 全绿 / `npm run smoke` 5/5 / electron `--smoke` EXIT=0
  （双惊吓自然触发保持）。
- **本轮不打包 exe**（打包链路零改动，1.12.0 exe 仍可用）。

## 下一轮（第 2 轮）优先做什么

1. **Blender loop 第 2、3 件资产**：双峰松树（对照 kit.js
   pineGeometryMaterial v3 找差距）与档案图书梯——沿用五拍 loop 口径
   （gen 脚本 → INSPECT → 四机位 → 目检改参 → GLB）。
2. **GLB 落厅打通**：GLTFLoader 接入一件资产进厅（建议 corner_wraith
   替换或并置 kit.cornerWraith v3 做 A/B 对照），注意 STYLE_AUDIT
   材质克制条目（哑光/低 env/黑影 specular=0）+ mesh/tris 预算断言。
3. **更多访谈条目**：INTERVIEWS 12→20 条（配额单测同步放宽），可选
   murmur 风格 WebAudio 合成朗读（非侵权采样、走低语层）。
4. **彩蛋第二批**：沿 STYLE_AUDIT 观察点——新交互默认零字幕、错拍
   默认、每厅至多一件永久态（趴地书模式）。
5. **打包 1.13.0 exe**（若本轮 Goal 要发布）：BUILD.md 步骤不变；
   注意 v1.12 的 winCodeSign/NSIS 缓存在 VM 轮换后会丢、需现场下载。

## 当前分支与阻塞项

- **分支**：`cursor/blender-loop-v1130-a993`（已推送）。
- **阻塞项**：无硬阻塞。两条环境注意：
  - Blender 不随仓库分发——新 VM 需按 `scripts/blender/README.md`
    重装（NLUUG 镜像 ~30s）；`npm run blender:check` 会在缺 Blender
    时跳过（CI 不红）。
  - electron `--smoke` 的预算/交互断言跑在 **dist 构建产物**上——改厅
    代码后必须先 `npm run build` 再跑，否则拿旧数（本轮实测勘破，
    WORKLOG C 段有记录）。
