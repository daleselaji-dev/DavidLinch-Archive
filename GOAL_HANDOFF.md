# GOAL_HANDOFF — 新 Goal「拐角惊吓 + 林奇风演进」交接（第 3 轮 → 第 4 轮）

> 本文件由每轮子代理更新：本轮完成了什么 / 下一轮优先做什么 /
> 当前分支与阻塞项。父代理不改代码，只据此派生下一轮 Task。
> 上一个 Goal（持续演进，九轮 v1.13→v1.21）已终态收官——评估
> 与证据清单存档在 v1.21 版本的本文件（git 历史 `f55c1f0`）。

---

## 本轮（新 Goal 第 3 轮，v1.24.0）完成了什么

**分支**：`cursor/corner-audio-wake-round3-v1240-a993`（基线
v1.23.0 tip `30e6eb9`，origin/cursor/corner-feel-polish-round2-
v1230-a993，非 main）。门禁 102 全绿，单测 717→**744**（29
文件），四连测试（test/smoke/electron/blender:check）全过。
**机制/几何/拍长零改动**：SCARE_BEATS/CLOSEUP/STARE_TILT/
RIM_BEATS 原值复钉（±0ms，v124-eggs toEqual 整表钉），显形线
47 用例原封，gen 脚本零回炉。

### 1) 音频层病灶修复（交接口径第 1 条上半）✅

- **直通总线**（engine `punch`，本轮最重要的一笔）：勘定发现
  惊吓自己的十一处声（刮擦/三口心跳/闷击/scare 主体/whisper）
  全挂 master——reveal 帧自己的 duck 抽真空 45ms 内把它们压到
  6%，错拍心跳实际推子只剩 0.03、扑近那嗓子只剩 ~15% 电平。
  **「不够吓人」的音频病灶在总线不在音色**。立 punch 直通
  （绕 duck 不绕总压缩器、静音闸同闸、sfx/sfxAt 第 4 路由参），
  「它的声」全走直通；世界侧（灯灭/接近段心跳/半程升压）照旧
  被抽走——抽真空抽走的是世界，不是它。
- **真空罩拍长重钉**（VACUUM）：旧 duck(1.3s) 在 1.345s 就开始
  归还、黑幕段环境底噪回到半血。改罩到 **wake+0.3s**（拐角
  3.555 / 转身 2.005 同构账入测）——环境音比睁眼慢一步回来。
- **音色塑形 98 刹车内零新嗓子**：scare 低频加权 + 双翼去相关
  （棕噪 1.9s、52→27Hz 半沉层、失谐簇 ±0.4 分翼、噪声墙劈两
  面）；scrape 与四次方滑出对时（0.9s 线性→0.58s 指数快落、
  石屑 0.48s）；thud 力度分层（vol≥0.9 惊吓级才醒 31→19Hz
  深层——全馆家具级闷响原封，普查恰两处入测）。
- **接近段持续低压层**（engine `setDread`）：dreadswell 同源
  27Hz 嗓子拉成 sustain（增益 q² 封顶 0.2、指数趋近），与巷灯
  /心跳同 q 同 armed 闸；挂 master 跨线帧被真空一并抽走；换厅
  stopAmbience 归零。**非新音色**（case 恰 98 复钉）。

### 2) wake 错位感（交接口径第 1 条下半）✅

- **俯冲醒**（WAKE_DAZE.pitch −0.36）：teleport 清俯仰后把视线
  压到脚边巷口地面——醒来不是站着醒的，头要自己抬起来。
- **字幕迟到 1.15s**：先自己认出这是哪儿，那句「有些拐角，
  不该拐过去。」才补刀。
- **只给拐角惊吓**：转身惊吓平视即醒即字——两重 wake 从此不只
  字幕不同：一个错的是**空间**（醒姿/声音都不对），一个错的
  是**时间**（转身与看见之间没有间隙）。

### 3) 变奏彩蛋第三例·时序反转语法（交接口径第 2 条）✅

- **路灯杆**：scare.seen 后敲杆**手上没声**、灯同帧把双沉答完、
  你那记铁鸣 2.4s 后才从杆里走出来——**答在问前**。与缺席
  （刮痕墙）/换位（呼叫铃）语法不同源。零字幕零网格零新热点、
  v1.16 贴顶纪律与远声密度钉原封（迟到的声在段外 rev 更新器走
  游戏时钟）；`if (scare.seen)` 恰三处封口入测——**三例三语法
  到此收满，再加就是通胀**。交互普查 195 持平、mull mesh 244
  持平。

### 4) Release 1.24.0 ✅

- bump 1.24.0（版本钉移交 v124-eggs；cornerscare dreadswell
  接线钉改钉留账 + v123 版本钉同值语义移交）；新增 **v124-eggs
  27 用例**（直通接线普查/真空账/俯冲醒顺序/塑形钉/低压层/
  反转账/机制拍长零改动复钉）；CHANGELOG/WORKLOG/TESTING/
  README/STYLE_AUDIT §15/门禁 102 入册；四连全绿（**744** /
  smoke 5/5 / electron EXIT=0——含 scare.seen 后三条变奏分支
  无异常 / blender:check 七件）；dist:win 完整一次成型 +
  SHA256SUMS + DOWNLOAD 直链（见 DOWNLOAD.md）。

## 下一轮（第 4 轮）优先

