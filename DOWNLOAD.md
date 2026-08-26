# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.9.0**（旧版 1.7.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.9.0.exe` ≈95MB | [下载 Portable-1.9.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/ps5-tier-sprint-190-a993/release/SmokeVelvet-LynchArchive-Portable-1.9.0.exe) | `e8290908eb9dec43db76199d510bfb7fc0ed08c3d692da039de1866cb0f067a5` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.9.0.exe` ≈96MB | [下载 Setup-1.9.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/ps5-tier-sprint-190-a993/release/SmokeVelvet-LynchArchive-Setup-1.9.0.exe) | `0bc2e13af594206fb18387f0c1cc532175f013bf16c197ff691485c2c76066f1` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.9.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.9.0'`
  与 `package.json` 一致。

## 本轮（v1.9.0）看点

- 开门第一眼：首次进馆**开幕点灯序列**（吊灯错拍点亮 → 光锥升起 → 霓虹醒来）
- 画面会呼吸：逐厅雾密度与尘埃随呼吸相位极缓涨落
- 143 件可交互物（+20）；触痕层贴花（桌面残环/指痕晕/票亭指印）
- 怪谈事件层：静默区 / 自己放下的椅子 / 停在半空的吊灯 / 幕后走过的东西 / 窗外夜车
- 新合成音色 9 种，全 WebAudio 零采样
- 穆赫兰道**拐角惊吓**与**转身惊吓**保持吓人且可复现（见 TESTING 复现步骤）

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
