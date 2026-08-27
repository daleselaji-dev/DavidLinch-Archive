# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.10.0**（旧版 1.9.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.10.0.exe` ≈96MB | [下载 Portable-1.10.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/ps5-tier-sprint2-1100-a993/release/SmokeVelvet-LynchArchive-Portable-1.10.0.exe) | `87787ee5a00b21bf559f49d4d857f46114c31aaae9b29d4a74d9fff50f6c3796` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.10.0.exe` ≈96MB | [下载 Setup-1.10.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/ps5-tier-sprint2-1100-a993/release/SmokeVelvet-LynchArchive-Setup-1.10.0.exe) | `0080fae84e47f8bd6bd25912f6cbcee847baa77080477b3781dd9809f2bee473` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.10.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.10.0'`
  与 `package.json` 一致。

## 本轮（v1.10.0）看点

- 开幕点灯 v2「**第 0 拍**」：黑场里碑前长明灯先独亮（一粒火星长成火苗），
  0.9s 后六盏吊灯才错拍跟上；收口「尘埃醒来」
- 开门第一眼的最后一笔：**入口丝绒长毯**直押碑座（金双边线接吊灯光、
  中线被走浅一道）；英雄光锥里有了**尘埃流**
- **156 件可交互物（+13）**：吊灯绞盘 / 碑阶白花 / 壁挂点唱盒 / 路边信箱排 /
  歌单立牌 / 半掩穿衣镜 / 候场呼叫铃 / 书桌转椅 / 门后行李箱 / 更衣柜排 /
  顶棚滴水接水桶 / 缩微阅读器 / 索引灯箱——全部 ≥2 通道反馈，新连锁 5 条
- **没有东西完全静止**：微动 8 处（信角/挂锁/行李牌/缩微机/花圈/气送管翻盖/
  冰桶瓶/站牌）+ 远处的光与声（流星、山腰远车、极远警笛、墙后抽屉、
  不存在的电梯）+ 无人剧场（空舞台自己演一小段）
- 新合成音色 10 种（合计 77 种），全 WebAudio 零采样；250 发声点混音纪律入门禁
- 穆赫兰道**拐角惊吓**与**转身惊吓**保持吓人且可复现（本轮自然触发 12/12，
  惊吓那一拍雾也收拢一口）

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
