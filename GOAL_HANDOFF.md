# GOAL_HANDOFF — 新 Goal「拐角惊吓 + 林奇风演进」交接（第 5 轮 → 第 6 轮）

> 本文件由每轮子代理更新：本轮完成了什么 / 下一轮优先做什么 /
> 当前分支与阻塞项。父代理不改代码，只据此派生下一轮 Task。
> 上一个 Goal（持续演进，九轮 v1.13→v1.21）已终态收官——评估
> 与证据清单存档在 v1.21 版本的本文件（git 历史 `f55c1f0`）。

---

## 本轮（新 Goal 第 5 轮，零代码改动·版本维持 1.25.0）完成了什么

**分支**：`cursor/acceptance-evidence-round5-v1251-a993`（基线
v1.25.0 tip `a4bde54`，origin/cursor/owl-refine-acceptance-
round4-v1250-a993，非 main）。门禁 104。**本轮交付的是验收包，
不是新功能**：交接口径「默认零改动，有证据才动手」执行到底——
全量验证跑完、逐拍实录解析完，**零病灶 → 零动手**。

### 1) 四连全量复验（新 VM 从零）✅

- `npm test` **774/774**（30 文件）/ `npm run smoke` 5/5 /
  electron `--smoke` **EXIT=0**（七厅全过·六 glb-landed·普查
  195=22/37/30/24/30/27/25·tp 243 / mull 244 / studio 224·
  拐角惊吓面南醒 yaw 0 + 转身惊吓背巷醒 yaw π 双朝向档全过）/
  `npm run blender:check` 七件全过。

### 2) scareProbe 逐拍实录解析——账目零矛盾 ✅

- 拐角惊吓四拍实录（就位帧 / reveal / rush / wake）逐拍落在
  SCARE_BEATS 预期窗口；clock 游戏秒与实时钟 0.065 倍速互证
  （rush 拍 0.1 游戏秒 ≈ 1.5 实秒恰落窗下沿、wake 冻结 0.216 =
  3.3 × 0.065）。stare/shock/blackout 未采到判为**采样缺拍非
  状态机缺拍**（500ms 轮询对 3.3s 序列必缺；later 链不可跳变，
  三拍行为账在单测）。转身惊吓三次 spinYaw 是设计内重试
  （armTime 按游戏钟）、等待段 clock 残留 0.216 是拐角局部时钟
  冻结值（phase=1 不走它——WRAITH_T0 眼焰相位专用）。
- **结论：与 v124/v125-eggs 账目零矛盾 → 拐角惊吓四层零改动
  维持**。对照表入 TESTING「状态位时间线对照表」节，日志摘录入
  `assets/acceptance/v125/scareprobe-smoke-excerpt.txt`。

### 3) 取证三件（验收包 `assets/acceptance/v125/`）✅

- **魅影 Blender 重渲对账**：gen 脚本重生成 fine 级，INSPECT 与
  库内 blend 逐项一致（12 mesh / 4060 verts / 7388 tris / 5 材质
  / 高 2.458——**脚本与定稿资产零漂移**）；四机位重渲目检形体
  一致（哈希差为 Cycles 采样噪声）——库内
  `assets/blender/renders/corner-wraith-*` 四帧确认为忠实存档，
  不换 png（防无意义二进制翻动）。
- **鸮定向机位三帧**：怠速全景（剪影+眼微光+hint 在框）/ 激活
  近景（眼焰亮起+转头对准，activateByHint 走 SV_SHOT_PRE 带厅
  守卫 IIFE；瞬移+压俯仰全放 PRE 内——SV_SHOT_POS 的 teleport
  会清俯仰）/ 月晕轴尝试**被行走边界钳回**（月→鸮延长线机位
  (-3.56,10.3) 钳到 (-3.1,9.1)——逆光剪影位在可行走区外，诚实
  留账：冒烟证机位与眼组机制，形体读感交真机）。
- **DOWNLOAD「v1.25 验收走查」小节**：走查路线 + 耳机清单链接 +
  直链沿用（1.25.0 双 exe SHA 不变）+ **填空式反馈模板**——
  惊吓按拍指认（七拍单选 + 听到什么 + 原因单选）、鸮按线指认
  （轮廓/双翼/垂尾/耳羽/栖枝五选）。

### 4) 内容侧零替换留账 + 维护巡检 ✅

- **零替换**：DOCENT 无第二条违纪条（上轮已换掉唯一零可查证
  印象句，其余全是事实级）；访谈最薄条 continuing 的同主题候选
  句仍无一过可查证关——**宁持平不换弱，伪引语是事故**（第 4 轮
  留账口径复认）。mulholland 零网格细节也不加：本轮无真机证词
  锚点，凭空加「林奇细节」与无靶翻修同病。
- 巡检全过：gen_*.py 恰七件（blender:check 实证）、六 glb-landed
  （冒烟实证）、封口轴五条随 774 复钉（回声窗窗长/drawerfar
  三处/暗示预算/BACK IN 5/第三层判死）、195 交互 / 98 音色 /
  40 访谈三数持平、变奏三例封口。
- **版本决策**：运行时零字节变化（改动全在文档 +
  `assets/acceptance/`，不进 dist 构建）——**维持 1.25.0**，
  exe / `__SV__.version` / v125-eggs 版本钉三方一致；exe 直链
  沿用第 4 轮双产物。

