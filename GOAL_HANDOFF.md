# GOAL_HANDOFF — 新 Goal「拐角惊吓 + 林奇风演进」交接（第 2 轮 → 第 3 轮）

> 本文件由每轮子代理更新：本轮完成了什么 / 下一轮优先做什么 /
> 当前分支与阻塞项。父代理不改代码，只据此派生下一轮 Task。
> 上一个 Goal（持续演进，九轮 v1.13→v1.21）已终态收官——评估
> 与证据清单存档在 v1.21 版本的本文件（git 历史 `f55c1f0`）。

---

## 本轮（新 Goal 第 2 轮，v1.23.0）完成了什么

**分支**：`cursor/corner-feel-polish-round2-v1230-a993`（基线
v1.22.0 tip，origin/cursor/corner-beat-lock-round1-v1220-a993，
非 main）。门禁 101 全绿，单测 686→**717**（28 文件），四连
测试（test/smoke/electron/blender:check）全过。**机制零改动**：
显形线/贝塞尔滑出/双扳机原封，cornerscare 47 用例几何守卫
一字未动。

### 1) 惊吓手感抛光（交接口径第 1 条）✅

- **CLOSEUP 入锁 0.45→0.35s**：滑出窗 0.55s，入锁快一步才能
  看着它滑完最后半程（原来锁到位时它几乎已站定，闪出被甩在
  镜头摆动里）。
- **FOV 推量 13→15° + 线性换 smoothstep**：起步几乎不动（黑
  与剪影先说话），错拍段推速最快——它站定了，镜头替它往前走。
- **错拍 800→950ms**：它看你的那口气加长一拍半（原片的怕长
  在「它不动」里）；后续三拍顺延 150ms，全程 3.3s（≤4.5s
  冒烟守卫）；错拍第三口心跳间隔收紧 870ms。
- **滑出曲线立方→四次方**：前 0.2s 完成 ~84% 行程，更「闪」。
- **STARE_TILT 错拍中段歪头**：lookAt 每帧重置后绕视线轴
  rotateZ 0.075rad（smoothstep 进、进了就不回）——它在核对你。
- **接近段 q≥0.7 心跳双拍**：190ms 后半拍轻回声（收缩压跟
  上来了）。

### 2) rim 剪影光分拍 + emissive 相位确定化（交接口径第 2 条）✅

- **RIM_BEATS 灯语分拍**：reveal 随滑出进度涨光 + 前 90ms
  打火过冲 / stare 与眼焰**错半拍**呼吸（光弱那一瞬眼最亮）/
  rush 涌光 / 黑幕归零。色温压冷 0x9fb7ff→**0x93aeff**、灯位
  抬高 2.5→**2.9m**（背顶剪冠顶肩线）。**零几何回炉**（12
  mesh / 7388 tris / GLB 224960B 原封，blender:check 七件全过）。
- **魅影 emissive 相位确定化**：惊吓期呼吸曲线从全局钟切到
  **scare.clock 局部时钟**，WRAITH_T0=(2π−1.2)/2.4−0.55 让
  眼焰恒在错拍 ~69% 处烧到峰值——此前赶上全局波谷则整个错拍
  眼是暗的。数学账入 v123-eggs 测试。

### 3) 内容出口双补（交接口径第 3 条）✅

- **DOCENT 回访补注 ×7**（kit.js quoteStandUpdater 加 docent2
  + awayAfterSpoke 回访门）：首段听完**走开再折回**才补讲。
  七厅七条全趣闻/事实向，防撞第七轮零命中（奥斯卡一分钟致辞/
  影碟不设章节点/树木研究员父亲/米兰家具展/住进旧马厩片场/
  传记片企划起点/晚年摇号）。
- **呼叫铃 scare.seen 变奏（变奏第二例）**：那一夜之后应铃的
  换到拐角那头（doorfar 从远门方位换 CORNER_EDGE、2.1→1.4s）
  ——只换既有第二层的方位与迟延，**第三层判死红线不碰**；
  首访原拍原样保留。零网格零新热点：交互普查 195、mull mesh
  244 一格不动。

### 4) Release 1.23.0 ✅

