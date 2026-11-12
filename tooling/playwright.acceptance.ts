import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../tests/acceptance',
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4180', headless: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'firefox', use: { browserName: 'firefox' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: { cwd: new URL('..', import.meta.url).pathname, command: 'npx vite --config tooling/vite.acceptance.ts', url: 'http://127.0.0.1:4180/tests/fixtures/sdk.html', reuseExistingServer: !process.env.CI },
});
