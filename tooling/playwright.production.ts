import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../tests/production',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4175', headless: true },
  webServer: {
    command: 'npm run preview:example2 -- --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: !process.env.CI,
  },
});
