import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('../example', import.meta.url)),
  resolve: {
    alias: [
      { find: 'lunarkit/style.css', replacement: fileURLToPath(new URL('../src/theme/style.css', import.meta.url)) },
      { find: /^lunarkit$/, replacement: fileURLToPath(new URL('../src/index.ts', import.meta.url)) },
    ],
  },
  build: { outDir: '../dist/example', emptyOutDir: true },
});
