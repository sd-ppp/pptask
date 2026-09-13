import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4178',
    browserName: 'chromium',
    headless: true,
  },
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 4178',
    url: 'http://127.0.0.1:4178/tests/browser/fixture.html',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
