# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.27.0**（旧版 1.26.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.27.0.exe` ≈96MB | [下载 Portable-1.27.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/doorfar-wake-echo-round8-v1270-a993/release/SmokeVelvet-LynchArchive-Portable-1.27.0.exe) | `46d0f577102f8d01e51fe25ab9b48436800a77d65dadd740a5e9e4e76148b3cb` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.27.0.exe` ≈96MB | [下载 Setup-1.27.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/doorfar-wake-echo-round8-v1270-a993/release/SmokeVelvet-LynchArchive-Setup-1.27.0.exe) | `db7102681c7c719ec18621adae2a1431c736f4f24b9fd49851265068d8752dbb` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.27.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.27.0'`
  与 `package.json` 一致。

## 本轮（v1.27.0）看点——只加了一声：劫后远门回声

- **黑幕醒来 2 秒后，拐角那头很远的一扇门关上/落锁**：它走了，
  门在它身后落锁。你醒来正对着巷子（v1.25 的朝向），这一声就落
  在你**视线尽头的黑里**（离轴仅 2°，几乎正前方 36 米外）——
  很轻、很远，戴耳机才立得住
- **错拍是刻意的（声先于灯）**：环境音 1.9s 回满 → 门 2.0s 应
  一声 → 巷灯 3.0s 才燃满。门响那一刻巷子还压在半黑里（缓燃
  走到 ~74%）——世界的声先回来，那扇门趁灯没亮完说了一句
- **复用的门，不是新的门**：音色是 v1.10 就有的 doorfar（98
  音色刹车内**零新增**）；方位是 v1.23 呼叫铃变奏「这次是拐角
  那头应的」**同一扇门**——世界里答话的门始终只有那一扇
- **只给拐角惊吓**：转身惊吓醒来没有这一声（它的错位在时间轴，
  wake 保持安全复位语言）——两重 wake 分家维持四轴 + 这一声
- **没动的**：v1.26 三刀（FOV 渐窄 / 滑出改闪 / 巷灯缓燃）参数
  ±0；显形线几何 / 六拍拍长 / rim 灯语 / 真空罩 / WAKE_POINT
  全部原封。195 件交互 / 98 音色 / 访谈 40 封顶持平；单测
  800→**817**；发布产物全冒烟复跑 EXIT=0

## v1.27 验收走查（请戴耳机按拍走一遍）

> v1.26 的三刀 + 本轮这一声，是否到位**只有您的真机证词能定案**。

**走查路线**（上表 Portable-1.27.0 直链下载即用）：

1. 进「穆赫兰道」厅 → 夜路南行 → 右侧便道 → 票亭转角 → 暗巷
   南行到底——触发拐角惊吓 → 黑幕醒来后**别动，数两秒**：
   ①巷灯慢慢燃回的半黑里 ②正前方很远处应当有一声很轻的关门/
   锁扣（太响/没听见/方向不对？）③三刀走查项照旧（视野收窄/
   闪出/缓燃）
2. 对照 [`TESTING.md` 的「拐角惊吓耳机验收清单」](TESTING.md)
   ——七拍逐拍列了**该听到什么/该看到什么**
3. 醒来后再走到剧场背后空地站定几秒、猛回头（转身惊吓——它
   醒来**没有**远门声、灯瞬间回来，两重惊吓故意不同）

**控制台验收捷径**（不想走全程夜路时用，直达触发线前 1 米）：

1. 进「穆赫兰道」厅后按 `F12` 开控制台，执行
   `__SV__.teleport(9.3, -25.5, 0)`——瞬移到暗巷中轴
   （x=9.3、面南），落点在显形线（z≈−26.506）以北约 1m
2. 关控制台点回画面，**戴耳机向南（正前方）走约 1m** 跨线即
   触发拐角惊吓——接近段压迫只剩最后一米，主拍序列完整
3. 惊吓后可再执行 `__SV__.scareProbe()` 读状态位快照
   （`{ phase, sub, clock, seen }`，非惊吓厅返回 null），与
   [`TESTING.md` 耳机验收清单](TESTING.md)的冒烟状态位实录
   逐拍对照（醒来后应 `seen: true`）

**魅影形体目检（(B) 项——不跑游戏也能审）**：

corner_wraith 是 v1.22 按您口径「眼睛很好，其他都要改」回炉
定稿的网格，其后各轮**零网格改动**。下面四机位静帧由仓库内
Blender 管线离线渲自**与游戏同一份网格**
（`assets/blender/corner_wraith.blend`，Cycles CPU 96 采样、
三点冷背光摄影棚），点直链即看，无需下载运行游戏：

| 机位 | 直链（raw） | 仓库路径 |
|------|-------------|---------|
| 正面 | [wraith-front.png](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/wraith-viewcheck-v1270-3602/assets/acceptance/v127/wraith-front.png) | `assets/acceptance/v127/wraith-front.png` |
| 侧面 | [wraith-side.png](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/wraith-viewcheck-v1270-3602/assets/acceptance/v127/wraith-side.png) | `assets/acceptance/v127/wraith-side.png` |
| 3/4 | [wraith-three.png](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/wraith-viewcheck-v1270-3602/assets/acceptance/v127/wraith-three.png) | `assets/acceptance/v127/wraith-three.png` |
| 俯视 | [wraith-top.png](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/wraith-viewcheck-v1270-3602/assets/acceptance/v127/wraith-top.png) | `assets/acceptance/v127/wraith-top.png` |

**请按 v1.22 回炉的三条线指认**（落到哪条线下一轮就修哪条线，
一句话就够）：

```
发帘（罩→披：垂帘加长、绺沟加深、下段左右不对称合拢）：
〔到位 / 还太整齐 / 太碎 / 其他〕________
垂臂（收拢贴身加长带屈指、左长右短错拍）：
〔到位 / 还太张 / 指形出戏 / 其他〕________
眼窝（眼组参数一字未动——您定过「眼睛很好」）：
〔仍然好 / 变了〕________
```

本地复核（可选）：装好 Blender 4.1.1 后 `npm run blender:check`
七件校验，再按 [`scripts/blender/README.md`](scripts/blender/README.md)
的 `render_views.py` 用法自渲四机位对照。

**反馈模板（填空式——按拍指认，一句话就够）**：

```
【本轮一声】
劫后远门回声：〔到位 / 太响 / 太轻没听见 / 方向不对 / 多余〕________

【v1.26 三刀】
FOV 渐窄：〔到位 / 太轻 / 太重 / 头晕 / 没感觉〕________
滑出改闪：〔到位 / 还不够闪 / 宁可要旧抽搐〕________
巷灯缓燃：〔到位 / 太慢 / 太快 / 没注意到〕________

【拐角惊吓整体】
不到位的拍：〔接近段 / 跨线帧 / 错拍 / 扑近 / 冲击 / 黑幕 / 俯冲醒〕
这一拍我听到/看到的是：________________

【双峰鸮 / 转身惊吓 / 其他厅】：________________
```

反馈落到哪一拍/哪条线，下一轮就修那一拍/那条线；没有拍位证词
时惊吓层保持零改动（全面翻修的回报已递减，纪律见
`STYLE_AUDIT` §16）。

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
