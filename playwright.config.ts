import { defineConfig } from '@playwright/test';

const port = Number(process.env.NAVET_PREVIEW_PORT ?? 4178);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: 'tests/browser',
  timeout: 20000,
  use: { baseURL, headless: true },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: `${baseURL}/demo/index.html`,
    env: { PORT: String(port) },
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: process.env.NAVET_BROWSER_CHANNEL } }],
});
