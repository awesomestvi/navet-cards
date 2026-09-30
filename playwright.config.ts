import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser',
  timeout: 20000,
  use: { baseURL: 'http://127.0.0.1:4178', headless: true },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://127.0.0.1:4178/demo/index.html',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
