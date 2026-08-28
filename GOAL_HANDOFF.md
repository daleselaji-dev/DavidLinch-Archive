# GOAL_HANDOFF — 新 Goal「拐角惊吓 + 林奇风演进」交接（第 9 轮 → 第 10 轮）

> 本文件由每轮子代理更新：本轮完成了什么 / 下一轮优先做什么 /
> 当前分支与阻塞项。父代理不改代码，只据此派生下一轮 Task。
> 上一个 Goal（持续演进，九轮 v1.13→v1.21）已终态收官——评估
> 与证据清单存档在 v1.21 版本的本文件（git 历史 `f55c1f0`）。

---

## 第 9 轮纯巡检（零代码改动，版本维持 1.27.0）✅

无用户证词轮，按第 8→9 轮交接口径执行**纯巡检零改动**。同分支
`cursor/doorfar-wake-echo-round8-v1270-a993`（基线 tip `6078ce4`），
四连全跑**全绿零病灶**：

- `npm test` **817/817**（32 文件，2.2s）→ `npm run smoke` 5/5
  → `npm run build` + `xvfb-run electron --smoke` 全队列
  **EXIT=0**（109s：七厅全过·六 glb-landed·普查
  195=22/37/30/24/30/27/25·mesh 峰值 mull 244 / tp 243 /
  studio 224（250 预算贴顶禁入照旧）·**双惊吓自然触发双朝向档**
  ——拐角 reveal 序列面南醒 yaw 0 + 转身冲脸背巷醒 yaw π，彩蛋
  corner-scare,turn-scare,alley-dread 全触发）→
  `npm run blender:check` 七件全过（Blender 4.1.1 在环境）。
- 封口轴五条 + 三数 **195 交互 / 98 音色 / 40 访谈**随 817 复钉
  确认（v121–v127-eggs 钉全绿）；变奏第四例判死复钉在册。
- 环境注意复证：本轮又遇 **2 次 shell spawn Aborted**（build+
  electron 复合长命令首发即中），拆步重跑即过——与第 8 轮 VM
  瞬态进程孵化故障同款，「失败先拆步重试再排查」口径有效。
- **零代码改动、版本维持 1.27.0**（第 5/6 轮先例）；改动仅本
  文件 + WORKLOG 一行。**第 10 轮仍等用户真机证词**：有证词按
  第 8→9 轮交接的模板对号修（届时 bump）；无证词继续纯巡检；
  **仍不建议 UpdateGoal complete**（无用户真机证词红线）。
- **验收捷径已入库**（第 9 轮后文档-only 微轮，零运行时改动）：
  DOWNLOAD.md「v1.27 验收走查」加控制台捷径——
  `__SV__.teleport(9.3, -25.5, 0)` 直达显形线（z≈−26.506）前
  1m 面南，走 ~1m 即触发；`__SV__.scareProbe()` 状态位对照
  TESTING.md 耳机验收清单。
- **魅影目检件已入库**（第 9 轮后验收辅助微轮，文档+png only、
  版本维持 1.27.0）：Blender 4.1.1 离线渲 corner_wraith 四机位
  `assets/acceptance/v127/wraith-{front,side,three,top}.png`
  （common.py 同棚 Cycles 96 采样；front/side 与 render_views.py
  机位逐位一致，three/top 为验收加拍）+ DOWNLOAD.md「v1.27 验收
  走查」加「魅影形体目检」小节（直链 + v1.22 三条线出题：发帘/
  垂臂/眼窝）——(B) 项不跑游戏也能审；零 mulholland.js/惊吓
  逻辑改动，817 复跑全绿，仍等用户证词。

---

## 本轮（新 Goal 第 8 轮，v1.27.0）完成了什么

**分支**：`cursor/doorfar-wake-echo-round8-v1270-a993`（基线第 7
轮 tip `ac2e6db`，origin/cursor/experience-patch-round7-
v1260-a993，非 main）。门禁 107。**本轮是「先巡检后一声」**：
无用户证词，四连巡检全绿零病灶后，只消费 r6 报告遗留的最后一笔
已论证改进（第 7→8 轮交接第 3 点的 doorfar 复用路径）——一声，
不翻修。v1.26 三刀（FOV 渐窄/滑出改闪/巷灯缓燃）参数 ±0。

### 1) 维护巡检（改动前基线 + 改动后复跑，各一整轮全绿）✅

