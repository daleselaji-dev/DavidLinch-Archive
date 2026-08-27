# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.11.0**（旧版 1.10.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.11.0.exe` ≈96MB | [下载 Portable-1.11.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/lynch-polish-v1110-a993/release/SmokeVelvet-LynchArchive-Portable-1.11.0.exe) | `98b747cfb5c8287b64a884cd53b24af65cde26ce94c476bf163a43cda26d1531` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.11.0.exe` ≈96MB | [下载 Setup-1.11.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/lynch-polish-v1110-a993/release/SmokeVelvet-LynchArchive-Setup-1.11.0.exe) | `d888ea06cde2efefb4b1f8ed78f729b75413b2a1455bfab1720ae1d48fba2a3c` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.11.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.11.0'`
  与 `package.json` 一致。

## 本轮（v1.11.0）看点

- **拐角惊吓修正**：触发区搬到拐角本体——转过暗巷拐角、即将看见垃圾箱的
  **最后一步**才引爆（不再是直巷中段就响）；空气先变重（次声 dreadswell），
  灯才开始不对；魅影 v2：兜帽里没有脸、身体冻住时红光在呼吸
- **树和梯子重做**：松林 8 层枝轮参差下垂 + 树皮沟壑杆（不再是光滑锥裙）；
  枯树桩鸮两级分枝 + 树洞暗斑；偏心年轮桩面；图书梯踏面磨浅 / 防滑刻槽 /
  黄铜螺钉 / 墙轨铆钉
- **七件捏他彩蛋**（零剧透字幕，空间自答）：锌盆里的缠布之物在呼吸 /
  焦黑坑洼球 / 耳形凹痕首饰盒 / 椅臂上那杯不会洒的咖啡 / 帘后会搬家的
  小门 / 心跳灯牌接骨 / 帷幕后的过影——外加第二眼细节六件（门脚磨痕 /
  灯牌余温 / 盖内镜像淡印 / 盆位湿痕晕 / 杯柄放不回原样 / 镜角布光）
- **162 件可交互物（+6）**；新合成音色 5 种（合计 82 种），全 WebAudio 零采样
- 拐角 + 转身两重惊吓保持吓人且可复现（本轮自然触发 20+ 轮全过）

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
