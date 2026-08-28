# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.12.0**（旧版 1.11.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.12.0.exe` ≈96MB | [下载 Portable-1.12.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/corner-wraith-asset-refine-v1120-a993/release/SmokeVelvet-LynchArchive-Portable-1.12.0.exe) | `3a1cde2fa35e5e59b2e178e28c8f4d1e7a4b3fad48b7656907bbfdbcddf16327` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.12.0.exe` ≈96MB | [下载 Setup-1.12.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/corner-wraith-asset-refine-v1120-a993/release/SmokeVelvet-LynchArchive-Setup-1.12.0.exe) | `1ba7aeeb006cf17cf71e8afbb160647e91b7668a436fd2c5e66f603bcb7de615` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.12.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.12.0'`
  与 `package.json` 一致。

## 本轮（v1.12.0）看点

- **拐角惊吓贴角化**：触发区北缘距拐角沿仅 **0.65m**——转过拐角那半步
  才是扳机；黑影沿**贝塞尔绕角路径**从拐角处挪出来（墙后只闻刮擦 →
  探出半身 → 全身出角三顿）
- **魅影 v3**：披垂**发帘**框住面部开口 + 成绺长发 ×13 垂过胸口 +
  **深陷眼窝空洞**（环红芯黑，洞里没有脸）；顿挪时身体死停、发帘还在
  极缓地摆（惯性没停，它不是雕像）；扑近时眼窝烧亮、发帘后甩
  ——抽象无面目，非肖像
- **精修循环十四轮**：松林 v3 层间空隙 + 顶点色分层明暗 + 倒木根盘；
  图书梯结构级病灶修正（梯面转向贴墙轨、贯穿榫 + 横楔）；老轿车圆角
  舱 + B 柱 + 白圈胎；吧台菱形绗缝软包；暖气炉龛 v2 铸铁排管；锯木厂
  剪影 v2（焚炉 + 上料坡道 + 值夜窗两粒）——修 17 件 / 判定不动 33 件
- **新彩蛋「门后刚走过一个人」**：本次进馆第一次走近任意一扇门，门里
  的虚空有个剪影横穿过去，之后整馆不再出现（一次性，零字幕）
- 拐角 + 转身两重惊吓保持吓人且可复现（本轮浸泡连跑 36/36 全过）

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
