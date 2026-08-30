# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.24.0**（旧版 1.23.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.24.0.exe` ≈96MB | [下载 Portable-1.24.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/corner-audio-wake-round3-v1240-a993/release/SmokeVelvet-LynchArchive-Portable-1.24.0.exe) | `4bda649d3653e30db6a33068d06f1e1f8dd5a25f14ef6716410842819b30a111` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.24.0.exe` ≈96MB | [下载 Setup-1.24.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/corner-audio-wake-round3-v1240-a993/release/SmokeVelvet-LynchArchive-Setup-1.24.0.exe) | `f8686bbf32020be713d15dba8c63819c343165126283e0508f2c12f984d954c4` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.24.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.24.0'`
  与 `package.json` 一致。

## 本轮（v1.24.0）看点（建议戴耳机）

- **它的声不再闷**：拐角惊吓那一帧世界骤静（万籁俱寂），但
  刮擦、错拍三口心跳、扑近那嗓子**满电平在场**——此前它们被
  自己的静默一并吞掉（最响的一嗓子实际是闷的），本轮修的就是
  这个病灶：**世界越安静，它越在**
- **黑幕全程死寂、环境音比睁眼慢一步回来**：黑里醒来先是没有
  世界的声，只有耳边那声 whisper
- **扑近那嗓子更沉更宽**：低频往下坠（坠的不是音量是地板）、
  左右耳不对称
- **刮擦跟着它站定收住**：它 0.55s 滑出站定，铁声几乎同拍
  收住——落定闷响前半拍还有一记石屑蹭出
- **走向拐角的耳底多了一层持续低压**：随接近渐涨，与心跳渐密
  /巷灯不稳同一口气（离开即退，冷却期全静）
- **醒来是俯冲醒**：黑幕后在巷口醒来**视线压在脚边地面**，头
  要自己抬起来；那句「有些拐角，不该拐过去。」迟到一秒多才
  补刀（转身惊吓仍平视即醒即字——两重 wake 一个错的是空间、
  一个错的是时间）
- **路灯杆的问答倒过来了（变奏第三例·时序反转）**：那一夜
  之后敲杆——手上没声，灯却同帧把双沉答完，你自己那记铁鸣
  2.4 秒后才从杆里走出来（**答在问前**；与刮痕墙的缺席、
  呼叫铃的换位构成三例三语法，到此封口）
- 显形线触发 / 惊吓拍长（3.3s 原值 ±0ms）/ 转身惊吓 / 195 件
  交互 / 98 音色 / 访谈 40 封顶全部保留；单测 717→**744**；
  发布产物全冒烟复跑 EXIT=0

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
