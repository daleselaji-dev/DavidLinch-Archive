import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the bundle works when Electron loads dist/index.html via file://
  base: './',
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