---

## 父 Goal 四目标对照表（第 5 轮收官评估——诚实口径）

| 目标 | 技术栈状态 | 缺什么 |
|------|-----------|--------|
| **(A) 拐角惊吓「更吓人」** | **齐**：四层（显形线机制 v1.22 / 手感拍长 v1.23 / rim 灯语 v1.23 / 音频直通+真空罩+wake 错位 v1.24）+ 两重 wake 三轴分家（醒姿/字幕时机/朝向 v1.24–25）+ 变奏三例封口。验收基建齐：scareProbe 实录 + 耳机清单 + 时间线对照表 + 填空反馈模板 | **只缺用户真机证词**。CI 证账目（本轮零矛盾复验），「吓不吓人」是体感命题——swiftshader 无音频无活帧，证不了也证伪不了。等拍位证词才有下一刀的靶 |
| **(B) 魅影形体** | **齐**：Blender 管线两轮回炉定稿（12 mesh 7388 tris，眼组红线原封）+ GLB 落厅 + rim 分拍灯语 + emissive 相位确定化（每次惊吓眼焰在错拍 69% 烧到峰）。本轮 gen↔blend↔renders 三方对账零漂移 | 等用户对比四机位渲染后的二次目检证词（若指认某条线，按线定向改） |
| **(C) 内容出口** | **满**：访谈 40 封顶（四主题 10/10/10/10）、DOCENT 全事实级、变奏三例语法封口、195 交互 / 98 音色。质量替换通道保持开但止损线明确（违纪才换 + 可查证关） | 无硬缺口。仅剩被动等待：有过硬可查证候选句才动 |
| **(D) 工程纪律** | **齐**：门禁 104 个、774 单测、四连 CI、封口轴五条、GLB 七件账、发布产物双 exe + SHA + 直链 | 无 |

**是否建议 UpdateGoal complete：不建议。**理由：(A) 的验收判据
是「用户觉得更吓人」——**无用户真机证词不得建议 complete**（本
Goal 从第 3 轮起的红线口径）。技术侧所有可做的都已做完并三方
取证；Goal 处于「等外部输入」态，不是「未完成」态。若用户走查
后回「够吓人/没毛病」，下一轮可凭证词建议 complete；若回拍位/
线位证词，按靶定向修补（届时 bump 1.26.0）。

---

## 下一轮（第 6 轮）优先

1. **第一优先：消费用户真机证词**（若有）。惊吓按拍修（改拍长
   必须联动 VACUUM.hold 派生账 + v124/v125-eggs 改钉留账）、
   鸮按线修（眼组红线照旧、净账 ≤0）、魅影按机位修（gen 脚本
   改完必须 INSPECT+四机位重渲+GLB 重导一条龙）。**证词落到
   哪就修哪，没落到的照旧零改动**。
2. **若仍无证词**：验收包已齐（本轮），**不要再造第二个验收包**
   ——重复取证是无靶射击的另一种形态。可做的仅剩：①维护巡检
   （四连 + 三数 + 封口轴）②有过硬可查证候选句才做的 ≤1 条
   质量替换③若巡检翻出红，按红修。
3. **wake 三轴分家到顶**（醒姿/字幕时机/朝向），挪落点三案已
   否决（STYLE_AUDIT §16）——**此轴封口**，除非真机证词推翻。
4. **变奏第四例判死复钉**；封口轴五条零触碰；三数口径 **195
   交互 / 98 音色 / 40 访谈**；gen_*.py 恰七件；studio 零 GLB。
5. **性能预算警戒**：twinpeaks 243、mulholland 244（250 预算）
   贴顶禁入；studio 224；lobby 207 余量最大。
6. **版本纪律**：有代码修补 → 1.26.0 + v126-eggs + 完整
   dist:win 一次成型 + 直链换轨；纯文档轮 → 维持现版并留账
   （本轮先例：版本钉三方一致优先于版本号叙事）。

## 当前分支与阻塞项

- **分支**：`cursor/acceptance-evidence-round5-v1251-a993`
  （已推送，基于 cursor/owl-refine-acceptance-round4-v1250-a993）。
- **阻塞项**：无硬阻塞。**真机验收是外部依赖**——验收包
  （DOWNLOAD 走查节 + 耳机清单 + 时间线对照表 + 三帧截屏 +
  四机位渲染 + 冒烟日志摘录）已备齐，等用户走查回证词。
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
  - **游戏时钟≠真钟**：软件渲染下 dt 封顶 0.1s、游戏时钟走约
    0.065–0.42 倍速（本轮实测 0.065）——计时敏感探针别用
    setTimeout 数真秒，注入 `S.engine.updaters` 累加 dt；
    `SV_SHOT_PRE` 每厅执行——先 `S.hall()` 守卫。
  - **定向截屏要压俯仰时，瞬移和压俯仰都放 SV_SHOT_PRE 里**
    （`S.engine.camera.parent.rotation.x`，正值抬头）——
    SV_SHOT_POS 的 teleport 跑在 PRE 之后且会清俯仰，两者混用
    俯仰必丢（本轮实证口径）。瞬移落点会被行走边界钳制——
    PRE 里返回 `S.player()` 读回，日志「截屏机位」再核一遍。
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
