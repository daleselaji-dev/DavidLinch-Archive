# GOAL_HANDOFF — 新 Goal「拐角惊吓 + 林奇风演进」交接（第 4 轮 → 第 5 轮）

> 本文件由每轮子代理更新：本轮完成了什么 / 下一轮优先做什么 /
> 当前分支与阻塞项。父代理不改代码，只据此派生下一轮 Task。
> 上一个 Goal（持续演进，九轮 v1.13→v1.21）已终态收官——评估
> 与证据清单存档在 v1.21 版本的本文件（git 历史 `f55c1f0`）。

---

## 本轮（新 Goal 第 4 轮，v1.25.0）完成了什么

**分支**：`cursor/owl-refine-acceptance-round4-v1250-a993`（基线
v1.24.0 tip `91bb8da`，origin/cursor/corner-audio-wake-round3-
v1240-a993，非 main）。门禁 103 全绿，单测 744→**774**（30
文件），四连测试（test/smoke/electron/blender:check）全过。
**拐角惊吓四层零翻修**：SCARE_BEATS/CLOSEUP/STARE_TILT/
RIM_BEATS/VACUUM/APPROACH_DREAD 六表 toEqual 原值复钉，惊吓
本体唯一改动是 wake 朝向档（见 2）。

### 1) 双峰鸮程序化精修（用户原始诉求补漏）✅

- 用户原话「建模眼睛很好，其他部分可以再改进」——**前半句是
  红线，后半句是工单**：眼组（位置/半径/emissive 0xffb45e@1.15/
  眨眼-亮起机制）逐字复钉不动；改的全是形。
- **轮廓 v2**：满胸(0.118@0.16)/收颈(0.068@0.302)/圆颅
  (0.082@0.335) 三段剪影替换旧桶形；收形不吞眼（颈腰 r0.0735 <
  眼心轴距 0.0828，账入测）。**合拢双翼 + 垂尾**（剪影第二读
  点，尾楔沉到栖枝以下）。**耳羽簇 v2**（加高外张 + 前副簇）。
- **栖枝关系修正**（几何账不是目测账）：旧账鸮底悬空 48mm、
  偏枝轴 60mm 爪下无枝——落座 3.075 骑轴 z0.07 四趾扣枝；枝面
  标高参数方程连同旧账判死条件一起入测。
- **净账 −1**：形件与身体同料合并单 mesh（3→2），tp 冒烟实测
  **244→243**（贴顶厅精修模板：先问哪些件同材质，再问要不要
  新 mesh）。禁新 GLB（tp 仅孪生松照旧）。

### 2) wake 空间错位下一档：挪朝向不挪落点 ✅

- **挪落点三案论证否决并留账**（STYLE_AUDIT §16）：backlot 在
  转身武装区内（醒来转头连锁二吓）；剧场内部脱离巷口地标（毁
  字幕迟到「先认出这是哪儿」前提）；马路失可辨识性。**落点的
  可辨识性是 wake 设计的承重墙**。
- **拐角惊吓面南朝巷醒**（WAKE_DAZE.yaw 0）：正对拐角沿离轴仅
  2.2°，视线沿途两盏将熄壁灯渐次没入黑——它把你转过来，让你
  看着你刚拐过去的那条巷子；字幕落下时你看着的就是那个方向。
  转身惊吓照旧 π 背巷——**两重 wake 分家三轴**（醒姿/字幕时机/
  朝向）。
- **冒烟断言同步**：wake 轮询位置+朝向双档（拐角 0/转身 π、
  容差 0.02）；顺带修复朝向档暴露的**补甩头旧竞态**（wake 传送
  后再甩一记把 yaw 抬到 2π——位置断言历轮看不见；修法 onTick
  带状态位快照，惊吓进行中/已在巷口让位）。

### 3) 真机验收基建 ✅

- **scareProbe 状态位只读快照**：mull build 返回 phase/sub/
  clock/seen → `__SV__.scareProbe()` 转发（非惊吓厅 null）→
  冒烟 wake 轮询逐拍实录进日志（`[smoke] … 状态位: phase=2
  sub=reveal …`）。
- **TESTING「拐角惊吓耳机验收清单」**：七拍（接近段/跨线帧/
  错拍/扑近/冲击/黑幕/俯冲醒）逐拍列「该听到什么/该看到什么」
  + 状态位对照口径。**目的：把「不够吓人」变成可定位的证词**
  ——swiftshader 无音频、陈旧帧不可信，CI 证账目，真机证体感。

### 4) 内容侧仅质量替换 + Release 1.25.0 ✅

- **DOCENT.home 换弱条**：原句是全 DOCENT 唯一零可查证事实的
  印象句（违背本层「只写事实级内容」口径）——换入可查证制作史
  （《妖夜慌踪》主宅=好莱坞山自宅，Lynch on Lynch 有载）；防撞
  展陈层零出现恰一处入测。**访谈宁持平不换弱**：最薄条
  continuing 符合退役画像，但同主题候选句无一可查证度过硬——
  伪引语的代价比薄引语高一个量级（留账入测）。变奏第四例判死
  复钉；195 交互 / 98 音色 / 40 访谈 / gen 七件全持平。
