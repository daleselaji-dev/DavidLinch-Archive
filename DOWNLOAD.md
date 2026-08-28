# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.18.0**（旧版 1.17.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.18.0.exe` ≈96MB | [下载 Portable-1.18.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/glb-finale-round6-v1180-a993/release/SmokeVelvet-LynchArchive-Portable-1.18.0.exe) | `1534d020d2734257a56a5b87f0dce92b29f54a8a1f380b700b00df0bf2fcfe80` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.18.0.exe` ≈96MB | [下载 Setup-1.18.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/glb-finale-round6-v1180-a993/release/SmokeVelvet-LynchArchive-Setup-1.18.0.exe) | `0bd3eedbd442c4371e97ed010df5e994d7ec207c3c230aa045b83a33721cc5e5` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.18.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.18.0'`
  与 `package.json` 一致。

## 本轮（v1.18.0）看点

- **卡片柜抽屉阵（Blender 第 7 件·GLB 收官件落厅）**：档案廊东墙
  第一座目录柜整面换新——4 列 5 排起线门芯抽屉脸、黄铜车削拉手、
  镂空标签框里卡片纸页微黄地滑出来；三只磨得发亮的抽屉；
  程序化可拉抽屉嵌在阵中洞位里照旧可拉（接缝同参材质抹平——
  拉开才看得见那沓空白卡片：v1.4 以来它一直探在柜面外，这轮才修）
- **卡死的抽屉（新交互 + 第 98 种音色）**：顶排**斜探 14mm 的那只**
  ——拉手断得只剩座盘、标签框空着；按 E 它挣一下又咬死
  （drawerstuck，木滑轨憋住的一声）；约 2.2s 后**西墙那头**传来
  同一只抽屉滑轨到底关严的声音——这面墙后没有房间。它在这里
  永远关不上，在那头关得上
- **GLB 轴收官**：七件资产六件落六厅（松/魅影/浮雕/调速器/酒瓶墙/
  卡片柜），录音间**刻意留空**——这条轴到此转维护，不为
  「每轮一件」松贴顶红线
- **回声窗有了一句传闻**：留言墙里访客「回头客」留了一条——
  「答完你别急着走。我趁它话音没落又问了一遍——这回接话的，
  换了一个。」馆里没有任何 UI 再多说一个字
- **访谈摘录册 34→38 条**：四主题齐涨 10/10/9/9——点子说了算 /
  在电话上看电影 / 生活的抽象 / 五十年代的小城
- 酒瓶墙 + 问第二遍 + 双惊吓 + 194 件老交互全部保留（普查 195
  ——只为收官件开一格）；发布产物全冒烟复跑 EXIT=0

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
