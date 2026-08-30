# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.17.0**（旧版 1.16.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.17.0.exe` ≈96MB | [下载 Portable-1.17.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/velvet-round5-v1170-a993/release/SmokeVelvet-LynchArchive-Portable-1.17.0.exe) | `a6e6d306e49d86fdfafeea2215692ac3398087bb7b8a7a16734b801c06c20974` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.17.0.exe` ≈96MB | [下载 Setup-1.17.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/velvet-round5-v1170-a993/release/SmokeVelvet-LynchArchive-Setup-1.17.0.exe) | `f572d548ca2de243a0dd41d5105da0981a2bef5b50d8c7a76b3d74c792018c0c` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.17.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.17.0'`
  与 `package.json` 一致。

## 本轮（v1.17.0）看点

- **酒瓶墙精修件（Blender 第 6 件资产落厅）**：蓝丝绒吧台背柜整面换新——
  四种剖面（圆肩波尔多/溜肩高瓶/矮墩醒酒瓶/细高笛形）× 三色玻璃 31 支，
  捻口环、堆唇、跟珠、逐瓶明暗全读得出来；两处空缺位、七对伴瓶，
  顶排还有一支**横躺的空瓶**——被拿过，又放回去了；
  「电压不稳」的闪烁还在整面墙上走
- **问第二遍（彩蛋第五批·七件，全部零新增交互）**：v1.16 那七件彩蛋
  的应答落定后有个不说破的**回声窗**——窗内再问一遍，**同拍即答**、
  答在意想不到的通道：
  - 大厅烛剪→火苗不动，屋子另一头**三对流苏**齐晃；
  - 档案廊上弦钥匙→钥匙不响秒针不动，**停摆钟的分针**同拍挣一下；
  - 橡皮头结霜支管→冰不裂，**大机器转速**沉半口（调速器跟着塌臂）；
  - 蓝丝绒空话筒→脚灯不亮，**酒瓶墙玻璃**泛一口光；
  - 双峰保温座→汽不旺，**旋转派柜**悄悄转过一格；
  - 穆赫兰路灯铁杆→**光先声无**（第一遍声先光迟，第二遍因果换位）；
  - 录音棚白瓷小碟→瓷不嗒，**节拍器摆针**无声点头
- **共用件并发盯防**：档案廊停摆钟与上弦钥匙同帧双触发实测——
  两针各自挣扎各自归位，秒针纹丝不动（单写者纪律入单测）
- **访谈摘录册 32→34 条**：「此生」主题 6→8——过去上的色 / 不退休
  （「我心里满是幸福，而且我永远不会退休」）
- 调速器 + 双惊吓 + 194 件可交互物全部保留；发布产物全冒烟复跑 EXIT=0

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
