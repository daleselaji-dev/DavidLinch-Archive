# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.23.0**（旧版 1.22.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.23.0.exe` ≈96MB | [下载 Portable-1.23.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/corner-feel-polish-round2-v1230-a993/release/SmokeVelvet-LynchArchive-Portable-1.23.0.exe) | `b65fba9cf812dc2a60c658402aed7d355b2b51c9caed8b898fd2f45a135d56f2` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.23.0.exe` ≈96MB | [下载 Setup-1.23.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/corner-feel-polish-round2-v1230-a993/release/SmokeVelvet-LynchArchive-Setup-1.23.0.exe) | `ab87fe897f9ec4be1ed9b22289cea0253d643c82bb39adbb2a6b1aff32ddfa0e` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.23.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.23.0'`
  与 `package.json` 一致。

## 本轮（v1.23.0）看点

- **拐角惊吓手感抛光（机制不换，只调手感）**：错拍加长到近
  一秒——它出角站住看你的那口气更长了（原片的怕长在「它不动」
  里）；**中途整个身位缓缓歪向一侧**，像在核对你；镜头入锁
  提速（看着它滑完最后半程）、视野慢推换成「感觉不到开始」
  的推——它站定了，镜头替它往前走；滑出更「闪」（前 0.2 秒
  完成大半行程）
- **每次惊吓，眼睛都在它看你看得最狠的那一拍最亮**：眼焰
  呼吸改走惊吓局部时钟，不再看全局钟的运气
- **剪影光会跟拍走**：滑出随进度显影 + 起手一记打火过冲
  （这个世界的灯从来不好好亮）、错拍与眼焰错半拍呼吸（光弱
  那一瞬眼最亮）、扑近涌光、黑幕归零
- **走向拐角的末程心跳变「咚-咚」双拍**（收缩压跟上来了）
- **呼叫铃的应答变了（变奏第二例）**：那一夜之前按铃，很远
  处一扇门应一声；**那一夜之后再按——应铃的换到拐角那头，
  快了一步近了一截**
- **讲解员回访补注 ×7**：立牌旁听完首段低语，走开再折回来
  多站一会儿——讲解员会补一段趣闻（七厅各一条：奥斯卡一分钟
  致辞 / 影碟不设章节点 / 树木研究员父亲 / 米兰家具展 / 住进
  片场 / 传记片企划起点 / 晚年摇号）
- 显形线触发 / 转身惊吓 / 195 件交互 / 98 音色 / 访谈 40 封顶
  全部保留；单测 686→**717**；发布产物全冒烟复跑 EXIT=0

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
