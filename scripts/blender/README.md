# Blender 4.1.1 headless 资产管线

> v1.13.0 起，展馆的英雄资产在 Three.js 程序化生成之外，建立了一条
> **Blender headless（无显示、无 MCP）** 的 DCC 精修管线：bpy 脚本直接
> 生成 `.blend`，CLI 渲染验证，GLB 导出对接 Three.js。首件示范资产为
> 穆赫兰道「拐角魅影」（对照运行时 `kit.cornerWraith` v3 形体语言）。

## 安装（Linux headless，本轮实测）

```bash
# download.blender.org 有 Cloudflare 盾，用官方镜像
curl -L -o /tmp/blender.tar.xz \
  https://ftp.nluug.nl/pub/graphics/blender/release/Blender4.1/blender-4.1.1-linux-x64.tar.xz
sudo mkdir -p /opt/blender && sudo tar xf /tmp/blender.tar.xz -C /opt/blender
sudo ln -s /opt/blender/blender-4.1.1-linux-x64/blender /usr/local/bin/blender
blender --version   # → Blender 4.1.1
```

无 GPU/显示环境注意：渲染引擎用 **Cycles CPU**（`common.py setup_cycles`），
EEVEE 在 headless 下不可用；`blender -b` 全程无窗口。

## 工具链快速自检

```bash
npm run blender:check
```

找不到 Blender 时打印手动步骤并以 0 退出（CI 不因缺重型依赖阻塞；
`SV_BLENDER_STRICT=1` 强制非零）；找到时校验 4.1.x 并跑
gen(block)→inspect 两步，断言比例架就位。

## 精修 loop（INSPECT → 比例/结构 → 中尺度 → 近景 → 导出）

每一步都是独立 CLI 命令，可循环执行：

```bash
# ① 生成（--stage block|mid|fine：占位比例架 → 中模 → 精修）
blender -b --factory-startup --python scripts/blender/gen_corner_wraith.py \
  -- --stage fine --out assets/blender/corner_wraith.blend

# ② INSPECT：对象/面数/包围盒/材质报告（比例与结构病灶先看账目）
blender -b assets/blender/corner_wraith.blend \
  --python scripts/blender/inspect_blend.py

# ③ 渲染验证（四机位静帧：front/side/back/closeup，Cycles CPU）
blender -b assets/blender/corner_wraith.blend \
  --python scripts/blender/render_views.py -- \
  --outdir assets/blender/renders --prefix corner-wraith --samples 96

# ④ 目检渲染样张 → 改 gen 脚本参数 → 回到 ① （精修循环）

# ⑤ 导出 GLB（Three.js 接入路径）
blender -b assets/blender/corner_wraith.blend \
  --python scripts/blender/export_glb.py -- \
  --out assets/blender/corner_wraith.glb
```

## 首件示范：拐角魅影（v1.13.0 实录，五拍精修）

| 拍 | INSPECT/渲染发现 | 修正 |
|----|------------------|------|
| 1 | 裙裾破布条尖端垂到 z=−0.24（穿地） | 布条长度按挂点高度收口，尖端离地 ≥2cm |
| 2 | 构图裁头；正面竖褶读不出；前侧长绺像木条；布条上翘如草叉 | 机位拉远；布褶谐波 +40%；绺条摆角减半；布条摆角 ±0.25→±0.15 |
| 3 | **锥体方向系统性反了**（Blender `create_cone` radius1 在底——绺条/布条尖朝上戳成王冠）；面部空洞受光鼓包；眼环卡通 | `add_cone` 翻转 z；`faceVoid` specular=0（照不亮的黑）；眼环径/亮度双收 |
| 4 | 绺束横排如管风琴；眼环被帘缘半埋 | 挂点放低宽头藏帘内；眼组回到洞口沿 0.082H |
| 5 | 绺条宽头仍暴露 | 宽头嵌进帘身（rr×0.9）+ 发梢外摆 0.16 rad，定稿 |

定稿账目（inspect）：12 mesh / 6.8k tris / 5 材质 / 总高 ≈2.35m。

产物（已入库）：

```
assets/blender/corner_wraith.blend            # 精修定稿（压缩保存，177KB）
assets/blender/corner_wraith.glb              # Three.js 接入示范（214KB）
assets/blender/renders/corner-wraith-{front,side,back,closeup}.png
assets/blender/renders/corner-wraith-stage-{block,mid}-front.png   # loop 递进对照
```

## Three.js 接入规划（后续轮次）

本馆运行时坚持「全程序化生成、仓库零媒体素材」（合规门禁 1/7 只扫
`src/` 与 `electron/`，`assets/blender/` 是 DCC 工坊区、不进构建产物）。
GLB 接入展厅的两条路线，留给下一轮定夺：

1. **GLB 直载**（`GLTFLoader` + 懒加载分包）：保真最高；需在合规页
   补一句「三维资产由本项目 bpy 脚本程序化生成」，并把 GLB 移入
   `src/assets/`（同时调整合规扫描的媒体清单口径——GLB 本身也是
   脚本产物，符合零外来素材原则）。
2. **形体参数回灌**（推荐起步）：Blender 里精修得到的剖面/位移场
   参数（如本轮布褶谐波相位 0.7、绺条挂点收放）直接回写进
   `kit.js cornerWraith`——运行时仍是纯代码生成，Blender loop 充当
   「离线放大镜 + 参数试衣间」。本轮布褶/绺条结论已可回灌。

## 文件清单

| 文件 | 职责 |
|------|------|
| `common.py` | 清场/材质/摄影棚（三点冷背光）/Cycles CPU/保存与导出助手 |
| `gen_corner_wraith.py` | 拐角魅影生成（`--stage block\|mid\|fine`，五拍精修注记在源码内） |
| `inspect_blend.py` | INSPECT 报告：对象/verts/tris/包围盒/材质（`[inspect]` 前缀可脚本抓取） |
| `render_views.py` | 四机位渲染验证（`--views` 可选子集，棚与相机不写回资产） |
| `export_glb.py` | GLB 导出（几何+材质，Y-up 自动转换） |
| `../blender-check.js` | `npm run blender:check` 工具链冒烟 |
