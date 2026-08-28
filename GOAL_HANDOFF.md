# GOAL_HANDOFF — 持续演进 Goal 交接（第 3 轮 → 第 4 轮）

> 本文件由每轮子代理更新：本轮完成了什么 / 下一轮优先做什么 /
> 当前分支与阻塞项。父代理不改代码，只据此派生下一轮 Task。

---

## 本轮（第 3 轮，v1.15.0）完成了什么

**分支**：`cursor/velvet-round3-v1150-a993`（基线 v1.14.0 tip
`8add537`，origin/cursor/pine-ladder-glb-v1140-a993，非 main）。
门禁 71–75 全绿，单测 470→**505**，四连测试（test/smoke/electron/
blender:check）全过，**已打包 1.15.0 exe**。

### 1) Blender loop 第 4 件·大厅纪念浮雕（门禁 71）✅
- `gen_memorial_relief.py` 三阶段五拍精修（block 比例架 2.04m →
  mid 框缘+凹场位移幕褶/下摆/单缕烟 → fine 烟分缕/凿痕只留已刻
  坡面/褶脊 pow 提脊压谷/顶点色 0.46–1.0/鎏金内缘）。
- **GLB 体积纪律确立并勘破**：导出器把 COLOR_0 强转 float VEC3
  （BYTE_COLOR 属性不省字节）——体积治理走网格账目（96×72→84×64
  重采样，349→275KB ≤300KB）。单件 ≤300KB、每厅 ≤1 件已入单测。
- `blender:check` 扩到**四件**资产比例架。

### 2) GLB 落厅第二批（门禁 72）✅
- **corner_wraith.glb 换骨穆赫兰道**：评估 AnimationMixer（GLB 无
  烘焙动画）后走「仅换网格保留程序化动画」——gltf 场景 **Y 转 π
  对齐 lookAt(+Z)**（Blender 前脸 -Z 的轴系教训），子件重挂运行时
  headPivot/arm 枢轴，setLurch/setRush 直驱；钳制豁免 wraithEye/
  wraithBody。双惊吓自然触发保持（冒烟断言原样过）。
- **memorial_relief.glb 落大厅哀悼角**：stonebrush 即时 + 2.1s 错拍
  独石光缝借亮一拍 + stonechime 低应（浮雕答的是碑），零字幕。
- **贴顶厅先合并再新增**：mulholland 七座远山合一（-6 mesh）、
  twinpeaks 柴堆墩顶并 cutGeos + 滚木双端盖合一（-2）。
- wraithReady/reliefReady promise 入厅返回值；冒烟三 glb-landed 信号。

### 3) 彩蛋第三批·远声应答音色谱系（门禁 73）✅
- **谱系确立**：`REPLY_DYAD = [146.83, 174.61]`（D3-F3 小三度）——
  「另一边」的应答永远同一副音高（replyhum/replytap，86/87 号音色，
  另有 stonebrush 88）；「这头」的动作声不调音（对照关系单测钉死）。
- 六厅各 +1，全部**可重复/零字幕/游戏时钟错拍/零光源/无永久态加码**：
  archive 通风格栅（应答每次换一头）/ era 对讲管 / bv 返听音箱死敲
  （零新增网格）/ tp 松果 / mul BACK IN 5 小牌 / studio 墙角立管。
- **回归修复（重要）**：门禁 69 提交插场记板时**误删 studio 工作桌
  挂载三行**——v1.14.0 全程整张桌子（抽屉/笔记本/铅笔刀/场记板）
  不在场景里但交互审计照过（只数 hotspots 登记不验场景归属）。
  git 考古找回（studio 207→226 mesh），修复断言入 v115-eggs.test。
- 交互 179→**186**（INTERACTIVE_MIN 重锁普查−1 = 179）。

### 4) 访谈 20→28 条 + 主题筛选（门禁 74）✅
- +8 条（忠于点子/谜/红帷幕/胶片之后/最终剪辑权/高尔夫球/自私的
  权利/天气播报）；与 QUOTES 零重复（bigfish/sound5050/coffee/
  philly/intuition 等立牌语录全部避开——**新增条目前先查 essays.js
  QUOTES 防撞**）；出处类型收「播报」。
