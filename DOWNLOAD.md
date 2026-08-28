# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.21.0**（旧版 1.20.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.21.0.exe` ≈96MB | [下载 Portable-1.21.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/maintenance-finale-round9-v1210-a993/release/SmokeVelvet-LynchArchive-Portable-1.21.0.exe) | `190c3301668d9690453ed7fcaa90cda03cd8b7c6530831edb3f715542d730957` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.21.0.exe` ≈96MB | [下载 Setup-1.21.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/maintenance-finale-round9-v1210-a993/release/SmokeVelvet-LynchArchive-Setup-1.21.0.exe) | `542160129e333a635fd800c0b82286fd508b6abe425cc23e5da1a2a99d2cdfbd` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.21.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.21.0'`
  与 `package.json` 一致。

## 本轮（v1.21.0）看点

- **唱机的针尖第一次真的落进沟槽（studio 转盘病灶修）**：三件
  老抛光件逐一问诊「哪件看着假」——磁带机与收音机零病灶不动，
  只修转盘：静止时唱臂不再横在标签正上方悬空，**落在盘外的
  歇臂柱上**；按 E 放唱片，臂摆进沟槽带、唱头壳下新做的针杆
  落到唱片面——那句「针尖落进沟槽。」终于有针尖了；转盘中心
  补了主轴，唱片不再是搁着的圆片
- **修法是工厂做工**：唱机像出厂的唱机——没有弯点、没有锤痕、
  没有歪旋钮；那些手作语言是隔壁台灯（也只是台灯）的
- **访谈册第二次换血（止损线内只换一条）**：「工作状态」退役
  （与「毒药」条领地重叠——都在讲负面情绪伤害创作者），换入
  「随时能动手」——点子来的任何一刻，你都有地方、有工具把它
  做出来；条数与四主题分布一格没动
- **七条演进轴全部转维护/封口**：盘点增量化只盘状态变了的两轴
  ——studio 精修与访谈换血双双收进维护，馆内没有「还长得动」
  的活轴（Goal 终态评估见 GOAL_HANDOFF）
- **GLB 维护巡检第 3 轮零病灶**：blender:check 七件全过 + 六
  glb-landed + 双惊吓自然触发功能验证——零改动零回炉
- 回声窗七件窗长 + 双惊吓 + 195 件交互 + 98 音色 + 38 访谈全部
  保留；单测 649→**669**；发布产物全冒烟复跑 EXIT=0

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
