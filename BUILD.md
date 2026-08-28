# BUILD — Windows exe 一键构建

## 产物

| 文件 | 说明 |
|------|------|
| `release/SmokeVelvet-LynchArchive-Portable-1.12.0.exe` | **便携版**：双击即运行，免安装（推荐分发） |
| `release/SmokeVelvet-LynchArchive-Setup-1.12.0.exe` | NSIS 一键安装包 |

## 一键构建（Windows x64 目标）

```bash
npm install
npm run dist:win
```

`dist:win` = `vite build`（前端产物）→ `gen:icon`（Node 逐像素程序化生成 icon.ico，零素材）→
`electron-builder --win --x64`（portable + nsis 两个目标，输出到 `release/`）。

只要便携版：`npm run dist:win:portable`

## 各平台环境要求

- **Windows**：Node.js ≥ 18 即可，直接运行上述命令。
- **Linux / CI 交叉打包 Windows**：需安装 wine，且 **NSIS 安装包目标需要 32 位 wine**
  （NSIS stub 是 x86-32；仅装 wine64 时 portable 目标可成功，nsis 目标会在生成卸载器时报
  `failed to load syswow64\ntdll.dll`）：

```bash
sudo dpkg --add-architecture i386
sudo apt-get update
sudo apt-get install -y wine64 wine32:i386   # Ubuntu 24.04 + wine 9.0 验证通过
npm run dist:win
```

- **macOS**：`brew install --cask wine-stable` 后同上。

## 本地开发/运行

```bash
npm run dev                 # 浏览器开发服务器
npm run build && npm start  # Electron 桌面运行
```

## 备注

- electron-builder 首次运行会下载 Electron 预编译包与 NSIS 工具链（需要网络）。
- 产物为未签名构建，Windows SmartScreen 可能提示「未知发布者」——选择「仍要运行」即可；
  正式分发可自行配置代码签名证书（`win.certificateFile` 等字段）。
- `release/` 下的 `win-unpacked/` 为中间产物（免安装绿色目录，含 `SmokeVelvet-LynchArchive.exe`），已被 gitignore，仅保留两个最终 exe 与 `SHA256SUMS.txt`。
- 在 Linux 上用 wine 直接运行打包出的 exe 可完成自解压并启动主进程，但会在 Chromium GPU
  初始化处崩溃——这是 wine 运行 Electron 的已知限制，不代表产物损坏；同一份 `dist/` 与主进程
  已用原生 Electron 通过完整运行时冒烟（见 TESTING.md）。请在真实 Windows x64 上运行产物。
