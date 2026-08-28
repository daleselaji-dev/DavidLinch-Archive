# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.19.0**（旧版 1.18.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.19.0.exe` ≈96MB | [下载 Portable-1.19.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/echo-window-cadence-round7-v1190-a993/release/SmokeVelvet-LynchArchive-Portable-1.19.0.exe) | `f3748e032af0a8198326595649a8ee5e25f8954223e0addc3e0b6969ce812add` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.19.0.exe` ≈96MB | [下载 Setup-1.19.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/echo-window-cadence-round7-v1190-a993/release/SmokeVelvet-LynchArchive-Setup-1.19.0.exe) | `f67401af10094f6c8f345e44fa0d330793f56dd1b01cecbb577aa69d69f7855b` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.19.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.19.0'`
  与 `package.json` 一致。

## 本轮（v1.19.0）看点

- **回声窗有了各自的性子（窗长差异化·余温总账 9s）**：v1.16 那
  七件「问第二遍」的回声窗不再齐刷刷 6 秒——问出口那刻起余温一共
  九秒，答落定花掉几秒、窗就剩几秒：**落定慢的余温短、落定快的
  余温长**。保温座即答（1.3s），窗开到全馆最长的 7.7s；烛剪等你
  3.7s 才答完，窗只剩 5.3s；上弦钥匙的秒针挣完三格要 3.4s——
  v1.17 给它的 8s 特批**退役**，如今只开 5.6s
- **答法一个字没改**：窗内再问仍是同拍即答、答在意想不到的通道、
  零字幕、答一次即消耗；改的只是每件余温散尽的快慢——馆里没有
  任何 UI 提到这件事
- **GLB 轴维护巡检首轮**：七件 Blender 资产、六处落厅逐一巡检
  （五厅定向机位目检 + 穆赫兰道魅影走自然触发功能验证）——
  **零病灶、零回炉、零新资产**；studio 维持刻意留空
- **三条封口纪律进了单测**：西墙 drawerfar 叙事恰三处钉死（第三次
  使用直接红测）/ 访谈 38 条封顶 40 / 回声窗暗示预算一句用尽
- 卡片柜 + 卡死的抽屉 + 双惊吓 + 195 件交互全部保留；单测
  607→**632**；发布产物全冒烟复跑 EXIT=0

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
