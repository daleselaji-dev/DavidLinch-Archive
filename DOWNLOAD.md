# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.20.0**（旧版 1.19.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.20.0.exe` ≈96MB | [下载 Portable-1.20.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/live-axis-audit-round8-v1200-d012/release/SmokeVelvet-LynchArchive-Portable-1.20.0.exe) | `847a990c915b5f55b2f61ee391ec21bdd5d49e9a2abc18c5011f259bc0eb7929` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.20.0.exe` ≈96MB | [下载 Setup-1.20.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/live-axis-audit-round8-v1200-d012/release/SmokeVelvet-LynchArchive-Setup-1.20.0.exe) | `0458e6d758fd61254b3f249fcdc5a694a1ee3f814980b49e5b2fbb700fd5961e` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.20.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.20.0'`
  与 `package.json` 一致。

## 本轮（v1.20.0）看点

- **他的绿罩台灯换了骨（studio 台灯 v3·手作精修）**：GLB 资产轴
  在录音间刻意留空——这间屋的精修件不从外面运进来，是**在这间屋
  里做出来的**：车削木重底座（座肩留一圈没磨平的车刀痕）、一根
  手弯的铁杆（四道弯，弯点出平面几毫米——没有夹具的弯法）、
  手锤黄铜罩（哑光手刷绿漆，深浅不齐）、布包电线在桌面盘一圈
  慵懒的余线
- **精修不宣布自己**：台灯的开关、字幕、声音、桌面那汪光——
  与上一版一字不动；只有站得近的人会看见锤痕
- **访谈册第一次换血（38 条封顶转质量维护）**：「看世界」退役
  （与立牌语录领地重叠），换入「都在找的东西」——我们在生活里
  都像侦探；条数与四主题分布一格没动
- **活轴盘点**：七条演进轴过账（活/维护/封口三档）——「给既有
  件叠第三层反应」判死（问第三遍同构），收官的轴谁来都不许动
- **GLB 维护巡检第 2 轮零病灶**：blender:check 七件全过 + 六
  glb-landed + 魅影自然触发功能验证——零改动零回炉
- 回声窗七件窗长 + 双惊吓 + 195 件交互 + 98 音色全部保留；单测
  632→**649**；发布产物全冒烟复跑 EXIT=0

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
