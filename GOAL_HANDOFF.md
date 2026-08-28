# GOAL_HANDOFF — 新 Goal「拐角惊吓 + 林奇风演进」交接（第 6 轮 → 第 7 轮）

> 本文件由每轮子代理更新：本轮完成了什么 / 下一轮优先做什么 /
> 当前分支与阻塞项。父代理不改代码，只据此派生下一轮 Task。
> 上一个 Goal（持续演进，九轮 v1.13→v1.21）已终态收官——评估
> 与证据清单存档在 v1.21 版本的本文件（git 历史 `f55c1f0`）。

---

## 本轮（新 Goal 第 6 轮，零代码改动·版本维持 1.25.0）完成了什么

**分支**：`cursor/walkthrough-probe-round6-v1260-a993`（基线第 5
轮 tip `4196ead`，origin/cursor/acceptance-evidence-round5-
v1251-a993，非 main）。门禁 105。**本轮交付的是一次半自动走查的
逐帧几何证据，不是第二个验收包**：交接口径「只有走查翻出与账目
矛盾或明显体感病灶才允许改代码」执行到底——两跑取证、逐帧对账，
**零矛盾零病灶 → 零改动**。

### 1) 半自动走查两跑（SV_SMOKE_QUEUE=mulholland 探针）✅

- **A 断言跑**：标准冒烟 + 页面内被动探针，EXIT=0（走通性/双惊吓
  双朝向档/普查 25/mull 244 全过）。
- **B 细步仪器跑**（核心证据）：onUpdate 探针每渲染帧沿巷轴
  x=9.3 南移 **0.06m**（≈真机 60fps × 4.2m/s 的单帧步长），
  z=-26.46（cross +0.039，差 3.9cm）不触发 → z=-26.52（过线
  1.4cm）**同一渲染帧引爆**。显形线理论跨点 z=-26.506——
  **触发滞后 1.4cm/零帧：确在「快要看见墙后」的几何瞬间**。
- **镜头特写证到位**：触发帧对准误差 61.9° → 0.2 游戏秒 0.8° →
  **错拍（stare）起点 0.0° 死锁跟焦**（每帧 lookAt 到 blackout
  归还）；FOV smoothstep 慢推 69.8→63.1（CLOSEUP.fovPush=15
  曲线吻合）；pitch 仰角跟焦 0.027→0.295；双脚全程钉死跨线点。
- **拍点实时钟逐拍吻合 SCARE_BEATS**：stare +0.82s / rush +1.54s
  / uShock 0.82 亮起后指数衰减 / blackout ~+2.4s（魅影隐+rim
  归零+FOV 归还 70）/ wake +3.3s (9.7,9.5) yaw 0 pitch −0.36
  俯冲醒；rim 灯语按 RIM_BEATS 走（打火 4.83→呼吸→涌光 8.2→
  归零）。**与 v124/v125-eggs 账目零矛盾 → 四层零改动维持**。
- 证据+探针源码+复现命令入
  `assets/acceptance/v125/r6-corner-walkthrough-probe.txt`。

### 2) 探针方法论留账（下轮直接复用）✅

- **软渲染大帧会饿死页面 setInterval**：50ms 轮询实际被拉到
  ~5s，惊吓中段只采到 1 帧——比第 5 轮 500ms executeJavaScript
  轮询更差。**逐渲染帧 `S.engine.onUpdate(fn)` 是软渲染盒子的
  时间分辨率上限**（帧界即证据界）。
- 探针记录借 `[sv] glb-r6` 前缀走 electron 冒烟既有的
  `[sv] glb-` 回显通道进 stdout——**零工装改动**（别用
  `glb-failed`/`uncaught` 字样，会触发失败判定）。
- 小窗口 `SV_WIN_SIZE=480x300` 显著提帧率；`SV_SHOT_DELAY=60000`
  可把工装走测推出实验窗（仪器跑非断言跑，证据收齐即杀进程——
  cooldown 75 游戏秒在软渲染下 ≈ 数百实秒，一进程只有一发）。
- 软渲染两钟错配复认：later 链走实时钟、滑出/扑近/入锁走游戏钟
  （本轮 0.28 倍速，第 5 轮 0.065——随窗口大小浮动）；真机
  60fps 两钟同速，此错配不存在。

### 3) 四连维护巡检 + 三数 + 封口轴 ✅

- `npm test` **774/774**（30 文件）/ `npm run smoke` 5/5 /
  electron `--smoke` 全队列 **EXIT=0**（七厅全过·六 glb-landed·
  普查 195=22/37/30/24/30/27/25·tp 243 / mull 244 / studio 224·
  双惊吓双朝向档全过）/ `npm run blender:check` 七件全过。
