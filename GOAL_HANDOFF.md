# GOAL_HANDOFF — 新 Goal「拐角惊吓 + 林奇风演进」交接（第 1 轮 → 第 2 轮）

> 本文件由每轮子代理更新：本轮完成了什么 / 下一轮优先做什么 /
> 当前分支与阻塞项。父代理不改代码，只据此派生下一轮 Task。
> 上一个 Goal（持续演进，九轮 v1.13→v1.21）已终态收官——评估
> 与证据清单存档在 v1.21 版本的本文件（git 历史 `f55c1f0`）。

---

## 本轮（新 Goal 第 1 轮，v1.22.0）完成了什么

**分支**：`cursor/corner-beat-lock-round1-v1220-a993`（基线
v1.21.0 tip `ea9e657`，origin/cursor/maintenance-finale-round9-
v1210-a993，非 main）。门禁 100 全绿，单测 669→**686**（27 文件），
四连测试（test/smoke/electron/blender:check）全过。

### 1) 拐角惊吓触发时机与镜头换代（用户诉求一）✅

- **病灶判定**：v1.8–v1.12 四轮调圆形触发区半径仍被判「时机
  不对」——圆量的是「离拐角多远」，用户要的是「快要看见墙后
  之物」，两者只在特定走位重合。**病灶在机制不在参数**。
- **显形线触发（cornerTrigger v2，kit.js 重写）**：触发线 =
  拐角沿 K × 藏身点 R 连线——跨线瞬间恰是「视线越过拐角、
  它即将入画」的几何瞬间；贴墙走的人在拐角沿本体触发，对侧
  按几何提前一小步；armed()/revealed() 暴露。
- **镜头特写接管（CLOSEUP）**：跨线帧双脚钉死 + yaw/pitch
  smoothstep 0.45s 入锁跟焦那张脸 + FOV 慢推 13°（林奇式慢推）
  ——黑幕帧归还（黑里换手看不见接缝）。
- **单拍 3.2s（SCARE_BEATS 重写）**：灯一口气全灭（狂闪前奏
  退役）→ 0.55s 立方减速抽搐滑出（REVEAL_PATH 贝塞尔）→ 错拍
  站住盯你 → 0.4s 扑近 → 闷击黑幕 → 移回巷口。2.2s 前奏与
  三顿挪退役。
- **接近段恐惧（APPROACH_DREAD）**：心跳渐密 / 巷灯渐次不稳 /
  半程一次低频升压，armed() 静音门。
- **转身惊吓（turnTrigger）零改动**；cornerscare.test **47 用例
  全量重钉**（含「跨显形线 ⟺ 藏身点视线通」逐点等价守卫）；
  electron 冒烟双惊吓自然触发全过。

### 2) corner_wraith 第二轮回炉（用户诉求二）✅

- 用户口径「眼睛很好，其他都要改」：**眼组参数一字不动**
  （环径/环管/亮度/竖长入 v122 测试钉），其余三档五拍重塑——
  主身收瘦杀帽尖 / 驼峰双结 / 肩线歪斜 / 佝偻场（**拍 4 勘破：
  推到头顶会把头冠从脸窗顶出把眼组全挡死——颈上淡出**）/
  发帘罩改披 + 下段不对称合拢（右帘收 26% 左帘内侧越线补缝）/
  前垂发绺 ×4 / 披领前侧后折 / 垂臂收拢左长右短 / 体色发色
  全压进黑（湿发哑光 rough 0.82）。
- **实渲驱动**：每拍四机位渲染对照；最后一处亮柱穿帮用
  **ray_cast 逐像素排查**定案（真身是帘幕合拢沿——藏件对照
  渲染三轮都误判，目检会骗人射线不会）。
- 账目：12 mesh / 7388 tris / GLB **224960B ≤300KB**；对象名与
  wraithPivot 全保——**落厅零改动**（仅换网格保留程序化动画，
  setLurch/setRush 曲线原样）；四机位取证渲染重录
  （assets/blender/renders/corner-wraith-*.png）；blender:check
  七件全过。

### 3) 林奇内容补充（用户诉求三）✅

- 访谈册 **38 → 40 封顶收官**：lightbulbs（心境·灯泡与极乐
  外溢）+ bigboy（此生·趣闻向：七年奶昔日课）双入册——四主题
  **10/10/10/10** 齐平；防撞第六轮零撞车；**封顶后新增永久
  关闸，只做质量替换**（v118/v120/v121 三处历史钉按新口径
  改钉留账）。
- **刮痕墙错拍变奏彩蛋**（零网格零新热点）：scare.seen 置位后
  再摸刮痕墙，预期中的刮擦回应**不来**——空一拍只剩一记轻心跳
  与「刮痕停在了那一夜」。交互普查 195 与 mull mesh 244 一格不动。

