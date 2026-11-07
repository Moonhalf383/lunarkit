import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import example from './vite.example.ts';

export default mergeConfig(example, defineConfig({
  root: fileURLToPath(new URL('../example2', import.meta.url)),
  build: { outDir: '../dist/example2', emptyOutDir: true },
}));
