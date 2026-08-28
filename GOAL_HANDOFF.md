# GOAL_HANDOFF — 新 Goal「拐角惊吓 + 林奇风演进」交接（第 7 轮 → 第 8 轮）

> 本文件由每轮子代理更新：本轮完成了什么 / 下一轮优先做什么 /
> 当前分支与阻塞项。父代理不改代码，只据此派生下一轮 Task。
> 上一个 Goal（持续演进，九轮 v1.13→v1.21）已终态收官——评估
> 与证据清单存档在 v1.21 版本的本文件（git 历史 `f55c1f0`）。

---

## 本轮（新 Goal 第 7 轮，v1.26.0）完成了什么

**分支**：`cursor/experience-patch-round7-v1260-a993`（基线第 6
轮 tip `d8b1723`，origin/cursor/walkthrough-probe-round6-
v1260-a993，非 main）。门禁 106。**本轮消费的是 r6 走查报告的
三条有靶改进**（机械层五星零病灶，体验层三条建议）——照靶修补，
不是全面翻修：显形线机制不换、gen_corner_wraith 几何不回炉、
SCARE_BEATS 六拍零改动（拍长不动 → VACUUM 派生账原封）。

### 1) 靶一·接近压迫 FOV 渐窄（APPROACH_SQUEEZE，高优先）✅

- **`{ z0: -24.5, z1: -26.4, drop: 5 }`**：跨线前最后 ~2m（z0 距
  中巷跨线点 z≈−26.506 恰 2.0m；z1 = APPROACH_DREAD.z1 同步收满）
  FOV 从常态 70° smoothstep 渐窄到 65°——接近段的窒息感补上视觉
  声部（此前只有心跳渐密 + 巷灯不稳）。
- **同闸同步**：armed() 门 + 惊吓进行中不收 + 巷内限定——冷却中
  的巷子照旧不预支压迫。**位置驱动收放**：走多深收多少、退回去
  就还回来；收窄直取位置值（跨线帧压满无时滞）、松开按帧缓释
  （dt×6——闸口翻脸不许一帧弹回）。
- **CLOSEUP 交接**：跨线帧 `grab.fov0` 捕获当前（可能已收窄的）
  FOV，慢推从 fov0 起步续推——推近终点代数上恒为 55°（与 fov0
  无关），交接帧零跳变；黑幕帧 releaseGrab 照旧归还 70°；squeeze
  随触发清零（醒来不补写旧账）。
- **实现取舍留账**：走独立更新器而非塞进 dread 更新器——v124-eggs
  的 `lampDread.v = 0; audio.setDread(0); return;` 正则钉容不下
  中间插行。显形线触发几何零改动。

### 2) 靶二·reveal 滑出去抽搐拍（中优先）✅

- **beat=sin(s·6π) 三口急抽搐退役**（摇 roll/沉浮/甩臂三通道
  全退）：滑出从「顿挪出来」改回「一整口气闪出来」（用户原话
  要原片那种闪）。GLB 版（mulholland.js）与 kit 程序化兜底版
  **双侧同步**。贝塞尔路径与四次方缓动零改动（前 0.2s 仍完成
  ~84% 行程）；前倾/抬头随 s 平滑加深、发帘惯性慢摆（t 基）保留。
- **错拍/rush 零改动**：s=1 处 sin(6π)=0——错拍站桩体态与旧账
  **逐位相同**（数学账入 v126-eggs），歪头 STARE_TILT、rush 高频
  扑动 sin(t·13) 原封。只改滑出段，不改 stare/rush 拍长——
  SCARE_BEATS 没动，**不触发 VACUUM/v124 改钉条款**。
- **实现取舍留账**：在 setLurch **体内**退役而非调用侧加参——
  cornerscare 47 用例的签名正则 `(s, t = 0)` 与 v123-eggs 的调用
  字面钉 `setLurch(s, t)`/`(1, t)` 全部原封，零旧测试改钉。
  lurchEase 纯函数留册（kit 导出 + 顿挪性质单测不拆——它是账）。

### 3) 靶三·wake 后巷灯缓慢重燃（WAKE_RELIGHT，中优先）✅

- **`{ dur: 3 }`**：拐角惊吓（daze）黑幕醒来，整巷两盏壁灯 +
  后门看护灯 **3s smoothstep 从黑里燃回**（旧账一瞬回满）——
  俯冲醒抬头时巷子还压在半黑里，灯比环境音（VACUUM.release
  1.6s）回得更晚，劫后余生的余韵。