- `npm test` 800/800 → 817/817 / `npm run smoke` 5/5 ×2 /
  electron `--smoke` 全队列 **EXIT=0 ×2**（七厅全过·六
  glb-landed·普查 195=22/37/30/24/30/27/25·tp 243 / mull 244 /
  studio 224·双惊吓自然触发双朝向档）/ `blender:check` 七件 ×2。
- 封口轴五条随钉复验、195/98/40 三数持平、gen_*.py 恰七件、
  studio 零 GLB、变奏第四例判死复钉——**零病灶**。

### 2) 唯一小修补·劫后远门回声（WAKE_ECHO）✅

- **`{ delayMs: 2000, vol: 0.5, ref: 8 }`**：拐角惊吓（daze）黑幕
  醒来 2.0s（任务窗 1.5–2.5s 取中），拐角那头很远的一扇门
  **关上/落锁**——复用 v1.10 的 doorfar 音色（**98 刹车内零
  新增**）；方位复用 v1.23 呼叫铃变奏「这次是拐角那头应的」
  **同一扇门**（CORNER_EDGE——世界里答话的门只有那一扇）。
  醒来面南朝巷，这一声落在视线尽头的黑里（离轴 2.2°，pan≈0.03）。
- **错拍留账（选了「声先于灯」）**：环境音回满 wake+1.9s
  （VACUUM 0.3+release 1.6——doorfar 挂 master 不走直通，世界的
  声回来它才响得成）→ **门 2.0s** → 灯 3.0s 燃满（门响时
  WAKE_RELIGHT smoothstep≈0.74，巷子还压在半黑里）。迟到字幕
  仍在屏上（1.15s+5.2s 驻留），这一声**零字幕不解释**。
- **边界纪律**：只给拐角 daze——**转身惊吓不分家此项**（它的
  错位在时间轴，wake 保持安全复位语言）；回调内 phase≠0 让位闸
  （新惊吓接管时回声让位，与 relight 同纪律）。
- **实现取舍留账（先算后写救了一命）**：far 族惯用 vol0.4/
  ref2.6 在 36.2m 处 vol·att≈0.006——**会被引擎混音器 0.015
  裁声线整只裁掉**（一声无声的修补）；改 vol0.5/ref8 →
  ≈0.045（裁声线 3× 余量、≤0.08 仍是「远」，数学账入钉）。
  调用写数字字面量——audio.test far 族提取器只认字面量，写
  常数引用会静默逃过纪律审计。

### 3) 测试与发布 ✅

- **v127-eggs 17 用例**钉一声全部边界（拍点窗口/声等世界/错拍/
  字幕零新增/daze 边界/让位闸/同门方位/可闻性与声像实算/字面=
  账本/三刀零改动七表复钉/纪律三数/版本钉 1.27.0）；v126-eggs
  版本精确钉按惯例移交同值语义。800→**817** 全绿（32 文件，
  首跑即绿）。
- **Release 1.27.0**：dist:win 首跑 EXIT=1（7za 载荷步被 VM
  瞬态进程孵化故障打断——nsis.7z ENOENT + Portable 残缺 26MiB；
  同窗口 shell 也两次 spawn Aborted，内存充足排除 OOM）——
  **半成品全清后完整重跑一次成型 EXIT=0**（不拆目标单跑）；
  PE32 ×2；asar 内版本 1.27.0 核对（先 cd /tmp）；双 exe
  95.82/95.99MiB <100MiB raw 限；SHA256SUMS 重写自校；DOWNLOAD
  直链换轨本分支 + 1.26.0 双产物同轮 git rm；发布产物终版冒烟
  复跑 EXIT=0。
- 文档收口：CHANGELOG/门禁 107/WORKLOG/TESTING（817 + v127-eggs
  行 + 耳机清单加「劫后回声」拍）/README 一句/DOWNLOAD（反馈
  模板加「本轮一声」一空：到位/太响/太轻没听见/方向不对/多余）。
- 内容侧零替换留账（无新语料源、无过硬可查证候选——宁持平不换
  弱，第 4–8 轮口径复认）。

---

## 父 Goal 四目标对照表（第 8 轮收官评估——诚实口径）