- bump 1.25.0 + **v125-eggs 30 用例**（眼组复钉/收形账/栖枝账/
  净账/朝向账/断言同步钉/scareProbe 接线/清单在册钉/防撞/六表
  复钉）；CHANGELOG/WORKLOG/TESTING/README/STYLE_AUDIT §16/
  门禁 103 入册；四连全绿（**774** / smoke 5/5 / electron
  EXIT=0——双惊吓双朝向档 + 状态位实录 / blender:check 七件）；
  dist:win 完整一次成型 + SHA256SUMS + DOWNLOAD 直链。

## 下一轮（第 5 轮）优先

1. **拐角惊吓：账目基建已齐，等真机证词——默认零改动**。四层
   + 三轴分家 + 状态位实录 + 耳机清单全部落地。在用户按
   TESTING「耳机验收清单」指认**哪一拍**没到位之前，任何再
   改造都是无靶射击（全面翻修回报已递减到负值，§16 留档）。
   若用户给出拍位证词：按拍定向修补，改拍长必须联动
   VACUUM.hold 派生账 + v124/v125-eggs 改钉留账。
2. **鸮精修已回应用户原话，等二次目检**。若用户指认某条线
   （轮廓/翼尾/栖枝/耳羽）再按线定向改，不整只回炉；眼组
   红线照旧。tp 现 243/250（让回 1 格），精修仍须净账 ≤0。
3. **wake 三轴分家到顶**：醒姿/字幕时机/朝向之后只剩挪落点，
   三候选已论证否决（§16）——**此轴封口**，除非用户真机反馈
   推翻论证。
4. **内容三出口只有质量替换**：换条目前先过「违背既有纪律才
   换」这一关（DOCENT.home 是先例）；访谈替换必须过可查证
   关——**宁持平不换弱，伪引语是事故**。变奏第四例判死照旧。
5. **维护纪律照旧**：封口轴五条零触碰（回声窗窗长/drawerfar
   三处/暗示预算/BACK IN 5/第三层判死）；三数口径 **195 交互 /
   98 音色 / 40 访谈**；gen_*.py 恰七件；studio 零 GLB；手作
   语言是台灯专利。
6. **性能预算警戒**：twinpeaks **243**（本轮 −1）、mulholland
   244（250 预算）仍贴顶禁入；studio 224；lobby 207 余量最大。

## 当前分支与阻塞项

- **分支**：`cursor/owl-refine-acceptance-round4-v1250-a993`
  （已推送，基于 cursor/corner-audio-wake-round3-v1240-a993）。
- **阻塞项**：无硬阻塞。**真机验收本身是外部依赖**——耳机清单
  与状态位实录已备好，等用户走查回证词。
- 环境注意（新 VM 必读）：
  - Blender 不随仓库分发——按 `scripts/blender/README.md` 重装
    （NLUUG 镜像 ~100–335s）；`blender:check` 缺 Blender 时跳过不红。
  - electron `--smoke` 断言跑在 **dist 构建产物**上——改厅代码后必须
    先 `npm run build` 再跑（先确认 build 成功再读冒烟数）。
  - **swiftshader 下 capturePage 会返回陈旧帧**（合成器滞后）——
    短时程视效的视觉取证不要依赖连拍；几何正确性交单测、功能
    触发交冒烟、模型视觉交 Blender CLI 渲染。**WebAudio 同理无
    输出可言**——时序正确性交 v124/v125-eggs 账目钉 + 冒烟状态
    位实录。
  - **游戏时钟≠真钟**：软件渲染下 dt 封顶 0.1s、游戏时钟走
    0.08–0.42 倍速——计时敏感探针别用 setTimeout 数真秒，注入
    `S.engine.updaters` 累加 dt；`SV_SHOT_PRE` 每厅执行——先
    `S.hall()` 守卫。
  - **teleport 会清俯仰、设 yaw**——WAKE_DAZE 俯冲醒依赖先
    teleport 后压 pitch 顺序（v124-eggs 顺序守卫）；**v1.25 起
    wake 还有朝向档**：改 WAKE_POINT/WAKE_DAZE.yaw 必须同步
    electron 冒烟 wantYaw 参数与 v125-eggs 朝向几何账。
  - **冒烟 wake 轮询的补甩头会跟 wake 抢 yaw**——onTick 已按
    状态位让位（phase≠0 或已在巷口不甩）；改转身测试节奏时
    别把这个闸拆了（拆了朝向断言必挂——竞态账在 WORKLOG v1.25）。
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
    `scare.clock`、`poleEcho.rev`、**`scareProbe`（build 返回，
    只读快照）**；studio 已有 `metro`/`saucer`/`chinaState`；
    archive 已有 `cardArrayReady`——新增状态字段先 rg 防撞名。
  - engine `sfx/sfxAt` 第 4 参是 punch 路由——新惊吓声想直通
    传 `true`；世界的声不要走直通。`setDread` 挂 master 是刻意
    的（dread 属于世界）。