- **只给拐角惊吓**：转身惊吓 else 分支照旧灯随醒瞬回——两重
  wake 分家自此**四轴**（醒姿/字幕时机/朝向/灯的归来）。
- **让位闸**：新惊吓接管灯时重燃中止（phase≠0——灯归惊吓管）；
  游戏时钟累加（软渲染纪律）。**WAKE_POINT 挪位三案维持判死**
  （STYLE_AUDIT §16）——动的是灯，不是落点。

### 4) 测试与发布 ✅

- **v126-eggs 26 用例**钉三改动边界（窗口账/收放不对称/交接账/
  双侧退役/分家四轴/机制拍长几何零改动六表复钉/纪律三数/版本钉
  1.26.0）；v125-eggs 版本精确钉按惯例移交同值语义。774→**800**
  全绿（31 文件），首跑即绿。
- 四连门禁全绿：`npm test` 800/800 / `npm run smoke` 5/5 /
  electron `--smoke` 全队列 **EXIT=0**（七厅全过·六 glb-landed·
  普查 195=22/37/30/24/30/27/25·tp 243 / mull 244 / studio 224·
  双惊吓双朝向档·scareProbe 逐拍实录）/ `blender:check` 七件。
- **Release 1.26.0**：dist:win 完整一次成型 EXIT=0（114s）；
  PE32 ×2；asar 内版本核对（先 cd /tmp）；双 exe 均 <100MiB
  raw 限；SHA256SUMS 重写；DOWNLOAD 直链换轨本分支 + 1.25.0
  双产物同轮 git rm 防混用；发布产物终版冒烟复跑 EXIT=0。
- 文档收口：CHANGELOG/门禁 106/WORKLOG/TESTING（800 + v126-eggs
  行 + 耳机清单三拍更新）/README/DOWNLOAD（**本轮三刀反馈模板**
  ——FOV/闪出/缓燃三空）；r6 报告两件移入
  `assets/acceptance/v125/`（验收取证区纪律）。
- 内容侧零替换留账（本轮无新语料源、无过硬可查证候选——宁持平
  不换弱，第 4–6 轮口径复认）；封口轴五条 / 变奏第四例判死 /
  195 交互 / 98 音色 / 40 访谈全持平。

---

## 父 Goal 四目标对照表（第 7 轮收官评估——诚实口径）

| 目标 | 技术栈状态 | 缺什么 |
|------|-----------|--------|
| **(A) 拐角惊吓「更吓人」** | **齐 + r6 三靶已修**：四层（显形线/拍长/rim 灯语/音频直通+真空罩+wake 错位）+ 两重 wake 四轴分家 + 变奏三例封口 + 机械层逐帧实证（r5/r6）+ **本轮体验层三刀**（接近压迫视觉声部/滑出改闪/醒后灯缓燃）——r6 报告列的全部体验层改进已落地 | **仍只缺用户真机证词**。三刀是否到位（FOV 太轻/太重？闪出够不够？缓燃有没有余韵？）是体感命题——DOWNLOAD 反馈模板已按三刀出题 |
| **(B) 魅影形体** | **齐**：Blender 管线两轮回炉定稿（12 mesh 7388 tris，眼组红线原封）+ GLB 落厅 + rim 分拍灯语 + emissive 相位确定化；本轮滑出体态去抖（网格零改动） | 等用户二次目检证词（若指认某条线，按线定向改） |
| **(C) 内容出口** | **满**：访谈 40 封顶（10/10/10/10）、DOCENT 全事实级、变奏三例语法封口、195 交互 / 98 音色。质量替换通道保持开但止损线明确 | 无硬缺口。仅剩被动等待：有过硬可查证候选句才动 |
| **(D) 工程纪律** | **齐**：门禁 106 个、800 单测、四连 CI、封口轴五条、GLB 七件账、发布产物双 exe + SHA + 直链 | 无 |