- bump 1.23.0（package.json + `__SV__.version`，版本钉移交
  v123-eggs，v122 两处改钉留账）；新增 **v123-eggs 31 用例**
  （手感边界/相位数学账/rim 分拍/回访门/变奏账/封顶复钉）；
  CHANGELOG/WORKLOG/TESTING/README/STYLE_AUDIT §14/门禁 101
  入册；四连全绿（**717** / smoke 5/5 / electron EXIT=0 /
  blender:check 七件）；dist:win 完整一次成型 + SHA256SUMS +
  DOWNLOAD 直链（见 DOWNLOAD.md）。

## 下一轮（第 3 轮）优先

1. **手感参数已到细调区**：本轮拍长/曲线改动都在 ±150ms/±2°
   量级——若用户仍报「不够吓人」，剩余空间在**音频层**（闷击
   音色、黑幕里的静默长度）与 **wake 错位感**（醒来位置/朝向
   的不对劲），继续内卷拍长参数回报递减。机制照旧不换。
2. **变奏彩蛋两例成型，警惕通胀**：刮痕墙（缺席语法）+ 呼叫
   铃（换位语法）——后轮再加变奏必须有**第三种语法**，同语法
   复制就是通胀。scare.seen 是现成状态位，可复用。
3. **DOCENT 立牌出口已收满**：一层低语 + 回访补注两层到顶——
   再加第三层触「第三层判死」精神。立牌内容后轮只做质量替换；
   若还要新内容出口，需先论证新载体（且不增 INTERACTIVE_MIN）。
4. **维护纪律照旧**：封口轴五条零触碰（回声窗窗长/drawerfar
   三处/暗示预算/BACK IN 5/第三层判死）；三数口径 **195 交互 /
   98 音色 / 40 访谈**；gen_*.py 恰七件；studio 零 GLB；手作
   语言是台灯专利。
5. **性能预算警戒照旧**：twinpeaks 244、mulholland 244（250
   预算）贴顶禁入；studio 224；lobby 207 余量最大。

## 当前分支与阻塞项

- **分支**：`cursor/corner-feel-polish-round2-v1230-a993`
  （已推送，基于 cursor/corner-beat-lock-round1-v1220-a993）。
- **阻塞项**：无硬阻塞。环境注意（新 VM 必读）：
  - Blender 不随仓库分发——按 `scripts/blender/README.md` 重装
    （NLUUG 镜像 ~100s）；`blender:check` 缺 Blender 时跳过不红。
  - electron `--smoke` 断言跑在 **dist 构建产物**上——改厅代码后必须
    先 `npm run build` 再跑（先确认 build 成功再读冒烟数）。
  - **swiftshader 下 capturePage 会返回陈旧帧**（合成器滞后）——
    短时程视效（惊吓 3.3s 序列）的视觉取证不要依赖 SV_SCARE_SHOT
    连拍；几何正确性交单测、功能触发交冒烟、模型视觉交 Blender
    CLI 渲染。
  - **游戏时钟≠真钟**：软件渲染下 dt 封顶 0.1s、游戏时钟走
    0.08–0.42 倍速——凡计时敏感的 `SV_SHOT_PRE` 探针**别用
    setTimeout 数真秒**，注入 `S.engine.updaters` 累加 dt 记游戏秒；
    `SV_SHOT_PRE` 探针会在每个厅执行——先 `S.hall()` 守卫。
  - **teleport 会清俯仰**——俯拍取证俯仰必须写在 PRE 里瞬移之后
    （pitchObject 是 camera 父节点）。
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
  - mulholland 已有 `scare.seen`（刮痕墙 + 呼叫铃两处变奏在用）
    与 `scare.clock`（emissive 局部时钟）；studio 已有 `metro`/
    `saucer`/`chinaState`；archive 已有 `cardArrayReady`——新增
    状态字段先 rg 防撞名。
  - 惊吓拍改动注意两处联动：electron --smoke 的拐角惊吓 wake
    守卫预算 40s（现全程 3.3s 余量大）；v123-eggs 钉了
    SCARE_BEATS 各拍数值——改拍长要改钉留账。
