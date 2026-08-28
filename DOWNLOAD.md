# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.14.0**（旧版 1.12.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.14.0.exe` ≈96MB | [下载 Portable-1.14.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/pine-ladder-glb-v1140-a993/release/SmokeVelvet-LynchArchive-Portable-1.14.0.exe) | `d9a5a29f52a1eca6648acba45381cfe401d6ad5f77417e7d8d0f11136b9a6fd0` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.14.0.exe` ≈96MB | [下载 Setup-1.14.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/pine-ladder-glb-v1140-a993/release/SmokeVelvet-LynchArchive-Setup-1.14.0.exe) | `a59aefb2eae2205081da4e9796d70f75a3d9fb512bbb2f0c6d68713622347c9a` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.14.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.14.0'`
  与 `package.json` 一致。

## 本轮（v1.14.0）看点

- **双峰厅孪生松（Blender GLB 落厅 A/B 对照）**：林中岔路北缘并立
  两棵松——西棵是 Blender 4.1.1 headless 管线产的 GLB、东棵是程序化
  同款；两棵都在极缓地摆；走近按 E：针叶簌簌即时、枝腰吱呀迟半拍，
  没有字幕；在岔路多待一两分钟，会先听见一声很远的吱呀
- **访谈摘录册扩到 20 条 + 低语钮**：每张卡片可以让馆里那个非人声
  把摘录「读」给你听——气声音节 + 静电碎语，永远听不清字
- **彩蛋第二批·七厅又各 +1（全部零字幕）**：名册中缝的钢笔（它永远
  不回中缝了）/ 没关严的抽屉（推严 2.6s 后自己滑开）/ 检修口盖板
  （楼那头回敲，一次比一次少）/ 吧台火柴盒（划着 1.4s 后被谁吹灭）/
  手板上的硬币（0.8s 后落定——立在手板上）/ 巷墙海报角（撕开露出
  更早一层 …CHE）/ 场记板（合拍之后顶灯自己暗一拍）
- **世界记得你**：这批彩蛋每厅一件永久态——按过之后，那件小事在
  这个厅里再也回不去了
- 拐角 + 转身两重惊吓、171→179 件可交互物全部保留；发布产物全冒烟
  复跑 EXIT=0

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