**是否建议 UpdateGoal complete：不建议（但比第 6 轮更近了）。**
理由：(A) 的验收判据是「用户觉得更吓人」——无用户真机证词不得
建议 complete（第 3 轮起红线）。与第 6 轮的差别：当时 CI 侧可证
的已证完、体验层三条建议还挂着；**本轮把三条全部落地**——现在
真正处于「等外部输入、无已知待办」态。若用户走查 v1.26 回「够
吓人/三刀到位」，下一轮可凭证词建议 complete；若按模板回拍位/
三刀证词，按靶再修（届时 bump 1.27.0）。

---

## 下一轮（第 8 轮）优先

1. **第一优先：消费用户真机证词**（若有）。**先按 DOWNLOAD 的
   「本轮三刀」模板对号**：FOV 渐窄（太轻→加 drop 但 ≤8 且必
   须浅于 fovPush；太重/头晕→减 drop 或缩窗；改值只动
   APPROACH_SQUEEZE 常数 + v126-eggs 改钉）、滑出（还不够闪→
   动四次方指数须联动 v123-eggs 曲线钉；宁可要旧抽搐→恢复
   beat 是一行 revert + v126-eggs 退役钉反转，留账）、缓燃
   （太慢/太快→只动 WAKE_RELIGHT.dur + v126-eggs 恰等钉）。
   其余证词照旧：惊吓按拍修（改拍长必须联动 VACUUM.hold 派生
   账 + v124/v125/v126-eggs 改钉留账）、鸮按线修、魅影按机位修。
   **证词落到哪就修哪，没落到的照旧零改动**。
2. **若仍无证词：不建议任何无靶改造**。r6 报告的体验层建议
   已全部消费完——**改进清单已清空**，再动手就是无靶翻修。可做
   的仅剩：①维护巡检（四连 + 三数 + 封口轴）②有过硬可查证
   候选句才做的 ≤1 条质量替换③若巡检翻出红，按红修。
3. **wake 四轴分家到顶**（醒姿/字幕时机/朝向/灯的归来），挪落点
   三案已否决（STYLE_AUDIT §16）——**此轴封口**，除非真机证词
   推翻。r6 报告还提过「醒来加一声远处门关/锁扣声」——本轮
   **未做**（任务只点了灯；且 98 音色封口，新嗓子需专门论证），
   若下轮想做须先过 98 刹车关（复用既有音色 doorfar 可免新增）。
4. **变奏第四例判死复钉**；封口轴五条零触碰；三数口径 **195
   交互 / 98 音色 / 40 访谈**；gen_*.py 恰七件；studio 零 GLB。
5. **性能预算警戒**：twinpeaks 243、mulholland 244（250 预算）
   贴顶禁入；studio 224；lobby 207 余量最大——但无证词锚点
   不加件。
6. **版本纪律**：有代码修补 → 1.27.0 + v127-eggs + 完整
   dist:win 一次成型 + 直链换轨；纯文档轮 → 维持现版并留账
   （第 5/6 轮先例：版本钉三方一致优先于版本号叙事）。

## 当前分支与阻塞项

- **分支**：`cursor/experience-patch-round7-v1260-a993`
  （已推送，基于 cursor/walkthrough-probe-round6-v1260-a993）。
- **阻塞项**：无硬阻塞。**真机验收是外部依赖**——v1.26 双 exe
  直链已换轨（DOWNLOAD.md），三刀反馈模板已出题，等用户走查
  回证词。
