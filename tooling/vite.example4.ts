import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import example from './vite.example.ts';

export default mergeConfig(example, defineConfig({
  root: fileURLToPath(new URL('../example/example4', import.meta.url)),
  build: { outDir: '../../dist/example4', emptyOutDir: true },
}));