| 目标 | 技术栈状态 | 缺什么 |
|------|-----------|--------|
| **(A) 拐角惊吓「更吓人」** | **齐 + r6 全部改进（含遗留一笔）已落地**：四层 + 两重 wake 四轴分家 + 变奏三例封口 + 机械层逐帧实证（r5/r6）+ v1.26 三刀 + **本轮劫后远门回声**——r6 报告列的体验层改进至此**全部消费完，包括第 7 轮留的最后一笔** | **仍只缺用户真机证词**。三刀 + 一声是否到位是体感命题——DOWNLOAD 反馈模板已按「一声 + 三刀」出题 |
| **(B) 魅影形体** | **齐**：Blender 管线两轮回炉定稿 + GLB 落厅 + rim 分拍灯语 + 滑出体态去抖（网格零改动） | 等用户二次目检证词（若指认某条线，按线定向改） |
| **(C) 内容出口** | **满**：访谈 40 封顶、DOCENT 全事实级、变奏三例语法封口、195 交互 / 98 音色（本轮复用零新增）。质量替换通道保持开但止损线明确 | 无硬缺口。仅剩被动等待：有过硬可查证候选句才动 |
| **(D) 工程纪律** | **齐**：门禁 107 个、817 单测、四连 CI、封口轴五条、GLB 七件账、发布产物双 exe + SHA + 直链 | 无 |

**是否建议 UpdateGoal complete：不建议（但这是技术栈侧的最后
一笔）。** 理由：(A) 的验收判据是「用户觉得更吓人」——无用户
真机证词不得建议 complete（第 3 轮起红线）。与第 7 轮的差别：
当时还挂着 r6 遗留的「远门声」一笔；**本轮把它落了——技术栈已
无任何已论证未做的改进**，改进清单真正清空。第 9 轮若有证词，
按证词修（届时视改动 bump）；若用户回「够吓人/到位」，可凭证词
建议 complete；若仍无证词，第 9 轮应是**纯巡检零改动轮**——
没有下一个「已论证未做」项可消费了，再动手就是无靶翻修。

---

## 下一轮（第 10 轮）优先（原第 9 轮清单——第 9 轮纯巡检零消费，逐条仍适用）

1. **第一优先：消费用户真机证词**（若有）。先按 DOWNLOAD 的
   「本轮一声 + v1.26 三刀」模板对号：**劫后回声**（太响/太轻→
   只动 WAKE_ECHO.vol/ref 但必须重算 36.2m 可闻性账（v127-eggs
   数学钉会逼你算）；方向不对→查 pan 账；多余→revert 是一处
   later 块 + WAKE_ECHO 常数 + v127-eggs 改钉留账）；**三刀**照
   第 7→8 轮交接的模板（drop ≤8 且浅于 fovPush / 四次方指数联动
   v123 曲线钉 / WAKE_RELIGHT.dur 联动 v127-eggs 错拍钉——注意
   本轮新增依赖：**改 dur 或 delayMs 都要过「声先于灯」窗口钉**）。
   其余证词照旧：拍长联动 VACUUM 派生账、鸮按线修、魅影按机位修。
   证词落到哪就修哪，没落到的照旧零改动。
2. **若仍无证词：纯巡检零改动轮**。改进清单已彻底清空（r6 遗留
   一笔本轮已消费）——可做的仅剩：①四连巡检 + 三数 + 封口轴
   ②有过硬可查证候选句才做的 ≤1 条质量替换③巡检翻红按红修。
   **版本维持 1.27.0**（第 5/6 轮先例：版本钉三方一致优先）。
3. **wake 分家封口**：四轴 + 劫后回声只归拐角侧——转身惊吓
   wake 不再加东西（它的错位在时间轴）；WAKE_POINT 挪位三案
   判死照旧（STYLE_AUDIT §16）。远声侧也到顶：**不要给转身
   惊吓配对称的「另一声」**——对称化是无靶翻修的常见伪装。
4. **变奏第四例判死复钉**；封口轴五条零触碰；三数口径 **195
   交互 / 98 音色 / 40 访谈**；gen_*.py 恰七件；studio 零 GLB。
5. **性能预算警戒**：twinpeaks 243、mulholland 244（250 预算）
   贴顶禁入；studio 224；lobby 207 余量最大——但无证词锚点
   不加件。
6. **版本纪律**：有代码修补 → 1.28.0 + v128-eggs + 完整
   dist:win 一次成型 + 直链换轨；纯巡检轮 → 维持 1.27.0 留账。

## 当前分支与阻塞项

- **分支**：`cursor/doorfar-wake-echo-round8-v1270-a993`
  （已推送，基于 cursor/experience-patch-round7-v1260-a993）。
- **阻塞项**：无硬阻塞。**真机验收是外部依赖**——v1.27 双 exe
  直链已换轨（DOWNLOAD.md），「一声 + 三刀」反馈模板已出题，
  等用户走查回证词。
