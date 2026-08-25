# BUILD — Windows exe 一键构建

## 产物

| 文件 | 说明 |
|------|------|
| `release/SmokeVelvet-LynchArchive-Portable-1.0.0.exe` | **便携版**：双击即运行，免安装（推荐分发） |
| `release/SmokeVelvet-LynchArchive-Setup-1.0.0.exe` | NSIS 一键安装包 |

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
- **Linux / CI 交叉打包 Windows**：需安装 wine（electron-builder 用它执行 rcedit 写入图标与版本信息，并运行 NSIS）：

```bash
sudo apt-get install -y wine64   # Ubuntu 24.04 验证通过 (wine 9.0)
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
- `release/` 下的 `win-unpacked/` 为中间产物（免安装绿色目录，含 `SmokeVelvet-LynchArchive.exe`），已被 gitignore，仅保留两个最终 exe。
