# GOAL_HANDOFF — 持续演进 Goal 交接（第 4 轮 → 第 5 轮）

> 本文件由每轮子代理更新：本轮完成了什么 / 下一轮优先做什么 /
> 当前分支与阻塞项。父代理不改代码，只据此派生下一轮 Task。

---

## 本轮（第 4 轮，v1.16.0）完成了什么

**分支**：`cursor/smoke-velvet-round4-v1160-a993`（基线 v1.15.0 tip
`14e8277`，origin/cursor/velvet-round3-v1150-a993，非 main）。
门禁 76–80 全绿，单测 505→**552**，四连测试（test/smoke/electron/
blender:check）全过，**已打包 1.16.0 exe**。

### 1) Blender loop 第 5 件·蒸汽调速器（门禁 76）✅
- `gen_steam_governor.py` 三档五拍精修（block 比例架 1.66m →
  mid 修柱粗球小/带轮套筒撞件/节流杆贴柱 → fine 修连杆天线化/
  S 臂折痕/叉口啃轴）。定稿 **6 mesh / 4320 tris / GLB 112KB**。
- `blender:check` 扩到**五件**资产比例架。

### 2) GLB 落厅第三批 + 冒烟盲区补漏（门禁 77）✅
- **落厅红线首次执行**：governor 落 **era 西墙**（机器与锅炉房门洞
  之间）——tp/mull 244/250 贴顶禁入，源码级单测钉死。
- **程序化动画直驱**：GLB 与程序化兜底共用 `rigGovernor` 装配
  （spinPivot/armPivots 张角/套筒升降/节流杆随动）；
  `machineState.run` 直驱——拉泄压阀停机它同步塌臂垂停。
  同步代理热区不等 GLB；governorReady 承诺 + glb-landed 信号
  （**冒烟现在共四处 glb-landed**：relief/governor/pine/wraith）。
- **幽灵交互普查（v1.15 工作桌事故制度化）**：`__SV__.auditHotspots()`
  ——热点网格 parent 链上溯必须到 scene，electron 冒烟逐厅硬断言
  （`热点场景归属 <hall>: 全部在场景树上`）。**交互审计从此验
  场景归属**。

### 3) 彩蛋第四批·换轴（门禁 78）✅
- **换轴执行**：远声应答（REPLY_DYAD）密度到顶——七件全部走三条
  新轴，九件新音色（89–97）**零件不入 REPLY_DYAD**（对照单测钉死）：
  - **光的应答**（共用 kit `ANSWER_BREATH` 包络）：lobby 烛剪 /
    bv 空话筒（熄灯档也答）；
  - **温度**（冷高薄、暖低软）：era 结霜支管 / tp 保温座 /
    studio 白瓷小碟（收缩三嗒间隔拉长）；
  - **时间错位**：archive 上弦钥匙（秒针挣三格渐迟，滑回不响）/
    mull 路灯铁杆（灯隔 2.4s **用光原样迟放**——声光不同拍；
    应答只走光通道，不加远场重放）。
- **贴顶厅纪律**：tp/mull 零新增网格（热点落既有 potBase /
  `streetLampV2.userData.pole` 句柄）——冒烟实测两厅仍 244。
- 交互 186→**194**（INTERACTIVE_MIN 重锁 21/35/29/23/26/24/29）。

### 4) 访谈 28→32 条·补「点子」主题（门禁 79）✅
- +4 条全部取自《钓大鱼》可查证原文（钓点子要等/接住的一瞬/
  隔壁的拼图/小鱼与大鱼——书名出处段落与立牌大鱼句互为上下句）；
  「点子」5→**9**（四主题 9/9/8/6 = 32）。
- **防撞记录留档**：doughnut 与 beneath the surface 两候选**已是
  QUOTES 立牌语录**，弃用（interviews.js 注释留名——新增条目前
  先查 essays.js QUOTES 防撞的纪律再次生效）。
- MurmurVoice 纪律保持：朗读仍只有低语一条通道，换筛即收声。