- 环境注意（新 VM 必读）：
  - Blender 不随仓库分发——按 `scripts/blender/README.md` 重装
    （NLUUG 镜像 ~100–335s）；`blender:check` 缺 Blender 时跳过不红。
    本轮 VM 自带 4.1.1（/usr/local/bin/blender），不保证下轮还有。
  - **VM 偶发瞬态进程孵化故障**（本轮实证：shell 两次 spawn
    Aborted + dist:win 首跑 7za 载荷步被打断产出残缺 exe，内存
    余量充足非 OOM）——dist:win 后**必查三件**：EXIT=0、双 exe
    尺寸 ~96MiB 量级（26MiB 是残缺件）、asar 内版本；失败就把
    半成品全清（含 win-unpacked/latest.yml）完整重跑，不拆目标。
    长命令建议走 tmux 会话 + 日志文件轮询。
  - electron `--smoke` 断言跑在 **dist 构建产物**上——改厅代码后必须
    先 `npm run build` 再跑（`npm run smoke` 自带 build，先跑它最省事）。
  - **swiftshader 下 capturePage 会返回陈旧帧**、**WebAudio 无
    输出**——时序正确性交 v124–v127-eggs 账目钉 + 冒烟状态位
    实录；几何正确性交单测、功能触发交冒烟、模型视觉交 Blender
    CLI 渲染。
  - **软渲染大帧会饿死页面 setInterval**（r6 实证：50ms 轮询实际
    ~5s）——计时敏感探针用 `S.engine.onUpdate(fn)` 逐渲染帧记录；
    探针输出借 `[sv] glb-<自定义>` 前缀走冒烟回显通道；复现全套见
    `assets/acceptance/v125/r6-corner-walkthrough-probe.txt`。
  - **游戏时钟≠真钟**：软件渲染下 dt 封顶 0.1s、游戏时钟走约
    0.065–0.42 倍速——`later()` 是 setTimeout 真钟、relight/
    squeeze 更新器是游戏钟（真机同拍、软渲染盒里别拿两者互证）。
  - **改惊吓段前先读四处钉**：cornerscare 47 用例（几何 + 源码
    字面钉）、v123-eggs（setLurch 调用字面钉 + 四次方曲线钉）、
    v124-eggs（`lampDread.v = 0; audio.setDread(0); return;`
    正则——dread 更新器早退路径容不下插行）、**v127-eggs
    （wakeUp daze 块次序钉：doorfar 调用必须在 if (daze) 与
    else 之间、让位闸先于响；错拍窗口钉锁 delayMs/dur 关系）**。
  - **FOV 三个写者**（squeeze/CLOSEUP/releaseGrab）、**巷灯四个
    写者**（壁灯闪烁/dreadTrig/惊吓灯灭帧/relight）——改前先数
    写者、对交接账。
  - **远声先算可闻性再写**：引擎 `sfxAt` 有 `vol·att < 0.015`
    裁声线（att=(ref/dist)^1.6）——远距离照抄惯用 vol/ref 会
    产出一声无声的修补；`spatialParams` 可在单测里实算。far 族
    调用必须写**数字字面量**（audio.test 提取器只认字面，常数
    引用会静默逃过纪律审计）。
  - **teleport 会清俯仰、设 yaw**——WAKE_DAZE 俯冲醒依赖先
    teleport 后压 pitch 顺序；改 WAKE_POINT/WAKE_DAZE.yaw 必须
    同步 electron 冒烟 wantYaw 与 v125-eggs 朝向几何账。
  - **xvfb 显示锁**：`xvfb-run -a` 自动挑空闲显示号。
  - 打包 winCodeSign/NSIS 缓存 VM 轮换后会丢，dist:win 现场下载；
    asar extract-file 校验版本**先 cd /tmp 再跑**（无 --output
    参数、总写 CWD）；Portable 是 7z 直包 74 件（`7za x` 直接抽
    `resources/app.asar`），Setup 才是嵌套 app-64.7z。
  - mulholland 已有 `scare.seen`/`scare.clock`/`poleEcho.rev`/
    `scareProbe`；新增状态字段先 rg 防撞名。
  - engine `sfx/sfxAt` 第 4/6 参是 punch 路由——惊吓自己的声
    直通、**世界的声（含 doorfar）不走直通**；`setDread` 挂
    master 是刻意的。
  - `assets/acceptance/` 是验收取证区（不进构建产物）；`*.log`
    在 .gitignore——日志摘录用 .txt 落库。
