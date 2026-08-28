# GOAL_HANDOFF — 持续演进 Goal 交接（第 2 轮 → 第 3 轮）

> 本文件由每轮子代理更新：本轮完成了什么 / 下一轮优先做什么 /
> 当前分支与阻塞项。父代理不改代码，只据此派生下一轮 Task。

---

## 本轮（第 2 轮，v1.14.0）完成了什么

**分支**：`cursor/pine-ladder-glb-v1140-a993`（基线 v1.13.0 tip
`6720511`，origin/cursor/blender-loop-v1130-a993，非 main）。
门禁 67–70 全绿，单测 443→**470**，四连测试（test/smoke/electron/
blender:check）全过，**已打包 1.14.0 exe**。

### 1) Blender loop 第 2/3 件（门禁 67 前半）✅
- **资产②双峰松树**：`gen_pine_tree.py` 四拍精修 loop（纸伞钣金锥面→
  表面噪声+轴向切环 / 荷叶边→锯齿针梢裙边 / 草叉亮棍→垂须簇 /
  顶部鼓包→幅度按层半径衰减）。产物 `pine_tree.{blend,glb}` + 样张。
- **资产③档案图书梯**：`gen_library_ladder.py` 两拍 loop（后倾符号反 /
  挂钩藏剪影 / 胶轮读成五金粒）。产物 `library_ladder.{blend,glb}`。
- 基础设施：common.py 通用件上移（seeded/attr_material/MeshBuilder/
  open_cone）；**studio rig/四机位随主体高度等比取景**（大件不裁头）；
  `blender:check` 扩到三件资产比例架。

### 2) GLB 经 GLTFLoader 落厅（门禁 67 后半）✅
- 双峰厅岔路北缘**孪生松 A/B 对照**（西 GLB / 东 kit 同款实例）。
- **electron sandbox 勘破**：data: URI 被 fetch 拦 → 手动 base64 解码
  ArrayBuffer 直进 `GLTFLoader.parse`（`?inline` + parse，勿用 load）。
- **普查竞态勘破**：厅返回 `ready` promise，main.js await 后才宣布
  hall-loaded——electron 冒烟预算断言才能读到 GLB。
- 材质克制钳制 + 零字幕交互 + 声先于形（40–75s 远处吱呀）。
- 预算实测 twinpeaks **245/250 mesh**（贴顶注意）、144k/240k tris。

### 3) 访谈 12→20 条 + 低语朗读（门禁 68）✅
- +8 条（合规纪律不变，单测钉死）；每卡**低语钮**——MurmurVoice 读成
  气声音节+静电碎语，同钮收声/换条互斥/关面板即收声；`onMurmurRead`
  接线 main.js。

### 4) 彩蛋第二批·七厅又各 +1（门禁 69）✅
- STYLE_AUDIT 观察点直接变纪律：**全部零字幕 + 错拍默认 + 每厅至多
  一件永久态**（中缝钢笔/没关严的抽屉/检修口盖板/火柴盒/手板硬币/
  海报角/场记板）。新音色 papertear+clapslap（84/85）。
- 交互 171→**179**（INTERACTIVE_MIN 重锁普查−1 = 172）。
- `tests/v114-eggs.test.js` 27 用例（**块级零字幕断言**——提取
  onActivate 块尾，防邻域 caption 误伤，写新蛋测试沿用此口径）。

### 5) Release 1.14.0（门禁 70）✅
- bump 1.14.0；CHANGELOG/WORKLOG/TESTING/README/STYLE_AUDIT §5
  执行账全部入册。
- 四连全绿；`npm run dist:win` 双 exe + SHA256SUMS + DOWNLOAD 直链
  （指向本分支）+ 发布产物冒烟复跑。

## 下一轮（第 3 轮）优先做什么

1. **Blender loop 继续**：第 4 件起建议做「厅里还没有的东西」而非
   对照复刻（对照件 A/B 已验证管线，继续复刻边际收益低）——候选：
   mulholland 剧场吊灯 / lobby 纪念碑浮雕层 / era 大机器局部替换。
   沿用五拍 loop 口径。
2. **GLB 落厅第二批**：corner_wraith.glb 尚未落厅（v1.13 建议过
   替换/并置惊吓魅影——动画骨架是新课题，GLTFLoader 后接 AnimationMixer
   或维持程序化动画只换网格）；注意 twinpeaks mesh 已 245/250 贴顶，
   新 GLB 优先放别的厅或先合并既有 mesh 腾预算。
3. **彩蛋第三批**（若 Goal 继续加码）：沿 STYLE_AUDIT §5 新病灶
   备忘——远声应答音色谱系 / GLB 体积纪律（单件 ≤300KB、每厅 ≤1）/
   朗读一律走 MurmurVoice 不引入清晰 TTS。
4. **访谈层可再扩**（20→28 或加主题筛选），但注意 D-5 收纳纪律：
   文字只进面板不进空间。
5. **性能预算警戒**：twinpeaks 245/250、archive/era 也在爬——下一轮
   加东西前先跑 electron 冒烟看逐厅实测，贴顶厅走「先合并再新增」。

## 当前分支与阻塞项

- **分支**：`cursor/pine-ladder-glb-v1140-a993`（已推送，PR 开向
  cursor/blender-loop-v1130-a993）。
- **阻塞项**：无硬阻塞。环境注意（新 VM 必读）：
  - Blender 不随仓库分发——按 `scripts/blender/README.md` 重装
    （NLUUG 镜像 ~30s）；`blender:check` 缺 Blender 时跳过不红。
  - electron `--smoke` 断言跑在 **dist 构建产物**上——改厅代码后必须
    先 `npm run build` 再跑，否则拿旧数。
  - GLB 截屏取证两坑：SwiftShader 陈旧帧（`SV_SHOT_DELAY=12000`）+
    双峰岔路机位别踩 groveEgg 触发圈（会被传送走，机位用 6.7,6.2）。
  - 打包 winCodeSign/NSIS 缓存 VM 轮换后会丢，dist:win 时现场下载
    （连通性已验证可达）。
