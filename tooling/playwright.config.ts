import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../tests/browser',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4173', headless: true },
  webServer: [
    {
      command: 'npm run dev:example4 -- --host 127.0.0.1 --port 4178 --strictPort',
      url: 'http://127.0.0.1:4178',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev:example3 -- --host 127.0.0.1 --port 4176 --strictPort',
      url: 'http://127.0.0.1:4176',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev:example2 -- --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