- 环境注意（新 VM 必读）：
  - Blender 不随仓库分发——按 `scripts/blender/README.md` 重装
    （NLUUG 镜像 ~100–335s）；`blender:check` 缺 Blender 时跳过不红。
    本轮 VM 自带 4.1.1（/usr/local/bin/blender），不保证下轮还有。
  - electron `--smoke` 断言跑在 **dist 构建产物**上——改厅代码后必须
    先 `npm run build` 再跑（`npm run smoke` 自带 build，先跑它最省事）。
  - **swiftshader 下 capturePage 会返回陈旧帧**（合成器滞后）——
    短时程视效的视觉取证不要依赖连拍；几何正确性交单测、功能
    触发交冒烟、模型视觉交 Blender CLI 渲染。**WebAudio 同理无
    输出可言**——时序正确性交 v124–v126-eggs 账目钉 + 冒烟状态
    位实录。
  - **软渲染大帧会饿死页面 setInterval**（r6 实证：50ms 轮询实际
    ~5s）——计时敏感探针用 `S.engine.onUpdate(fn)` 逐渲染帧记录；
    探针输出借 `[sv] glb-<自定义>` 前缀走冒烟回显通道（避开
    `glb-failed`/`uncaught` 字样）；小窗 `SV_WIN_SIZE` 提帧率、
    `SV_SHOT_DELAY` 推开工装走测；仪器跑与断言跑分开。复现全套见
    `assets/acceptance/v125/r6-corner-walkthrough-probe.txt`。
  - **游戏时钟≠真钟**：软件渲染下 dt 封顶 0.1s、游戏时钟走约
    0.065–0.42 倍速（随窗口浮动）——计时敏感探针别用 setTimeout
    数真秒；`SV_SHOT_PRE` 每厅执行——先 `S.hall()` 守卫。
  - **改惊吓段前先读三处钉**：cornerscare 47 用例（几何 + 源码
    字面钉，含 setLurch 签名正则 `(s, t = 0)`）、v123-eggs
    （`setLurch(s, t)`/`(1, t)` 调用字面钉 + 四次方曲线钉）、
    v124-eggs（`lampDread.v = 0; audio.setDread(0); return;`
    正则——**dread 更新器早退路径容不下插行**，本轮 FOV 渐窄走
    独立更新器就是为它让路）。
  - **FOV 有三个写者**：APPROACH_SQUEEZE 更新器（常态，epsilon
    闸）、CLOSEUP 更新器（grab.on 期间独占——squeeze 让位）、
    releaseGrab（归还 baseFov）。改任何一处先对交接账
    （grab.fov0 捕获在 doCornerScare，v126-eggs 有终点数学钉）。
  - **巷灯有四个写者**：两盏壁灯闪烁更新器（读 lampKill/
    lampDread/lampPanic）、dreadTrig 恐惧拍（cooldown 90）、
    两重惊吓灯灭帧、**relight 重燃更新器**（本轮新增——只在
    relight.t≥0 活动，phase≠0 让位）。改灯语先数写者。
  - **teleport 会清俯仰、设 yaw**——WAKE_DAZE 俯冲醒依赖先
    teleport 后压 pitch 顺序（v124-eggs 顺序守卫）；改 WAKE_POINT/
    WAKE_DAZE.yaw 必须同步 electron 冒烟 wantYaw 参数与
    v125-eggs 朝向几何账。
  - **冒烟 wake 轮询的补甩头会跟 wake 抢 yaw**——onTick 已按
    状态位让位；改转身测试节奏时别把这个闸拆了（竞态账在
    WORKLOG v1.25）。
  - **xvfb 显示锁**：并行跑过 electron 后 `:99` 可能被占——
    `xvfb-run -a` 自动挑空闲显示号。
  - 打包 winCodeSign/NSIS 缓存 VM 轮换后会丢，dist:win 现场下载；
    **必须完整 dist:win 一次成型**，单独重跑 nsis 会超限；asar
    extract-file 校验版本**先 cd /tmp 再跑**（无 --output 参数、
    总写 CWD，在仓库根跑必覆盖根 package.json）。
  - lathe 顶点扰动只用整数角频率（接缝安全）；Blender `box()`
    参数序 (w,h,d)；bpy `create_cone` 的 radius1 在底面（-z）——
    「尖朝下」要翻 z。three.js ConeGeometry 尖朝 +y——鸮的垂尾/
    趾锥「尖朝下/前」全靠 rx 翻转（行注在 twinpeaks 鸮段）。
  - **鸮段改动防撞**：眼组三钉 + 栖枝几何账 + 净账 mergedMesh
    恰 2 都在 v125-eggs——挪鸮/挪枝/加件会红，先读账再动。
  - mulholland 已有 `scare.seen`（三处变奏，恰三处有测试钉）、
    `scare.clock`、`poleEcho.rev`、`scareProbe`（build 返回，
    只读快照）；studio 已有 `metro`/`saucer`/`chinaState`；
    archive 已有 `cardArrayReady`——新增状态字段先 rg 防撞名。
  - engine `sfx/sfxAt` 第 4 参是 punch 路由——新惊吓声想直通
    传 `true`；世界的声不要走直通。`setDread` 挂 master 是刻意
    的（dread 属于世界）。
  - `assets/acceptance/` 是验收取证区（不进构建产物，合规扫描
    只扫 src/ 与 electron/）；`*.log` 在 .gitignore——日志摘录
    用 .txt 落库。
