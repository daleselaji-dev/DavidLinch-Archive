# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.15.0**（旧版 1.14.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.15.0.exe` ≈96MB | [下载 Portable-1.15.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/velvet-round3-v1150-a993/release/SmokeVelvet-LynchArchive-Portable-1.15.0.exe) | `ff72ebb70332cfaaf8f7f548f966e9582ab65054f9e25091abab81a781df589d` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.15.0.exe` ≈96MB | [下载 Setup-1.15.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/velvet-round3-v1150-a993/release/SmokeVelvet-LynchArchive-Setup-1.15.0.exe) | `b7d8d863dd41172ebdc8f2c96cd2e07e28258034128094292e6b933f3c01112f` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.15.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.15.0'`
  与 `package.json` 一致。

## 本轮（v1.15.0）看点

- **大厅纪念浮雕（Blender 第 4 件新资产落厅）**：大厅东南哀悼角
  立起一面 2 米浮雕碑——幕褶、一缕烟、鎏金内缘、凿痕都在顶点色的
  深浅里；伸手拂过（E）是石面的沙沙，2.1 秒后碑缝里回你一声石磬
- **穆赫兰道拐角魅影换骨（GLB 第二批落厅）**：程序化魅影换成
  Blender 产的 `corner_wraith.glb`——网格换了、那套潜行/扑近的
  程序化动画一点没丢；它还是会在你回头时出现在拐角
- **彩蛋第三批·六厅「另一边」远声应答（全部零字幕、全部可重复）**：
  档案厅通风格栅（敲一下，2.4s 后风道深处回你——每次换一头，它在
  管道里走）/ 橡皮头对讲管（3.0s 后极远那头有嗓子）/ 蓝丝绒返听
  音箱（死闷一敲，1.9s 后监听从后幕回来）/ 双峰松果（2.2s 后林海
  深处）/ 穆赫兰道售票亭 BACK IN 5 小牌（拨转半圈背面还是 BACK IN
  5，1.6s 后亭子里面有人哼——可窗从没开过）/ 录音棚墙角立管
  （1.4s 后楼下回敲）——每个厅的「另一边」是同一个另一边（D3-F3）
- **访谈摘录册 20→28 条 + 主题筛选**：点子 / 电影 / 心境 / 此生
  四主题一键筛；低语钮照旧——馆里那个非人声永远读不清字
- **回归修复**：录音棚工作桌（抽屉/笔记本/铅笔刀/场记板）自 v1.14
  起整张不在场景里，本轮找回
- 拐角 + 转身两重惊吓、179→186 件可交互物全部保留；发布产物全冒烟
  复跑 EXIT=0

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
