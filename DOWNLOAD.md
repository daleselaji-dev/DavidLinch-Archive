# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.16.0**（旧版 1.15.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.16.0.exe` ≈96MB | [下载 Portable-1.16.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/smoke-velvet-round4-v1160-a993/release/SmokeVelvet-LynchArchive-Portable-1.16.0.exe) | `fc771b6639624eb4aa6a1c4bd397e29da9615aea81fb441298f236a130a0480f` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.16.0.exe` ≈96MB | [下载 Setup-1.16.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/smoke-velvet-round4-v1160-a993/release/SmokeVelvet-LynchArchive-Setup-1.16.0.exe) | `704e1257c47a2b4f84848738ed1457959ab5034921f83750c336915df53931da` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.16.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.16.0'`
  与 `package.json` 一致。

## 本轮（v1.16.0）看点

- **蒸汽调速器（Blender 第 5 件新资产落厅）**：橡皮头厅西墙、大机器
  与锅炉房门洞之间——离心飞球调速器随整栋楼的转速活着：锭轴转、
  飞球张、套筒升降、节流杆随动；**拉泄压阀停机，它跟着塌臂垂停**；
  按 E 它超速呼啸一拍，0.9 秒后大机器自己冲了一拍回敬你
- **换轴彩蛋七件（远声应答封顶，换三条新轴；全部零字幕、可重复）**：
  - **光的应答**：大厅长明灯旁的**烛剪**（碰一下，1.5s 后火苗认得
    那把剪子——压低又缓缓立回）/ 蓝丝绒台口**空话筒**（手背碰一声
    PA 低闷，1.5s 后整排脚灯呼吸着亮一口——熄灯档也答）
  - **温度**：橡皮头北墙**结霜的支管**（整栋楼都在冒汽唯独这段
    冰凉；掌心薄嘶，1.7s 后墙外极远处冰裂一声）/ 双峰咖啡壶
    **保温座**（掌心贴上是极低的暖哼，1.3s 后蒸汽旺一大口）/
    录音棚桌角**白瓷小碟**（杯子在冒烟碟子在降温——收缩三嗒，
    间隔越拉越长）
  - **时间错位**：档案廊站钟下的**上弦钥匙**（拧一下，垂死在 6 点
    位的秒针挣出三格——一格比一格迟、一声比一声轻，第三格没站稳
    滑回去，滑回不响）/ 穆赫兰道路口**路灯铁杆**（敲一记铁管双鸣，
    灯隔 2.4 秒才「听见」——用光把那记双鸣原样迟放一遍；这条路上
    声音和光不同步）
- **幽灵交互普查**：冒烟测试从此逐厅验证每个热点真的挂在场景树上
  （v1.15 工作桌事故的制度化补漏）
- **访谈摘录册 28→32 条**：「点子」主题 5→9——钓点子要等 / 接住的
  一瞬 / 隔壁的拼图 / 小鱼与大鱼（与档案廊立牌那句大鱼是同一段书
  的上下句）
- 拐角 + 转身两重惊吓、186→194 件可交互物全部保留；发布产物全冒烟
  复跑 EXIT=0

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