### 4) Release 1.22.0 ✅

- bump 1.22.0（package.json + `__SV__.version`，版本钉移交
  v122-eggs.test）；CHANGELOG/WORKLOG/TESTING/README/STYLE_AUDIT
  §13/门禁 100 入册；四连全绿（**686** / smoke 5/5 / electron
  EXIT=0 / blender:check 七件）；dist:win 完整一次成型 + SHA256SUMS
  + DOWNLOAD 直链（见 DOWNLOAD.md）。

## 下一轮（第 2 轮）优先

1. **惊吓时机等真人验收**：显形线在几何上是对的（47 用例等价
   守卫），但「时机对不对」最终裁判是用户手感——若再报时机
   问题，先调 CLOSEUP.lock（0.45s 入锁）与 SCARE_BEATS.stare
   （错拍长度）两个手感参数，**显形线机制本身不要再换**。
2. **魅影若仍不够吓人，下一步在厅内灯光不在几何**：rim 剪影光
   （0x9fb7ff 那盏）的角度/色温/强度优先——棚渲四机位好看
   不等于巷子里那 3.2 秒好看；几何已收敛（12 mesh 7388 tris），
   继续堆几何是回报最低的方向。
3. **内容出口**：访谈 40 关闸 + 195 交互持平后，新内容的合规
   出口只剩 DOCENT 低语（立牌背景层，现 7 条）与彩蛋变奏
   （错拍变奏是首例）——两者零预算压力，适合小步补充。
4. **维护纪律照旧**（上一 Goal 遗产全数生效）：封口轴五条零
   触碰（回声窗窗长/drawerfar 三处/暗示预算/BACK IN 5/第三层
   判死）；三数新口径 **195 交互 / 98 音色 / 40 访谈**；
   gen_*.py 恰七件；studio 零 GLB；手作语言是台灯专利。
5. **性能预算警戒照旧**：twinpeaks 244、mulholland 244（250
   预算）贴顶禁入；studio 224；lobby 207 余量最大。

## 当前分支与阻塞项

- **分支**：`cursor/corner-beat-lock-round1-v1220-a993`
  （已推送，基于 cursor/maintenance-finale-round9-v1210-a993）。
- **阻塞项**：无硬阻塞。环境注意（新 VM 必读）：
  - Blender 不随仓库分发——按 `scripts/blender/README.md` 重装
    （NLUUG 镜像 ~100s）；`blender:check` 缺 Blender 时跳过不红。
  - electron `--smoke` 断言跑在 **dist 构建产物**上——改厅代码后必须
    先 `npm run build` 再跑（先确认 build 成功再读冒烟数）。
  - **swiftshader 下 capturePage 会返回陈旧帧**（合成器滞后）——
    短时程视效（惊吓 3.2s 序列）的视觉取证不要依赖 SV_SCARE_SHOT
    连拍；几何正确性交单测、功能触发交冒烟、模型视觉交 Blender
    CLI 渲染（本轮实录）。
  - **游戏时钟≠真钟**：软件渲染下 dt 封顶 0.1s、游戏时钟走
    0.08–0.42 倍速——凡计时敏感的 `SV_SHOT_PRE` 探针**别用
    setTimeout 数真秒**，注入 `S.engine.updaters` 累加 dt 记游戏秒；
    `SV_SHOT_PRE` 探针会在每个厅执行——先 `S.hall()` 守卫。
  - **teleport 会清俯仰**——俯拍取证俯仰必须写在 PRE 里瞬移之后
    （pitchObject 是 camera 父节点）。
  - **xvfb 显示锁**：并行跑过 electron 后 `:99` 可能被占——
    `xvfb-run -a` 自动挑空闲显示号（本轮实踩）。
  - Blender 渲染排查穿帮件时**别信藏件对照渲染的目检**——用
    `scene.ray_cast(depsgraph, origin, dir)` 逐像素问首命中对象
    （本轮三轮误判后定案的方法，模板在 WORKLOG v1.22 段）。
  - 打包 winCodeSign/NSIS 缓存 VM 轮换后会丢，dist:win 现场下载；
    **必须完整 dist:win 一次成型**，单独重跑 nsis 会超限；asar
    extract-file 校验版本**先 cd /tmp 再跑**（无 --output 参数、
    总写 CWD，在仓库根跑必覆盖根 package.json）。
  - lathe 顶点扰动只用整数角频率（接缝安全）；Blender `box()`
    参数序 (w,h,d)；bpy `create_cone` 的 radius1 在底面（-z）——
    「尖朝下」要翻 z（gen_corner_wraith.py add_cone 行注）。
  - mulholland 已有 `scare.seen`（错拍变奏彩蛋在用）；studio 已有
    `metro`/`saucer`/`chinaState`；archive 已有 `cardArrayReady`
    ——新增状态字段先 rg 防撞名。
