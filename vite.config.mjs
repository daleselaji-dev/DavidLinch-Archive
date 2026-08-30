import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the bundle works when Electron loads dist/index.html via file://
  base: './',
  // v1.14：Blender 管线 GLB（脚本产物，非外来素材）作为资产打包；
  // 展厅内经 ?inline data URI 引入——electron sandbox 的 file:// 页面
  // fetch 不了本地文件，data URI 两端通吃
  assetsInclude: ['**/*.glb'],
  build: {
    outDir: 'dist',
    target: 'chrome120',
    chunkSizeWarningLimit: 1200,
    sourcemap: false
  },
  server: {
    port: 5173
  }
});
