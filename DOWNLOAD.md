# DOWNLOAD — Windows 试运行下载

> ## ⬇️ 请下载本轮 **Portable-1.25.0**（旧版 1.24.0 已从本分支移除，勿混用）

| 产物 | 直链（raw） | SHA256 |
|------|-------------|--------|
| **便携版（推荐）** `SmokeVelvet-LynchArchive-Portable-1.25.0.exe` ≈96MB | [下载 Portable-1.25.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/owl-refine-acceptance-round4-v1250-a993/release/SmokeVelvet-LynchArchive-Portable-1.25.0.exe) | `fab874966f7ccc96bf873d0295b1aeffc127e95a0f9ba9f24b9c9a29d9da7c64` |
| 安装版 `SmokeVelvet-LynchArchive-Setup-1.25.0.exe` ≈96MB | [下载 Setup-1.25.0](https://raw.githubusercontent.com/daleselaji-dev/DavidLinch-Archive/cursor/owl-refine-acceptance-round4-v1250-a993/release/SmokeVelvet-LynchArchive-Setup-1.25.0.exe) | `c695fe0b5f960e48888af51287996903ceef0e6f3903c39e268eedcfa04217a2` |

## 使用

- **便携版**：下载后双击即运行，免安装（首次自解压需几秒）。
- **安装版**：一键安装后从开始菜单启动。
- 校验（PowerShell）：`Get-FileHash .\SmokeVelvet-LynchArchive-Portable-1.25.0.exe -Algorithm SHA256`，
  与上表/`release/SHA256SUMS.txt` 比对。
- 版本自检：窗口标题含「Unofficial Fan Tribute」；控制台 `__SV__.version === '1.25.0'`
  与 `package.json` 一致。

## 本轮（v1.25.0）看点

- **双峰枯树桩鸮精修**（空地边缘抬头看，夜里认剪影）：眼睛那
  两粒微光**一点没动**（您说眼睛好，这轮就没碰它）——变的是形：
  满胸收颈圆颅的三段剪影、贴身合拢的双翼线、垂到栖枝下面的
  尾楔、外张的耳羽簇；**爪现在扣在枝上**（旧版悬空近 5cm）。
  E 触发的转头/亮起/叫声全部照旧
- **拐角惊吓醒来的朝向变了**：黑幕后巷口俯冲醒，头自己抬起来
  ——**面前就是你刚拐过去的那条巷子**（两盏将熄壁灯渐次没入
  黑，尽头正对拐角方向）；那句「有些拐角，不该拐过去。」落下
  时你看着的就是它。转身惊吓照旧背巷平视——两重 wake 现在差
  三样：醒姿、字幕时机、朝向
- **拐角惊吓本体这轮零改动**：v1.22–v1.24 四层（显形线机制/
  手感拍长/rim 灯语/音频+wake）全部原值——**这轮交付的是验收
  工具**：`TESTING.md` 新增**「拐角惊吓耳机验收清单」**，七拍
  逐拍列「该听到什么/该看到什么」。**若您觉得哪里不够吓人，
  请按清单指认是哪一拍**（接近段没压？滑出不闪？错拍不僵？
  扑近不响？醒来不晕？）——下一轮好定向修补
- 立牌导览一条换血：蓝丝绒厅「家会出事」立牌的低语注解换成了
  一件可查证的事——他把那句话拍进过自己家
- 显形线 / 惊吓拍长（3.3s 原值 ±0ms）/ 转身惊吓 / 195 件交互 /
  98 音色 / 访谈 40 封顶全部保留；单测 744→**774**；发布产物
  全冒烟复跑 EXIT=0

## v1.25 验收走查（第 5 轮验收包——请戴耳机按拍走一遍）

> CI 能证明的账目本轮已全部复验（774 单测 / 冒烟 EXIT=0 /
> scareProbe 逐拍实录零矛盾，见
> [`assets/acceptance/v125/`](assets/acceptance/v125/)）。
> **「吓不吓人」只有您的真机证词能定案**——下一轮修不修、修哪里，
> 全看这一节的反馈。

**走查路线**（上表 Portable-1.25.0 直链下载即用）：

1. 进「穆赫兰道」厅 → 夜路南行 → 右侧便道 → 票亭转角 → 暗巷
   南行到底（拐角惊吓）；醒来后再走到剧场背后空地站定几秒、
   猛回头（转身惊吓）
2. 对照 [`TESTING.md` 的「拐角惊吓耳机验收清单」](TESTING.md)
   ——七拍逐拍列了**该听到什么/该看到什么**
3. 进「双峰」厅 → 空地边缘枯树桩抬头（鸮剪影 + 眼微光；按 E
   眼睛亮起、头转过来）——CI 定向机位三帧在
   [`assets/acceptance/v125/`](assets/acceptance/v125/) 供对照，
   魅影形体四机位渲染在
   [`assets/blender/renders/`](assets/blender/renders/)
   （corner-wraith-{front,side,back,closeup}.png）

**反馈模板（填空式——按拍指认，一句话就够）**：

```
【拐角惊吓】
不到位的拍：〔接近段 / 跨线帧 / 错拍 / 扑近 / 冲击 / 黑幕 / 俯冲醒〕
这一拍我听到/看到的是：________________
不吓人的原因更接近：〔太快 / 太慢 / 不够响 / 没看清 / 不意外 / 其他____〕

【双峰鸮】（若二次目检仍有不满）
不对的线：〔轮廓 / 双翼 / 垂尾 / 耳羽 / 栖枝〕，怎么不对：________

【转身惊吓 / 其他厅】：________________
```

反馈落到哪一拍/哪条线，下一轮就修那一拍/那条线；没有拍位证词
时惊吓四层保持零改动（全面翻修的回报已递减，纪律见
`STYLE_AUDIT` §16）。

构建方法与跨平台说明见 [`BUILD.md`](BUILD.md)。