- **四主题筛选**（INTERVIEW_THEMES：点子 5/电影 9/心境 8/此生 6）；
  面板筛选片只重排面板内容（D-5 保持），换筛即收声。

### 5) Release 1.15.0（门禁 75）✅
- bump 1.15.0；CHANGELOG/WORKLOG/TESTING/README/STYLE_AUDIT §6
  执行账全部入册；四连全绿；双 exe + SHA256SUMS + DOWNLOAD 直链
  + 发布产物冒烟复跑。

## 下一轮（第 4 轮）优先做什么

1. **Blender loop 第 5 件+**：继续做「厅里还没有的东西」——候选：
   穆赫兰道剧场吊灯（**注意 mull 244/250 贴顶，先合并**）/ 橡皮头
   大机器局部（era 220 余量尚可）/ bluevelvet 吧台后酒瓶墙精修件。
   沿用五拍 loop 口径 + GLB 体积纪律（≤300KB、每厅 ≤1——lobby/
   mull/tp 三厅已各有一件，**下一件只能落 era/bv/archive/studio**）。
2. **冒烟盲区补漏**（STYLE_AUDIT §6 备忘）：给 electron 冒烟加
   「hotspot 网格必须挂在场景树上」普查（obj.parent 链上溯 scene），
   防第二次「幽灵交互」（本轮 studio 工作桌事故的教训）。
3. **彩蛋第四批（若继续加码）换轴**：远声应答已铺六厅 + lobby 石钟
   支系，「另一边」密度接近上限——第四批走**光的应答 / 温度 /
   时间错位**，防远声读成模板。字面预算同字幕预算（BACK IN 5 是
   第三处英文字面，再添要先删）。
4. **访谈层**：28 条 + 四主题已够用；若再扩优先补「点子」主题
   （现最少 5 条）；新增前先查 QUOTES 防撞。
5. **性能预算警戒**：twinpeaks 244、mulholland 244（250 预算）——
   两厅加任何东西前先合并；lobby 206 / studio 226 / era 220 /
   archive 211 / bv 230。

## 当前分支与阻塞项

- **分支**：`cursor/velvet-round3-v1150-a993`（已推送，PR 开向
  cursor/pine-ladder-glb-v1140-a993）。
- **阻塞项**：无硬阻塞。环境注意（新 VM 必读）：
  - Blender 不随仓库分发——按 `scripts/blender/README.md` 重装
    （NLUUG 镜像 ~30s）；`blender:check` 缺 Blender 时跳过不红。
  - electron `--smoke` 断言跑在 **dist 构建产物**上——改厅代码后必须
    先 `npm run build` 再跑，否则拿旧数（本轮又踩一次：构建失败时
    冒烟照跑旧产物，**先确认 build 成功再读冒烟数**）。
  - studio 已有 v1.4 节拍器（`metro` 变量名占用）——新增道具前先
    rg 同名变量防撞名。
  - GLB 截屏取证两坑：SwiftShader 陈旧帧（`SV_SHOT_DELAY=12000`）+
    双峰岔路机位别踩 groveEgg 触发圈（会被传送走，机位用 6.7,6.2）。
  - 打包 winCodeSign/NSIS 缓存 VM 轮换后会丢，dist:win 时现场下载
    （连通性已验证可达）。

## Goal 终态对照（父 Goal 四目标——未终结，持续中）

- **Blender 管线成熟**：四件资产五拍 loop + GLB 落厅三件 + 体积
  纪律单测化——管线已闭环成熟，后续是产能问题。
- **林奇风**：STYLE_AUDIT 六病灶→纪律→执行账三轮闭环；远声应答
  谱系是本轮新增的「风格资产」。
- **丰富彩蛋互动**：186 件交互、七厅彩蛋四批（v1.13 起每轮 +7），
  永久态/零字幕/错拍纪律稳定。
- **合规访谈**：28 条 + 四主题 + 低语朗读，合规纪律单测钉死。
