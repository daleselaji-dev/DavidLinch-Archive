// ============================================================
// gen-icon.js — 纯 Node 程序化生成应用图标（无任何外部素材）。
// 画面: 红天鹅绒帷幕 + 黑白折线地板 + 暗角。
// 输出: build/icon.ico（内嵌 256x256 PNG，Vista+ 格式）
// ============================================================
'use strict';

const zlib = require('node:zlib');
const fs = require('node:fs');
const path = require('node:path');

const SIZE = 256;

// ---------- 像素绘制 ----------
function drawPixels() {
  const px = Buffer.alloc(SIZE * SIZE * 4);
  const floorTop = Math.floor(SIZE * 0.72);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let r; let g; let b;

      if (y < floorTop) {
        // 帷幕: 竖向褶皱 (多频正弦叠加) + 顶部到底部微渐变
        const wave =
          Math.sin((x / SIZE) * Math.PI * 14 + Math.sin(y * 0.02) * 0.8) * 0.5 +
          Math.sin((x / SIZE) * Math.PI * 37 + 1.3) * 0.22;
        const shade = 0.42 + 0.58 * (wave * 0.5 + 0.5);
        const vgrad = 1 - (y / floorTop) * 0.28;
        r = 143 * shade * vgrad + 16;
        g = 14 * shade * vgrad + 4;
        b = 30 * shade * vgrad + 6;
      } else {
        // 地板: 黑白折线
        const period = 36;
        const yy = (y - floorTop) % period;
        const tri = yy < period / 2 ? yy : period - yy;
        const idx = Math.floor((x + tri * 2) / 30) % 2;
        const persp = 1 - ((y - floorTop) / (SIZE - floorTop)) * 0.35;
        if (idx === 0) { r = 10 * persp; g = 9 * persp; b = 11 * persp; }
        else { r = 222 * persp; g = 215 * persp; b = 200 * persp; }
      }

      // 暗角
      const dx = (x - SIZE / 2) / (SIZE / 2);
      const dy = (y - SIZE / 2) / (SIZE / 2);
      const vig = 1 - Math.pow(Math.min(1, Math.hypot(dx, dy)), 2.2) * 0.55;
      r *= vig; g *= vig; b *= vig;

      const o = (y * SIZE + x) * 4;
      px[o] = Math.min(255, Math.round(r));
      px[o + 1] = Math.min(255, Math.round(g));
      px[o + 2] = Math.min(255, Math.round(b));
      px[o + 3] = 255;
    }
  }
  return px;
}

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(px) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  // 每行前置过滤字节 0
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y++) {
    raw[y * (SIZE * 4 + 1)] = 0;
    px.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- ICO 容器 ----------
function encodeIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry[0] = 0;   // 256 width
  entry[1] = 0;   // 256 height
  entry[2] = 0;   // palette
  entry[3] = 0;   // reserved
  entry.writeUInt16LE(1, 4);   // planes
  entry.writeUInt16LE(32, 6);  // bpp
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12); // offset
  return Buffer.concat([header, entry, png]);
}

const outDir = path.join(__dirname, '..', 'build');
fs.mkdirSync(outDir, { recursive: true });
const png = encodePng(drawPixels());
fs.writeFileSync(path.join(outDir, 'icon.png'), png);
fs.writeFileSync(path.join(outDir, 'icon.ico'), encodeIco(png));
console.log(`[gen-icon] build/icon.ico 已生成 (${encodeIco(png).length} bytes, 程序化绘制)`);