- 封口轴五条随 774 复钉；195 交互 / 98 音色 / 40 访谈三数持平；
  gen_*.py 恰七件；studio 零 GLB；变奏三例封口。

### 4) 内容侧零替换留账 + 版本决策 ✅

- **零替换**：本轮无新语料源，DOCENT 无违纪条、访谈候选句仍
  无一过可查证关——宁持平不换弱（第 4/5 轮口径复认）。
- lobby mesh 207 余量最大，但本轮走查未及 lobby、无「明显空洞」
  证词锚点——**INTERACTIVE_MIN 与 195 纪律不动**（凭空加件与
  无靶翻修同病）。
- **版本决策**：运行时零字节变化（改动全在文档 +
  `assets/acceptance/`）——**维持 1.25.0**，exe /
  `__SV__.version` / v125-eggs 版本钉三方一致；exe 直链沿用
  第 4 轮双产物（SHA256 不变）。

---

## 父 Goal 四目标对照表（第 6 轮收官评估——诚实口径）

| 目标 | 技术栈状态 | 缺什么 |
|------|-----------|--------|
| **(A) 拐角惊吓「更吓人」** | **齐 + 本轮机械层实证**：四层（显形线/拍长/rim 灯语/音频直通+真空罩+wake 错位）+ 两重 wake 三轴分家 + 变奏三例封口。**本轮新增**：触发几何（滞后 1.4cm/零帧）与镜头特写（错拍前 0° 死锁）的逐帧证据——「时机对不对、镜头到不到位」两问已用数据答完：到位 | **只缺用户真机证词**。机械层证完了，「吓不吓人」是体感命题——swiftshader 无音频无活帧。等拍位证词才有下一刀的靶 |
| **(B) 魅影形体** | **齐**：Blender 管线两轮回炉定稿（12 mesh 7388 tris，眼组红线原封）+ GLB 落厅 + rim 分拍灯语 + emissive 相位确定化；第 5 轮 gen↔blend↔renders 三方对账零漂移 | 等用户对比四机位渲染后的二次目检证词（若指认某条线，按线定向改） |
| **(C) 内容出口** | **满**：访谈 40 封顶（四主题 10/10/10/10）、DOCENT 全事实级、变奏三例语法封口、195 交互 / 98 音色。质量替换通道保持开但止损线明确（违纪才换 + 可查证关） | 无硬缺口。仅剩被动等待：有过硬可查证候选句才动 |
| **(D) 工程纪律** | **齐**：门禁 105 个、774 单测、四连 CI、封口轴五条、GLB 七件账、发布产物双 exe + SHA + 直链 | 无 |

**是否建议 UpdateGoal complete：不建议。**理由不变：(A) 的验收
判据是「用户觉得更吓人」——**无用户真机证词不得建议 complete**
（本 Goal 从第 3 轮起的红线口径）。本轮把 CI 能证的最后一层
（触发几何瞬间 + 镜头特写机械层）也证完了；Goal 仍处于「等外部
输入」态，不是「未完成」态。若用户走查后回「够吓人/没毛病」，
下一轮可凭证词建议 complete；若回拍位/线位证词，按靶定向修补
（届时 bump 1.26.0）。

---

## 下一轮（第 7 轮）优先

1. **第一优先：消费用户真机证词**（若有）。惊吓按拍修（改拍长
   必须联动 VACUUM.hold 派生账 + v124/v125-eggs 改钉留账）、
   鸮按线修（眼组红线照旧、净账 ≤0）、魅影按机位修（gen 脚本
   改完必须 INSPECT+四机位重渲+GLB 重导一条龙）。**证词落到
   哪就修哪，没落到的照旧零改动**。
2. **若仍无证词：不建议任何无靶改造**。验收包（第 5 轮）齐、
   机械层走查（本轮）齐——CI 侧可证的已全部证完，**再走查也
   只会重复本轮结论**（触发几何与镜头账已逐帧钉死）。可做的
   仅剩：①维护巡检（四连 + 三数 + 封口轴）②有过硬可查证候选
   句才做的 ≤1 条质量替换③若巡检翻出红，按红修。
3. **wake 三轴分家到顶**（醒姿/字幕时机/朝向），挪落点三案已
   否决（STYLE_AUDIT §16）——**此轴封口**，除非真机证词推翻。
4. **变奏第四例判死复钉**；封口轴五条零触碰；三数口径 **195
   交互 / 98 音色 / 40 访谈**；gen_*.py 恰七件；studio 零 GLB。