1. **拐角惊吓四层齐了，下一步是真机验收不是继续改造**：机制
   （显形线）→ 手感（拍长/镜头/歪头）→ 灯语（rim 分拍/相位
   确定化）→ 音频与 wake（直通/真空/塑形/低压层/俯冲醒）四轮
   四层全部落地。swiftshader 无音频输出、陈旧帧不可信——本轮
   全部时序正确性交 v124-eggs 账目钉。**若用户仍报「不够吓
   人」，先问清「哪一拍不吓人」**（接近段没压？滑出不闪？错拍
   不僵？扑近不响？醒来不晕？）再定向动手，全面翻修的回报已经
   递减到负值。
2. **wake 空间错位的下一档（若需要）**：俯冲醒+字幕迟到+环境
   音迟归三件已到身体面——再往下是 WAKE_POINT 挪位置/换朝向
   （醒在「不该在」的地方）。动之前先论证与巷口地标/CORNER
   几何的关系，且 electron 冒烟的 wake 位置断言要同步。
3. **三个内容出口全部收满，只剩质量替换**：变奏三语法封口
   （scare.seen 恰三处入测）、DOCENT 二层封口、访谈 40 封顶——
   第 4 轮内容侧只有质量替换一条路；新载体需先论证且不增
   INTERACTIVE_MIN。**变奏第四例判死**：任何语法都会稀释前
   三例。
4. **维护纪律照旧**：封口轴五条零触碰（回声窗窗长/drawerfar
   三处/暗示预算/BACK IN 5/第三层判死）；三数口径 **195 交互 /
   98 音色 / 40 访谈**；gen_*.py 恰七件；studio 零 GLB；手作
   语言是台灯专利。
5. **性能预算警戒照旧**：twinpeaks 244、mulholland 244（250
   预算）贴顶禁入；studio 224；lobby 207 余量最大。

## 当前分支与阻塞项

- **分支**：`cursor/corner-audio-wake-round3-v1240-a993`
  （已推送，基于 cursor/corner-feel-polish-round2-v1230-a993）。
- **阻塞项**：无硬阻塞。环境注意（新 VM 必读）：
  - Blender 不随仓库分发——按 `scripts/blender/README.md` 重装
    （NLUUG 镜像 ~100–335s）；`blender:check` 缺 Blender 时跳过不红。
  - electron `--smoke` 断言跑在 **dist 构建产物**上——改厅代码后必须
    先 `npm run build` 再跑（先确认 build 成功再读冒烟数）。
  - **swiftshader 下 capturePage 会返回陈旧帧**（合成器滞后）——
    短时程视效（惊吓 3.3s 序列）的视觉取证不要依赖 SV_SCARE_SHOT
    连拍；几何正确性交单测、功能触发交冒烟、模型视觉交 Blender
    CLI 渲染。**WebAudio 同理无输出可言**——音频时序正确性交
    v124-eggs 真空账/直通钉/对时账，冒烟只证不抛错。
  - **游戏时钟≠真钟**：软件渲染下 dt 封顶 0.1s、游戏时钟走
    0.08–0.42 倍速——凡计时敏感的 `SV_SHOT_PRE` 探针**别用
    setTimeout 数真秒**，注入 `S.engine.updaters` 累加 dt 记游戏秒；
    `SV_SHOT_PRE` 探针会在每个厅执行——先 `S.hall()` 守卫。
  - **teleport 会清俯仰**——俯拍取证俯仰必须写在 PRE 里瞬移之后
    （pitchObject 是 camera 父节点）；WAKE_DAZE 俯冲醒依赖同一
    顺序（先 teleport 后压 pitch，v124-eggs 有顺序守卫钉）。
  - **xvfb 显示锁**：并行跑过 electron 后 `:99` 可能被占——
    `xvfb-run -a` 自动挑空闲显示号。
  - Blender 渲染排查穿帮件时**别信藏件对照渲染的目检**——用
    `scene.ray_cast(depsgraph, origin, dir)` 逐像素问首命中对象
    （模板在 WORKLOG v1.22 段）。
  - 打包 winCodeSign/NSIS 缓存 VM 轮换后会丢，dist:win 现场下载；
    **必须完整 dist:win 一次成型**，单独重跑 nsis 会超限；asar
    extract-file 校验版本**先 cd /tmp 再跑**（无 --output 参数、
    总写 CWD，在仓库根跑必覆盖根 package.json）。
  - lathe 顶点扰动只用整数角频率（接缝安全）；Blender `box()`
    参数序 (w,h,d)；bpy `create_cone` 的 radius1 在底面（-z）——
    「尖朝下」要翻 z（gen_corner_wraith.py add_cone 行注）。
  - mulholland 已有 `scare.seen`（刮痕墙/呼叫铃/路灯杆三处变奏
    在用，**恰三处有测试钉**——新增分支会红）、`scare.clock`
    （emissive 局部时钟）与 `poleEcho.rev`（反转变奏迟到声）；
    studio 已有 `metro`/`saucer`/`chinaState`；archive 已有
    `cardArrayReady`——新增状态字段先 rg 防撞名。
  - 惊吓拍改动注意三处联动：electron --smoke 的拐角惊吓 wake
    守卫预算 40s（现全程 3.3s 余量大）；v124-eggs 钉了
    SCARE_BEATS/CLOSEUP/STARE_TILT/RIM_BEATS **整表 toEqual
    原值**——改拍长要改钉留账；**VACUUM 是 wake+0.3−0.045 的
    派生账**（v124-eggs 有算式钉）——改 SCARE_BEATS.wake 必须
    同步改 VACUUM.hold，否则真空罩漏拍。
  - engine `sfx/sfxAt` 第 4 参是 punch 路由——新惊吓声想直通
    传 `true`；世界的声（环境/家具/脚步）**不要**走直通（会
    躲过抽真空破坏「世界消失」）。`setDread` 挂 master 是刻意
    的（dread 属于世界）。
