# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.22.0**（旧版 1.21.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.22.0.exe` ≈96MB | [下载 Portable-1.22.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/corner-beat-lock-round1-v1220-a993/release/SmokeVelvet-LynchArchive-Portable-1.22.0.exe) | `d708bf55206c343289c70a1c40c617755372cf3835f41ae2479f09302192db6b` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.22.0.exe` ≈96MB | [下载 Setup-1.22.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/corner-beat-lock-round1-v1220-a993/release/SmokeVelvet-LynchArchive-Setup-1.22.0.exe) | `3d85da400d60dab5ab630ffa1f19b5cadafaf8bb831c25867805aac739a78791` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.22.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.22.0'`
  与 `package.json` 一致。

## 本轮（v1.22.0）看点

- **拐角惊吓触发时机换代（显形线触发）**：穆赫兰道后巷沿剧场
  后墙南行——**视线越过拐角、墙后之物即将入画的那一帧**才引爆
  （不再提前半巷或迟到半步；v1.8–v1.12 的圆形触发区量的是
  「离拐角多远」，病灶在机制不在参数）：全巷灯一口气熄灭、
  它 0.55 秒抽搐着滑出、**镜头被拉去跟焦那张脸**（双脚钉死 +
  视野慢推）、错拍站住盯你、扑近闷击——单拍 3.2 秒
- **走向拐角的路本身是 dread**：心跳渐密、巷灯渐次不稳、
  半程一次低频升压
- **魅影第二轮回炉（眼睛没动）**：红眼环还是那对红眼环——
  身形收瘦压黑、驼峰双结、发帘披垂到胸口在脸下合拢、垂臂
  左长右短、通体近黑的湿发哑光
- **见过它之后，刮痕墙的回答变了**：惊吓前摸墙有刮擦回应；
  惊吓后再摸——什么都不来，空一拍只有一记很轻的心跳
- **访谈册 40 条封顶收官**：「灯泡」（极乐外溢）与「每天两点半」
  （七年奶昔日课趣闻）入册，四主题各 10 条
- 转身惊吓 / 195 件交互 / 98 音色全部保留；单测 669→**686**；
  发布产物全冒烟复跑 EXIT=0

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