5. **性能预算警戒**：twinpeaks 243、mulholland 244（250 预算）
   贴顶禁入；studio 224；lobby 207 余量最大——但无证词锚点
   不加件。
6. **版本纪律**：有代码修补 → 1.26.0 + v126-eggs + 完整
   dist:win 一次成型 + 直链换轨；纯文档轮 → 维持现版并留账
   （第 5/6 轮先例：版本钉三方一致优先于版本号叙事）。

## 当前分支与阻塞项

- **分支**：`cursor/walkthrough-probe-round6-v1260-a993`
  （已推送，基于 cursor/acceptance-evidence-round5-v1251-a993）。
- **阻塞项**：无硬阻塞。**真机验收是外部依赖**——验收包（第 5
  轮：DOWNLOAD 走查节 + 耳机清单 + 时间线对照表 + 三帧截屏 +
  四机位渲染）+ 机械层走查证据（本轮：逐帧几何/镜头实录）已
  备齐，等用户走查回证词。
- 环境注意（新 VM 必读）：
  - Blender 不随仓库分发——按 `scripts/blender/README.md` 重装
    （NLUUG 镜像 ~100–335s）；`blender:check` 缺 Blender 时跳过不红。
    本轮 VM 自带 4.1.1（/usr/local/bin/blender），不保证下轮还有。
  - electron `--smoke` 断言跑在 **dist 构建产物**上——改厅代码后必须
    先 `npm run build` 再跑（`npm run smoke` 自带 build，先跑它最省事）。
  - **swiftshader 下 capturePage 会返回陈旧帧**（合成器滞后）——
    短时程视效的视觉取证不要依赖连拍；几何正确性交单测、功能
    触发交冒烟、模型视觉交 Blender CLI 渲染。**WebAudio 同理无
    输出可言**——时序正确性交 v124/v125-eggs 账目钉 + 冒烟状态
    位实录。
  - **软渲染大帧会饿死页面 setInterval**（本轮实证：50ms 轮询
    实际 ~5s）——计时敏感探针用 `S.engine.onUpdate(fn)` 逐渲染
    帧记录（帧界即分辨率上限）；探针输出借 `[sv] glb-<自定义>`
    前缀走冒烟回显通道（避开 `glb-failed`/`uncaught` 字样）；
    小窗 `SV_WIN_SIZE` 提帧率、`SV_SHOT_DELAY` 推开工装走测；
    仪器跑与断言跑分开（cooldown 75 游戏秒 ≈ 软渲染数百实秒，
    一进程只有一发）。复现全套见
    `assets/acceptance/v125/r6-corner-walkthrough-probe.txt`。
  - **游戏时钟≠真钟**：软件渲染下 dt 封顶 0.1s、游戏时钟走约
    0.065–0.42 倍速（第 5 轮 0.065 / 本轮 B 跑 0.28，随窗口
    浮动）——计时敏感探针别用 setTimeout 数真秒；
    `SV_SHOT_PRE` 每厅执行——先 `S.hall()` 守卫。
  - **定向截屏要压俯仰时，瞬移和压俯仰都放 SV_SHOT_PRE 里**
    （`S.engine.camera.parent.rotation.x`，正值抬头）——
    SV_SHOT_POS 的 teleport 跑在 PRE 之后且会清俯仰，两者混用
    俯仰必丢。瞬移落点会被行走边界钳制——PRE 里返回
    `S.player()` 读回，日志「截屏机位」再核一遍。
  - **teleport 会清俯仰、设 yaw**——WAKE_DAZE 俯冲醒依赖先
    teleport 后压 pitch 顺序（v124-eggs 顺序守卫）；改 WAKE_POINT/
    WAKE_DAZE.yaw 必须同步 electron 冒烟 wantYaw 参数与
    v125-eggs 朝向几何账。
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
    `scare.clock`、`poleEcho.rev`、`scareProbe`（build 返回，
    只读快照）；studio 已有 `metro`/`saucer`/`chinaState`；
    archive 已有 `cardArrayReady`——新增状态字段先 rg 防撞名。
  - engine `sfx/sfxAt` 第 4 参是 punch 路由——新惊吓声想直通
    传 `true`；世界的声不要走直通。`setDread` 挂 master 是刻意
    的（dread 属于世界）。
  - `assets/acceptance/` 是验收取证区（不进构建产物，合规扫描
    只扫 src/ 与 electron/）；`*.log` 在 .gitignore——日志摘录
    用 .txt 落库。