### 5) Release 1.16.0（门禁 80）✅
- bump 1.16.0（package.json + `__SV__.version`，口径一致入单测）；
  CHANGELOG/WORKLOG/TESTING/README/STYLE_AUDIT §7 执行账全部入册；
  四连全绿；双 exe + SHA256SUMS + DOWNLOAD 直链 + 发布产物冒烟复跑。

## 下一轮（第 5 轮）优先做什么

1. **Blender loop 第 6 件**：继续做「厅里还没有的东西」——候选：
   bv 吧台后**酒瓶墙精修件**（bv 231 余量尚可且只有 24 件交互）/
   archive **卡片柜抽屉阵局部**（archive 212）/ studio **台灯座
   车削件**（studio 227）。红线不变：**只能落 bv/archive/studio**
   （era 已有 governor——每厅 ≤1 件；tp/mull 贴顶）。五拍 loop +
   体积纪律 ≤300KB 照旧。
2. **彩蛋第五批（若继续加码）防「等待感」堆积**：全馆带 wait 错拍
   彩蛋已 13 件——第五批考虑**「不等的答」**（即时轴：应答与动作
   同拍但在意想不到的通道）或**「零新增交互」的深化**（给既有件
   加第二层反应，INTERACTIVE_MIN 五轮连涨的惯性该停一停，见
   STYLE_AUDIT §7 自查第 4 条）。
3. **时间错位轴共用件盯防**：archive 上弦钥匙与「停摆的钟」共用
   secHand——两条交互同时触发时的归位逻辑靠 windState 自复位兜底，
   跑一轮并发触发抽查（STYLE_AUDIT §7 自查第 3 条）。
4. **访谈层**：32 条 + 四主题够用；若再扩优先补「此生」主题
   （现最少 6 条）；新增前先查 essays.js QUOTES 防撞（本轮两候选
   撞库教训）。
5. **性能预算警戒**：twinpeaks 244、mulholland 244（250 预算）——
   两厅加任何东西前先合并；era 228 / studio 227 / bv 231 /
   archive 212 / lobby 207（本轮普查口径，冒烟日志为准）。

## 当前分支与阻塞项

- **分支**：`cursor/smoke-velvet-round4-v1160-a993`（已推送，PR 开向
  cursor/velvet-round3-v1150-a993）。
- **阻塞项**：无硬阻塞。环境注意（新 VM 必读）：
  - Blender 不随仓库分发——按 `scripts/blender/README.md` 重装
    （NLUUG 镜像 ~30s）；`blender:check` 缺 Blender 时跳过不红。
  - electron `--smoke` 断言跑在 **dist 构建产物**上——改厅代码后必须
    先 `npm run build` 再跑（先确认 build 成功再读冒烟数）。
  - studio 已有 v1.4 节拍器（`metro` 占用）、v1.16 白瓷小碟
    （`saucer`/`chinaState`）——新增道具前先 rg 同名变量防撞名。
  - GLB 截屏取证两坑：SwiftShader 陈旧帧（`SV_SHOT_DELAY=12000`）+
    双峰岔路机位别踩 groveEgg 触发圈（机位用 6.7,6.2）。
  - 打包 winCodeSign/NSIS 缓存 VM 轮换后会丢，dist:win 时现场下载
    （连通性已验证可达）。

## Goal 终态对照（父 Goal 四目标——未终结，持续中）

- **Blender 管线成熟**：五件资产五拍 loop + GLB 落厅四件（tp 松/
  mull 魅影/lobby 浮雕/era 调速器）+ 体积纪律 + 落厅红线单测化
  ——管线闭环，剩三厅（bv/archive/studio）待落。
- **林奇风**：STYLE_AUDIT 七节病灶→纪律→执行账四轮闭环；本轮
  「换轴」证明风格资产可以谱系化管理（远声封顶→光/温度/时间）。
- **丰富彩蛋互动**：194 件交互、七厅彩蛋五批（v1.13 起每轮 +7）；
  下一轮警惕密度惯性（STYLE_AUDIT §7）。
- **合规访谈**：32 条 + 四主题 + 低语朗读，防撞纪律两轮实战生效。
