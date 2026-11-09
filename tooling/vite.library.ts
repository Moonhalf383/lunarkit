import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// 将公开子入口解析到源码，保持根入口兼容且按需分块。
function entry(path: string): string { return fileURLToPath(new URL(`../src/${path}`, import.meta.url)); }

export default defineConfig({
  build: {
    lib: {
      entry: { index: entry('index.ts'), core: entry('core.ts'), markdown: entry('output/markdown.ts'), charts: entry('visuals/charts.ts'), models: entry('visuals/model.ts'), 'icons/streamline': entry('visuals/icons.ts') },
      formats: ['es'],
      fileName: '[name]',
    },
    rollupOptions: { external: ['dompurify', 'marked'] },
  },
});
